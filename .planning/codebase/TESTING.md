# Testing Patterns

**Analysis Date:** 2026-03-07

## Test Frameworks

**Backend (Unit + Integration):**
- Jest `^29.6.2` with `ts-jest` `^29.1.1`
- Root config: `jest.config.js`
- Environment: `node`
- Test regex: `\.(test|spec)\.(js|ts)$`

**Frontend (Unit):**
- Vitest (via `@n8n/vitest-config` shared config package)
- Environment: `jsdom`
- Globals enabled (`describe`, `it`, `expect` available without imports)
- Setup file: `src/__tests__/setup.ts` in each frontend package

**E2E:**
- Playwright (package: `n8n-playwright`)
- Config: `packages/testing/playwright/playwright.config.ts`
- Parallel execution with worker isolation

**Assertion Libraries:**
- Jest: built-in + `jest-expect-message` for custom error messages
- Vitest: built-in (compatible with Jest API)
- Playwright: built-in `expect` with custom matchers

**Run Commands:**
```bash
pnpm test                          # Run all tests (monorepo-wide via Turbo)
pnpm test:affected                 # Tests affected by recent changes
pnpm test:ci:backend:unit          # Backend unit tests only
pnpm test:ci:backend:integration   # Backend integration tests only
pnpm test:ci:frontend              # Frontend tests only

# Package-specific (run from package directory):
cd packages/cli && pnpm test       # CLI package tests
cd packages/nodes-base && pnpm test # Node tests
cd packages/frontend/editor-ui && pnpm test  # Editor UI tests
cd packages/frontend/editor-ui && pnpm test:dev  # Watch mode (verbose)

# E2E:
pnpm --filter=n8n-playwright test:local <file-path>
pnpm --filter=n8n-playwright test:container:sqlite --grep @capability:email
```

## Test File Organization

**Backend - Co-located unit tests:**
- Pattern: `src/**/__tests__/*.test.ts`
- Example: `packages/cli/src/controllers/__tests__/auth.controller.test.ts`
- Example: `packages/cli/src/credentials/__tests__/credentials.service.test.ts`

**Backend - Separate integration tests:**
- Pattern: `test/integration/**/*.test.ts`
- Example: `packages/cli/test/integration/credentials/credentials.api.test.ts`
- Example: `packages/cli/test/integration/auth.api.test.ts`
- Integration tests with `.integration.test.ts` suffix in `src/` are also supported

**Backend - Migration tests:**
- Pattern: `test/migration/**/*.test.ts`
- Configs: `packages/cli/jest.config.migration.js`, `packages/cli/jest.config.migration.testcontainers.js`

**Nodes - Co-located with node code:**
- Pattern: `packages/nodes-base/nodes/<NodeName>/test/**/*.test.ts`
- Example: `packages/nodes-base/nodes/Airtable/test/Airtable.node.test.ts`
- Some use `__tests__/` pattern: `packages/nodes-base/nodes/Aws/__tests__/GenericFunctions.test.ts`

**Frontend - Co-located:**
- Pattern: `src/**/*.test.ts` (directly alongside source files)
- Example: `packages/frontend/editor-ui/src/app/composables/useRunWorkflow.test.ts`
- Example: `packages/frontend/@n8n/design-system/src/components/N8nButton/Button.test.ts`

**E2E - Centralized:**
- Pattern: `packages/testing/playwright/tests/e2e/**/*.spec.ts`

## Jest Configuration Hierarchy

**Root config** (`jest.config.js`):
- Shared by all backend packages via `...require('../../jest.config')`
- Uses `ts-jest` with `isolatedModules: true`
- Handles ESM dependencies transformation (pdfjs-dist, openid-client, jose, etc.)
- Uses `jest-expect-message` for better assertion errors
- CI mode: adds `jest-junit` reporter, `cobertura` coverage

**CLI package** (`packages/cli/jest.config.js`):
- Extends root config
- Global setup: `<rootDir>/test/setup.ts` (disables network via nock)
- Setup files:
  - `test/setup-test-folder.ts` - creates temp N8N_USER_FOLDER, sets encryption key
  - `test/setup-mocks.ts` - mocks Sentry, license SDK, telemetry, eventbus, push, fs
  - `test/extend-expect.ts` - custom matchers (`toBeEmptyArray`, `toBeEmptySet`, `toBeSetContaining`)
- Test timeout: 10 seconds

