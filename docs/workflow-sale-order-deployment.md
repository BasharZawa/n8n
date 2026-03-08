# Workflow: Webhook → Odoo Sale Order + Lines

Deployment guide for the sale order creation workflow on the VPS.

---

## What It Does

Accepts a POST webhook with order data, then in sequence:

1. **Get Contact by Name** — looks up the Odoo `res.partner` by name
2. **Create Sale Order** — creates `sale.order` with partner + client ref
3. **Search Products** — fetches `product.product` records matching the product codes
4. **Prepare Lines** — maps each order line to `{order_id, product_id, qty, price, discount}`
5. **Create Order Line** — creates each `sale.order.line` in Odoo
6. **Confirm Order** — calls `action_confirm` on the sale order
7. **Update Sale Order** — sets `date_order` from the webhook payload
8. **Respond to Webhook** — returns JSON `{ success, sale_order_id, lines_created }`

---

## Webhook Payload Format

```json
{
  "customerName": "Ahmed Al-Rashid",
  "clientOrderRef": "PO-2024-001",
  "dateOrder": "2024-01-15 09:00:00",
  "orderLines": [
    {
      "productCode": "ITX-QMSW-0004",
      "quantity": 2,
      "priceUnit": 150.00,
      "discount": 0,
      "description": "Optional line description"
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `customerName` | Yes | Must match an Odoo contact name exactly |
| `clientOrderRef` | No | Shown as "Customer Reference" on the SO |
| `dateOrder` | No | Format: `YYYY-MM-DD HH:MM:SS` |
| `orderLines[].productCode` | Yes | Matches `product.product.default_code` (trailing spaces are trimmed automatically) |
| `orderLines[].quantity` | Yes | — |
| `orderLines[].priceUnit` | Yes | — |
| `orderLines[].discount` | No | Defaults to 0 |
| `orderLines[].description` | No | Falls back to product name |

---

## Prerequisites

### 1. Custom Node Installed

The `n8n-nodes-odoo-generic` custom node must be installed and built on the VPS.
See [vps-setup-guide.md](vps-setup-guide.md) for full instructions.

### 2. Odoo Credential

Create a credential in n8n:

- **Type**: Odoo Generic account
- **Name**: `Odoo Generic account` *(must match exactly — the workflow references this name)*
- **URL**: your Odoo instance URL (e.g. `http://your-odoo-host:8069`)
- **Database**: Odoo database name (e.g. `OdooE`)
- **Username**: Odoo user email
- **Password / API Key**: Odoo user API key (Settings → Technical → API Keys)

---

## Deploying on VPS

### Step 1 — Import the Workflow

1. Open n8n at `http://YOUR_VPS_IP:5678`
2. Go to **Workflows** → **Import from file**
3. Upload `workflow-sale-order.json` (see below)

### Step 2 — Assign the Credential

After import, open the workflow. Each Odoo node will show a credential warning.

For every node that uses Odoo:
1. Click the node
2. Under **Credential** → select your **Odoo Generic account**

Nodes that need the credential:
- Get Contact by Name
- Create Sale Order
- Search Products
- Create Order Line
- Confirm Order
- Update Sale Order

### Step 3 — Activate

Toggle the workflow to **Active** (top-right switch).

The webhook URL will be:
```
http://YOUR_VPS_IP:5678/webhook/odoo-sale-order
```

### Step 4 — Test

```bash
curl -s -X POST http://YOUR_VPS_IP:5678/webhook/odoo-sale-order \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Ahmed Al-Rashid",
    "clientOrderRef": "TEST-001",
    "dateOrder": "2024-01-15 09:00:00",
    "orderLines": [
      { "productCode": "ITX-QMSW-0004", "quantity": 1, "priceUnit": 100 }
    ]
  }'
```

Expected response:
```json
{ "success": true, "sale_order_id": 42, "confirmed": true, "lines_created": 1 }
```

---

## Known Odoo Data Issue

Odoo stores `default_code` with **trailing spaces** (e.g. `"ITX-QMSW-0004 "`).
The workflow handles this automatically:
- `rawDomain` passes trimmed codes to the search
- `Prepare Lines` does `.trim()` on both sides before matching

---

## Workflow JSON

Save the content below as `workflow-sale-order.json` and import it into n8n.

