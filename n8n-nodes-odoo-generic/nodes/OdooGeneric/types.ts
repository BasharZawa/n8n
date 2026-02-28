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
