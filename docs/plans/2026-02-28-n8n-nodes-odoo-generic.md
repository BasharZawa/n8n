# n8n-nodes-odoo-generic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-ready n8n community node package that provides generic, dynamic integration with any Odoo ERP instance (versions 14–19).

**Architecture:** Single unified node (`OdooGeneric`) with resource/operation pattern. Dual-protocol API client: JSON-2 API (Odoo 18+, primary) with JSON-RPC fallback (Odoo 14-17). Dynamic field discovery and visual domain filter builder.

**Tech Stack:** TypeScript, n8n-workflow peer dependency, Jest for testing. Standalone npm package at repo root `n8n-nodes-odoo-generic/`.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `n8n-nodes-odoo-generic/package.json`
- Create: `n8n-nodes-odoo-generic/tsconfig.json`
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/odoo.svg`

**Step 1: Create directory structure**

```bash
mkdir -p n8n-nodes-odoo-generic/{credentials,nodes/OdooGeneric/descriptions,test}
```

**Step 2: Create package.json**

```json
{
  "name": "n8n-nodes-odoo-generic",
  "version": "0.1.0",
  "description": "n8n community node for generic Odoo ERP integration (v14-19) with JSON-2 API + JSON-RPC support",
  "license": "MIT",
  "keywords": [
    "n8n-community-node-package"
  ],
  "scripts": {
    "build": "tsc --build tsconfig.json",
    "test": "jest",
    "lint": "tsc --noEmit"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/OdooGenericApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/OdooGeneric/OdooGeneric.node.js"
    ]
  },
  "devDependencies": {
    "typescript": "5.9.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0",
    "n8n-workflow": "*"
  },
  "peerDependencies": {
    "n8n-workflow": "*"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "commonjs",
    "moduleResolution": "node",
    "target": "es2019",
    "lib": ["es2019", "es2020", "es2022.error"],
    "removeComments": true,
    "useUnknownInCatchVariables": false,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "strictNullChecks": true,
    "preserveConstEnums": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "incremental": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "outDir": "./dist/"
  },
  "include": ["credentials/**/*", "nodes/**/*", "nodes/**/*.json", "package.json"]
}
```

**Step 4: Copy the Odoo SVG icon**

```bash
cp packages/nodes-base/nodes/Odoo/odoo.svg n8n-nodes-odoo-generic/nodes/OdooGeneric/odoo.svg
```

**Step 5: Install dependencies**

```bash
cd n8n-nodes-odoo-generic && pnpm install
```

**Step 6: Verify compilation (empty project)**

Run: `cd n8n-nodes-odoo-generic && pnpm lint`
Expected: Success (no source files yet, no errors)

**Step 7: Commit**

```bash
git add n8n-nodes-odoo-generic/
git commit -m "chore: scaffold n8n-nodes-odoo-generic package"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/types.ts`

**Step 1: Write types.ts**

```typescript
import type { IDataObject } from 'n8n-workflow';

export type OdooProtocol = 'auto' | 'json2' | 'jsonrpc';
export type ResolvedProtocol = 'json2' | 'jsonrpc';
export type OdooAuthMethod = 'apiKey' | 'password';
export type OdooResource = 'contact' | 'lead' | 'saleOrder' | 'custom';
export type OdooOperation = 'create' | 'get' | 'getAll' | 'update' | 'delete' | 'executeMethod';

export const RESOURCE_MODEL_MAP: Record<string, string> = {
	contact: 'res.partner',
	lead: 'crm.lead',
	saleOrder: 'sale.order',
};

export const mapOperationToJSONRPC: Record<string, string> = {
	create: 'create',
	get: 'read',
	getAll: 'search_read',
	update: 'write',
	delete: 'unlink',
};

export const mapFilterOperationToJSONRPC: Record<string, string> = {
	equal: '=',
	notEqual: '!=',
	greaterThan: '>',
	lessThan: '<',
	greaterOrEqual: '>=',
	lessOrEqual: '<=',
	like: 'like',
	ilike: 'ilike',
	in: 'in',
	notIn: 'not in',
	childOf: 'child_of',
};

export interface IOdooCredentials {
	url: string;
	authMethod: OdooAuthMethod;
	database: string;
	username: string;
	password: string;
	apiKey: string;
	protocol: OdooProtocol;
}

export interface IOdooFilterOperations {
	filter: Array<{
		fieldName: string;
		operator: string;
		value: string;
	}>;
}

export interface IOdooNameValueFields {
	fields: Array<{
		fieldName: string;
		fieldValue: string;
	}>;
}

export interface IOdooJsonRpcBody {
	jsonrpc: '2.0';
	method: 'call';
	params: {
		service: string;
		method: string;
		args: unknown[];
	};
	id: number;
}

