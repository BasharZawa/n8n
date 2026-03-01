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
		displayName: 'Fields',
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['create'], resource: ['saleOrder'] } },
		options: [
			{
				displayName: 'Field Record',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name or ID', name: 'fieldName', type: 'options', default: '',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: { loadOptionsMethod: 'getModelFields', loadOptionsDependsOn: ['resource'] },
					},
					{ displayName: 'Value', name: 'fieldValue', type: 'string', default: '' },
				],
			},
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
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['update'], resource: ['saleOrder'] } },
		options: [
			{
				displayName: 'Field Record',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name or ID', name: 'fieldName', type: 'options', default: '',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: { loadOptionsMethod: 'getModelFields', loadOptionsDependsOn: ['resource'] },
					},
					{ displayName: 'Value', name: 'fieldValue', type: 'string', default: '' },
				],
			},
		],
	},
];
