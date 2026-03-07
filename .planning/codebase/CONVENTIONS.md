# Coding Conventions

**Analysis Date:** 2026-03-07

## Naming Patterns

**Files:**
- Backend: **kebab-case** enforced by ESLint `unicorn/filename-case` rule in `packages/cli/eslint.config.mjs`
  - Services: `insights.service.ts`, `insights-collection.service.ts`
  - Controllers: `insights.controller.ts`, `community-packages.controller.ts`
  - Modules: `insights.module.ts`, `chat-hub.module.ts`
  - Errors: `bad-request.error.ts`, `not-found.error.ts`
  - Database migrations: exempt from kebab-case rule
- Frontend stores: **camelCase** with `.store.ts` suffix: `settings.store.ts`, `credentials.store.ts`
- Frontend components: **PascalCase** `.vue` files: `ProjectHeader.vue`, `ChatMessage.vue`
- DTOs: **kebab-case** files with `Dto` suffix in class name: `create-credential.dto.ts` contains `CreateCredentialDto`
- Enterprise edition: suffix directory/file names with `.ee` or `.ee/`: `dynamic-credentials.ee/`, `workflows.ee.store.ts`

**Functions:**
- **camelCase** enforced by ESLint naming-convention rule
- Leading underscore allowed for unused/private params: `_req`, `_res`

**Variables:**
- **camelCase**, **snake_case**, **UPPER_CASE**, or **PascalCase** all permitted
- Leading/trailing underscore allowed

**Properties:**
- **camelCase**, **snake_case**, or **UPPER_CASE** permitted

**Types/Interfaces:**
- **PascalCase** enforced
- Prefix interfaces with `I` for legacy types (e.g., `ICredentialsState`, `INodeUi`) but newer code omits the prefix
- Type imports use `import type` syntax (enforced by `@typescript-eslint/consistent-type-imports`)

**Classes:**
- **PascalCase**
- Services: `InsightsService`, `InsightsCompactionService`
- Controllers: `InsightsController`, `CommunityPackagesController`
- Errors: `BadRequestError`, `NotFoundError`, `UserError`

**Enums:**
- Must use `const enum` -- raw enums are forbidden via `no-restricted-syntax` rule

## Code Style

**Formatting:**
- **Biome** for `.ts`, `.js`, `.json` files (configured in `biome.jsonc`)
- **Prettier** for `.vue`, `.yml`, `.md`, `.css`, `.scss` files (configured in `.prettierrc.js`)
- **Lefthook** pre-commit hooks auto-format staged files (`lefthook.yml`)

**Key formatting rules (Biome + Prettier aligned):**
- Indentation: **tabs** (not spaces)
- Tab width: 2
- Semicolons: **always**
- Trailing commas: **all** (including function parameters)
- Single quotes for strings
- Double quotes for JSX
- Line width: **100** characters
- Line endings: **LF**
- Arrow function parentheses: **always** `(x) => x`
- Bracket spacing: **true** `{ a: 1 }`

**Linting:**
- **ESLint** with flat config (`eslint.config.mjs` per package)
- Shared base config: `packages/@n8n/eslint-config/src/configs/base.ts`
- Backend extends: `nodeConfig` from `@n8n/eslint-config/node`
- Frontend extends: `frontendConfig` from `@n8n/eslint-config/frontend`
- Custom rules plugin: `n8n-local-rules` in `packages/@n8n/eslint-config/src/rules/`
- **Stylelint** for `.scss`, `.sass`, `.vue` styles

**Identifier deny list (eslint `id-denylist`):**
- Forbidden names: `err`, `cb`, `callback`, `any`, `Number`, `number`, `String`, `string`, `Boolean`, `boolean`, `Undefined`, `undefined`

## Import Organization

**Order (enforced by `import-x/order`):**
1. Builtin + external packages (e.g., `vue`, `zod`, `luxon`, `n8n-workflow`)
2. Internal packages (e.g., `@n8n/api-types`, `@n8n/di`, `@n8n/decorators`)
3. Parent, index, sibling imports (e.g., `@/errors/...`, `./insights.service`)
4. Object imports

**Rules:**
- Alphabetize within groups (case-insensitive)
- Newlines between groups
- **No default exports** (`import-x/no-default-export: error`) -- use named exports everywhere
- **No duplicate imports** from the same module
- **No circular imports** (`import-x/no-cycle` with `maxDepth: 3`)
- Use `import type` for type-only imports (enforced by `@typescript-eslint/consistent-type-imports`)
- Use `export type` for type-only exports (enforced by `@typescript-eslint/consistent-type-exports`)