export interface IOdooJson2Response {
	data: IDataObject[];
	next?: string;
}
```

**Step 2: Verify compilation**

Run: `cd n8n-nodes-odoo-generic && pnpm lint`
Expected: Success

**Step 3: Commit**

```bash
git add n8n-nodes-odoo-generic/nodes/OdooGeneric/types.ts
git commit -m "feat(odoo-generic): add TypeScript type definitions"
```

---

## Task 3: Credentials

**Files:**
- Create: `n8n-nodes-odoo-generic/credentials/OdooGenericApi.credentials.ts`

**Step 1: Write credential file**

```typescript
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OdooGenericApi implements ICredentialType {
	name = 'odooGenericApi';

	displayName = 'Odoo Generic API';

	documentationUrl = 'https://www.odoo.com/documentation/18.0/developer/reference/external_api.html';

	properties: INodeProperties[] = [
		{
			displayName: 'Site URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://my-organization.odoo.com',
			required: true,
		},
		{
			displayName: 'Authentication Method',
			name: 'authMethod',
			type: 'options',
			options: [
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'Password',
					value: 'password',
				},
			],
			default: 'apiKey',
		},
		{
			displayName: 'Database Name',
			name: 'database',
			type: 'string',
			default: '',
			description: 'If empty, derived from the URL hostname (e.g. "mycompany" from mycompany.odoo.com)',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			placeholder: 'user@email.com',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: {
				show: {
					authMethod: ['password'],
				},
			},
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Generate from Odoo: Settings → Users → API Keys',
			displayOptions: {
				show: {
					authMethod: ['apiKey'],
				},
			},
		},
		{
			displayName: 'API Protocol',
			name: 'protocol',
			type: 'options',
			options: [
				{
					name: 'Auto-Detect (Recommended)',
					value: 'auto',
				},
				{
					name: 'JSON-2 API (Odoo 18+)',
					value: 'json2',
				},
				{
					name: 'JSON-RPC (Legacy)',
					value: 'jsonrpc',
				},
			],
			default: 'auto',
			description: 'Auto tries JSON-2 first, falls back to JSON-RPC for older Odoo versions',
		},
	];
}
```

**Step 2: Verify compilation**

Run: `cd n8n-nodes-odoo-generic && pnpm lint`
Expected: Success

**Step 3: Commit**

```bash
git add n8n-nodes-odoo-generic/credentials/
git commit -m "feat(odoo-generic): add OdooGenericApi credentials"
```

---

## Task 4: API Client — Helpers & JSON-RPC Adapter

**Files:**
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/GenericFunctions.ts`

This is the largest task — the dual-protocol API client. We build it in one file with clearly separated sections.

**Step 1: Write GenericFunctions.ts**

```typescript
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	ICredentialTestFunctions,
	IRequestOptions,
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
import { mapOperationToJSONRPC, mapFilterOperationToJSONRPC, RESOURCE_MODEL_MAP } from './types';

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
		return [item.fieldName, operator, item.value];
	});
}

export function processNameValueFields(value: IDataObject): IDataObject {
	const data = value as unknown as IOdooNameValueFields;
	return (data?.fields || []).reduce<IDataObject>((acc, record) => {
		acc[record.fieldName] = record.fieldValue;
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

export async function odooJsonRpcLogin(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	db: string,
	username: string,
	password: string,
	url: string,
): Promise<number> {
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
	if (!result || result === false) {
		throw new NodeApiError(this.getNode(), {
			message: 'Authentication failed. Check your credentials and database name.',
		} as JsonObject);
	}
	return result as unknown as number;
}

function buildJsonRpcBody(
	db: string,
	userID: number,
	password: string,
	model: string,
	method: string,
	args: unknown[],
): IOdooJsonRpcBody {
	return {
		jsonrpc: '2.0',
		method: 'call',
		params: {
			service: 'object',
			method: 'execute',
			args: [db, userID, password, model, method, ...args],
		},
		id: randomInt(100),
	};
}

// ─── JSON-2 API Adapter (Odoo 18+) ─────────────────────────────────────────

export async function odooJson2Request(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
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

const protocolCache = new Map<string, ResolvedProtocol>();

export async function detectProtocol(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	url: string,
	credentials: IOdooCredentials,
): Promise<ResolvedProtocol> {
	const cacheKey = normalizeUrl(url);
	const cached = protocolCache.get(cacheKey);
	if (cached) return cached;

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
		protocolCache.set(cacheKey, 'json2');
		return 'json2';
	} catch {
		protocolCache.set(cacheKey, 'jsonrpc');
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
): Promise<IDataObject[]> {
	const protocol = await resolveProtocol.call(this, credentials);
	const url = normalizeUrl(credentials.url);

	if (protocol === 'json2') {
		const qs: IDataObject = {};
		if (fieldsList && fieldsList.length > 0) {
			qs.fields = fieldsList.join(',');
		}
		if (limit > 0) qs.limit = limit;
		if (offset > 0) qs.offset = offset;
		if (filters?.filter?.length) {
			// JSON-2 uses domain parameter as JSON string
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
	const domain = filters?.filter?.length ? processFilters(filters) : [];
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
```

**Step 2: Verify compilation**

Run: `cd n8n-nodes-odoo-generic && pnpm lint`
Expected: Success

**Step 3: Commit**

```bash
git add n8n-nodes-odoo-generic/nodes/OdooGeneric/GenericFunctions.ts
git commit -m "feat(odoo-generic): add dual-protocol API client (JSON-2 + JSON-RPC)"
```

---

