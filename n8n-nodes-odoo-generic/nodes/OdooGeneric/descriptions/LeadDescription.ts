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
