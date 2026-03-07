# External Integrations

**Analysis Date:** 2026-03-07

## APIs & External Services

**n8n Cloud APIs:**
- **Templates API** - Fetches workflow templates for the template gallery
  - Endpoint: `https://api.n8n.io/api/`
  - Dynamic templates: `https://dynamic-templates.n8n.io/templates`
  - Config: `packages/@n8n/config/src/configs/templates.config.ts`
  - Env: `N8N_TEMPLATES_HOST`, `N8N_DYNAMIC_TEMPLATES_HOST`

- **Version Notifications API** - Checks for new n8n versions and "What's New" content
  - Endpoint: `https://api.n8n.io/api/versions/`
  - What's New: `https://api.n8n.io/api/whats-new`
  - Config: `packages/@n8n/config/src/configs/version-notifications.config.ts`
  - Env: `N8N_VERSION_NOTIFICATIONS_ENDPOINT`, `N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENDPOINT`

- **License Server** - Validates and refreshes license certificates
  - Endpoint: `https://license.n8n.io/v1`
  - SDK: `@n8n_io/license-sdk` (via `LicenseManager`)
  - Implementation: `packages/cli/src/license.ts`
  - Config: `packages/@n8n/config/src/configs/license.config.ts`
  - Env: `N8N_LICENSE_SERVER_URL`, `N8N_LICENSE_ACTIVATION_KEY`, `N8N_LICENSE_CERT`

**AI Services:**
- **Anthropic (Claude)** - Powers the AI workflow builder
  - Config: `packages/@n8n/config/src/configs/ai-builder.config.ts`
  - Env: `N8N_AI_ANTHROPIC_KEY`
  - Module: `packages/cli/src/modules/workflow-builder/workflow-builder.module.ts`

- **AI Assistant Service** - External AI assistant for user help
  - Config: `packages/@n8n/config/src/configs/ai-assistant.config.ts`
  - Env: `N8N_AI_ASSISTANT_BASE_URL`

- **OpenAI** - Used by AI features and LangChain nodes
  - Default headers set in `packages/@n8n/config/src/configs/ai.config.ts`
  - Env: `N8N_AI_ENABLED`, `N8N_AI_TIMEOUT_MAX`

**MCP (Model Context Protocol):**
- n8n exposes an MCP server that allows external AI agents to execute workflows
  - Full OAuth2 implementation with consent flow
  - Module: `packages/cli/src/modules/mcp/`
  - Service: `packages/cli/src/modules/mcp/mcp.service.ts`
  - OAuth: `packages/cli/src/modules/mcp/mcp-oauth-service.ts`
  - SDK: `@modelcontextprotocol/sdk`
  - Endpoints: `/mcp` (production), `/mcp-test` (test)
  - Env: `N8N_ENDPOINT_MCP`, `N8N_ENDPOINT_MCP_TEST`

**Custom Nodes (Fork-Specific):**
- **Odoo Generic** - Custom node for Odoo ERP integration via XML-RPC
  - Location: `custom-nodes/n8n-nodes-odoo-generic/`
  - Node: `custom-nodes/n8n-nodes-odoo-generic/nodes/OdooGeneric/OdooGeneric.node.ts`
  - Credentials: `custom-nodes/n8n-nodes-odoo-generic/credentials/OdooGenericApi.credentials.ts`
  - Supports: Contacts, Leads, Sale Orders, Custom Models, Execute Method

## Data Storage

**Databases:**
- **SQLite** (default)
  - Config: `packages/@n8n/config/src/configs/database.config.ts`
  - Env: `DB_TYPE=sqlite`, `DB_SQLITE_DATABASE`, `DB_SQLITE_POOL_SIZE`
  - ORM: TypeORM
  - Default file: `database.sqlite`

