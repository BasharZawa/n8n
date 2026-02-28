import {
	odooGetDBName,
	getOdooPassword,
	processFilters,
	processNameValueFields,
	resolveModel,
} from '../nodes/OdooGeneric/GenericFunctions';
import type { IOdooCredentials, IOdooFilterOperations } from '../nodes/OdooGeneric/types';

describe('GenericFunctions', () => {
	describe('odooGetDBName', () => {
		it('should return provided database name when set', () => {
			expect(odooGetDBName('mydb', 'https://example.odoo.com')).toBe('mydb');
		});

		it('should derive database from URL hostname when not set', () => {
			expect(odooGetDBName(undefined, 'https://mycompany.odoo.com')).toBe('mycompany');
		});

		it('should derive database from URL without subdomain', () => {
			expect(odooGetDBName('', 'https://localhost:8069')).toBe('localhost');
		});
	});

	describe('getOdooPassword', () => {
		it('should return API key when auth method is apiKey', () => {
			const creds = { authMethod: 'apiKey', apiKey: 'my-key', password: 'my-pass' } as IOdooCredentials;
			expect(getOdooPassword(creds)).toBe('my-key');
		});

		it('should return password when auth method is password', () => {
			const creds = { authMethod: 'password', apiKey: 'my-key', password: 'my-pass' } as IOdooCredentials;
			expect(getOdooPassword(creds)).toBe('my-pass');
		});
	});

	describe('resolveModel', () => {
		it('should map contact to res.partner', () => {
			expect(resolveModel('contact')).toBe('res.partner');
		});

		it('should map lead to crm.lead', () => {
			expect(resolveModel('lead')).toBe('crm.lead');
		});

		it('should map saleOrder to sale.order', () => {
			expect(resolveModel('saleOrder')).toBe('sale.order');
		});

		it('should return customModel for custom resource', () => {
			expect(resolveModel('custom', 'stock.picking')).toBe('stock.picking');
		});
	});

	describe('processFilters', () => {
		it('should convert filter operations to domain tuples', () => {
			const filters: IOdooFilterOperations = {
				filter: [
					{ fieldName: 'name', operator: 'equal', value: 'test' },
					{ fieldName: 'amount', operator: 'greaterThan', value: '100' },
				],
			};
			expect(processFilters(filters)).toEqual([
				['name', '=', 'test'],
				['amount', '>', '100'],
			]);
		});

		it('should handle empty filters', () => {
			const filters: IOdooFilterOperations = { filter: [] };
			expect(processFilters(filters)).toEqual([]);
		});

		it('should support ilike operator', () => {
			const filters: IOdooFilterOperations = {
				filter: [{ fieldName: 'name', operator: 'ilike', value: 'test' }],
			};
			expect(processFilters(filters)).toEqual([['name', 'ilike', 'test']]);
		});
	});

	describe('processNameValueFields', () => {
		it('should convert fixedCollection format to flat object', () => {
			const input = {
				fields: [
					{ fieldName: 'name', fieldValue: 'Test' },
					{ fieldName: 'email', fieldValue: 'test@example.com' },
				],
			};
			expect(processNameValueFields(input)).toEqual({
				name: 'Test',
				email: 'test@example.com',
			});
		});

		it('should return empty object for empty fields', () => {
			expect(processNameValueFields({ fields: [] })).toEqual({});
		});
	});
});
