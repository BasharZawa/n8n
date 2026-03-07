# Architecture

**Analysis Date:** 2026-03-07

## Pattern Overview

**Overall:** Modular monorepo with layered backend (Controller-Service-Repository) and feature-based frontend (Vue 3 + Pinia)

**Key Characteristics:**
- pnpm workspace monorepo with Turbo build orchestration
- Dependency injection via `@n8n/di` (custom IoC container with `@Service()` decorator)
- Decorator-driven backend with `@n8n/decorators` providing `@RestController`, `@BackendModule`, `@Command`, route decorators, lifecycle hooks
- Event-driven internal communication via `EventService` and relay pattern
- Real-time client updates via WebSocket/SSE push system
- Enterprise features gated by `.ee` suffix convention and license flags
- Backend modules as self-contained feature units with lazy loading

## Layers

**API Types (Shared Contract):**
- Purpose: TypeScript interfaces and DTOs shared between frontend and backend
- Location: `packages/@n8n/api-types/src/`
- Contains: Zod-based DTOs (`dto/`), schemas (`schemas/`), push message types (`push/`), frontend settings types
- Depends on: `zod`
- Used by: `packages/cli` (backend), `packages/frontend/editor-ui` (frontend)

**Workflow Engine (Core Domain):**
- Purpose: Core workflow type definitions, expression evaluation, graph traversal, node parameter resolution
- Location: `packages/workflow/src/`
- Contains: Workflow interfaces (`Interfaces.ts`), expression runtime (`expressions/`), graph utilities (`graph/`, `common/`), error hierarchy (`errors/`)
- Depends on: Nothing (foundational package)
- Used by: `packages/core`, `packages/cli`, `packages/nodes-base`, `packages/frontend`

**Execution Engine:**
- Purpose: Workflow execution runtime, node execution contexts, binary data handling
- Location: `packages/core/src/`
- Contains: Execution engine (`execution-engine/`), partial execution (`partial-execution-utils/`), binary data management (`binary-data/`), node loader (`nodes-loader/`), instance settings (`instance-settings/`)
- Depends on: `packages/workflow`
- Used by: `packages/cli`

**Database (Persistence):**
- Purpose: TypeORM entities, repositories, migrations, database connection management
- Location: `packages/@n8n/db/src/`
- Contains: Entities (`entities/`), repositories (`repositories/`), migrations (`migrations/postgresdb/`, `migrations/sqlite/`), connection management (`connection/`), subscribers (`subscribers/`)
- Depends on: `@n8n/typeorm`
- Used by: `packages/cli`

**Backend Server (Application):**
- Purpose: Express HTTP server, REST API controllers, services, CLI commands, scaling/worker infrastructure
- Location: `packages/cli/src/`
- Contains: Controllers (`controllers/`), services (`services/`), modules (`modules/`), commands (`commands/`), webhooks (`webhooks/`), scaling (`scaling/`), execution lifecycle (`execution-lifecycle/`)
- Depends on: `packages/core`, `packages/workflow`, `packages/@n8n/db`, `packages/@n8n/config`
- Used by: End users via HTTP/CLI

**Frontend (UI):**
- Purpose: Vue 3 SPA workflow editor with canvas, node detail view, settings
- Location: `packages/frontend/editor-ui/src/`
- Contains: App shell (`app/`), feature modules (`features/`), experiments (`experiments/`)
- Depends on: `@n8n/design-system`, `@n8n/rest-api-client`, `@n8n/stores`, `@n8n/i18n`, `@n8n/composables`
- Used by: End users via browser

**Design System:**
- Purpose: Reusable Vue component library for UI consistency
- Location: `packages/frontend/@n8n/design-system/src/`
- Contains: Components (`components/`), composables (`composables/`), CSS variables (`css/`), locale (`locale/`)
- Depends on: `vue`, `element-plus`
- Used by: `packages/frontend/editor-ui`

