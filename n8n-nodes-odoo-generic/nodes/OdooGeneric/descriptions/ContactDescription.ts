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
		displayName: 'Fields (JSON)',
		name: 'fieldsJson',
		type: 'json',
		default: '{\n  "name": ""\n}',
		required: true,
		description: 'JSON object with Odoo field names and values. Common fields: name, email, phone, mobile, street, city, state_id, country_id, zip, function, website, vat, comment.',
		displayOptions: { show: { operation: ['create'], resource: ['contact'] } },
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
		displayName: 'Fields (JSON)',
		name: 'fieldsJson',
		type: 'json',
		default: '{}',
		required: true,
		description: 'JSON object with Odoo field names and values to update.',
		displayOptions: { show: { operation: ['update'], resource: ['contact'] } },
	},
];
