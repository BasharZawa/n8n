# Codebase Concerns

**Analysis Date:** 2026-03-07

## Tech Debt

**Orphan build artifacts at repository root:**
- Issue: A stale `n8n-nodes-odoo-generic/` directory exists at the repo root (`/n8n-nodes-odoo-generic/`) containing only `dist/`, `node_modules/`, and `.turbo/` build artifacts. This is left over from before the node was moved to `custom-nodes/`.
- Files: `/n8n-nodes-odoo-generic/` (root-level directory)
- Impact: Confusing for developers; unclear which is the canonical source. The root copy has no source files, only build output. May cause pnpm workspace resolution issues if accidentally matched.
- Fix approach: Delete the entire `/n8n-nodes-odoo-generic/` directory at root. Add it to `.gitignore` or confirm it is already ignored (it appears untracked).

**Uncommitted package.json change (workspace:* to semver):**
- Issue: `custom-nodes/n8n-nodes-odoo-generic/package.json` has an uncommitted diff changing `n8n-workflow` from `workspace:*` to `^2.10.0` in devDependencies and `>=2.10.0` in peerDependencies. This change is needed for Docker builds (where the monorepo workspace is not available), but it should be committed.
- Files: `custom-nodes/n8n-nodes-odoo-generic/package.json`
- Impact: Running `pnpm install` in the monorepo will resolve differently than what the Dockerfile expects. The Dockerfile already has a `sed` workaround for this (`sed -i 's/"workspace:\*"/"*"/g'`), creating a double-fix situation.
- Fix approach: Commit the semver version as the canonical value. The `sed` in the Dockerfile becomes a no-op (harmless) or can be removed.

**Module-level caches without eviction bounds:**
- Issue: `loginCache` and `protocolCache` in `GenericFunctions.ts` are unbounded `Map` instances at module scope. They have TTL-based expiry (5 minutes) but never delete expired entries; they only skip them on read.
- Files: `custom-nodes/n8n-nodes-odoo-generic/nodes/OdooGeneric/GenericFunctions.ts` (lines 128-139, 240-247)
- Impact: In long-running n8n instances with many different Odoo credentials, stale cache entries accumulate indefinitely. Minor memory concern but indicates missing cleanup logic.
- Fix approach: Either use a proper LRU cache or add periodic pruning. Alternatively, delete expired entries on cache miss.

**Empty workflow directories:**
- Issue: `workflows/crm/` and `workflows/odoo/` are empty placeholder directories with no workflow JSON files.
- Files: `workflows/crm/`, `workflows/odoo/`
- Impact: No functional impact, but misleading structure. The `docker-compose.yml` mounts `../workflows` into the container, implying workflows should live here.
- Fix approach: Either populate with actual workflow exports or remove the empty subdirectories and document the expected workflow storage pattern.

**If-chain instead of switch/dispatch in execute():**
- Issue: The main `execute()` method in `OdooGeneric.node.ts` uses a chain of `if (operation === '...')` statements instead of `if/else if` or a `switch`. Every operation check runs even after one matches.
- Files: `custom-nodes/n8n-nodes-odoo-generic/nodes/OdooGeneric/OdooGeneric.node.ts` (lines 196-264)
- Impact: Negligible performance cost, but violates the principle of mutual exclusivity. If `responseData` were accidentally set by a wrong branch, it would be hard to debug.
- Fix approach: Replace the `if` chain with `if/else if` or a `switch (operation)` block.

## Security Considerations

**Dockerfile uses `n8n:latest` tag (unpinned):**
- Risk: The Dockerfile pulls `docker.n8n.io/n8nio/n8n:latest`, meaning every build can get a different n8n version. A breaking change or vulnerability in a new release could silently enter production.
- Files: `deploy/Dockerfile` (line 20)
- Current mitigation: None.
- Recommendations: Pin to a specific n8n version tag (e.g., `n8n:1.84.1`). Update the tag deliberately when upgrading.

**VPS setup guide recommends running as root for initial setup:**
- Risk: The guide instructs cloning repos and installing packages as root. While an `n8n` user is created for runtime, the custom node build artifacts are owned by root under `/opt/`.
- Files: `docs/vps-setup-guide.md` (lines 126-132)
- Current mitigation: The n8n process runs as a dedicated `n8n` user via PM2.
- Recommendations: Build custom nodes as the `n8n` user, or explicitly `chown` the build output. Document minimal required privileges.

**VPS guide includes hardcoded GitHub repo URL:**
- Risk: The guide references `https://github.com/BasharZawa/n8n_custom_nodes.git` as a public repo. If this repo contains any sensitive configuration or is made private, the guide breaks.
- Files: `docs/vps-setup-guide.md` (line 128)
- Current mitigation: None.
- Recommendations: Use a placeholder like `YOUR_REPO_URL` and instruct users to substitute, or document SSH-based clone for private repos.

**VPS guide has placeholder password in PostgreSQL setup:**
- Risk: The guide uses `your-strong-password` as a placeholder that a user might accidentally leave unchanged.
- Files: `docs/vps-setup-guide.md` (lines 72, 102)
- Current mitigation: The text says "fill in your values."
- Recommendations: Generate the password in the guide using `openssl rand -hex 16` similar to how the encryption key is generated.

**Bearer token sent over HTTP by default:**
- Risk: The `.env.example` defaults to `N8N_PROTOCOL=http`. When the Odoo node uses JSON-2 API, it sends `Authorization: Bearer <api_key>` in plain HTTP.
- Files: `.env.example` (line 9), `custom-nodes/n8n-nodes-odoo-generic/nodes/OdooGeneric/GenericFunctions.ts` (line 213)
- Current mitigation: The Odoo credential URL is user-specified and typically uses HTTPS for odoo.com hosted instances.
- Recommendations: Add a note in `.env.example` to use HTTPS in production. Consider validating that the Odoo `url` credential starts with `https://` and warning if not.