**Nodes (Integration Layer):**
- Purpose: Built-in node implementations for third-party integrations
- Location: `packages/nodes-base/nodes/`
- Contains: ~200+ integration nodes (e.g., `Airtable/`, `Aws/`, `Slack/`, `Google/`)
- Depends on: `packages/workflow`
- Used by: Workflow execution engine at runtime

**AI/LangChain Nodes:**
- Purpose: AI-specific nodes for LLM workflows
- Location: `packages/@n8n/nodes-langchain/`
- Contains: LangChain-based AI nodes, MCP server
- Depends on: `@langchain/*`, `packages/workflow`
- Used by: Workflow execution engine at runtime

## Data Flow

**Workflow Execution (Main Instance):**

1. User triggers execution via UI or webhook
2. `packages/cli/src/workflow-runner.ts` receives execution request
3. `packages/core/src/execution-engine/workflow-execute.ts` orchestrates node-by-node execution
4. Each node runs in an execution context (`packages/core/src/execution-engine/node-execution-context/`)
5. Execution lifecycle hooks fire events (`packages/cli/src/execution-lifecycle/`)
6. Results saved via `ExecutionRepository` in `packages/@n8n/db/src/repositories/`
7. Push service (`packages/cli/src/push/`) sends real-time updates to connected UI clients

**Webhook-Triggered Execution:**

1. External HTTP request hits webhook endpoint
2. `packages/cli/src/webhooks/webhook-request-handler.ts` routes to appropriate handler
3. `LiveWebhooks` (`packages/cli/src/webhooks/live-webhooks.ts`) or `TestWebhooks` resolve the target workflow
4. Execution follows same path as manual execution from step 2

**Scaled Execution (Worker Mode):**

1. Main instance enqueues execution via `packages/cli/src/scaling/scaling.service.ts`
2. Uses Redis-backed Bull queue for job distribution
3. Worker instance (`packages/cli/src/commands/worker.ts`) picks up job
4. `packages/cli/src/scaling/job-processor.ts` executes workflow
5. PubSub system (`packages/cli/src/scaling/pubsub/`) coordinates between instances

**State Management (Frontend):**
- Pinia stores in `packages/frontend/editor-ui/src/app/stores/` for global app state
- Feature-specific stores co-located with features (e.g., `features/credentials/credentials.store.ts`)
- REST API client (`packages/frontend/@n8n/rest-api-client/`) for backend communication
- Push connection store (`packages/frontend/editor-ui/src/app/stores/pushConnection.store.ts`) for real-time updates

## Key Abstractions

**Dependency Injection Container:**
- Purpose: IoC container for service instantiation and lifecycle management
- Implementation: `packages/@n8n/di/src/di.ts`
- Pattern: `@Service()` decorator registers classes; `Container.get(Class)` resolves instances with constructor injection via `reflect-metadata`

**Controller Registry:**
- Purpose: Auto-discovers and registers decorated REST controllers with Express
- Implementation: `packages/cli/src/controller.registry.ts`
- Pattern: Controllers use `@RestController('/path')` decorator with route decorators (`@Get`, `@Post`, etc.). Side-effect imports in `packages/cli/src/server.ts` register controllers.

**Backend Modules:**
- Purpose: Self-contained feature units that can declare entities, controllers, services, settings
- Implementation: `packages/@n8n/decorators/src/module/module.ts`
- Pattern: `@BackendModule({ name, instanceTypes, licenseFlag })` decorator. Modules implement `ModuleInterface` with optional `init()`, `entities()`, `settings()`, `context()`, `shutdown()` methods.
- Examples: `packages/cli/src/modules/insights/insights.module.ts`, `packages/cli/src/modules/source-control.ee/`, `packages/cli/src/modules/external-secrets.ee/`

**Node Type System:**
- Purpose: Defines the interface for all workflow nodes (triggers, actions, etc.)
- Implementation: `packages/workflow/src/Interfaces.ts` (INodeType, INodeTypeDescription)
- Pattern: Each node exports a class implementing `INodeType` with `description` and `execute()` method

