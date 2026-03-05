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
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';

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
	odooUpdate,
	odooExecuteMethod,
	processNameValueFields,
	testOdooCredentials,
} from './GenericFunctions';

function getRecordIdParam(resource: string): string {
	const paramMap: Record<string, string> = {
		contact: 'contactId',
		lead: 'leadId',
		saleOrder: 'saleOrderId',
		custom: 'customResourceId',
	};
	return paramMap[resource] || `${resource}Id`;
}

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

				const credentials =
					(await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;
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
				const credentials =
					(await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;
				const models = await odooGetModels.call(this, credentials);
				return models
					.map((model) => ({
						name: model.name as string,
						value: model.model as string,
						description: `model: ${model.model}`,
					}))
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
		const credentials =
			(await this.getCredentials('odooGenericApi')) as unknown as IOdooCredentials;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] | undefined;

				const model =
					resource === 'custom'
						? (this.getNodeParameter('customModel', i) as string)
						: RESOURCE_MODEL_MAP[resource] || resource;

				if (!model || !model.trim()) {
					throw new NodeApiError(this.getNode(), {
						message: 'Model name is empty',
						description: 'Please specify a valid Odoo model name (e.g. "res.partner", "sale.order")',
					} as JsonObject);
				}

				if (operation === 'create') {
					const rawFields = this.getNodeParameter('fieldsToCreateOrUpdate', i) as IDataObject;
					const fields = processNameValueFields(rawFields);
					responseData = await odooCreate.call(this, credentials, model, fields);
				}

				if (operation === 'get') {
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const fieldsList = (options.fieldsList as string[]) || [];

					if (resource === 'contact') {
						const getBy = this.getNodeParameter('getBy', i, 'id') as string;
						if (getBy === 'name') {
							const contactName = this.getNodeParameter('contactName', i) as string;
							const filters: IOdooFilterOperations = {
								filter: [{ fieldName: 'name', operator: 'ilike', value: contactName }],
							};
							responseData = await odooGetAll.call(this, credentials, model, filters, fieldsList, 0);
						} else {
							const recordId = this.getNodeParameter(getRecordIdParam(resource), i) as string;
							responseData = await odooGet.call(this, credentials, model, recordId, fieldsList);
						}
					} else {
						const recordId = this.getNodeParameter(getRecordIdParam(resource), i) as string;
						responseData = await odooGet.call(this, credentials, model, recordId, fieldsList);
					}
				}

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const fieldsList = (options.fieldsList as string[]) || [];
					const filters = this.getNodeParameter('filterRequest', i, {}) as IOdooFilterOperations;
					responseData = await odooGetAll.call(this, credentials, model, filters, fieldsList, limit);
				}

				if (operation === 'update') {
					const recordId = this.getNodeParameter(getRecordIdParam(resource), i) as string;
					const rawFields = this.getNodeParameter('fieldsToCreateOrUpdate', i) as IDataObject;
					const fields = processNameValueFields(rawFields);
					responseData = await odooUpdate.call(this, credentials, model, recordId, fields);
				}

				if (operation === 'delete') {
					const recordId = this.getNodeParameter(getRecordIdParam(resource), i) as string;
					responseData = await odooDelete.call(this, credentials, model, recordId);
				}

				if (operation === 'executeMethod') {
					const methodName = this.getNodeParameter('methodName', i) as string;
					const recordId = this.getNodeParameter('recordId', i, '') as string;
					const methodArgsRaw = this.getNodeParameter('methodArgs', i, '[]') as string;
					let methodArgs: unknown[];
					try {
						methodArgs = JSON.parse(methodArgsRaw) as unknown[];
					} catch (error) {
						throw new NodeApiError(this.getNode(), {
							message: 'Invalid JSON in "Method Arguments"',
							description: `${(error as SyntaxError).message}. Must be a JSON array, e.g. [1, "hello", {"key": "value"}]`,
						} as JsonObject);
					}
					responseData = await odooExecuteMethod.call(
						this, credentials, model, methodName, recordId || undefined, methodArgs,
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
}
