import type { INodeProperties } from 'n8n-workflow';
import { makeFilterFields, makeFieldsOptions, makeReturnAllField, makeLimitField } from './SharedFields';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: { show: { resource: ['contact'] } },
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
		displayName: 'Fields',
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['create'], resource: ['contact'] } },
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
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Field' },
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { operation: ['update'], resource: ['contact'] } },
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
