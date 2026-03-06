# n8n Repo Setup — Workflows, Custom Nodes, Server Deployment

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Organize this monorepo so workflows are versioned in Git, custom nodes are under a single `custom-nodes/` folder, and the server can be deployed via Docker with custom nodes bundled in.

**Architecture:** `custom-nodes/` holds all n8n node packages (pnpm workspace); `workflows/` holds JSON exports grouped by domain; `deploy/` holds the Dockerfile and docker-compose for server deployment. Local dev stays on `pnpm dev` — no Docker needed locally.

**Tech Stack:** pnpm workspaces, n8n CLI (`n8n export/import`), Docker multi-stage build, n8nio/n8n base image.

> **Note:** We use `deploy/` instead of `docker/` because `docker/images/` is already used by n8n's own build system. `deploy/` clearly signals "this is our server deployment".

---

### Task 1: Move n8n-nodes-odoo-generic into custom-nodes/

**Files:**
- Move: `n8n-nodes-odoo-generic/` → `custom-nodes/n8n-nodes-odoo-generic/`
- Modify: `pnpm-workspace.yaml` (line 7)

**Step 1: Move the folder**

```bash
mkdir -p custom-nodes
mv n8n-nodes-odoo-generic custom-nodes/n8n-nodes-odoo-generic
```

**Step 2: Update pnpm-workspace.yaml**

In [pnpm-workspace.yaml](../../pnpm-workspace.yaml), replace line 7:
```yaml
# Before
- n8n-nodes-odoo-generic

# After
- custom-nodes/*
```

**Step 3: Reinstall to relink workspace**

```bash
pnpm install
```

Expected: no errors, `n8n-nodes-odoo-generic` still resolved as workspace package.

**Step 4: Verify build still works**

```bash
cd custom-nodes/n8n-nodes-odoo-generic && pnpm build
```

Expected: `dist/` produced with no errors.

**Step 5: Commit**

```bash
git add pnpm-workspace.yaml custom-nodes/ n8n-nodes-odoo-generic/
git commit -m "refactor: move custom nodes under custom-nodes/ folder"
```

---

### Task 2: Create workflows/ folder structure

**Files:**
- Create: `workflows/README.md`
- Create: `workflows/odoo/.gitkeep`
- Create: `workflows/crm/.gitkeep`

**Step 1: Create folder structure**

```bash
mkdir -p workflows/odoo workflows/crm
touch workflows/odoo/.gitkeep workflows/crm/.gitkeep
```

**Step 2: Create workflows/README.md**

Create [workflows/README.md](../../workflows/README.md) with this content:

```markdown
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
```

**Step 3: Commit**

```bash
git add workflows/
git commit -m "feat: add workflows/ folder structure with import/export docs"
```

---

### Task 3: Create .env.example

**Files:**
- Create: `.env.example`

**Step 1: Create .env.example at repo root**

Create [.env.example](.env.example):

```bash
# n8n Configuration
# Copy this file to .env and fill in your values
# Never commit .env to Git

# Encryption key for credentials stored in n8n DB
# Generate with: openssl rand -hex 32
N8N_ENCRYPTION_KEY=change-me-generate-a-random-key

# Base URL where n8n is accessible (used for webhooks)
N8N_PROTOCOL=http
N8N_HOST=localhost
N8N_PORT=5678

# Timezone (used by Schedule nodes)
GENERIC_TIMEZONE=UTC

# Custom nodes - paths to built node packages
# Colon-separated list of directories
N8N_CUSTOM_EXTENSIONS=./custom-nodes/n8n-nodes-odoo-generic/dist

# Database (SQLite by default, switch to postgres for production)
# DB_TYPE=postgresdb
# DB_POSTGRESDB_HOST=localhost
# DB_POSTGRESDB_PORT=5432
# DB_POSTGRESDB_DATABASE=n8n
# DB_POSTGRESDB_USER=n8n
# DB_POSTGRESDB_PASSWORD=change-me
```

**Step 2: Verify .env is in .gitignore**

```bash
grep -n "\.env" .gitignore
```

Expected: `.env` or `.env*` appears. If not, add it:

```bash
echo ".env" >> .gitignore
```

**Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "feat: add .env.example with n8n configuration template"
```

---

### Task 4: Create Dockerfile for server deployment

**Files:**
- Create: `deploy/Dockerfile`

**Step 1: Create deploy/ directory**

```bash
mkdir -p deploy
```

**Step 2: Create deploy/Dockerfile**

Create [deploy/Dockerfile](../../deploy/Dockerfile):

```dockerfile
# Stage 1: Build custom nodes
FROM node:18-alpine AS builder

WORKDIR /build

# Copy all custom nodes
COPY custom-nodes/ ./custom-nodes/

# Build n8n-nodes-odoo-generic
# Add one RUN block per node when you add new custom nodes
RUN cd custom-nodes/n8n-nodes-odoo-generic \
  && npm install \
  && npm run build