## Task 5: Resource Descriptions

**Files:**
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/descriptions/ContactDescription.ts`
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/descriptions/LeadDescription.ts`
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/descriptions/SaleOrderDescription.ts`
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/descriptions/CustomModelDescription.ts`
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/descriptions/ExecuteMethodDescription.ts`
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/descriptions/SharedFields.ts`
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/descriptions/index.ts`

**Step 1: Create SharedFields.ts** (reusable filter + options definitions)

```typescript
import type { INodeProperties } from 'n8n-workflow';

export function makeFilterFields(resource: string): INodeProperties {
	const dependsOn = resource === 'custom' ? ['customModel'] : [];
	return {
		displayName: 'Filters',
		name: 'filterRequest',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Filter',
		},
		default: {},
		description: 'Filter results by applying conditions',
		placeholder: 'Add condition',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: [resource],
			},
		},
		options: [
			{
				name: 'filter',
				displayName: 'Filter',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getModelFields',
							...(dependsOn.length ? { loadOptionsDependsOn: dependsOn } : {}),
						},
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						default: 'equal',
						options: [
							{ name: '=', value: 'equal' },
							{ name: '!=', value: 'notEqual' },
							{ name: '<', value: 'lessThan' },
							{ name: '<=', value: 'lessOrEqual' },
							{ name: '>', value: 'greaterThan' },
							{ name: '>=', value: 'greaterOrEqual' },
							{ name: 'Child Of', value: 'childOf' },
							{ name: 'Contains', value: 'ilike' },
							{ name: 'In', value: 'in' },
							{ name: 'Like', value: 'like' },
							{ name: 'Not In', value: 'notIn' },
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to compare against',
					},
				],
			},
		],
	};
}

export function makeFieldsOptions(resource: string): INodeProperties {
	const dependsOn = resource === 'custom' ? ['customModel'] : [];
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: ['getAll', 'get'],
				resource: [resource],
			},
		},
		options: [
			{
				displayName: 'Fields to Include',
				name: 'fieldsList',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getModelFields',
					...(dependsOn.length ? { loadOptionsDependsOn: dependsOn } : {}),
				},
			},
		],
	};
}

export function makeReturnAllField(resource: string): INodeProperties {
	return {
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	};
}

export function makeLimitField(resource: string): INodeProperties {
	return {
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	};
}
```

**Step 2: Create ContactDescription.ts**

```typescript
import type { INodeProperties } from 'n8n-workflow';
import { makeFilterFields, makeFieldsOptions, makeReturnAllField, makeLimitField } from './SharedFields';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{ name: 'Create', value: 'create', description: 'Create a new contact', action: 'Create a contact' },
			{ name: 'Delete', value: 'delete', description: 'Delete a contact', action: 'Delete a contact' },
			{ name: 'Get', value: 'get', description: 'Get a contact', action: 'Get a contact' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many contacts', action: 'Get many contacts' },
			{ name: 'Update', value: 'update', description: 'Update a contact', action: 'Update a contact' },
		],
	},
];

export const contactDescription: INodeProperties[] = [
	// ── create ──
	{
		displayName: 'Name',
		name: 'contactName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['create'], resource: ['contact'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['create'], resource: ['contact'] } },
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Address',
				typeOptions: { multipleValues: false },
				options: [
					{
						name: 'value',
						displayName: 'Address',
						values: [
							{ displayName: 'City', name: 'city', type: 'string', default: '' },
							{
								displayName: 'Country Name or ID', name: 'country_id', type: 'options', default: '',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: { loadOptionsMethod: 'getCountries' },
							},
							{
								displayName: 'State Name or ID', name: 'state_id', type: 'options', default: '',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: { loadOptionsMethod: 'getStates' },
							},
							{ displayName: 'Street', name: 'street', type: 'string', default: '' },
							{ displayName: 'Street 2', name: 'street2', type: 'string', default: '' },
							{ displayName: 'Zip Code', name: 'zip', type: 'string', default: '' },
						],
					},
				],
			},
			{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'Internal Notes', name: 'comment', type: 'string', default: '' },
			{ displayName: 'Job Position', name: 'function', type: 'string', default: '' },
			{ displayName: 'Mobile', name: 'mobile', type: 'string', default: '' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Tax ID', name: 'vat', type: 'string', default: '' },
			{ displayName: 'Website', name: 'website', type: 'string', default: '' },
		],
	},

	// ── get / delete ──
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['get', 'delete'], resource: ['contact'] } },
	},

	// ── getAll ──
	makeReturnAllField('contact'),
	makeLimitField('contact'),
	makeFilterFields('contact'),
	makeFieldsOptions('contact'),

	// ── update ──
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['update'], resource: ['contact'] } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['update'], resource: ['contact'] } },
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Address',
				typeOptions: { multipleValues: false },
				options: [
					{
						name: 'value',
						displayName: 'Address',
						values: [
							{ displayName: 'City', name: 'city', type: 'string', default: '' },
							{
								displayName: 'Country Name or ID', name: 'country_id', type: 'options', default: '',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: { loadOptionsMethod: 'getCountries' },
							},
							{
								displayName: 'State Name or ID', name: 'state_id', type: 'options', default: '',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: { loadOptionsMethod: 'getStates' },
							},
							{ displayName: 'Street', name: 'street', type: 'string', default: '' },
							{ displayName: 'Street 2', name: 'street2', type: 'string', default: '' },
							{ displayName: 'Zip Code', name: 'zip', type: 'string', default: '' },
						],
					},
				],
			},
			{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'Internal Notes', name: 'comment', type: 'string', default: '' },
			{ displayName: 'Job Position', name: 'function', type: 'string', default: '' },
			{ displayName: 'Mobile', name: 'mobile', type: 'string', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Tax ID', name: 'vat', type: 'string', default: '' },
			{ displayName: 'Website', name: 'website', type: 'string', default: '' },
		],
	},
];
```

**Step 3: Create LeadDescription.ts**

```typescript
import type { INodeProperties } from 'n8n-workflow';
import { makeFilterFields, makeFieldsOptions, makeReturnAllField, makeLimitField } from './SharedFields';

