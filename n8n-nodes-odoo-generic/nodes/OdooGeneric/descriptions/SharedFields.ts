import type { INodeProperties } from 'n8n-workflow';

export function makeFilterFields(resource: string): INodeProperties {
	const dependsOn = resource === 'custom' ? ['customModel'] : [];
	return {
		displayName: 'Filters',
		name: 'filterRequest',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Filter',
		},
		default: {},
		description: 'Filter results by applying conditions',
		placeholder: 'Add condition',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: [resource],
			},
		},
		options: [
			{
				name: 'filter',
				displayName: 'Filter',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getModelFields',
							...(dependsOn.length ? { loadOptionsDependsOn: dependsOn } : {}),
						},
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						default: 'equal',
						options: [
							{ name: '=', value: 'equal' },
							{ name: '!=', value: 'notEqual' },
							{ name: '<', value: 'lessThan' },
							{ name: '<=', value: 'lessOrEqual' },
							{ name: '>', value: 'greaterThan' },
							{ name: '>=', value: 'greaterOrEqual' },
							{ name: 'Child Of', value: 'childOf' },
							{ name: 'Contains', value: 'ilike' },
							{ name: 'In', value: 'in' },
							{ name: 'Like', value: 'like' },
							{ name: 'Not In', value: 'notIn' },
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to compare against',
					},
				],
			},
		],
	};
}

export function makeFieldsOptions(resource: string): INodeProperties {
	const dependsOn = resource === 'custom' ? ['customModel'] : [];
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: ['getAll', 'get'],
				resource: [resource],
			},
		},
		options: [
			{
				displayName: 'Fields to Include',
				name: 'fieldsList',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getModelFields',
					...(dependsOn.length ? { loadOptionsDependsOn: dependsOn } : {}),
				},
			},
		],
	};
}

export function makeReturnAllField(resource: string): INodeProperties {
	return {
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	};
}

export function makeLimitField(resource: string): INodeProperties {
	return {
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	};
}