**CLI unit vs integration separation:**
- `packages/cli/jest.config.unit.js` - excludes `test/integration/` and `*.integration.test.ts`
- `packages/cli/jest.config.integration.js` - runs only `test/integration/`, `test/migration/`, and `*.integration.test.ts`

**Nodes-base** (`packages/nodes-base/jest.config.js`):
- Sets `process.env.TZ = 'UTC'` to avoid timezone-related failures
- Global setup: `test/globalSetup.ts`
- Additional setup: `test/setup.ts`

## Vitest Configuration

**Shared config package:** `packages/@n8n/vitest-config`
- Frontend preset (`frontend.ts`): jsdom environment, `src/__tests__/setup.ts` setupFile, CSS modules with non-scoped classnames
- Node preset (`node.ts`): node environment, globals enabled
- Node decorators preset (`node-decorators.ts`): for packages using reflect-metadata

**Frontend setup file** (`packages/frontend/editor-ui/src/__tests__/setup.ts`):
- Imports `@testing-library/jest-dom` for DOM matchers
- Imports `fake-indexeddb/auto` for IndexedDB polyfill
- Configures `testIdAttribute: 'data-test-id'`
- Mocks Reka UI Popover components (realistic open/close behavior)
- Polyfills: `PointerEvent`, `ResizeObserver`, `IntersectionObserver`, `Worker`, `SharedWorker`, `DataTransfer`, `matchMedia`, `scrollIntoView`, `SpeechSynthesisUtterance`
- Loads English i18n translations
- Creates `app-grid` and `app-modals` DOM containers before each test

## Test Structure Patterns

### Backend Unit Test (Controller)

Use `mockInstance` from `@n8n/backend-test-utils` to register mocks in the DI container, then get the controller from the container:

```typescript
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

describe('AuthController', () => {
  mockInstance(Logger);
  mockInstance(EventService);
  mockInstance(AuthService);
  const controller = Container.get(AuthController);

  describe('login', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should not validate email if LDAP is enabled', async () => {
      const member = mock<User>({ id: '123', role: { slug: 'global:member' } });
      const body = mock<LoginRequestDto>({ emailOrLdapLoginId: 'non email' });
      const req = mock<AuthenticatedRequest>({ body, browserId: '1' });
      const res = mock<Response>();

      // Act & Assert...
    });
  });
});
```

### Backend Integration Test (API)

Use `setupTestServer` to create an Express app with specific endpoint groups, create test users, and make HTTP requests with `supertest`:

```typescript
import { testDb, createTeamProject } from '@n8n/backend-test-utils';
import { setupTestServer } from '../shared/utils';
import { createOwner, createMember } from '../shared/db/users';
import { saveCredential } from '../shared/db/credentials';

const testServer = setupTestServer({
  endpointGroups: ['credentials'],
  enabledFeatures: ['feat:sharing'],
});

let owner: User;
let authOwnerAgent: SuperAgentTest;

beforeEach(async () => {
  await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
  owner = await createOwner();
  authOwnerAgent = testServer.authAgentFor(owner);
});

describe('GET /credentials', () => {
  test('should return all creds for owner', async () => {
    await saveCredential(payload(), { user: owner, role: 'credential:owner' });
    const response = await authOwnerAgent.get('/credentials');
    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });
});
```

### Node Workflow Test (NodeTestHarness)

Use `NodeTestHarness` with JSON workflow definitions and `nock` for API mocking:

```typescript
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Execute Airtable Node', () => {
  const testHarness = new NodeTestHarness();

  beforeEach(() => {
    nock('https://api.airtable.com/v0')
      .get('/appId/tableId/recordId')
      .reply(200, record);
  });

  const testData: WorkflowTestData = {
    description: 'List Airtable Records',
    input: {
      workflowData: testHarness.readWorkflowJSON('workflow.json'),
    },
    output: {
      nodeData: {
        Airtable: [[{ json: record }]],
      },
    },
  };

  testHarness.setupTest(testData, { credentials: { airtableTokenApi: {} } });
});
```

### Frontend Component Test

Use `@testing-library/vue` for rendering and `@testing-library/user-event` for interactions:

```typescript
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

describe('N8nButton', () => {
  it('should render correctly with default props', () => {
    const wrapper = render(N8nButton, {
      slots: { default: 'Click me' },
      global: { stubs: ['N8nSpinner', 'N8nIcon'] },
    });
    expect(wrapper.getByRole('button')).toBeInTheDocument();
    expect(wrapper.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Frontend Composable/Store Test

Use `@pinia/testing` with `createTestingPinia`, mock stores via `vi.mock`:

```typescript
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { captor, mock } from 'vitest-mock-extended';