## Performance Bottlenecks

**Protocol auto-detection makes extra HTTP request:**
- Problem: When `protocol` is set to `auto` (the default), every first request to a new Odoo instance makes a probe request to `/api/res.users` to detect JSON-2 support, doubling the latency for the first call.
- Files: `custom-nodes/n8n-nodes-odoo-generic/nodes/OdooGeneric/GenericFunctions.ts` (lines 249-275)
- Cause: The detection result is cached for 5 minutes, but the first call and every call after cache expiry pays the cost.
- Improvement path: Increase the TTL or make it configurable. Alternatively, persist the detected protocol in the credential data so it survives across executions.

**JSON-RPC requires separate login call for every cache miss:**
- Problem: JSON-RPC operations require a login call to get a `uid` before any CRUD operation. Combined with protocol detection, the first call can make 3 HTTP requests (probe + login + actual operation).
- Files: `custom-nodes/n8n-nodes-odoo-generic/nodes/OdooGeneric/GenericFunctions.ts` (lines 141-171)
- Cause: Login cache TTL is 5 minutes with no persistence.
- Improvement path: Store the uid in credential metadata or use a longer TTL for known-good credentials.

## Fragile Areas

**rawDomain JSON.parse without validation:**
- Files: `custom-nodes/n8n-nodes-odoo-generic/nodes/OdooGeneric/GenericFunctions.ts` (line 386)
- Why fragile: `rawDomain` is user-provided text that is directly `JSON.parse()`-d with no `try/catch`. If the user provides malformed JSON, the node throws an unhandled error without a user-friendly message.
- Safe modification: Wrap in try/catch and throw a `NodeApiError` with a descriptive message about expected format.
- Test coverage: No test covers `rawDomain` parsing. The test file only covers `processFilters`, `processNameValueFields`, `odooGetDBName`, `getOdooPassword`, and `resolveModel`.

**Credential type casting with `as unknown as`:**
- Files: `custom-nodes/n8n-nodes-odoo-generic/nodes/OdooGeneric/OdooGeneric.node.ts` (lines 116, 154, 177-178)
- Why fragile: Credentials are cast through `as unknown as IOdooCredentials` in three places. If the credential schema changes (e.g., a field is renamed), TypeScript will not catch the mismatch.
- Safe modification: Add runtime validation for required credential fields before use.
- Test coverage: No tests exercise credential loading.

**Docker build relies on sed for package.json rewriting:**
- Files: `deploy/Dockerfile` (line 15)
- Why fragile: The `sed -i 's/"workspace:\*"/"*"/g'` command blindly replaces all `workspace:*` strings. If a dependency name happens to contain that pattern, it would be corrupted. The approach also breaks if pnpm workspace protocol syntax changes.
- Safe modification: Use `npm pkg set` or `jq` for targeted field updates, or maintain the `package.json` with semver versions as the canonical form.
- Test coverage: No CI pipeline tests the Docker build.

## Test Coverage Gaps

**No integration/E2E tests for the Odoo node:**
- What's not tested: All HTTP interactions (JSON-RPC, JSON-2 API), protocol detection, credential testing, create/read/update/delete operations, and the `executeMethod` operation.
- Files: `custom-nodes/n8n-nodes-odoo-generic/test/GenericFunctions.test.ts` (only 100 lines of pure-function unit tests)
- Risk: Any change to `GenericFunctions.ts` HTTP logic (650 lines) could silently break Odoo integration. The test file only covers 5 pure helper functions.
- Priority: High - this is the primary custom node and the core differentiator of this fork.

**No tests for Docker build or deployment:**
- What's not tested: The `deploy/Dockerfile` and `deploy/docker-compose.yml` are never validated in CI.
- Files: `deploy/Dockerfile`, `deploy/docker-compose.yml`
- Risk: Dockerfile build failures are only discovered when deploying to production.
- Priority: Medium - add a CI job that runs `docker build` to catch build regressions.

**No tests for description files:**
- What's not tested: The node description/property definitions in `descriptions/*.ts` are not validated for correctness (e.g., matching `displayOptions` references, valid default values).
- Files: `custom-nodes/n8n-nodes-odoo-generic/nodes/OdooGeneric/descriptions/`
- Risk: A typo in `displayOptions.show` conditions could hide a UI field permanently. Only discoverable through manual UI testing.
- Priority: Low - these are declarative definitions that change infrequently.

## Dependencies at Risk

**`change-case` listed as devDependency but used at runtime:**
- Risk: `change-case` is imported in `OdooGeneric.node.ts` (line 1: `import { capitalCase } from 'change-case'`) but listed under `devDependencies` in `package.json`. In production, if the package is not installed (e.g., `npm install --production`), the node will crash at runtime.
- Impact: Node fails to load with `Cannot find module 'change-case'` in production-only installs.
- Migration plan: Move `change-case` from `devDependencies` to `dependencies` in `custom-nodes/n8n-nodes-odoo-generic/package.json`.

## Missing Critical Features

**No CI/CD pipeline for custom nodes:**
- Problem: There is no GitHub Actions workflow, no automated testing, no linting, and no Docker build validation for the custom nodes or deployment config.
- Blocks: Automated quality checks before merge. The VPS setup guide references a manual `git pull && npm run build` workflow for updates.

**No n8n version compatibility matrix:**
- Problem: The Dockerfile uses `n8n:latest` and the node declares `n8n-workflow >= 2.10.0` as a peer dependency, but there is no documented compatibility matrix showing which n8n versions have been tested.
- Blocks: Confident upgrades. A new n8n release could break the custom node without warning.

---

*Concerns audit: 2026-03-07*
