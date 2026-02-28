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
		displayName: 'Fields (JSON)',
		name: 'fieldsJson',
		type: 'json',
		default: '{\n  "name": ""\n}',
		required: true,
		description: 'JSON object with Odoo field names and values. Common fields: name, partner_id, contact_name, email_from, phone, expected_revenue, probability, date_deadline, user_id, team_id, stage_id, priority, description.',
		displayOptions: { show: { operation: ['create'], resource: ['lead'] } },
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
		displayName: 'Fields (JSON)',
		name: 'fieldsJson',
		type: 'json',
		default: '{}',
		required: true,
		description: 'JSON object with Odoo field names and values to update.',
		displayOptions: { show: { operation: ['update'], resource: ['lead'] } },
	},
];