export const leadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: { show: { resource: ['lead'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a new lead/opportunity', action: 'Create a lead' },
			{ name: 'Delete', value: 'delete', description: 'Delete a lead/opportunity', action: 'Delete a lead' },
			{ name: 'Get', value: 'get', description: 'Get a lead/opportunity', action: 'Get a lead' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many leads/opportunities', action: 'Get many leads' },
			{ name: 'Update', value: 'update', description: 'Update a lead/opportunity', action: 'Update a lead' },
		],
	},
];

export const leadDescription: INodeProperties[] = [
	// ── create ──
	{
		displayName: 'Name',
		name: 'leadName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['create'], resource: ['lead'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['create'], resource: ['lead'] } },
		options: [
			{ displayName: 'Email', name: 'email_from', type: 'string', default: '' },
			{ displayName: 'Expected Revenue', name: 'expected_revenue', type: 'number', default: 0 },
			{ displayName: 'Internal Notes', name: 'description', type: 'string', default: '' },
			{
				displayName: 'Partner Name or ID', name: 'partner_id', type: 'options', default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getPartners' },
			},
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{
				displayName: 'Priority', name: 'priority', type: 'options', default: '1',
				options: [
					{ name: 'Low', value: '0' },
					{ name: 'Medium', value: '1' },
					{ name: 'High', value: '2' },
					{ name: 'Very High', value: '3' },
				],
			},
			{
				displayName: 'Probability', name: 'probability', type: 'number', default: 0,
				typeOptions: { maxValue: 100, minValue: 0 },
			},
			{
				displayName: 'Stage Name or ID', name: 'stage_id', type: 'options', default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getStages' },
			},
		],
	},

	// ── get / delete ──
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['get', 'delete'], resource: ['lead'] } },
	},

	// ── getAll ──
	makeReturnAllField('lead'),
	makeLimitField('lead'),
	makeFilterFields('lead'),
	makeFieldsOptions('lead'),

	// ── update ──
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['update'], resource: ['lead'] } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['update'], resource: ['lead'] } },
		options: [
			{ displayName: 'Email', name: 'email_from', type: 'string', default: '' },
			{ displayName: 'Expected Revenue', name: 'expected_revenue', type: 'number', default: 0 },
			{ displayName: 'Internal Notes', name: 'description', type: 'string', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{
				displayName: 'Priority', name: 'priority', type: 'options', default: '1',
				options: [
					{ name: 'Low', value: '0' },
					{ name: 'Medium', value: '1' },
					{ name: 'High', value: '2' },
					{ name: 'Very High', value: '3' },
				],
			},
			{
				displayName: 'Probability', name: 'probability', type: 'number', default: 0,
				typeOptions: { maxValue: 100, minValue: 0 },
			},
		],
	},
];
```

**Step 4: Create SaleOrderDescription.ts**

```typescript
import type { INodeProperties } from 'n8n-workflow';
import { makeFilterFields, makeFieldsOptions, makeReturnAllField, makeLimitField } from './SharedFields';

