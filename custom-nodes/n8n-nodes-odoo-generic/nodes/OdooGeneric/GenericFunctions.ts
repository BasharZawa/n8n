import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	ICredentialTestFunctions,
	IRequestOptions,
	IHttpRequestMethods,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, randomInt } from 'n8n-workflow';

import type {
	IOdooCredentials,
	IOdooFilterOperations,
	IOdooNameValueFields,
	IOdooJsonRpcBody,
	ResolvedProtocol,
} from './types';
import { mapFilterOperationToJSONRPC, RESOURCE_MODEL_MAP } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function odooGetDBName(databaseName: string | undefined, url: string): string {
	if (databaseName) return databaseName;
	const odooURL = new URL(url);
	const hostname = odooURL.hostname;
	if (!hostname) return '';
	return hostname.split('.')[0];
}

export function getOdooPassword(credentials: IOdooCredentials): string {
	return credentials.authMethod === 'apiKey' ? credentials.apiKey : credentials.password;
}

export function resolveModel(resource: string, customModel?: string): string {
	if (resource === 'custom') {
		return customModel || '';
	}
	return RESOURCE_MODEL_MAP[resource] || resource;
}

export function processFilters(value: IOdooFilterOperations): unknown[][] {
	return (value.filter || []).map((item) => {
		const operator = mapFilterOperationToJSONRPC[item.operator] || item.operator;
		let filterValue: unknown = item.value;

		// For 'in' / 'not in' operators, Odoo expects an array.
		// Parse JSON arrays or split comma-separated strings.
		if (operator === 'in' || operator === 'not in') {
			if (typeof filterValue === 'string') {
				const trimmed = filterValue.trim();
				if (trimmed.startsWith('[')) {
					try {
						filterValue = JSON.parse(trimmed);
					} catch {
						filterValue = trimmed.slice(1, -1).split(',').map((s) => s.trim());
					}
				} else {
					filterValue = trimmed.split(',').map((s) => s.trim());
				}
				// Auto-cast numeric array items
				filterValue = (filterValue as string[]).map((v) =>
					typeof v === 'string' && v !== '' && !isNaN(Number(v)) ? Number(v) : v,
				);
			}
		} else if (typeof filterValue === 'string' && filterValue !== '' && !isNaN(Number(filterValue))) {
			// Auto-cast single numeric values (e.g. partner_id = "14" → 14)
			filterValue = Number(filterValue);
		}

		return [item.fieldName, operator, filterValue];
	});
}

export function processNameValueFields(value: IDataObject): IDataObject {
	const data = value as unknown as IOdooNameValueFields;
	return (data?.fields || []).reduce<IDataObject>((acc, record) => {
		const v = record.fieldValue;
		// Auto-cast numeric strings to numbers (required for Many2one, Integer, Float fields)
		if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) {
			acc[record.fieldName] = Number(v);
		} else {
			acc[record.fieldName] = v;
		}
		return acc;
	}, {});
}

function normalizeUrl(url: string): string {
	return url.replace(/\/$/, '');
}

// ─── JSON-RPC Adapter (Odoo 14-17, fallback for 18+) ───────────────────────