**Path Aliases:**
- Backend (`packages/cli`): `@/*` maps to `src/*`, `@test/*` maps to `test/shared/*`
- Frontend (`packages/frontend/editor-ui`): `@/*` maps to `src/*`, plus `@n8n/*` aliases for sibling frontend packages
- Lodash: import individual methods, not the full library: `import get from 'lodash/get'` (enforced by `lodash/import-scope: ['error', 'method']`)

## TypeScript Patterns

**Strict mode:**
- Base config enables `strict: true`, `noImplicitAny`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `strictNullChecks` (`packages/@n8n/typescript-config/tsconfig.common.json`)
- Backend (`packages/cli`) has `strict: false` temporarily (marked as TODO to remove)
- Decorators: `emitDecoratorMetadata: true`, `experimentalDecorators: true` in backend

**Never use `any`:**
- `@typescript-eslint/no-explicit-any: error` in frontend config
- `@typescript-eslint/no-explicit-any: warn` in backend (being tightened)
- Prefer `unknown` and type guards over `as` casts

**Const enums only:**
- Raw `enum` declarations are forbidden -- use `const enum` instead
- Rationale: avoids runtime overhead (see ESLint `no-restricted-syntax` rule in base config)

**Restricted types:**
- Do not use wrapper types: `Object` (use `object`), `String` (use `string`), `Boolean` (use `boolean`), `Number` (use `number`), `Symbol` (use `symbol`), `Function` (define explicit function shape)

**Promise handling:**
- `@typescript-eslint/no-floating-promises: error` -- all promises must be awaited or voided
- `@typescript-eslint/no-misused-promises: error`
- `@typescript-eslint/promise-function-async: error` -- functions returning promises must be `async`
- `@typescript-eslint/return-await: ['error', 'always']` -- always use `return await`
- `no-void: ['error', { allowAsStatement: true }]` -- `void` allowed as statement for fire-and-forget

**Nullish handling:**
- Prefer `??` over `||` (`@typescript-eslint/prefer-nullish-coalescing: error`)
- Prefer optional chaining `?.` (`@typescript-eslint/prefer-optional-chain: error`)

**Member accessibility:**
- Do not write `public` keyword explicitly (`@typescript-eslint/explicit-member-accessibility: ['error', { accessibility: 'no-public' }]`)

**Shared interfaces:**
- Define FE/BE shared types in `packages/@n8n/api-types`
- Use `Z.class()` from `packages/@n8n/api-types/src/zod-class.ts` for DTOs with runtime validation:
```typescript
import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class CreateCredentialDto extends Z.class({
  name: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
}) {}
```

## Error Handling

**Error hierarchy (use these, NOT `ApplicationError`):**
- `UserError` -- user caused the issue (invalid input, unauthorized access, business rule violation). Default level: `info`. Location: `packages/workflow/src/errors/base/user.error.ts`
- `OperationalError` -- transient issue (network failure, timeout). Default level: `warning`. Location: `packages/workflow/src/errors/base/operational.error.ts`
- `UnexpectedError` -- code bug (logic mistake, unhandled case). Default level: `error`. Location: `packages/workflow/src/errors/base/unexpected.error.ts`
- `ApplicationError` is **deprecated** -- do not use in new code. Location: `packages/@n8n/errors/src/application.error.ts`

**HTTP response errors (backend controllers):**
- Extend `ResponseError` from `packages/cli/src/errors/response-errors/abstract/response.error.ts`
- Predefined errors in `packages/cli/src/errors/response-errors/`:
  - `BadRequestError` (400), `UnauthenticatedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `UnprocessableError` (422), `TooManyRequestsError` (429), `InternalServerError` (500), `ServiceUnavailableError` (503)

**Error throwing rules:**
- `@typescript-eslint/only-throw-error: error` -- only throw Error instances
- `n8n-local-rules/no-plain-errors: error` (disabled in tests) -- do not throw plain `Error`, use typed error classes
- Wrap `JSON.parse()` in try-catch (`n8n-local-rules/no-uncaught-json-parse`)

## Dependency Injection (Backend)

**IoC container:** `@n8n/di` package provides `Container` and `@Service()` decorator

**Service pattern:**
```typescript
import { Service } from '@n8n/di';