export const saleOrderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: { show: { resource: ['saleOrder'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a new sale order', action: 'Create a sale order' },
			{ name: 'Delete', value: 'delete', description: 'Delete a sale order', action: 'Delete a sale order' },
			{ name: 'Get', value: 'get', description: 'Get a sale order', action: 'Get a sale order' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many sale orders', action: 'Get many sale orders' },
			{ name: 'Update', value: 'update', description: 'Update a sale order', action: 'Update a sale order' },
		],
	},
];

export const saleOrderDescription: INodeProperties[] = [
	// ── create ──
	{
		displayName: 'Partner Name or ID',
		name: 'partnerId',
		type: 'options',
		default: '',
		required: true,
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getPartners' },
		displayOptions: { show: { operation: ['create'], resource: ['saleOrder'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['create'], resource: ['saleOrder'] } },
		options: [
			{ displayName: 'Date Order', name: 'date_order', type: 'dateTime', default: '' },
			{ displayName: 'Note', name: 'note', type: 'string', default: '' },
			{ displayName: 'Client Reference', name: 'client_order_ref', type: 'string', default: '' },
		],
	},

	// ── get / delete ──
	{
		displayName: 'Sale Order ID',
		name: 'saleOrderId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['get', 'delete'], resource: ['saleOrder'] } },
	},

	// ── getAll ──
	makeReturnAllField('saleOrder'),
	makeLimitField('saleOrder'),
	makeFilterFields('saleOrder'),
	makeFieldsOptions('saleOrder'),

	// ── update ──
	{
		displayName: 'Sale Order ID',
		name: 'saleOrderId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['update'], resource: ['saleOrder'] } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['update'], resource: ['saleOrder'] } },
		options: [
			{ displayName: 'Date Order', name: 'date_order', type: 'dateTime', default: '' },
			{ displayName: 'Note', name: 'note', type: 'string', default: '' },
			{ displayName: 'Client Reference', name: 'client_order_ref', type: 'string', default: '' },
		],
	},
];
```

**Step 5: Create CustomModelDescription.ts**

```typescript
import type { INodeProperties } from 'n8n-workflow';
import { makeFilterFields, makeFieldsOptions, makeReturnAllField, makeLimitField } from './SharedFields';

export const customModelOperations: INodeProperties[] = [
	{
		displayName: 'Model Name or ID',
		name: 'customModel',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		typeOptions: { loadOptionsMethod: 'getModels' },
		displayOptions: { show: { resource: ['custom'] } },
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: { show: { resource: ['custom'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a new record', action: 'Create a record' },
			{ name: 'Delete', value: 'delete', description: 'Delete a record', action: 'Delete a record' },
			{ name: 'Execute Method', value: 'executeMethod', description: 'Call an arbitrary method on the model', action: 'Execute a method' },
			{ name: 'Get', value: 'get', description: 'Get a record', action: 'Get a record' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many records', action: 'Get many records' },
			{ name: 'Update', value: 'update', description: 'Update a record', action: 'Update a record' },
		],
	},
];

export const customModelDescription: INodeProperties[] = [
	// ── create ──
	{
		displayName: 'Fields',
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['create'], resource: ['custom'] } },
		options: [
			{
				displayName: 'Field Record',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name or ID', name: 'fieldName', type: 'options', default: '',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: { loadOptionsMethod: 'getModelFields', loadOptionsDependsOn: ['customModel'] },
					},
					{ displayName: 'Value', name: 'fieldValue', type: 'string', default: '' },
				],
			},
		],
	},

	// ── get / delete ──
	{
		displayName: 'Record ID',
		name: 'customResourceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['get', 'delete'], resource: ['custom'] } },
	},

	// ── getAll ──
	makeReturnAllField('custom'),
	makeLimitField('custom'),
	makeFilterFields('custom'),
	makeFieldsOptions('custom'),

	// ── update ──
	{
		displayName: 'Record ID',
		name: 'customResourceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { operation: ['update'], resource: ['custom'] } },
	},
	{
		displayName: 'Update Fields',
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['update'], resource: ['custom'] } },
		options: [
			{
				displayName: 'Field Record',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name or ID', name: 'fieldName', type: 'options', default: '',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: { loadOptionsMethod: 'getModelFields', loadOptionsDependsOn: ['customModel'] },
					},
					{ displayName: 'Value', name: 'fieldValue', type: 'string', default: '' },
				],
			},
		],
	},
];
```

**Step 6: Create ExecuteMethodDescription.ts**

```typescript
import type { INodeProperties } from 'n8n-workflow';

export const executeMethodDescription: INodeProperties[] = [
	{
		displayName: 'Method Name',
		name: 'methodName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. action_confirm',
		description: 'The name of the method to call on the model',
		displayOptions: {
			show: {
				operation: ['executeMethod'],
				resource: ['custom'],
			},
		},
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		default: '',
		description: 'The ID of the record to call the method on. Leave empty for class-level methods.',
		displayOptions: {
			show: {
				operation: ['executeMethod'],
				resource: ['custom'],
			},
		},
	},
	{
		displayName: 'Arguments (JSON)',
		name: 'methodArgs',
		type: 'json',
		default: '[]',
		description: 'Additional arguments to pass to the method as a JSON array',
		displayOptions: {
			show: {
				operation: ['executeMethod'],
				resource: ['custom'],
			},
		},
	},
];
```

**Step 7: Create index.ts barrel export**

```typescript
export { contactOperations, contactDescription } from './ContactDescription';
export { leadOperations, leadDescription } from './LeadDescription';
export { saleOrderOperations, saleOrderDescription } from './SaleOrderDescription';
export { customModelOperations, customModelDescription } from './CustomModelDescription';
export { executeMethodDescription } from './ExecuteMethodDescription';
```

**Step 8: Verify compilation**

Run: `cd n8n-nodes-odoo-generic && pnpm lint`
Expected: Success

**Step 9: Commit**

```bash
git add n8n-nodes-odoo-generic/nodes/OdooGeneric/descriptions/
git commit -m "feat(odoo-generic): add resource description files for all resources"
```

---

## Task 6: Main Node File

**Files:**
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/OdooGeneric.node.ts`
- Create: `n8n-nodes-odoo-generic/nodes/OdooGeneric/OdooGeneric.node.json`