- **PostgreSQL** (production recommended)
  - Config: `packages/@n8n/config/src/configs/database.config.ts`
  - Env: `DB_TYPE=postgresdb`, `DB_POSTGRESDB_HOST`, `DB_POSTGRESDB_PORT`, `DB_POSTGRESDB_DATABASE`, `DB_POSTGRESDB_USER`, `DB_POSTGRESDB_PASSWORD`
  - SSL support: `DB_POSTGRESDB_SSL_ENABLED`, `DB_POSTGRESDB_SSL_CA`, `DB_POSTGRESDB_SSL_CERT`, `DB_POSTGRESDB_SSL_KEY`
  - Connection pool: `DB_POSTGRESDB_POOL_SIZE` (default: 2)
  - Statement timeout: `DB_POSTGRESDB_STATEMENT_TIMEOUT` (default: 5 min)
  - ORM: TypeORM

**Caching:**
- **In-Memory** (default for single instances)
  - Max size: 3 MiB, TTL: 1 hour
  - Env: `N8N_CACHE_MEMORY_MAX_SIZE`, `N8N_CACHE_MEMORY_TTL`

- **Redis** (for scaling mode)
  - Config: `packages/@n8n/config/src/configs/cache.config.ts`
  - Env: `N8N_CACHE_BACKEND=redis`, `N8N_CACHE_REDIS_KEY_PREFIX`, `N8N_CACHE_REDIS_TTL`
  - Auto mode: `N8N_CACHE_BACKEND=auto` selects based on deployment

**Redis (Queue/PubSub/Multi-Main):**
- Used for job queuing (BullMQ), pub/sub messaging, and multi-main leader election
  - Client: `ioredis` via `packages/cli/src/services/redis-client.service.ts`
  - Queue config: `packages/@n8n/config/src/configs/scaling-mode.config.ts`
  - Env: `QUEUE_BULL_REDIS_HOST`, `QUEUE_BULL_REDIS_PORT`, `QUEUE_BULL_REDIS_PASSWORD`, `QUEUE_BULL_REDIS_DB`, `QUEUE_BULL_REDIS_USERNAME`
  - TLS: `QUEUE_BULL_REDIS_TLS`
  - Cluster: `QUEUE_BULL_REDIS_CLUSTER_NODES`
  - Key prefix: `N8N_REDIS_KEY_PREFIX` (default: `n8n`)
  - Pub/Sub: `packages/cli/src/scaling/pubsub/publisher.service.ts`, `packages/cli/src/scaling/pubsub/subscriber.service.ts`
  - Multi-main: `packages/cli/src/scaling/multi-main-setup.ee.ts`
  - Multi-main config: `packages/@n8n/config/src/configs/multi-main-setup.config.ts`

**File Storage:**
- Local filesystem by default (n8n data dir: `~/.n8n`)
- Docker volume: `n8n_data:/home/node/.n8n`

## Authentication & Identity

**Built-in Email/Password Auth:**
- JWT-based session management
  - Implementation: `packages/cli/src/auth/auth.service.ts`
  - JWT handler: `packages/cli/src/auth/jwt.ts`
  - Email handler: `packages/cli/src/auth/handlers/email.auth-handler.ts`
  - Config: `packages/@n8n/config/src/configs/user-management.config.ts`
  - Env: `N8N_USER_MANAGEMENT_JWT_SECRET`, `N8N_USER_MANAGEMENT_JWT_DURATION_HOURS`

**SAML SSO (Enterprise):**
- SAML 2.0-based single sign-on
  - Module: `packages/cli/src/modules/sso-saml/`
  - Service: `packages/cli/src/modules/sso-saml/saml.service.ee.ts`
  - Controller: `packages/cli/src/modules/sso-saml/saml.controller.ee.ts`
  - Env: `N8N_SSO_SAML_LOGIN_ENABLED`, `N8N_SSO_SAML_LOGIN_LABEL`

**OIDC SSO (Enterprise):**
- OpenID Connect-based single sign-on
  - SDK: `openid-client`
  - Module: `packages/cli/src/modules/sso-oidc/`
  - Service: `packages/cli/src/modules/sso-oidc/oidc.service.ee.ts`
  - Controller: `packages/cli/src/modules/sso-oidc/oidc.controller.ee.ts`
  - Env: `N8N_SSO_OIDC_LOGIN_ENABLED`