export async function odooJsonRpcRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	body: IOdooJsonRpcBody,
	url: string,
): Promise<IDataObject | IDataObject[]> {
	try {
		const options: IRequestOptions = {
			headers: {
				'User-Agent': 'n8n',
				Connection: 'keep-alive',
				Accept: '*/*',
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body,
			uri: `${normalizeUrl(url)}/jsonrpc`,
			json: true,
		};

		const response = await this.helpers.request(options);
		if (response.error) {
			throw new NodeApiError(this.getNode(), response.error.data as JsonObject, {
				message: response.error.data?.message || response.error.message || 'Unknown Odoo error',
			});
		}
		return response.result;
	} catch (error) {
		if (error instanceof NodeApiError) throw error;
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

const LOGIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedLogin {
	uid: number;
	expiresAt: number;
}

const loginCache = new Map<string, CachedLogin>();

function loginCacheKey(url: string, db: string, username: string): string {
	return `${normalizeUrl(url)}|${db}|${username}`;
}

export async function odooJsonRpcLogin(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	db: string,
	username: string,
	password: string,
	url: string,
): Promise<number> {
	const cacheKey = loginCacheKey(url, db, username);
	const cached = loginCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.uid;

	const body: IOdooJsonRpcBody = {
		jsonrpc: '2.0',
		method: 'call',
		params: {
			service: 'common',
			method: 'login',
			args: [db, username, password],
		},
		id: randomInt(100),
	};
	const result = await odooJsonRpcRequest.call(this, body, url);
	if (!result) {
		throw new NodeApiError(this.getNode(), {
			message: 'Authentication failed. Check your credentials and database name.',
		} as JsonObject);
	}
	const uid = result as unknown as number;
	loginCache.set(cacheKey, { uid, expiresAt: Date.now() + LOGIN_CACHE_TTL_MS });
	return uid;
}

function buildJsonRpcBody(
	db: string,
	userID: number,
	password: string,
	model: string,
	method: string,
	args: unknown[],
	kwargs: Record<string, unknown> = {},
): IOdooJsonRpcBody {
	return {
		jsonrpc: '2.0',
		method: 'call',
		params: {
			service: 'object',
			method: 'execute_kw',
			args: [db, userID, password, model, method, args, kwargs],
		},
		id: randomInt(100),
	};
}

// ─── JSON-2 API Adapter (Odoo 18+) ─────────────────────────────────────────

export async function odooJson2Request(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	url: string,
	credentials: IOdooCredentials,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const password = getOdooPassword(credentials);
	const baseUrl = normalizeUrl(url);

	const options: IRequestOptions = {
		headers: {
			'User-Agent': 'n8n',
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${password}`,
		},
		method,
		uri: `${baseUrl}${endpoint}`,
		json: true,
		qs: qs || {},
	};

	if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
		options.body = body;
	}

	try {
		const response = await this.helpers.request(options);
		// JSON-2 may return { data: [...] } or direct array/object
		if (response?.data !== undefined) {
			return response.data;
		}
		return response;
	} catch (error) {
		if (error instanceof NodeApiError) throw error;
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// ─── Protocol Auto-Detection ────────────────────────────────────────────────

const PROTOCOL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedProtocol {
	protocol: ResolvedProtocol;
	expiresAt: number;
}

const protocolCache = new Map<string, CachedProtocol>();

export async function detectProtocol(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	url: string,
	credentials: IOdooCredentials,
): Promise<ResolvedProtocol> {
	const cacheKey = normalizeUrl(url);
	const cached = protocolCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.protocol;

	try {
		// Try JSON-2 API probe
		await odooJson2Request.call(
			this,
			'GET',
			'/api/res.users',
			url,
			credentials,
			undefined,
			{ limit: 1 },
		);
		protocolCache.set(cacheKey, { protocol: 'json2', expiresAt: Date.now() + PROTOCOL_CACHE_TTL_MS });
		return 'json2';
	} catch {
		protocolCache.set(cacheKey, { protocol: 'jsonrpc', expiresAt: Date.now() + PROTOCOL_CACHE_TTL_MS });
		return 'jsonrpc';
	}
}

export async function resolveProtocol(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
): Promise<ResolvedProtocol> {
	if (credentials.protocol === 'json2') return 'json2';
	if (credentials.protocol === 'jsonrpc') return 'jsonrpc';
	return detectProtocol.call(this, credentials.url, credentials);
}

// ─── Unified CRUD Helpers ───────────────────────────────────────────────────

export async function odooCreate(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
	model: string,
	fields: IDataObject,
): Promise<IDataObject> {
	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	if (protocol === 'json2') {
		const result = await odooJson2Request.call(
			this, 'POST', `/api/${model}`, url, credentials, fields,
		);
		return Array.isArray(result) ? result[0] : result;
	}

	const db = odooGetDBName(credentials.database, url);
	const password = getOdooPassword(credentials);
	const userID = await odooJsonRpcLogin.call(this, db, credentials.username, password, url);
	const body = buildJsonRpcBody(db, userID, password, model, 'create', [fields]);
	const result = await odooJsonRpcRequest.call(this, body, url);
	return { id: result } as IDataObject;
}

export async function odooGet(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
	model: string,
	recordId: string,
	fieldsList?: string[],
): Promise<IDataObject | IDataObject[]> {
	if (!/^\d+$/.test(recordId) || !parseInt(recordId, 10)) {
		throw new NodeApiError(this.getNode(), {
			message: `Please specify a valid ID: ${recordId}`,
		} as JsonObject);
	}

	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	if (protocol === 'json2') {
		const qs: IDataObject = {};
		if (fieldsList && fieldsList.length > 0) {
			qs.fields = fieldsList.join(',');
		}
		return odooJson2Request.call(
			this, 'GET', `/api/${model}/${recordId}`, url, credentials, undefined, qs,
		);
	}

	const db = odooGetDBName(credentials.database, url);
	const password = getOdooPassword(credentials);
	const userID = await odooJsonRpcLogin.call(this, db, credentials.username, password, url);
	const args: unknown[] = [[+recordId]];
	if (fieldsList && fieldsList.length > 0) {
		args.push(fieldsList);
	} else {
		args.push([]);
	}
	const body = buildJsonRpcBody(db, userID, password, model, 'read', args);
	return odooJsonRpcRequest.call(this, body, url);
}

export async function odooGetAll(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
	model: string,
	filters?: IOdooFilterOperations,
	fieldsList?: string[],
	limit = 0,
	offset = 0,
	rawDomain?: string,
): Promise<IDataObject[]> {
	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	// rawDomain with OR conditions isn't reliably handled by JSON-2 REST query params,
	// so fall back to JSON-RPC for complex domain searches.
	if (protocol === 'json2' && !rawDomain?.trim()) {
		const qs: IDataObject = {};
		if (fieldsList && fieldsList.length > 0) {
			qs.fields = fieldsList.join(',');
		}
		if (limit > 0) qs.limit = limit;
		if (offset > 0) qs.offset = offset;
		if (filters?.filter?.length) {
			qs.domain = JSON.stringify(processFilters(filters));
		}
		const result = await odooJson2Request.call(
			this, 'GET', `/api/${model}`, url, credentials, undefined, qs,
		);
		return Array.isArray(result) ? result : [result];
	}

	const db = odooGetDBName(credentials.database, url);
	const password = getOdooPassword(credentials);
	const userID = await odooJsonRpcLogin.call(this, db, credentials.username, password, url);
	const domain = rawDomain && rawDomain.trim()
		? JSON.parse(rawDomain) as unknown[][]
		: (filters?.filter?.length ? processFilters(filters) : []);
	const fields = fieldsList && fieldsList.length > 0 ? fieldsList : [];
	const body = buildJsonRpcBody(db, userID, password, model, 'search_read', [
		domain,
		fields,
		offset,
		limit,
	]);
	const result = await odooJsonRpcRequest.call(this, body, url);
	return Array.isArray(result) ? result : [result as IDataObject];
}

export async function odooUpdate(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
	model: string,
	recordId: string,
	fields: IDataObject,
): Promise<IDataObject> {
	if (!Object.keys(fields).length) {
		throw new NodeApiError(this.getNode(), {
			message: 'Please specify at least one field to update',
		} as JsonObject);
	}
	if (!/^\d+$/.test(recordId) || !parseInt(recordId, 10)) {
		throw new NodeApiError(this.getNode(), {
			message: `Please specify a valid ID: ${recordId}`,
		} as JsonObject);
	}

	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	if (protocol === 'json2') {
		await odooJson2Request.call(
			this, 'PATCH', `/api/${model}/${recordId}`, url, credentials, fields,
		);
		return { id: +recordId };
	}

	const db = odooGetDBName(credentials.database, url);
	const password = getOdooPassword(credentials);
	const userID = await odooJsonRpcLogin.call(this, db, credentials.username, password, url);
	const body = buildJsonRpcBody(db, userID, password, model, 'write', [[+recordId], fields]);
	await odooJsonRpcRequest.call(this, body, url);
	return { id: +recordId };
}

export async function odooDelete(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
	model: string,
	recordId: string,
): Promise<IDataObject> {
	if (!/^\d+$/.test(recordId) || !parseInt(recordId, 10)) {
		throw new NodeApiError(this.getNode(), {
			message: `Please specify a valid ID: ${recordId}`,
		} as JsonObject);
	}

	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	if (protocol === 'json2') {
		await odooJson2Request.call(
			this, 'DELETE', `/api/${model}/${recordId}`, url, credentials,
		);
		return { success: true };
	}

	const db = odooGetDBName(credentials.database, url);
	const password = getOdooPassword(credentials);
	const userID = await odooJsonRpcLogin.call(this, db, credentials.username, password, url);
	const body = buildJsonRpcBody(db, userID, password, model, 'unlink', [[+recordId]]);
	await odooJsonRpcRequest.call(this, body, url);
	return { success: true };
}

export async function odooExecuteMethod(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
	model: string,
	methodName: string,
	recordId?: string,
	args?: unknown[],
): Promise<IDataObject> {
	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	if (protocol === 'json2') {
		const endpoint = recordId
			? `/api/${model}/${recordId}/${methodName}`
			: `/api/${model}/${methodName}`;
		const result = await odooJson2Request.call(
			this, 'POST', endpoint, url, credentials, { args: args || [] },
		);
		return Array.isArray(result) ? { result } as IDataObject : (result || { success: true }) as IDataObject;
	}

	const db = odooGetDBName(credentials.database, url);
	const password = getOdooPassword(credentials);
	const userID = await odooJsonRpcLogin.call(this, db, credentials.username, password, url);
	const methodArgs: unknown[] = recordId ? [[+recordId], ...(args || [])] : [...(args || [])];
	const body = buildJsonRpcBody(db, userID, password, model, methodName, methodArgs);
	const result = await odooJsonRpcRequest.call(this, body, url);
	if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
		return result;
	}
	return { result } as IDataObject;
}

// ─── Metadata Helpers (for loadOptions) ─────────────────────────────────────

export async function odooGetModelFields(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
	model: string,
): Promise<IDataObject> {
	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	if (protocol === 'json2') {
		const result = await odooJson2Request.call(
			this, 'GET', `/api/${model}/fields_get`, url, credentials, undefined,
			{ attributes: 'string,type,help,required,name' },
		);
		return (Array.isArray(result) ? result[0] : result) || {};
	}

	const db = odooGetDBName(credentials.database, url);
	const password = getOdooPassword(credentials);
	const userID = await odooJsonRpcLogin.call(this, db, credentials.username, password, url);
	const body = buildJsonRpcBody(db, userID, password, model, 'fields_get', [
		[],
		['string', 'type', 'help', 'required', 'name'],
	]);
	const result = await odooJsonRpcRequest.call(this, body, url);
	return (Array.isArray(result) ? result[0] : result) as IDataObject || {};
}

export async function odooGetModels(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
): Promise<IDataObject[]> {
	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	if (protocol === 'json2') {
		const result = await odooJson2Request.call(
			this, 'GET', '/api/ir.model', url, credentials, undefined,
			{ fields: 'name,model' },
		);
		return Array.isArray(result) ? result : [result];
	}

	const db = odooGetDBName(credentials.database, url);
	const password = getOdooPassword(credentials);
	const userID = await odooJsonRpcLogin.call(this, db, credentials.username, password, url);
	const body = buildJsonRpcBody(db, userID, password, 'ir.model', 'search_read', [
		[],
		['name', 'model'],
	]);
	const result = await odooJsonRpcRequest.call(this, body, url);
	return Array.isArray(result) ? result : [result as IDataObject];
}

export async function odooSearchRead(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentials: IOdooCredentials,
	model: string,
	fieldsList: string[],
): Promise<IDataObject[]> {
	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	if (protocol === 'json2') {
		const result = await odooJson2Request.call(
			this, 'GET', `/api/${model}`, url, credentials, undefined,
			{ fields: fieldsList.join(',') },
		);
		return Array.isArray(result) ? result : [result];
	}

	const db = odooGetDBName(credentials.database, url);
	const password = getOdooPassword(credentials);
	const userID = await odooJsonRpcLogin.call(this, db, credentials.username, password, url);
	const body = buildJsonRpcBody(db, userID, password, model, 'search_read', [
		[],
		fieldsList,
	]);
	const result = await odooJsonRpcRequest.call(this, body, url);
	return Array.isArray(result) ? result : [result as IDataObject];
}

// ─── Credential Test Helper (for ICredentialTestFunctions context) ──────────

export async function testOdooCredentials(
	helpers: ICredentialTestFunctions['helpers'],
	credentials: IOdooCredentials,
): Promise<{ status: string; message: string }> {
	const url = normalizeUrl(credentials.url);
	const password = getOdooPassword(credentials);

	// Try JSON-2 first if not forced to jsonrpc
	if (credentials.protocol !== 'jsonrpc') {
		try {
			const options: IRequestOptions = {
				headers: {
					'User-Agent': 'n8n',
					Accept: 'application/json',
					Authorization: `Bearer ${password}`,
				},
				method: 'GET',
				uri: `${url}/api/res.users`,
				json: true,
				qs: { limit: 1 },
			};
			const result = await helpers.request(options);
			if (result && !result.error) {
				return { status: 'OK', message: 'Authentication successful (JSON-2 API)!' };
			}
		} catch {
			// Fall through to JSON-RPC
		}
	}

	// Try JSON-RPC
	if (credentials.protocol !== 'json2') {
		try {
			const db = odooGetDBName(credentials.database, url);
			const body = {
				jsonrpc: '2.0',
				method: 'call',
				params: {
					service: 'common',
					method: 'login',
					args: [db, credentials.username, password],
				},
				id: randomInt(100),
			};
			const options: IRequestOptions = {
				headers: {
					'User-Agent': 'n8n',
					Connection: 'keep-alive',
					Accept: '*/*',
					'Content-Type': 'application/json',
				},
				method: 'POST',
				body,
				uri: `${url}/jsonrpc`,
				json: true,
			};
			const result = await helpers.request(options);
			if (result.error || !result.result) {
				return { status: 'Error', message: 'Credentials are not valid' };
			}
			return { status: 'OK', message: 'Authentication successful (JSON-RPC)!' };
		} catch (error) {
			return { status: 'Error', message: `Connection failed: ${error}` };
		}
	}

	return { status: 'Error', message: 'Could not connect to Odoo with either protocol' };
}
