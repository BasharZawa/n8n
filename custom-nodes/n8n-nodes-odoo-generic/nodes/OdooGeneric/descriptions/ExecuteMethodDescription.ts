import type { INodeProperties } from 'n8n-workflow';

export const executeMethodDescription: INodeProperties[] = [
	{
		displayName: 'Method Name',
		name: 'methodName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. action_confirm',
		description: 'The name of the method to call on the model',
		displayOptions: {
			show: {
				operation: ['executeMethod'],
				resource: ['custom'],
			},
		},
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		default: '',
		description: 'The ID of the record to call the method on. Leave empty for class-level methods.',
		displayOptions: {
			show: {
				operation: ['executeMethod'],
				resource: ['custom'],
			},
		},
	},
	{
		displayName: 'Arguments (JSON)',
		name: 'methodArgs',
		type: 'json',
		default: '[]',
		description: 'Additional arguments to pass to the method as a JSON array',
		displayOptions: {
			show: {
				operation: ['executeMethod'],
				resource: ['custom'],
			},
		},
	},
];