**Step 1: Write OdooGeneric.node.ts**

```typescript
import { capitalCase } from 'change-case';
import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	contactDescription,
	contactOperations,
	leadDescription,
	leadOperations,
	saleOrderDescription,
	saleOrderOperations,
	customModelDescription,
	customModelOperations,
	executeMethodDescription,
} from './descriptions';

import type { IOdooCredentials, IOdooFilterOperations } from './types';
import { RESOURCE_MODEL_MAP } from './types';

import {
	odooCreate,
	odooDelete,
	odooGet,
	odooGetAll,
	odooGetModelFields,
	odooGetModels,
	odooSearchRead,
	odooUpdate,
	odooExecuteMethod,
	processNameValueFields,
	testOdooCredentials,
} from './GenericFunctions';

export class OdooGeneric implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Odoo Generic',
		name: 'odooGeneric',
		icon: 'file:odoo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with any Odoo model via JSON-2 API (18+) or JSON-RPC (14-17)',
		defaults: {
			name: 'Odoo Generic',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'odooGenericApi',
				required: true,
				testedBy: 'odooGenericApiTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'contact',
				noDataExpression: true,
				options: [
					{ name: 'Contact', value: 'contact' },
					{ name: 'Custom Model', value: 'custom' },
					{ name: 'Lead/Opportunity', value: 'lead' },
					{ name: 'Sale Order', value: 'saleOrder' },
				],
			},

			...customModelOperations,
			...customModelDescription,
			...executeMethodDescription,
			...contactOperations,
			...contactDescription,
			...leadOperations,
			...leadDescription,
			...saleOrderOperations,
			...saleOrderDescription,
		],
	};

	methods = {
		loadOptions: {
			async getModelFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let resource = this.getCurrentNodeParameter('resource') as string;
				if (resource === 'custom') {
					resource = this.getCurrentNodeParameter('customModel') as string;
					if (!resource) return [];
				} else {
					resource = RESOURCE_MODEL_MAP[resource] || resource;
				}

				const credentials = (await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;
				const response = await odooGetModelFields.call(this, credentials, resource);
				const options = Object.entries(response).map(([key, field]) => {
					const f = field as { [key: string]: string };
					let displayName: string;
					try {
						displayName = capitalCase(f.name || key);
					} catch {
						displayName = f.string || key;
					}
					return {
						name: displayName,
						value: key,
						description: `name: ${key}, type: ${f?.type || 'unknown'}`,
					};
				});
				return options.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;
				const models = await odooGetModels.call(this, credentials);
				return models
					.map((model) => ({
						name: model.name as string,
						value: model.model as string,
						description: `model: ${model.model}`,
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getPartners(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;
				const partners = await odooSearchRead.call(this, credentials, 'res.partner', ['id', 'name']);
				return partners
					.map((p) => ({ name: p.name as string, value: p.id as number }))
					.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;
				const stages = await odooSearchRead.call(this, credentials, 'crm.stage', ['id', 'name']);
				return stages
					.map((s) => ({ name: s.name as string, value: s.id as number }))
					.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getCountries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;
				const countries = await odooSearchRead.call(this, credentials, 'res.country', ['id', 'name']);
				return countries
					.map((c) => ({ name: c.name as string, value: c.id as number }))
					.sort((a, b) => a.name.localeCompare(b.name));
			},

			async getStates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = (await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;
				const states = await odooSearchRead.call(this, credentials, 'res.country.state', ['id', 'name']);
				return states
					.map((s) => ({ name: s.name as string, value: s.id as number }))
					.sort((a, b) => a.name.localeCompare(b.name));
			},
		},

		credentialTest: {
			async odooGenericApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as unknown as IOdooCredentials;
				try {
					const result = await testOdooCredentials(this.helpers, credentials);
					return {
						status: result.status === 'OK' ? 'OK' : 'Error',
						message: result.message,
					};
				} catch (error) {
					return {
						status: 'Error',
						message: `Connection failed: ${error}`,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = (await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] | undefined;

				// Resolve model name
				const model =
					resource === 'custom'
						? (this.getNodeParameter('customModel', i) as string)
						: RESOURCE_MODEL_MAP[resource] || resource;

				if (operation === 'create') {
					let fields: IDataObject;
					if (resource === 'contact') {
						const name = this.getNodeParameter('contactName', i) as string;
						let additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if (additionalFields.address) {
							const addressFields = (additionalFields.address as IDataObject).value as IDataObject;
							if (addressFields) {
								additionalFields = { ...additionalFields, ...addressFields };
							}
							delete additionalFields.address;
						}
						fields = { name, ...additionalFields };
					} else if (resource === 'lead') {
						const name = this.getNodeParameter('leadName', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						fields = { name, ...additionalFields };
					} else if (resource === 'saleOrder') {
						const partnerId = this.getNodeParameter('partnerId', i);
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						fields = { partner_id: partnerId, ...additionalFields };
					} else {
						// custom
						const rawFields = this.getNodeParameter('fieldsToCreateOrUpdate', i) as IDataObject;
						fields = processNameValueFields(rawFields);
					}
					responseData = await odooCreate.call(this, credentials, model, fields);
				}

				if (operation === 'get') {
					const recordId = this.getRecordId(resource, i);
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const fieldsList = (options.fieldsList as string[]) || [];
					responseData = await odooGet.call(this, credentials, model, recordId, fieldsList);
				}

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const fieldsList = (options.fieldsList as string[]) || [];
					const filters = this.getNodeParameter('filterRequest', i, {}) as IOdooFilterOperations;
					responseData = await odooGetAll.call(
						this, credentials, model, filters, fieldsList, limit,
					);
				}

				if (operation === 'update') {
					const recordId = this.getRecordId(resource, i);
					let fields: IDataObject;
					if (resource === 'contact') {
						let updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						if (updateFields.address) {
							const addressFields = (updateFields.address as IDataObject).value as IDataObject;
							if (addressFields) {
								updateFields = { ...updateFields, ...addressFields };
							}
							delete updateFields.address;
						}
						fields = updateFields;
					} else if (resource === 'lead') {
						fields = this.getNodeParameter('updateFields', i) as IDataObject;
					} else if (resource === 'saleOrder') {
						fields = this.getNodeParameter('updateFields', i) as IDataObject;
					} else {
						const rawFields = this.getNodeParameter('fieldsToCreateOrUpdate', i) as IDataObject;
						fields = processNameValueFields(rawFields);
					}
					responseData = await odooUpdate.call(this, credentials, model, recordId, fields);
				}

				if (operation === 'delete') {
					const recordId = this.getRecordId(resource, i);
					responseData = await odooDelete.call(this, credentials, model, recordId);
				}

				if (operation === 'executeMethod') {
					const methodName = this.getNodeParameter('methodName', i) as string;
					const recordId = this.getNodeParameter('recordId', i, '') as string;
					const methodArgsRaw = this.getNodeParameter('methodArgs', i, '[]') as string;
					let methodArgs: unknown[];
					try {
						methodArgs = JSON.parse(methodArgsRaw);
					} catch {
						methodArgs = [];
					}
					responseData = await odooExecuteMethod.call(
						this, credentials, model, methodName,
						recordId || undefined, methodArgs,
					);
				}

				if (responseData !== undefined) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

	private getRecordId(this: IExecuteFunctions, resource: string, index: number): string {
		const paramMap: Record<string, string> = {
			contact: 'contactId',
			lead: 'leadId',
			saleOrder: 'saleOrderId',
			custom: 'customResourceId',
		};
		return this.getNodeParameter(paramMap[resource] || `${resource}Id`, index) as string;
	}
}
```

