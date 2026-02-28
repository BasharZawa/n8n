# Design: Expression-First Fields for Odoo Generic Node

**Date**: 2026-02-28
**Status**: Approved

## Problem

The current Odoo Generic node uses dropdown fields (`type: 'options'` with `loadOptionsMethod`) for relational fields like Partner, Salesperson, Stage, etc. This makes the node unusable in automated workflows where data flows from previous nodes (triggers, HTTP requests, etc.) because:

1. Dropdown fields require a live Odoo connection at design time to populate
2. Values from previous nodes can't be mapped without switching to expression mode
3. Key fields like order lines, salesperson, and date are either missing or buried in "Additional Fields"
4. The Contact model nests address in a fixedCollection, adding unnecessary complexity

## Design

### Principle: All fields are expression-mappable string inputs

Every field across all models becomes `type: 'string'` (or `type: 'number'`/`type: 'dateTime'` where appropriate). No `loadOptionsMethod` on any required or commonly-used field. Users map values from previous nodes using `{{ $json.field }}` expressions.

### Structural Changes

1. **Remove all `loadOptionsMethod`** from Sale Order, Contact, and Lead description fields
2. **Promote all common fields to top level** — no "Additional Fields" collection wrapper
3. **Flatten Contact address** — individual street/city/state/country/zip fields, no nested fixedCollection
4. **Add "Extra Fields"** name/value collection to every model for arbitrary Odoo field names
5. **Update operations mirror Create** — same explicit fields available
6. **Remove loadOptions methods** from OdooGeneric.node.ts: `getPartners`, `getStages`, `getCountries`, `getStates`. Keep `getModelFields` and `getModels` (used by Custom Model resource only)

### Sale Order — Create Fields

| Display Name | Param Name | Type | Required | Notes |
|---|---|---|---|---|
| Partner ID | `partner_id` | string | yes | Customer ID from Odoo |
| Date Order | `date_order` | dateTime | no | Defaults to now in Odoo |
| Salesperson ID | `user_id` | string | no | res.users ID |
| Sales Team ID | `team_id` | string | no | crm.team ID |
| Pricelist ID | `pricelist_id` | string | no | product.pricelist ID |
| Payment Terms ID | `payment_term_id` | string | no | account.payment.term ID |
| Fiscal Position ID | `fiscal_position_id` | string | no | account.fiscal.position ID |
| Customer Reference | `client_order_ref` | string | no | |
| Source Document | `origin` | string | no | |
| Note | `note` | string | no | Terms and conditions |
| Extra Fields | `extraFields` | fixedCollection (name/value) | no | Catch-all |

### Contact — Create Fields

| Display Name | Param Name | Type | Required | Notes |
|---|---|---|---|---|
| Name | `name` | string | yes | |
| Email | `email` | string | no | |
| Phone | `phone` | string | no | |
| Mobile | `mobile` | string | no | |
| Street | `street` | string | no | |
| City | `city` | string | no | |
| State ID | `state_id` | string | no | res.country.state ID |
| Country ID | `country_id` | string | no | res.country ID |
| Zip | `zip` | string | no | |
| Job Position | `function` | string | no | |
| Website | `website` | string | no | |
| Tax ID | `vat` | string | no | |
| Notes | `comment` | string | no | |
| Extra Fields | `extraFields` | fixedCollection (name/value) | no | Catch-all |

### Lead/Opportunity — Create Fields

| Display Name | Param Name | Type | Required | Notes |
|---|---|---|---|---|
| Name | `name` | string | yes | Opportunity name |
| Partner ID | `partner_id` | string | no | res.partner ID |
| Contact Name | `contact_name` | string | no | |
| Email | `email_from` | string | no | |
| Phone | `phone` | string | no | |
| Expected Revenue | `expected_revenue` | number | no | |
| Probability | `probability` | number | no | 0-100 |
| Expected Closing | `date_deadline` | dateTime | no | |
| Salesperson ID | `user_id` | string | no | res.users ID |
| Sales Team ID | `team_id` | string | no | crm.team ID |
| Stage ID | `stage_id` | string | no | crm.stage ID |
| Priority | `priority` | string | no | 0=Normal, 1=Low, 2=High, 3=Very High |
| Description | `description` | string | no | |
| Extra Fields | `extraFields` | fixedCollection (name/value) | no | Catch-all |

### Custom Model — unchanged

Keeps name/value pair fields with `getModelFields` loadOption for field name discovery.

### Update Operations

Each model's Update operation exposes the same fields as Create (minus the required constraint on most fields), plus the record ID field.

### Execute Logic Changes (OdooGeneric.node.ts)

The `execute()` method's create/update branches need to:
1. Collect all explicitly-named fields into a single `fields` object
2. Merge in any `extraFields` name/value pairs
3. Pass to `odooCreate`/`odooUpdate`

### Files Changed

1. `descriptions/SaleOrderDescription.ts` — rewrite
2. `descriptions/ContactDescription.ts` — rewrite
3. `descriptions/LeadDescription.ts` — rewrite
4. `descriptions/SharedFields.ts` — add `makeExtraFields()` factory
5. `OdooGeneric.node.ts` — simplify execute() field collection, remove unused loadOptions
