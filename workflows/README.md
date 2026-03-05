# Workflows

Workflow JSON exports, versioned in Git. Grouped by domain.

## Folder Structure

- `odoo/` — Odoo ERP integration workflows
- `crm/` — CRM and sales workflows

## Export a workflow (local → Git)

```bash
# export all workflows in a domain
n8n export:workflow --all --output=./workflows/odoo/

# or export a specific workflow by ID
n8n export:workflow --id=<workflow-id> --output=./workflows/odoo/my-workflow.json

git add workflows/
git commit -m "feat(workflows): <description of change>"
```

## Import workflows (Git → local)

```bash
git pull
n8n import:workflow --input=./workflows/
```

## Import on server

The `workflows/` folder is mounted as a volume into the container.

```bash
docker exec -it n8n n8n import:workflow --input=/workflows/
```

---

## Required Credentials

**IMPORTANT:** Credential names must be identical between your local n8n and the server.
Create these credentials in the n8n UI before importing workflows.

| Credential Name | Type | Used By |
|---|---|---|
| `Odoo` | Odoo API | All Odoo workflows |

When you add a new workflow that requires a new credential, add it to this table.