**Execution Context:**
- Purpose: Provides sandboxed access to workflow data, credentials, helpers during node execution
- Implementation: `packages/core/src/execution-engine/node-execution-context/`
- Pattern: Different context classes for different node types (execute, poll, trigger, webhook)

## Entry Points

**CLI Start Command:**
- Location: `packages/cli/src/commands/start.ts`
- Triggers: `n8n start` CLI command
- Responsibilities: Initializes database, loads nodes/credentials, starts HTTP server, activates workflows, starts task runners

**HTTP Server:**
- Location: `packages/cli/src/server.ts` (extends `packages/cli/src/abstract-server.ts`)
- Triggers: Instantiated by Start command
- Responsibilities: Mounts Express middleware, registers controllers via `ControllerRegistry`, serves editor UI static files, configures webhook endpoints

**Worker Command:**
- Location: `packages/cli/src/commands/worker.ts`
- Triggers: `n8n worker` CLI command
- Responsibilities: Connects to Redis queue, processes execution jobs, reports status

**Webhook Command:**
- Location: `packages/cli/src/commands/webhook.ts`
- Triggers: `n8n webhook` CLI command
- Responsibilities: Runs a dedicated webhook-processing instance (no UI)

**Frontend App:**
- Location: `packages/frontend/editor-ui/src/main.ts`
- Triggers: Browser navigation
- Responsibilities: Bootstraps Vue app, initializes router (`packages/frontend/editor-ui/src/app/router.ts`), registers Pinia stores

**Public API:**
- Location: `packages/cli/src/public-api/v1/`
- Triggers: HTTP requests to `/api/v1/`
- Responsibilities: OpenAPI-documented external API for programmatic access

## Error Handling

**Strategy:** Hierarchical error classes with HTTP-aware response errors

**Patterns:**
- Base error classes in `packages/workflow/src/errors/` and `packages/core/src/errors/`
- Use `UnexpectedError`, `OperationalError`, or `UserError` (NOT deprecated `ApplicationError`)
- Response errors in `packages/cli/src/errors/response-errors/` map to HTTP status codes (e.g., `NotFoundError`, `UnauthenticatedError`, `ServiceUnavailableError`)
- `packages/cli/src/response-helper.ts` provides `send()` and `sendErrorResponse()` for standardized API responses

## Cross-Cutting Concerns

**Logging:**
- `Logger` from `@n8n/backend-common` (backend)
- Constructor-injected via DI container
- Structured logging with context

**Validation:**
- Zod schemas for API request/response validation (`packages/@n8n/api-types/src/dto/`)
- Controller decorators `@Body()`, `@Query()`, `@Param()` for parameter extraction and validation

**Authentication:**
- `packages/cli/src/auth/auth.service.ts` handles session-based auth
- `@GlobalScope()` and `@ProjectScope()` decorators on controller methods for authorization
- `@Licensed()` decorator for enterprise feature gating
- SSO support via SAML (`packages/cli/src/modules/sso-saml/`) and OIDC (`packages/cli/src/modules/sso-oidc/`)
- LDAP integration (`packages/cli/src/modules/ldap.ee/`)

**Configuration:**
- Centralized config classes in `packages/@n8n/config/src/configs/`
- Decorator-based config with validation
- Runtime config via `packages/cli/src/config/` (legacy convict-based)

**Events:**
- `EventService` (`packages/cli/src/events/event.service.ts`) as internal event bus
- Event relays (`packages/cli/src/events/relays/`) forward events to external systems (telemetry, log streaming)
- Event maps (`packages/cli/src/events/maps/`) define event type mappings

**Real-Time Push:**
- WebSocket and SSE transports (`packages/cli/src/push/websocket.push.ts`, `packages/cli/src/push/sse.push.ts`)
- Push message types defined in `packages/@n8n/api-types/src/push/`
- Frontend receives via push connection store

---

*Architecture analysis: 2026-03-07*
