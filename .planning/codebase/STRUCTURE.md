# Codebase Structure

**Analysis Date:** 2026-03-07

## Directory Layout

```
n8n/
├── packages/                    # All monorepo packages (pnpm workspaces)
│   ├── @n8n/                    # Scoped shared packages (~30 packages)
│   │   ├── api-types/           # Shared FE/BE TypeScript interfaces
│   │   ├── backend-common/      # Shared backend utilities
│   │   ├── backend-test-utils/  # Backend test helpers
│   │   ├── benchmark/           # Performance benchmarking
│   │   ├── config/              # Centralized configuration (class-based)
│   │   ├── constants/           # Shared constants
│   │   ├── db/                  # Database entities, repos, migrations
│   │   ├── decorators/          # TypeScript decorators
│   │   ├── di/                  # Dependency injection container (IoC)
│   │   ├── errors/              # Error class hierarchy
│   │   ├── nodes-langchain/     # AI/LangChain integration nodes
│   │   ├── permissions/         # Role/permission logic
│   │   ├── task-runner/         # JS task runner for sandboxed execution
│   │   ├── task-runner-python/  # Python task runner
│   │   ├── utils/               # General utilities
│   │   ├── workflow-sdk/        # Workflow SDK
│   │   ├── ai-node-sdk/         # AI node development SDK
│   │   ├── ai-utilities/        # AI helper utilities
│   │   ├── ai-workflow-builder.ee/ # AI workflow builder (enterprise)
│   │   ├── chat-hub/            # Chat hub backend logic
│   │   ├── client-oauth2/       # OAuth2 client library
│   │   ├── codemirror-lang/     # Custom CodeMirror n8n expression lang
│   │   ├── codemirror-lang-html/# CodeMirror HTML lang extension
│   │   ├── codemirror-lang-sql/ # CodeMirror SQL lang extension
│   │   ├── crdt/                # CRDT for real-time collaboration
│   │   ├── create-node/         # CLI scaffolding for new nodes
│   │   ├── eslint-config/       # Shared ESLint configuration
│   │   ├── eslint-plugin-community-nodes/ # Linting for community nodes
│   │   ├── expression-runtime/  # Expression evaluation runtime
│   │   ├── extension-sdk/       # Extension SDK
│   │   ├── imap/                # IMAP email client
│   │   ├── json-schema-to-zod/  # JSON Schema → Zod converter
│   │   ├── node-cli/            # Node CLI tool
│   │   ├── scan-community-package/ # Community package scanner
│   │   ├── stylelint-config/    # Shared Stylelint configuration
│   │   ├── syslog-client/       # Syslog client
│   │   ├── typescript-config/   # Shared TSConfig bases
│   │   └── vitest-config/       # Shared Vitest configuration
│   ├── cli/                     # Backend: Express server, REST API, CLI
│   ├── core/                    # Workflow execution engine
│   ├── workflow/                # Core workflow interfaces and types
│   ├── nodes-base/              # Built-in integration nodes (~304 nodes)
│   ├── node-dev/                # Node development CLI tool
│   ├── extensions/              # Extension packages
│   │   └── insights/            # Insights extension
│   ├── frontend/                # All frontend packages
│   │   ├── editor-ui/           # Main Vue 3 application
│   │   └── @n8n/               # Frontend scoped packages
│   │       ├── design-system/   # Shared Vue component library (N8n*)
│   │       ├── stores/          # Pinia stores (shared across frontend)
│   │       ├── i18n/            # Internationalization
│   │       ├── chat/            # Embeddable chat widget
│   │       ├── composables/     # Shared Vue composables
│   │       ├── rest-api-client/ # REST API client for frontend
│   │       └── storybook/       # Storybook for design system
│   └── testing/                 # Test infrastructure
│       ├── playwright/          # E2E tests (Playwright)
│       ├── janitor/             # Static analysis for test architecture
│       ├── containers/          # Test container management
│       └── performance/         # Performance testing
├── custom-nodes/                # Custom node packages (local workspace)
│   └── n8n-nodes-odoo-generic/  # Custom Odoo integration node
├── deploy/                      # Deployment configuration
│   ├── Dockerfile               # Custom Docker build
│   └── docker-compose.yml       # Docker Compose for deployment
├── docker/                      # Official Docker images
│   └── images/                  # Docker image definitions
├── scripts/                     # Build and utility scripts
│   └── backend-module/          # Backend module scaffolding guide
├── workflows/                   # Workflow JSON files (for import)
│   ├── crm/                     # CRM workflow templates
│   └── odoo/                    # Odoo workflow templates
├── patches/                     # pnpm patch overrides
├── .github/                     # GitHub Actions, templates, scripts
│   ├── workflows/               # CI/CD pipeline definitions
│   ├── actions/                 # Reusable GitHub Actions
│   └── scripts/                 # CI helper scripts
├── .planning/                   # Project planning documents
│   └── codebase/                # Codebase analysis docs (this file)
├── docs/                        # Project documentation
├── assets/                      # Static assets (images, etc.)
├── package.json                 # Root package.json
├── pnpm-workspace.yaml          # Workspace configuration
├── turbo.json                   # Turborepo build orchestration
├── tsconfig.json                # Root TypeScript config
├── biome.jsonc                  # Biome formatter config
├── jest.config.js               # Root Jest config
├── vitest.workspace.ts          # Vitest workspace config
├── lefthook.yml                 # Git hooks configuration
└── .env.example                 # Environment variable template
```