vi.mock('@/app/stores/workflows.store', () => {
  const storeState = {
    allNodes: [],
    runWorkflow: vi.fn(),
    // ... mock state
  };
  return { useWorkflowsStore: vi.fn(() => storeState) };
});

describe('useRunWorkflow', () => {
  beforeEach(() => {
    setActivePinia(createTestingPinia());
  });
  // tests...
});
```

## Mocking

### Backend Mocking

**DI Container Mocking (`mockInstance`):**
- Package: `@n8n/backend-test-utils`
- File: `packages/@n8n/backend-test-utils/src/mocking.ts`
- Creates a `jest-mock-extended` mock and registers it in the `@n8n/di` container
- Use for all service dependencies in unit tests

```typescript
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

// Register mock in DI container
const authService = mockInstance(AuthService);
authService.issueJWT.mockReturnValue('token');

// Create standalone mock (not in DI)
const user = mock<User>({ id: '123', role: { slug: 'global:member' } });
```

**HTTP Mocking (`nock`):**
- Package: `nock` `^14.0.1`
- Used for all external HTTP calls in node tests and integration tests
- Global setup disables all network: `nock.disableNetConnect()` (only `127.0.0.1` allowed)

```typescript
nock('https://api.example.com')
  .get('/endpoint')
  .reply(200, responseData);