```json
{
  "name": "Webhook → Odoo Sale Order + Lines",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "odoo-sale-order",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [-672, -16],
      "id": "webhook-1",
      "name": "Webhook",
      "webhookId": "odoo-sale-order"
    },
    {
      "parameters": {
        "operation": "get",
        "getBy": "name",
        "contactName": "={{ $json.body.customerName }}",
        "options": {}
      },
      "type": "CUSTOM.odooGeneric",
      "typeVersion": 1,
      "position": [-480, -16],
      "id": "get-contact",
      "name": "Get Contact by Name",
      "credentials": {
        "odooGenericApi": { "id": "", "name": "Odoo Generic account" }
      }
    },
    {
      "parameters": {
        "resource": "saleOrder",
        "fieldsToCreateOrUpdate": {
          "fields": [
            { "fieldName": "partner_id",       "fieldValue": "={{ $(\"Get Contact by Name\").item.json.id }}" },
            { "fieldName": "client_order_ref", "fieldValue": "={{ $('Webhook').item.json.body.clientOrderRef }}" }
          ]
        }
      },
      "type": "CUSTOM.odooGeneric",
      "typeVersion": 1,
      "position": [-304, -16],
      "id": "create-so",
      "name": "Create Sale Order",
      "credentials": {
        "odooGenericApi": { "id": "", "name": "Odoo Generic account" }
      }
    },
    {
      "parameters": {
        "resource": "custom",
        "customModel": "product.product",
        "operation": "getAll",
        "returnAll": true,
        "filterRequest": {
          "filter": [
            {
              "fieldName": "default_code",
              "operator": "in",
              "value": "={{ $('Webhook').first().json.body.orderLines.map(l => (l.productCode || '').trim()).join(',') }}"
            }
          ]
        },
        "rawDomain": "={{ JSON.stringify([['default_code', 'in', $('Webhook').first().json.body.orderLines.map(l => (l.productCode || '').trim())]]) }}",
        "options": {
          "fieldsList": ["id", "default_code", "name"]
        }
      },
      "type": "CUSTOM.odooGeneric",
      "typeVersion": 1,
      "position": [-128, -16],
      "id": "search-products",
      "name": "Search Products",
      "credentials": {
        "odooGenericApi": { "id": "", "name": "Odoo Generic account" }
      }
    },
    {
      "parameters": {
        "jsCode": "const lines = $('Webhook').first().json.body.orderLines;\nconst soId = $('Create Sale Order').first().json.id;\nconst products = $('Search Products').all().map(i => i.json);\n\nreturn lines.map(line => {\n  const code = (line.productCode || '').trim();\n  const product = products.find(p => (p.default_code || '').trim() === code)\n      || products.find(p => p.name && p.name.toLowerCase().includes(code.toLowerCase()));\n  if (!product) throw new Error(`Product not found: \"${code}\"`);\n  return {\n    json: {\n      order_id: soId,\n      product_id: product.id,\n      product_uom_qty: line.quantity,\n      price_unit: line.priceUnit,\n      discount: line.discount || 0,\n      name: line.description || product.name,\n    }\n  };\n});"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [48, -16],
      "id": "prepare-lines",
      "name": "Prepare Lines"
    },
    {
      "parameters": {
        "resource": "custom",
        "customModel": "sale.order.line",
        "fieldsToCreateOrUpdate": {
          "fields": [
            { "fieldName": "order_id",         "fieldValue": "={{ $json.order_id }}" },
            { "fieldName": "product_id",        "fieldValue": "={{ $json.product_id }}" },
            { "fieldName": "product_uom_qty",   "fieldValue": "={{ $json.product_uom_qty }}" },
            { "fieldName": "price_unit",        "fieldValue": "={{ $json.price_unit }}" },
            { "fieldName": "discount",          "fieldValue": "={{ $json.discount }}" },
            { "fieldName": "name",              "fieldValue": "={{ $json.name }}" }
          ]
        }
      },
      "type": "CUSTOM.odooGeneric",
      "typeVersion": 1,
      "position": [224, -16],
      "id": "create-line",
      "name": "Create Order Line",
      "credentials": {
        "odooGenericApi": { "id": "", "name": "Odoo Generic account" }
      }
    },
    {
      "parameters": {
        "resource": "custom",
        "customModel": "sale.order",
        "operation": "executeMethod",
        "methodName": "action_confirm",
        "recordId": "={{ $('Create Sale Order').first().json.id }}"
      },
      "type": "CUSTOM.odooGeneric",
      "typeVersion": 1,
      "position": [400, -16],
      "id": "confirm-so",
      "name": "Confirm Order",
      "credentials": {
        "odooGenericApi": { "id": "", "name": "Odoo Generic account" }
      },
      "onError": "continueRegularOutput"
    },
    {
      "parameters": {
        "resource": "saleOrder",
        "operation": "update",
        "saleOrderId": "={{ $('Create Sale Order').first().json.id }}",
        "fieldsToCreateOrUpdate": {
          "fields": [
            { "fieldName": "date_order", "fieldValue": "={{ $('Webhook').first().json.body.dateOrder }}" }
          ]
        }
      },
      "type": "CUSTOM.odooGeneric",
      "typeVersion": 1,
      "position": [576, -16],
      "id": "update-so",
      "name": "Update Sale Order",
      "credentials": {
        "odooGenericApi": { "id": "", "name": "Odoo Generic account" }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ success: true, sale_order_id: $(\"Create Sale Order\").first().json.id, confirmed: true, lines_created: $(\"Create Order Line\").all().length }) }}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [752, -16],
      "id": "respond-1",
      "name": "Respond to Webhook"
    }
  ],
  "connections": {
    "Webhook":              { "main": [[{ "node": "Get Contact by Name", "type": "main", "index": 0 }]] },
    "Get Contact by Name":  { "main": [[{ "node": "Create Sale Order",   "type": "main", "index": 0 }]] },
    "Create Sale Order":    { "main": [[{ "node": "Search Products",     "type": "main", "index": 0 }]] },
    "Search Products":      { "main": [[{ "node": "Prepare Lines",       "type": "main", "index": 0 }]] },
    "Prepare Lines":        { "main": [[{ "node": "Create Order Line",   "type": "main", "index": 0 }]] },
    "Create Order Line":    { "main": [[{ "node": "Confirm Order",       "type": "main", "index": 0 }]] },
    "Confirm Order":        { "main": [[{ "node": "Update Sale Order",   "type": "main", "index": 0 }]] },
    "Update Sale Order":    { "main": [[{ "node": "Respond to Webhook",  "type": "main", "index": 0 }]] }
  },
  "settings": {
    "executionOrder": "v1",
    "callerPolicy": "workflowsFromSameOwner",
    "availableInMCP": true
  }
}
```