## Directory Purposes

**`packages/cli/`:**
- Purpose: Backend Express server, REST API, CLI commands
- Contains: Controllers, services, modules, middlewares, commands
- Key files:
  - `packages/cli/src/server.ts` - Express server setup
  - `packages/cli/src/controllers/` - REST API controllers
  - `packages/cli/src/services/` - Business logic services
  - `packages/cli/src/modules/` - Feature modules (modular backend features)
  - `packages/cli/src/commands/` - CLI commands (oclif-based)
  - `packages/cli/src/databases/repositories/` - Legacy repository location (migrating to `@n8n/db`)
  - `packages/cli/src/middlewares/` - Express middleware
  - `packages/cli/src/public-api/v1/` - Public REST API (OpenAPI spec)
  - `packages/cli/src/webhooks/` - Webhook handling
  - `packages/cli/src/scaling/` - Queue/worker scaling (Redis pub/sub)
  - `packages/cli/src/push/` - WebSocket push notifications
  - `packages/cli/src/events/` - Event system and telemetry relays

**`packages/core/`:**
- Purpose: Workflow execution engine
- Contains: Node execution logic, binary data handling, credential management
- Key files:
  - `packages/core/src/execution-engine/` - Workflow execution engine
  - `packages/core/src/node-execute-functions.ts` - Node execution helper functions
  - `packages/core/src/credentials.ts` - Credential management
  - `packages/core/src/binary-data/` - Binary data storage
  - `packages/core/src/nodes-loader/` - Dynamic node loading

**`packages/workflow/`:**
- Purpose: Core workflow interfaces, types, and expression engine
- Contains: Type definitions, expression evaluator, graph utilities
- Key files:
  - `packages/workflow/src/interfaces.ts` - Core workflow interfaces
  - `packages/workflow/src/expression.ts` - Expression evaluator
  - `packages/workflow/src/common/` - Graph traversal utilities
  - `packages/workflow/src/graph/` - Graph algorithms
  - `packages/workflow/src/errors/` - Workflow error types