**LDAP (Enterprise):**
- LDAP directory-based authentication and user sync
  - SDK: `ldapts`
  - Module: `packages/cli/src/modules/ldap.ee/`
  - Service: `packages/cli/src/modules/ldap.ee/ldap.service.ee.ts`
  - Controller: `packages/cli/src/modules/ldap.ee/ldap.controller.ee.ts`
  - Env: `N8N_SSO_LDAP_LOGIN_ENABLED`, `N8N_SSO_LDAP_LOGIN_LABEL`

**SSO Provisioning:**
- JIT provisioning for first-time SSO users
  - Role and project assignment from SSO claims
  - Config: `packages/@n8n/config/src/configs/sso.config.ts`
  - Env: `N8N_SSO_JUST_IN_TIME_PROVISIONING`, `N8N_SSO_REDIRECT_LOGIN_TO_SSO`
  - Claim mapping: `N8N_SSO_SCOPES_PROVISION_INSTANCE_ROLE`, `N8N_SSO_SCOPES_PROVISION_PROJECT_ROLES`

**MFA (Multi-Factor Authentication):**
- TOTP-based multi-factor auth
  - Config: `packages/@n8n/config/src/configs/mfa.config.ts`
  - Env: `N8N_MFA_ENABLED`

## External Secrets Providers (Enterprise)

Centralized external secrets management with multiple provider support.

- **Module:** `packages/cli/src/modules/external-secrets.ee/`
- **Config:** `packages/cli/src/modules/external-secrets.ee/external-secrets.config.ts`
- **Env:** `N8N_EXTERNAL_SECRETS_UPDATE_INTERVAL` (default: 300s)

**Supported Providers:**

- **AWS Secrets Manager**
  - SDK: `@aws-sdk/client-secrets-manager`
  - Implementation: `packages/cli/src/modules/external-secrets.ee/providers/aws-secrets-manager.ts`

- **Azure Key Vault**
  - SDK: `@azure/keyvault-secrets`, `@azure/identity`
  - Implementation: `packages/cli/src/modules/external-secrets.ee/providers/azure-key-vault/azure-key-vault.ts`

- **GCP Secret Manager**
  - SDK: `@google-cloud/secret-manager`
  - Implementation: `packages/cli/src/modules/external-secrets.ee/providers/gcp-secrets-manager/gcp-secrets-manager.ts`

- **HashiCorp Vault**
  - Client: Custom axios-based (token, username/password, or AppRole auth)
  - Implementation: `packages/cli/src/modules/external-secrets.ee/providers/vault.ts`
  - Env: `N8N_EXTERNAL_SECRETS_PREFER_GET`

- **Infisical**
  - SDK: `infisical-node`
  - Implementation: `packages/cli/src/modules/external-secrets.ee/providers/infisical.ts`

## Monitoring & Observability

**Sentry (Error Tracking & APM):**
- Backend and frontend error tracking, tracing, and profiling
  - SDK: `@sentry/node`
  - Config: `packages/@n8n/config/src/configs/sentry.config.ts`
  - Env: `N8N_SENTRY_DSN` (backend), `N8N_FRONTEND_SENTRY_DSN` (frontend)
  - Tracing: `N8N_SENTRY_TRACES_SAMPLE_RATE`
  - Profiling: `N8N_SENTRY_PROFILES_SAMPLE_RATE`
  - Event loop detection: `N8N_SENTRY_EVENT_LOOP_BLOCK_THRESHOLD`
  - Setup: `packages/cli/src/commands/start.ts`, `packages/cli/src/abstract-server.ts`

**Prometheus Metrics:**
- Exposes `/metrics` endpoint for Prometheus scraping
  - SDK: `prom-client`, `express-prom-bundle`
  - Implementation: `packages/cli/src/metrics/prometheus-metrics.service.ts`
  - Config: `packages/@n8n/config/src/configs/endpoints.config.ts`
  - Env: `N8N_METRICS=true`
  - Labels: `N8N_METRICS_INCLUDE_WORKFLOW_ID_LABEL`, `N8N_METRICS_INCLUDE_NODE_TYPE_LABEL`, `N8N_METRICS_INCLUDE_WORKFLOW_NAME_LABEL`
  - Queue metrics: `N8N_METRICS_INCLUDE_QUEUE_METRICS`
  - API metrics: `N8N_METRICS_INCLUDE_API_ENDPOINTS`
  - Cache metrics: `N8N_METRICS_INCLUDE_CACHE_METRICS`

