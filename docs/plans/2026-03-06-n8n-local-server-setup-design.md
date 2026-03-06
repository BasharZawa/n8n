# n8n Local + Server Setup Design

**Date:** 2026-03-06
**Status:** Approved

## Context

We use this n8n monorepo for two purposes:
1. Developing custom nodes (TypeScript packages under `custom-nodes/`)
2. Building and maintaining automation workflows

We need a setup where:
- All developers run n8n locally via `pnpm dev` with full hot reload
- Workflows and custom nodes are versioned in Git (this repo)
- The production server runs a Dockerized n8n with the same custom nodes bundled in
- Workflow sync to server is manual and explicit (export → commit → import)

## Folder Structure

```
monorepo/
├── custom-nodes/                   ← all custom node packages
│   └── n8n-nodes-odoo-generic/    ← existing node (already in pnpm workspace)
├── workflows/                      ← workflow JSON exports, versioned in Git
│   ├── odoo/                       ← grouped by domain
│   ├── crm/
│   └── README.md                   ← credential naming conventions per workflow
├── docker/                         ← server deployment only (not for local dev)
│   ├── Dockerfile
│   └── docker-compose.yml
└── .env.example                    ← environment variable template
```

## Local Development

Custom nodes are pnpm workspace packages. n8n loads them via `N8N_CUSTOM_EXTENSIONS`.
No Docker needed locally — `pnpm dev` is the single command.

### Teammate Onboarding

```bash
git clone <repo>
pnpm install
pnpm build          # builds custom nodes
cp .env.example .env
# create n8n credentials in UI (see workflows/README.md for required names)
pnpm dev
# import workflows
n8n import:workflow --input=./workflows/
```

### Adding a New Custom Node

1. Create package under `custom-nodes/<node-name>/`
2. Add to `pnpm-workspace.yaml`
3. Add `N8N_CUSTOM_EXTENSIONS` entry in `.env.example`
4. Add a `RUN` build step in `docker/Dockerfile`

## Workflow Sync

### Export (local → Git)

```bash
n8n export:workflow --all --output=./workflows/<domain>/
git add workflows/
git commit -m "feat(workflows): sync <description>"
git push
```

### Import (Git → local)

```bash
git pull
n8n import:workflow --input=./workflows/
```

### Import (Git → server)

The `workflows/` folder is mounted as a volume on the server.

```bash
docker exec -it n8n n8n import:workflow --input=/workflows/
```

## Docker (Server Deployment)

### Dockerfile

Builds all custom nodes from source and installs them into the n8n image.
No npm registry required — nodes are copied directly from `custom-nodes/`.

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /build
COPY custom-nodes/ ./custom-nodes/

# Build each custom node (add one RUN block per node)
RUN cd custom-nodes/n8n-nodes-odoo-generic && npm install && npm run build

FROM n8nio/n8n:latest
COPY --from=builder /build/custom-nodes/ /home/node/.n8n/custom/
ENV N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
```

### docker-compose.yml

```yaml
services:
  n8n:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
      - ../workflows:/workflows   # mount for import without rebuild
    env_file:
      - ../.env
    restart: unless-stopped

volumes:
  n8n_data:
```

## Credentials Convention

Credentials are never stored in Git. They live in n8n's database only.

**Rule: credential names must be identical between local instances and the server.**

Example:
- Always name it `"Odoo"` — never `"Odoo Dev"` or `"Odoo Prod"`
- Always name it `"Postgres Main"` — not `"Postgres Local"`

`workflows/README.md` lists every credential name required by each workflow.
Each developer creates them once locally. The server admin (repo owner) creates them once on the server.

## Server Capabilities

| Capability | Implementation |
|---|---|
| Run n8n | Docker Compose (`docker/docker-compose.yml`) |
| Custom nodes | Built into Docker image at deploy time |
| Workflow versioning | Git history on `workflows/` folder |
| Workflow sync to server | Volume mount + `docker exec n8n import` |
| Workflow sync to local | `n8n import:workflow` CLI |
| Credentials | Manual setup in n8n UI, names match convention |
| Local dev | `pnpm dev` — no Docker needed |
| New teammate setup | `pnpm install && pnpm build && pnpm dev` |

## Non-Goals

- Automated CI/CD deployment (manual sync is intentional — explicit and reviewable)
- Sub-workflow chaining (not needed currently)
- npm registry publishing for custom nodes