**`packages/@n8n/db/`:**
- Purpose: Database layer - entities, repositories, migrations
- Contains: TypeORM entities, repositories, DB migrations
- Key files:
  - `packages/@n8n/db/src/entities/` - TypeORM entity definitions
  - `packages/@n8n/db/src/repositories/` - Database repository classes
  - `packages/@n8n/db/src/migrations/sqlite/` - SQLite migrations
  - `packages/@n8n/db/src/migrations/postgresdb/` - PostgreSQL migrations
  - `packages/@n8n/db/src/migrations/dsl/` - Migration DSL utilities
  - `packages/@n8n/db/src/services/` - Database-level services

**`packages/nodes-base/`:**
- Purpose: All built-in integration nodes (~304 nodes)
- Contains: Node implementations, credential definitions, tests
- Key files:
  - `packages/nodes-base/nodes/` - Node implementations (one dir per service)
  - `packages/nodes-base/credentials/` - Credential type definitions
  - `packages/nodes-base/utils/` - Shared node utilities
  - `packages/nodes-base/test/` - Node integration tests

**`packages/frontend/editor-ui/`:**
- Purpose: Main Vue 3 web application (the n8n editor)
- Contains: Views, components, composables, stores, features
- Key files:
  - `packages/frontend/editor-ui/src/app/` - Core app shell (views, stores, components, routing)
  - `packages/frontend/editor-ui/src/features/` - Feature modules (domain-specific UI)
  - `packages/frontend/editor-ui/src/experiments/` - A/B test experiments
  - `packages/frontend/editor-ui/src/app/views/` - Top-level route views
  - `packages/frontend/editor-ui/src/app/stores/` - Pinia stores (app-level)
  - `packages/frontend/editor-ui/src/app/components/` - Shared app components
  - `packages/frontend/editor-ui/src/app/composables/` - Vue composables
  - `packages/frontend/editor-ui/src/app/constants/` - App constants
  - `packages/frontend/editor-ui/src/app/utils/` - Utility functions

**`packages/frontend/@n8n/design-system/`:**
- Purpose: Shared Vue component library for UI consistency
- Contains: Reusable Vue components (N8n-prefixed), CSS variables, tokens
- Key files:
  - `packages/frontend/@n8n/design-system/src/components/` - Vue components (N8nButton, N8nCard, etc.)
  - `packages/frontend/@n8n/design-system/src/css/` - Design tokens and CSS variables
  - `packages/frontend/@n8n/design-system/src/composables/` - Shared composables
  - `packages/frontend/@n8n/design-system/src/locale/` - Component-level i18n

**`packages/frontend/@n8n/stores/`:**
- Purpose: Shared Pinia stores used across frontend packages
- Key files:
  - `packages/frontend/@n8n/stores/src/useRootStore.ts` - Root application store
  - `packages/frontend/@n8n/stores/src/useAgentRequestStore.ts` - AI agent request store

**`packages/frontend/@n8n/rest-api-client/`:**
- Purpose: Typed REST API client for frontend-to-backend communication
- Key files:
  - `packages/frontend/@n8n/rest-api-client/src/api/` - API method definitions
  - `packages/frontend/@n8n/rest-api-client/src/types.ts` - Client types

**`packages/@n8n/api-types/`:**
- Purpose: Shared TypeScript interfaces between frontend and backend
- Contains: DTOs, schemas, request/response types
- Key files:
  - `packages/@n8n/api-types/src/dto/` - Data Transfer Objects
  - `packages/@n8n/api-types/src/schemas/` - Zod schemas
  - `packages/@n8n/api-types/src/frontend-settings.ts` - Settings shared with frontend

**`packages/@n8n/config/`:**
- Purpose: Centralized backend configuration using class-based config
- Key files:
  - `packages/@n8n/config/src/` - Config classes for all backend settings

**`packages/@n8n/nodes-langchain/`:**
- Purpose: AI/LangChain integration nodes
- Contains: AI agent nodes, memory nodes, tool nodes, chain nodes
- Key files:
  - `packages/@n8n/nodes-langchain/nodes/` - AI node implementations
  - `packages/@n8n/nodes-langchain/credentials/` - AI service credentials
  - `packages/@n8n/nodes-langchain/utils/` - AI utility functions

