# Technology Stack

**Analysis Date:** 2026-03-07

## Languages

**Primary:**
- TypeScript 5.9.2 - All packages (backend, frontend, workflow engine, nodes)

**Secondary:**
- JavaScript (ES Modules) - Build scripts (`scripts/*.mjs`), config files
- Python - Task runner (`packages/@n8n/task-runner-python/`)
- SQL - Database migrations via TypeORM

## Runtime

**Environment:**
- Node.js >= 22.16 (Docker image uses Node 24.13.1)

**Package Manager:**
- pnpm 10.22.0 (enforced via `packageManager` field and `preinstall` script blocking npm)
- Lockfile: `pnpm-lock.yaml` present
- Workspace: `pnpm-workspace.yaml` with catalog version management

## Frameworks

**Core:**
- Express 5.1.0 - HTTP server (`packages/cli/`)
- Vue 3.5+ - Frontend SPA (`packages/frontend/editor-ui/`)
- Pinia 2.2+ - Vue state management
- Element Plus 2.4.3 - UI component library (patched)
- Vue Router 4.5+ - Client-side routing
- Vue Flow 1.48.0 - Workflow canvas/graph visualization

**Testing:**
- Jest 29.6 - Backend unit and integration tests
- Vitest 3.1+ - Frontend and `n8n-workflow` package tests
- Playwright 1.58.0 - End-to-end tests (`packages/testing/playwright/`)
- Testing Library (Vue) - Component testing
- nock 14.0 - HTTP mocking (backend)
- miragejs 0.1 - API mocking (frontend)

**Build/Dev:**
- Turbo 2.8.9 - Monorepo build orchestration (`turbo.json`)
- Vite (via rolldown-vite) - Frontend bundling
- tsc / tsc-watch / tsc-alias - Backend TypeScript compilation
- tsdown - Some packages (`packages/extensions/`)
- Biome 1.9+ - Code formatting
- ESLint 9.29 - Linting
- Lefthook - Git hooks
- Storybook 10.1 - Component development (`packages/frontend/@n8n/storybook/`)

## Key Dependencies

**Critical:**
- `@n8n/typeorm` 0.3.20-16 - Custom fork of TypeORM for database access (`packages/@n8n/db/`)
- `n8n-workflow` (workspace) - Core workflow types and execution interfaces
- `n8n-core` (workspace) - Workflow execution engine
- `@n8n/di` (workspace) - Dependency injection / IoC container
- `@n8n_io/license-sdk` 2.25.0 - License management (enterprise features)
- `@n8n_io/ai-assistant-sdk` 1.20.0 - AI assistant integration

**Infrastructure:**
- `ioredis` 5.3.2 - Redis client for scaling/caching (`packages/cli/src/services/redis-client.service.ts`)
- `bull` 4.16.4 (patched) - Job queue for workflow execution scaling (`packages/cli/src/scaling/`)
- `sqlite3` 5.1.7 - Default embedded database
- `pg` 8.17.0 - PostgreSQL driver
- `ws` 8.17.1 - WebSocket support for push notifications (`packages/cli/src/push/`)
- `nodemailer` 7.0.11 - Email sending
- `axios` 1.13.5 - HTTP client

**AI/LangChain:**
- `langchain` 1.2.3 - LLM framework
- `@langchain/core` 1.1.8 - Core abstractions
- `@langchain/openai` 1.1.3 - OpenAI integration
- `@langchain/anthropic` 1.1.3 - Anthropic integration
- `@langchain/community` 1.1.14 - Community integrations
- `@modelcontextprotocol/sdk` 1.26.0 - MCP server support (`packages/cli/src/modules/mcp/`)

**Authentication:**
- `jsonwebtoken` 9.0.3 - JWT handling
- `bcryptjs` 2.4.3 - Password hashing
- `samlify` 2.10.0 - SAML SSO (`packages/cli/src/modules/sso-saml/`)
- `openid-client` 6.5.0 - OIDC SSO (`packages/cli/src/modules/sso-oidc/`)
- `ldapts` 4.2.6 - LDAP integration (`packages/cli/src/modules/ldap.ee/`)
- `otpauth` 9.1.1 - TOTP/MFA

**Observability:**
- `@sentry/node` 10.36+ - Error tracking (backend)
- `@sentry/vue` 10.36+ - Error tracking (frontend)
- `prom-client` 15.1.3 - Prometheus metrics (`packages/cli/src/metrics/`)
- `posthog-node` 3.2.1 - Feature flags and analytics (`packages/cli/src/posthog/`)
- `@rudderstack/rudder-sdk-node` 3.0.0 - Telemetry (`packages/cli/src/telemetry/`)

**Frontend-specific:**
- `@codemirror/*` - Code editor (expression editor, code nodes)
- `@dagrejs/dagre` - Graph layout
- `chart.js` / `vue-chartjs` - Data visualization
- `vue-i18n` 11.1+ - Internationalization (`packages/frontend/@n8n/i18n/`)
- `ag-grid-vue3` - Data grid component

## Configuration

**Environment:**
- `.env.example` present - Contains n8n configuration template
- Runtime config via `@n8n/config` package (uses `zod` schemas + `reflect-metadata`)
- Config class: `GlobalConfig` in `packages/@n8n/config/`
- Database type configured via `DB_TYPE` env var (sqlite or postgresdb)

**Build:**
- `turbo.json` - Build orchestration and task dependencies
- `tsconfig.json` (root) - Extends `packages/@n8n/typescript-config/tsconfig.common.json`
- `biome.jsonc` - Formatting config
- `lefthook.yml` - Git hooks config
- Per-package `tsconfig.build.json` files for compilation

## Monorepo Structure

**Workspace packages (pnpm-workspace.yaml):**
- `packages/*` - Core packages (cli, core, workflow, nodes-base, etc.)
- `packages/@n8n/*` - Scoped internal packages (~35 packages)
- `packages/frontend/**` - Frontend packages (editor-ui, design-system, i18n, stores, etc.)
- `packages/extensions/**` - Extension packages (insights)
- `packages/testing/**` - Test infrastructure (playwright)
- `custom-nodes/*` - Custom community nodes (n8n-nodes-odoo-generic)

**Version catalog:** Centralized dependency versions in `pnpm-workspace.yaml` catalogs:
- Default catalog - Shared backend/core dependencies
- `frontend` catalog - Vue/Vite/Testing Library versions
- `storybook` catalog - Storybook addon versions
- `e2e` catalog - Playwright versions
- `sentry` catalog - Sentry SDK versions

## Platform Requirements

**Development:**
- Node.js >= 22.16
- pnpm >= 10.22.0
- SQLite3 (default, compiled via native addon)
- Optional: PostgreSQL, Redis (for scaling mode)

**Production:**
- Docker (official image: `n8nio/base` with Node 24.13.1)
- Port 5678 (default HTTP)
- SQLite or PostgreSQL for persistence
- Optional: Redis for multi-instance scaling (queue mode)

---

*Stack analysis: 2026-03-07*