**Telemetry (Product Analytics):**
- **PostHog** - Feature flags and product analytics
  - SDK: `posthog-node`
  - Client: `packages/cli/src/posthog/index.ts`
  - Config: `packages/@n8n/config/src/configs/diagnostics.config.ts`
  - Env: `N8N_DIAGNOSTICS_POSTHOG_API_KEY`, `N8N_DIAGNOSTICS_POSTHOG_API_HOST`
  - Default host: `https://us.i.posthog.com`

- **RudderStack** - Event tracking and analytics pipeline
  - SDK: `@rudderstack/rudder-sdk-node`
  - Client: `packages/cli/src/telemetry/index.ts`
  - Config: `packages/@n8n/config/src/configs/diagnostics.config.ts`
  - Env: `N8N_DIAGNOSTICS_CONFIG_BACKEND`, `N8N_DIAGNOSTICS_CONFIG_FRONTEND`
  - Default endpoint: `https://telemetry.n8n.io`

- Telemetry can be disabled: `N8N_DIAGNOSTICS_ENABLED=false`

**Log Streaming (Enterprise):**
- Streams n8n events to external destinations
  - Module: `packages/cli/src/modules/log-streaming.ee/`
  - Destinations:
    - **Webhook:** `packages/cli/src/modules/log-streaming.ee/destinations/message-event-bus-destination-webhook.ee.ts`
    - **Syslog:** `packages/cli/src/modules/log-streaming.ee/destinations/message-event-bus-destination-syslog.ee.ts`
    - **Sentry:** `packages/cli/src/modules/log-streaming.ee/destinations/message-event-bus-destination-sentry.ee.ts`

**Logging:**
- Console or file-based logging
  - Config: `packages/@n8n/config/src/configs/logging.config.ts`
  - Env: `N8N_LOG_LEVEL`, `N8N_LOG_OUTPUT`, `N8N_LOG_FORMAT`
  - File output: `N8N_LOG_FILE_LOCATION`, `N8N_LOG_FILE_SIZE_MAX`, `N8N_LOG_FILE_COUNT_MAX`
  - Scope filtering: `N8N_LOG_SCOPES`

## Email (SMTP)

**Nodemailer-based SMTP:**
- Used for user invitations, password resets, workflow failure notifications, and sharing notifications
  - SDK: `nodemailer`
  - Implementation: `packages/cli/src/user-management/email/node-mailer.ts`
  - Mailer: `packages/cli/src/user-management/email/user-management-mailer.ts`
  - Config: `packages/@n8n/config/src/configs/user-management.config.ts`
  - Env: `N8N_EMAIL_MODE=smtp`, `N8N_SMTP_HOST`, `N8N_SMTP_PORT`, `N8N_SMTP_SSL`, `N8N_SMTP_USER`, `N8N_SMTP_PASS`, `N8N_SMTP_SENDER`
  - OAuth support: `N8N_SMTP_OAUTH_SERVICE_CLIENT`, `N8N_SMTP_OAUTH_PRIVATE_KEY`
  - Email templates (overridable): `N8N_UM_EMAIL_TEMPLATES_INVITE`, `N8N_UM_EMAIL_TEMPLATES_PWRESET`, `N8N_UM_EMAIL_TEMPLATES_WORKFLOW_SHARED`, `N8N_UM_EMAIL_TEMPLATES_WORKFLOW_FAILURE`

## Source Control (Git)