**`packages/testing/playwright/`:**
- Purpose: End-to-end tests using Playwright
- Contains: Test specs, page objects, composables, fixtures
- Key files:
  - `packages/testing/playwright/tests/` - Test spec files (*.spec.ts)
  - `packages/testing/playwright/pages/` - Page object classes
  - `packages/testing/playwright/composables/` - Test flow composables
  - `packages/testing/playwright/fixtures/` - Test fixtures and capabilities

## Key File Locations

**Entry Points:**
- `packages/cli/bin/n8n` - CLI binary entry point
- `packages/cli/src/server.ts` - Express server entry
- `packages/frontend/editor-ui/src/main.ts` - Frontend Vue app entry (expected)
- `packages/core/src/index.ts` - Core package exports

**Configuration:**
- `tsconfig.json` - Root TypeScript config
- `turbo.json` - Turborepo pipeline config
- `biome.jsonc` - Biome formatting rules
- `lefthook.yml` - Git hooks (pre-commit lint/typecheck)
- `jest.config.js` - Root Jest config (backend)
- `vitest.workspace.ts` - Vitest workspace config (frontend)
- `.env.example` - Environment variable template
- `packages/@n8n/config/src/` - All backend config classes
- `packages/@n8n/typescript-config/` - Shared tsconfig bases

**Core Logic:**
- `packages/workflow/src/interfaces.ts` - Fundamental workflow type definitions
- `packages/core/src/execution-engine/` - Workflow execution logic
- `packages/cli/src/controllers/` - All REST API endpoints
- `packages/cli/src/services/` - Backend business logic
- `packages/cli/src/modules/` - Backend feature modules
- `packages/@n8n/db/src/entities/` - Database entity models
- `packages/@n8n/db/src/repositories/` - Database access layer

**Testing:**
- `packages/testing/playwright/` - E2E Playwright tests
- `packages/cli/test/` - Backend integration tests
- `packages/cli/src/**/__tests__/` - Backend unit tests (co-located)
- `packages/nodes-base/nodes/**/*.test.ts` - Node unit tests (co-located)
- `packages/frontend/editor-ui/src/**/*.test.ts` - Frontend unit tests (co-located)

## Naming Conventions

**Files:**
- `kebab-case.ts` for most source files: `active-workflows.controller.ts`
- `camelCase.ts` for frontend feature modules: `useRootStore.ts`
- `PascalCase.vue` for Vue components: `WorkflowsView.vue`, `NodeView.vue`
- `*.ee.ts` suffix for enterprise-edition features: `annotation-tag.service.ee.ts`
- `*.controller.ts` for API controllers
- `*.service.ts` for business logic services
- `*.test.ts` or `*.spec.ts` for tests

**Directories:**
- `kebab-case/` for most directories: `binary-data/`, `execution-lifecycle/`
- `camelCase/` for frontend feature subdirectories: `chatHub/`, `nodeCreator/`
- `*.ee/` suffix for enterprise-edition feature directories: `environments.ee/`, `source-control.ee/`
- `__tests__/` for co-located test directories

**Node Packages:**
- `packages/nodes-base/nodes/[ServiceName]/` - PascalCase directory per integration
- Each node dir contains: `[ServiceName].node.ts`, `[ServiceName].node.json` (codex), description files
- Credentials in `packages/nodes-base/credentials/[ServiceName]Api.credentials.ts`

**Backend Modules (new pattern):**
- `packages/cli/src/modules/[module-name]/` - Self-contained feature modules
- Each contains its own controllers, services, and tests
- See `scripts/backend-module/backend-module-guide.md` for scaffolding

## Where to Add New Code

