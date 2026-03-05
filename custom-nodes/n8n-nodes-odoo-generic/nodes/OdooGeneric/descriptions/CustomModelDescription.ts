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
