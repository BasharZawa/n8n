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
		displayName: 'Fields',
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['create'], resource: ['lead'] } },
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
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['update'], resource: ['lead'] } },
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