**NOTE:** The `getRecordId` is a private method on the class. However, since `execute()` uses `this: IExecuteFunctions`, we cannot call `this.getRecordId()` directly. We need to refactor it as a standalone helper function instead:

Replace the private method approach by extracting `getRecordId` as a module-level function:

```typescript
function getRecordIdParam(resource: string): string {
	const paramMap: Record<string, string> = {
		contact: 'contactId',
		lead: 'leadId',
		saleOrder: 'saleOrderId',
		custom: 'customResourceId',
	};
	return paramMap[resource] || `${resource}Id`;
}
```

Then in the execute method, replace `this.getRecordId(resource, i)` with:
```typescript
const recordId = this.getNodeParameter(getRecordIdParam(resource), i) as string;
```

**Step 2: Write OdooGeneric.node.json**

```json
{
  "node": "n8n-nodes-odoo-generic.odooGeneric",
  "nodeVersion": "1.0",
  "codexVersion": "1.0",
  "categories": ["Data & Storage"],
  "resources": {
    "primaryDocumentation": [
      {
        "url": "https://www.odoo.com/documentation/18.0/developer/reference/external_api.html"
      }
    ]
  },
  "alias": ["ERP", "Odoo", "CRM", "Sales", "Contacts", "Leads"]
}
```

**Step 3: Add `change-case` dependency**

Add to `package.json` devDependencies:
```json
"change-case": "^4.1.2"
```

Run: `cd n8n-nodes-odoo-generic && pnpm install`

**Step 4: Verify compilation**

Run: `cd n8n-nodes-odoo-generic && pnpm lint`
Expected: Success

**Step 5: Commit**

```bash
git add n8n-nodes-odoo-generic/nodes/OdooGeneric/OdooGeneric.node.ts
git add n8n-nodes-odoo-generic/nodes/OdooGeneric/OdooGeneric.node.json
git add n8n-nodes-odoo-generic/package.json
git commit -m "feat(odoo-generic): add main OdooGeneric node with resource/operation routing"
```

---

## Task 7: Unit Tests — GenericFunctions

**Files:**
- Create: `n8n-nodes-odoo-generic/test/GenericFunctions.test.ts`
- Create: `n8n-nodes-odoo-generic/jest.config.ts`

**Step 1: Create jest.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/test'],
	moduleFileExtensions: ['ts', 'js', 'json'],
};

export default config;
```

**Step 2: Write failing tests**

```typescript
import {
	odooGetDBName,
	getOdooPassword,
	processFilters,
	processNameValueFields,
	resolveModel,
} from '../nodes/OdooGeneric/GenericFunctions';
import type { IOdooCredentials, IOdooFilterOperations } from '../nodes/OdooGeneric/types';