**New Backend API Endpoint:**
- Define types in `packages/@n8n/api-types/src/dto/`
- Add controller in `packages/cli/src/controllers/` or within a module in `packages/cli/src/modules/`
- Add service in `packages/cli/src/services/` or within the relevant module
- Follow `packages/cli/scripts/backend-module/backend-module-guide.md` for new feature modules
- Tests go in co-located `__tests__/` directory

**New Backend Feature Module:**
- Create directory: `packages/cli/src/modules/[feature-name]/`
- Include controller, service, and test files within the module
- Enterprise features use `.ee` suffix: `packages/cli/src/modules/[feature-name].ee/`

**New Database Entity/Migration:**
- Entity: `packages/@n8n/db/src/entities/[entity-name].ts`
- Repository: `packages/@n8n/db/src/repositories/[entity-name].repository.ts`
- Migration (SQLite): `packages/@n8n/db/src/migrations/sqlite/`
- Migration (Postgres): `packages/@n8n/db/src/migrations/postgresdb/`

**New Integration Node:**
- Node: `packages/nodes-base/nodes/[ServiceName]/[ServiceName].node.ts`
- Credentials: `packages/nodes-base/credentials/[ServiceName]Api.credentials.ts`
- Tests: `packages/nodes-base/nodes/[ServiceName]/__tests__/`
- Use `@n8n/create-node` CLI for scaffolding

**New AI/LangChain Node:**
- Node: `packages/@n8n/nodes-langchain/nodes/[category]/[NodeName]/[NodeName].node.ts`
- Credentials: `packages/@n8n/nodes-langchain/credentials/`

**New Frontend Feature:**
- Feature module: `packages/frontend/editor-ui/src/features/[feature-name]/`
- Include components, composables, views within the feature directory
- Reusable UI components: `packages/frontend/@n8n/design-system/src/components/`
- Shared composables: `packages/frontend/@n8n/composables/src/`
- All UI text must use i18n: `packages/frontend/@n8n/i18n/src/`

**New Frontend View/Page:**
- View component: `packages/frontend/editor-ui/src/app/views/`
- Register route in the router configuration

**New Pinia Store:**
- App-level store: `packages/frontend/editor-ui/src/app/stores/`
- Shared store: `packages/frontend/@n8n/stores/src/`

**New E2E Test:**
- Test file: `packages/testing/playwright/tests/e2e/[feature].spec.ts`
- Page object: `packages/testing/playwright/pages/[Feature]Page.ts`
- Test composable: `packages/testing/playwright/composables/[Feature]Composer.ts`

**New Custom Node (local development):**
- Package: `custom-nodes/n8n-nodes-[name]/`
- Listed in `pnpm-workspace.yaml` under `custom-nodes/*`

**Shared Utilities:**
- Backend utilities: `packages/@n8n/utils/src/`
- Frontend utilities: `packages/frontend/editor-ui/src/app/utils/`
- Workflow utilities: `packages/workflow/src/common/`

## Special Directories

**`packages/cli/src/modules/`:**
- Purpose: Self-contained backend feature modules (newer pattern)
- Contains: Each module bundles its own controller, service, tests
- Generated: No
- Committed: Yes

**`dist/` (in each package):**
- Purpose: Compiled JavaScript output
- Generated: Yes (by `pnpm build`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: Package dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No

**`.turbo/`:**
- Purpose: Turborepo build cache
- Generated: Yes
- Committed: No

**`patches/`:**
- Purpose: pnpm patch overrides for dependencies
- Generated: No (manual)
- Committed: Yes

**`workflows/`:**
- Purpose: Workflow JSON files for import/templates
- Contains: CRM and Odoo workflow templates
- Generated: No
- Committed: Yes

**`.planning/`:**
- Purpose: Project planning and codebase analysis docs
- Generated: By analysis tools
- Committed: Yes

**`packages/frontend/editor-ui/src/experiments/`:**
- Purpose: A/B test experiment implementations (PostHog feature flags)
- Contains: Each experiment in its own directory
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-07*