**Git-based Version Control (Enterprise):**
- Push/pull workflows, credentials, and variables to/from a Git remote
  - SDK: `simple-git`
  - Module: `packages/cli/src/modules/source-control.ee/`
  - Git service: `packages/cli/src/modules/source-control.ee/source-control-git.service.ee.ts`
  - Export: `packages/cli/src/modules/source-control.ee/source-control-export.service.ee.ts`
  - Import: `packages/cli/src/modules/source-control.ee/source-control-import.service.ee.ts`
  - Config: `packages/cli/src/modules/source-control.ee/source-control.config.ts`

## Webhooks & Callbacks

**Incoming Webhooks:**
- n8n exposes webhook endpoints that external services can call to trigger workflows
  - Server: `packages/cli/src/webhooks/webhook-server.ts`
  - Handler: `packages/cli/src/webhooks/webhook-request-handler.ts`
  - Service: `packages/cli/src/webhooks/webhook.service.ts`
  - Controller: `packages/cli/src/webhooks/webhooks.controller.ts`
  - Endpoints: `/webhook/:path` (production), `/webhook-test/:path` (testing), `/webhook-waiting/:path` (waiting)
  - Form endpoints: `/form/:path`, `/form-test/:path`, `/form-waiting/:path`
  - Env: `N8N_ENDPOINT_WEBHOOK`, `N8N_ENDPOINT_WEBHOOK_TEST`, `N8N_ENDPOINT_WEBHOOK_WAIT`

**Health Check:**
- Endpoint: `/healthz` (configurable via `N8N_ENDPOINT_HEALTH`)
- Worker health: `QUEUE_HEALTH_CHECK_ACTIVE`, `QUEUE_HEALTH_CHECK_PORT`

**Public API:**
- RESTful API at `/api/v1/...`
  - Config: `packages/@n8n/config/src/configs/public-api.config.ts`
  - Env: `N8N_PUBLIC_API_DISABLED`, `N8N_PUBLIC_API_ENDPOINT`
  - Swagger UI: disable with `N8N_PUBLIC_API_SWAGGERUI_DISABLED`

## CI/CD & Deployment

**Docker:**
- Custom Dockerfile with bundled custom nodes: `deploy/Dockerfile`
- Docker Compose: `deploy/docker-compose.yml`
- Port: 5678

**External Hooks:**
- Lifecycle hook system for custom extensions
  - Config: `packages/@n8n/config/src/configs/external-hooks.config.ts`
  - Env: `EXTERNAL_HOOK_FILES` (colon-separated file paths)

## Task Runners

**Code Execution Runners:**
- Sandboxed execution for Code nodes (JS/Python)
  - Config: `packages/@n8n/config/src/configs/runners.config.ts`
  - Modes: `internal` (child process) or `external` (separate process)
  - Env: `N8N_RUNNERS_MODE`, `N8N_RUNNERS_AUTH_TOKEN`, `N8N_RUNNERS_BROKER_PORT`
  - Concurrency: `N8N_RUNNERS_MAX_CONCURRENCY` (default: 10)
  - Timeout: `N8N_RUNNERS_TASK_TIMEOUT` (default: 300s)

## Environment Configuration

**Required env vars (minimum):**
- `DB_TYPE` - Database type (`sqlite` or `postgresdb`)
- `N8N_ENCRYPTION_KEY` - Encryption key for credentials (auto-generated if not set)

**Required for production:**
- `DB_POSTGRESDB_HOST`, `DB_POSTGRESDB_DATABASE`, `DB_POSTGRESDB_USER`, `DB_POSTGRESDB_PASSWORD`
- `N8N_USER_MANAGEMENT_JWT_SECRET`
- `N8N_SMTP_HOST`, `N8N_SMTP_PORT`, `N8N_SMTP_USER`, `N8N_SMTP_PASS` (for email)

**Required for scaling mode:**
- `QUEUE_BULL_REDIS_HOST`, `QUEUE_BULL_REDIS_PORT`
- `QUEUE_BULL_REDIS_PASSWORD` (if Redis requires auth)

**Secrets location:**
- `.env` file present at project root (loaded via docker-compose `env_file`)
- `.env.example` exists with configuration template

---

*Integration audit: 2026-03-07*
