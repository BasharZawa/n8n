import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OdooGenericApi implements ICredentialType {
	name = 'odooGenericApi';

	displayName = 'Odoo Generic API';

	documentationUrl = 'https://www.odoo.com/documentation/18.0/developer/reference/external_api.html';

	properties: INodeProperties[] = [
		{
			displayName: 'Site URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://my-organization.odoo.com',
			required: true,
		},
		{
			displayName: 'Authentication Method',
			name: 'authMethod',
			type: 'options',
			options: [
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'Password',
					value: 'password',
				},
			],
			default: 'apiKey',
		},
		{
			displayName: 'Database Name',
			name: 'database',
			type: 'string',
			default: '',
			description: 'If empty, derived from the URL hostname (e.g. "mycompany" from mycompany.odoo.com)',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			placeholder: 'user@email.com',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: {
				show: {
					authMethod: ['password'],
				},
			},
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Generate from Odoo: Settings → Users → API Keys',
			displayOptions: {
				show: {
					authMethod: ['apiKey'],
				},
			},
		},
		{
			displayName: 'API Protocol',
			name: 'protocol',
			type: 'options',
			options: [
				{
					name: 'Auto-Detect (Recommended)',
					value: 'auto',
				},
				{
					name: 'JSON-2 API (Odoo 18+)',
					value: 'json2',
				},
				{
					name: 'JSON-RPC (Legacy)',
					value: 'jsonrpc',
				},
			],
			default: 'auto',
			description: 'Auto tries JSON-2 first, falls back to JSON-RPC for older Odoo versions',
		},
	];
}