```

**API Testing (`supertest`):**
- Package: `supertest` `^7.1.1`
- Used in CLI integration tests via `setupTestServer`
- Authenticated agents created via `testServer.authAgentFor(user)`

**Global Setup Mocks** (`packages/cli/test/setup-mocks.ts`):
- Always mock: `@sentry/node`, `@n8n_io/license-sdk`, `@/telemetry`, `@/eventbus/message-event-bus/message-event-bus`, `@/push`, `node:fs`, `node:fs/promises`

### Frontend Mocking

**Vitest mocks:**
- Use `vi.mock()` for module-level mocking
- Use `vitest-mock-extended` (`mock`, `captor`) for typed mocks (same API as `jest-mock-extended`)

**What to Mock:**
- External services and API calls
- Pinia stores when testing composables in isolation
- `vue-router` (`useRouter`, `useRoute`)
- Browser APIs not available in jsdom (see setup.ts polyfills)

**What NOT to Mock:**
- Vue components under test
- Pinia stores when testing store logic itself
- Pure utility functions

## Test Utilities

### Backend Test Utilities

**`@n8n/backend-test-utils`** (`packages/@n8n/backend-test-utils/src/`):
- `mockInstance(Class, overrides?)` - Mock + register in DI container
- `mockLogger()` - Creates a mock logger with scoped mock
- `testDb.init()` - Initialize test database (SQLite or Postgres)
- `testDb.truncate(entities)` - Truncate specific tables between tests
- `randomEmail()`, `randomName()`, `randomValidPassword()` - Random test data generators
- `randomCredentialPayload()` - Generate credential test data
- `createTeamProject()`, `linkUserToProject()` - Project test helpers

**CLI Integration Test Helpers** (`packages/cli/test/integration/shared/`):
- `shared/utils/test-server.ts` - `setupTestServer({ endpointGroups, enabledFeatures })` creates test Express app
- `shared/db/users.ts` - `createOwner()`, `createMember()`, `createAdmin()`, `createUser()`, `createManyUsers()`
- `shared/db/credentials.ts` - `saveCredential()`, `shareCredentialWithUsers()`, `decryptCredentialData()`
- `shared/db/executions.ts` - Execution test data helpers
- `shared/db/folders.ts` - Folder test data helpers
- `shared/db/tags.ts` - Tag test data helpers
- `shared/workflow.ts` - Workflow test data helpers
- `shared/license.ts` - License mocking (`LicenseMocker`)

**Node Test Helpers** (`packages/nodes-base/test/`):
- `nodes/Helpers.ts` - `createMockExecuteFunction()` for mocking `IExecuteFunctions`
- `nodes/TriggerHelpers.ts` - Trigger node test utilities
- `NodeTestHarness` - Workflow-based node testing with JSON fixtures

### Frontend Test Utilities

- `@testing-library/vue` - Vue component rendering and queries
- `@testing-library/user-event` - Simulating user interactions
- `@pinia/testing` - `createTestingPinia()` for Pinia store testing
- `vitest-mock-extended` - Typed mock creation (`mock`, `captor`)
- `fake-indexeddb` - IndexedDB polyfill for jsdom

## Custom Matchers

**Backend** (`packages/cli/test/extend-expect.ts`):
```typescript
expect(result).toBeEmptyArray();     // Array.isArray && length === 0
expect(result).toBeEmptySet();       // instanceof Set && size === 0
expect(result).toBeSetContaining('a', 'b'); // Set.has() for each element
```

**Frontend:** Standard `@testing-library/jest-dom` matchers (`toBeInTheDocument`, `toBeVisible`, `toHaveAttribute`, etc.)

## Test Database

**Setup** (`packages/@n8n/backend-test-utils/src/test-db.ts`):
- SQLite: in-memory, no special setup
- PostgreSQL: creates uniquely-named test database per suite (`n8n_test_<random>_<timestamp>`)
- Runs migrations automatically via `dbConnection.migrate()`
- Initializes auth roles via `AuthRolesService.init()`

**Cleanup:**
- Use `testDb.truncate(['EntityName1', 'EntityName2'])` in `beforeEach` to reset tables
- Test database is dropped in `afterAll`/globalTeardown

## Coverage

**Requirements:** Not strictly enforced, but collected in CI

**Backend Coverage:**
```bash
COVERAGE_ENABLED=true pnpm test     # Enable coverage collection
```
- Reporters: `text-summary`, `lcov`, `html-spa` (local); `cobertura` (CI)
- Source: `src/**/*.ts`

**Frontend Coverage:**
```bash
COVERAGE_ENABLED=true pnpm test     # Enable coverage collection
```
- Provider: `v8`
- Reporters: `text-summary`, `lcov`, `html-spa` (local); `cobertura` (CI)

## Test Types

### Unit Tests

- **Backend:** Co-located in `src/__tests__/` directories
- **Frontend:** Co-located alongside source files as `*.test.ts`
- **Nodes:** Co-located in `test/` or `__tests__/` within each node directory
- Mock all external dependencies, DI services, and database access
- Use `jest.resetAllMocks()` or `vi.clearAllMocks()` in `beforeEach`

### Integration Tests

- **Backend only:** Located in `packages/cli/test/integration/`
- Use real database (SQLite or Postgres via testcontainers)
- Use `setupTestServer` for HTTP endpoint testing with supertest
- Create real users, credentials, workflows in the test database
- Use `testDb.truncate()` for cleanup between tests

### Migration Tests

- Located in `packages/cli/test/migration/`
- Separate Jest configs: `jest.config.migration.js`, `jest.config.migration.testcontainers.js`
- Test database schema migrations

### Workflow Tests (Node Testing)

- JSON-based workflow definitions with expected outputs
- Use `NodeTestHarness` to execute workflows
- Mock external APIs with `nock`
- Located alongside node source code

### E2E Tests

- Playwright-based, located in `packages/testing/playwright/`
- Architecture: Tests -> Composables -> Page Objects -> Components -> Playwright API
- Run locally: `pnpm --filter=n8n-playwright test:local <file>`
- Run in containers: `pnpm --filter=n8n-playwright test:container:sqlite`
- Use `nanoid()` for test data uniqueness (parallel-safe)
- Use API helpers for data setup, UI interactions for verification only
- Janitor tool for static analysis and architecture enforcement

## Common Patterns

### Async Testing (Backend)

```typescript
it('should handle async operations', async () => {
  const result = await service.doSomething();
  expect(result).toBeDefined();
});
```

### Async Testing (Frontend)

```typescript
import { waitFor } from '@testing-library/vue';

it('should update after async operation', async () => {
  const { getByText } = render(MyComponent);
  await waitFor(() => {
    expect(getByText('Updated')).toBeInTheDocument();
  });
});
```

### Error Testing (Backend)

```typescript
it('should throw on invalid input', async () => {
  await expect(service.process(invalidInput)).rejects.toThrow(BadRequestError);
});
```

### Error Testing (Frontend)

```typescript
it('should display error message', async () => {
  vi.mocked(useWorkflowsStore).runWorkflow.mockRejectedValue(new Error('Failed'));
  // trigger action and assert error UI
});
```

### Testing with DI Container

```typescript
// Always reset DI state between tests in backend
beforeEach(() => {
  jest.resetAllMocks();
});

// Use mockInstance for services, mock<T>() for data objects
const service = mockInstance(MyService);
service.method.mockResolvedValue(expectedResult);
const controller = Container.get(MyController);
```

---

*Testing analysis: 2026-03-07*