describe('GenericFunctions', () => {
	describe('odooGetDBName', () => {
		it('should return provided database name when set', () => {
			expect(odooGetDBName('mydb', 'https://example.odoo.com')).toBe('mydb');
		});

		it('should derive database from URL hostname when not set', () => {
			expect(odooGetDBName(undefined, 'https://mycompany.odoo.com')).toBe('mycompany');
		});

		it('should derive database from URL without subdomain', () => {
			expect(odooGetDBName('', 'https://localhost:8069')).toBe('localhost');
		});
	});

	describe('getOdooPassword', () => {
		it('should return API key when auth method is apiKey', () => {
			const creds = { authMethod: 'apiKey', apiKey: 'my-key', password: 'my-pass' } as IOdooCredentials;
			expect(getOdooPassword(creds)).toBe('my-key');
		});

		it('should return password when auth method is password', () => {
			const creds = { authMethod: 'password', apiKey: 'my-key', password: 'my-pass' } as IOdooCredentials;
			expect(getOdooPassword(creds)).toBe('my-pass');
		});
	});

	describe('resolveModel', () => {
		it('should map contact to res.partner', () => {
			expect(resolveModel('contact')).toBe('res.partner');
		});

		it('should map lead to crm.lead', () => {
			expect(resolveModel('lead')).toBe('crm.lead');
		});

		it('should map saleOrder to sale.order', () => {
			expect(resolveModel('saleOrder')).toBe('sale.order');
		});

		it('should return customModel for custom resource', () => {
			expect(resolveModel('custom', 'stock.picking')).toBe('stock.picking');
		});
	});

	describe('processFilters', () => {
		it('should convert filter operations to domain tuples', () => {
			const filters: IOdooFilterOperations = {
				filter: [
					{ fieldName: 'name', operator: 'equal', value: 'test' },
					{ fieldName: 'amount', operator: 'greaterThan', value: '100' },
				],
			};
			expect(processFilters(filters)).toEqual([
				['name', '=', 'test'],
				['amount', '>', '100'],
			]);
		});

		it('should handle empty filters', () => {
			const filters: IOdooFilterOperations = { filter: [] };
			expect(processFilters(filters)).toEqual([]);
		});

		it('should support ilike operator', () => {
			const filters: IOdooFilterOperations = {
				filter: [{ fieldName: 'name', operator: 'ilike', value: 'test' }],
			};
			expect(processFilters(filters)).toEqual([['name', 'ilike', 'test']]);
		});
	});

	describe('processNameValueFields', () => {
		it('should convert fixedCollection format to flat object', () => {
			const input = {
				fields: [
					{ fieldName: 'name', fieldValue: 'Test' },
					{ fieldName: 'email', fieldValue: 'test@example.com' },
				],
			};
			expect(processNameValueFields(input)).toEqual({
				name: 'Test',
				email: 'test@example.com',
			});
		});

		it('should return empty object for empty fields', () => {
			expect(processNameValueFields({ fields: [] })).toEqual({});
		});
	});
});
```

**Step 3: Run tests**

Run: `cd n8n-nodes-odoo-generic && pnpm test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add n8n-nodes-odoo-generic/jest.config.ts n8n-nodes-odoo-generic/test/
git commit -m "test(odoo-generic): add unit tests for GenericFunctions helpers"
```

---

## Task 8: Build & Verify

**Step 1: Build the package**

Run: `cd n8n-nodes-odoo-generic && pnpm build > build.log 2>&1 && tail -20 build.log`
Expected: Clean compilation, dist/ directory created

**Step 2: Verify dist structure**

Run: `ls -la n8n-nodes-odoo-generic/dist/credentials/ n8n-nodes-odoo-generic/dist/nodes/OdooGeneric/`
Expected: `.js` and `.d.ts` files for all source files

**Step 3: Verify package.json n8n paths resolve**

Run: `ls n8n-nodes-odoo-generic/dist/credentials/OdooGenericApi.credentials.js n8n-nodes-odoo-generic/dist/nodes/OdooGeneric/OdooGeneric.node.js`
Expected: Both files exist

**Step 4: Commit**

```bash
git add n8n-nodes-odoo-generic/
git commit -m "chore(odoo-generic): verify build and complete v0.1.0 package"
```

---

## Verification Checklist

After all tasks are complete, verify end-to-end:

1. `cd n8n-nodes-odoo-generic && pnpm lint` — no TypeScript errors
2. `cd n8n-nodes-odoo-generic && pnpm test` — all tests pass
3. `cd n8n-nodes-odoo-generic && pnpm build` — clean build
4. `ls dist/nodes/OdooGeneric/OdooGeneric.node.js` — exists
5. `ls dist/credentials/OdooGenericApi.credentials.js` — exists
6. Manual test: set `N8N_CUSTOM_EXTENSIONS=/path/to/n8n-nodes-odoo-generic` and start n8n, verify "Odoo Generic" appears in node picker
7. Manual test against live Odoo 18: credential test, Contact CRUD, Custom Model + Execute Method