# Stage 2: n8n runtime with custom nodes
FROM docker.n8n.io/n8nio/n8n:latest

# Copy built custom nodes into n8n's custom extensions directory
COPY --from=builder /build/custom-nodes/ /home/node/.n8n/custom/

# Tell n8n where to find custom nodes
ENV N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom/n8n-nodes-odoo-generic/dist
```

> **When adding a new custom node:** add a `RUN cd custom-nodes/<node-name> && npm install && npm run build` block in Stage 1, and append its `dist/` path to `N8N_CUSTOM_EXTENSIONS` (colon-separated).

**Step 3: Verify the Dockerfile syntax**

```bash
docker build -f deploy/Dockerfile -t n8n-custom --no-cache . 2>&1 | tail -20
```

Expected: `Successfully built <image-id>` or similar success message.

**Step 4: Commit**

```bash
git add deploy/Dockerfile
git commit -m "feat(deploy): add Dockerfile with custom nodes bundled"
```

---

### Task 5: Create docker-compose.yml for server deployment

**Files:**
- Create: `deploy/docker-compose.yml`

**Step 1: Create deploy/docker-compose.yml**

Create [deploy/docker-compose.yml](../../deploy/docker-compose.yml):

```yaml
services:
  n8n:
    build:
      context: ..
      dockerfile: deploy/Dockerfile
    container_name: n8n
    ports:
      - "5678:5678"
    volumes:
      # Persist n8n data (credentials, execution history, encryption key)
      - n8n_data:/home/node/.n8n
      # Mount workflows folder so you can import without rebuilding the image
      - ../workflows:/workflows
    env_file:
      - ../.env
    restart: unless-stopped

volumes:
  n8n_data:
```

**Step 2: Verify docker-compose syntax**

```bash
docker compose -f deploy/docker-compose.yml config 2>&1 | tail -10
```

Expected: parsed config output with no errors.

**Step 3: Commit**

```bash
git add deploy/docker-compose.yml
git commit -m "feat(deploy): add docker-compose for server deployment"
```

---

### Task 6: Add teammate onboarding docs

**Files:**
- Modify: `CONTRIBUTING.md` (create if it doesn't exist)

**Step 1: Check if CONTRIBUTING.md exists**

```bash
ls CONTRIBUTING.md 2>/dev/null && echo "exists" || echo "missing"
```

**Step 2a: If it exists — append onboarding section**

Add to the end of [CONTRIBUTING.md](../../CONTRIBUTING.md):

```markdown
## Team Automation Setup (Workflows & Custom Nodes)

### First-Time Local Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Build custom nodes
cd custom-nodes/n8n-nodes-odoo-generic && pnpm build && cd ../..

# 3. Set up environment
cp .env.example .env
# Edit .env — at minimum, set N8N_ENCRYPTION_KEY to a random value

# 4. Start n8n
pnpm dev

# 5. Create credentials in the n8n UI
# Open http://localhost:5678, go to Credentials, and create each credential
# listed in workflows/README.md — use the EXACT names in that table.

# 6. Import all workflows
n8n import:workflow --input=./workflows/
```

### Daily Workflow

**Pull latest workflows from teammates:**
```bash
git pull
n8n import:workflow --input=./workflows/
```

**Export your workflows to share:**
```bash
n8n export:workflow --all --output=./workflows/<domain>/
git add workflows/ && git commit -m "feat(workflows): <description>"
git push
```

### Adding a New Custom Node

1. Create a new package under `custom-nodes/<node-name>/`
2. Add `- custom-nodes/*` is already in `pnpm-workspace.yaml` (covers all new nodes automatically)
3. Add a `RUN` build step in `deploy/Dockerfile` for the new node
4. Append its `dist/` path to `N8N_CUSTOM_EXTENSIONS` in `.env.example` and `deploy/Dockerfile`
5. Document any new credentials it requires in `workflows/README.md`

### Deploying to Server (admin only)

```bash
# Build and start
cd deploy && docker compose up -d --build

# Import workflows after deploy
docker exec -it n8n n8n import:workflow --input=/workflows/

# View logs
docker compose -f deploy/docker-compose.yml logs -f n8n
```
```

**Step 2b: If it doesn't exist — create it**

Create [CONTRIBUTING.md](../../CONTRIBUTING.md) with just the onboarding section above (without the leading `##`—start from `# Team Automation Setup`).

**Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add team onboarding guide for workflows and custom nodes"
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `custom-nodes/n8n-nodes-odoo-generic/` exists and builds cleanly
- [ ] `pnpm install` resolves `n8n-nodes-odoo-generic` as workspace package
- [ ] `workflows/README.md` has credential table
- [ ] `.env.example` exists, `.env` is gitignored
- [ ] `docker build -f deploy/Dockerfile .` succeeds
- [ ] `docker compose -f deploy/docker-compose.yml config` parses cleanly
- [ ] `CONTRIBUTING.md` has onboarding steps
- [ ] `git log --oneline -7` shows 6 clean commits
