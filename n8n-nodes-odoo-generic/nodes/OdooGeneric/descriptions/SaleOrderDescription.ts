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
		displayName: 'Fields (JSON)',
		name: 'fieldsJson',
		type: 'json',
		default: '{\n  "partner_id": 0\n}',
		required: true,
		description: 'JSON object with Odoo field names and values. Map from previous nodes using expressions. Common fields: partner_id, date_order, user_id, team_id, pricelist_id, payment_term_id, client_order_ref, origin, note.',
		displayOptions: { show: { operation: ['create'], resource: ['saleOrder'] } },
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
		displayName: 'Fields (JSON)',
		name: 'fieldsJson',
		type: 'json',
		default: '{}',
		required: true,
		description: 'JSON object with Odoo field names and values to update.',
		displayOptions: { show: { operation: ['update'], resource: ['saleOrder'] } },
	},
];