@Service()
export class InsightsService {
  constructor(
    private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
    private readonly logger: Logger,
  ) {}
}
```

**Controller pattern:**
```typescript
import { Get, GlobalScope, Licensed, Query, RestController } from '@n8n/decorators';

@RestController('/insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('/summary')
  @GlobalScope('insights:list')
  async getInsightsSummary(
    _req: AuthenticatedRequest,
    _res: Response,
    @Query query: InsightsDateFilterDto = {},
  ): Promise<InsightsSummary> {
    // ...
  }
}
```

**Module pattern (backend modules):**
```typescript
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';

@BackendModule({ name: 'insights', instanceTypes: ['main', 'webhook'] })
export class InsightsModule implements ModuleInterface {
  async init() {
    await import('./insights.controller');
    // Dynamic imports for lazy loading
  }
}
```

**Module rules (enforced by ESLint):**
- No top-level relative imports in `*.module.ts` files (`n8n-local-rules/no-top-level-relative-imports-in-backend-module`)
- No constructors in module files (`n8n-local-rules/no-constructor-in-backend-module`)
- Use dynamic `await import()` inside module methods

## Frontend Patterns (Vue 3)

**Component structure (enforced by ESLint vue rules):**
- Block order: `<script>`, `<template>`, `<style>` (enforced by `vue/block-order`)
- Use `<script setup lang="ts">` for new components
- Component names in templates: **PascalCase** (`vue/component-name-in-template-casing`)
- Prop names: **camelCase** (`vue/prop-name-casing`)
- Attribute hyphenation: **always** (`vue/attribute-hyphenation`)
- Emit declarations: use **type-literal** syntax (`vue/define-emits-declaration`)
- Macro variable names: `props` for `defineProps`, `emit` for `defineEmits`, `slots` for `defineSlots`

**Store pattern (Pinia with composition API):**
```typescript
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { STORES } from '@n8n/stores';

export const useSettingsStore = defineStore(STORES.SETTINGS, () => {
  const settings = ref<FrontendSettings>({} as FrontendSettings);
  const isDocker = computed(() => settings.value?.isDocker ?? false);
  // ...
  return { settings, isDocker };
});
```

**Vue rules:**
- No `v-html` directive (`vue/no-v-html: error`)
- All components must be imported or registered (`vue/no-undef-components: error`)
- No deprecated slot attributes
- No `console.log` in frontend code (`no-console: warn`)
- All UI text must use i18n: `useI18n()` from `@n8n/i18n`

**CSS conventions:**
- Use CSS variables from design system -- never hardcode `px` values for spacing
- Spacing variables: `--spacing--2xs` (8px) through `--spacing--5xl` (256px)
- Color variables: `--color--primary`, `--color--text`, etc.
- Use design system components from `@n8n/design-system` (`N8nButton`, `N8nHeading`, etc.)

## Logging

**Framework:** Custom `Logger` class from `@n8n/backend-common`

**Pattern:**
```typescript
constructor(private readonly logger: Logger) {
  this.logger = this.logger.scoped('insights');
}
// Usage:
this.logger.debug('Instance is not main or webhook, skipping collection');
```

## Comments

**When to Comment:**
- JSDoc on public APIs and complex methods
- `@deprecated` annotations with migration guidance
- `// TODO:` for known improvements (tracked in Linear)
- `// @TECH_DEBT:` for known tech debt with Linear ticket references (e.g., `N8N-5821`)

**TSDoc patterns:**
- Use `/** ... */` for class and method documentation
- Include `@param`, `@returns`, `@throws` where helpful

## Module Design

**Exports:**
- Named exports only -- default exports are forbidden (`import-x/no-default-export: error`)
- Use barrel files (`index.ts`) for package public APIs
- Use `export type` for type-only exports

**Enterprise edition modules:**
- Directory suffix: `.ee` or `.ee/` (e.g., `dynamic-credentials.ee/`, `source-control.ee/`)
- Licensed features use `@Licensed('feat:...')` decorator on controller methods

## Git Hooks

**Pre-commit (via Lefthook in `lefthook.yml`):**
- Biome format check on `packages/**/*.{js,ts,json}`
- Prettier format check on `packages/**/*.{vue,yml,md,css,scss}`
- Stylelint check on `packages/**/*.{scss,sass,vue}`
- Actionlint on `.github/workflows/*.{yml,yaml}`
- Workspace dependency validation on `**/package.json`

---

*Convention analysis: 2026-03-07*
