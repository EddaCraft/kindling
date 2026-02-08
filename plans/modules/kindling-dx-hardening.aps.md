# Kindling DX Hardening

| Scope | Owner  | Priority | Status |
| ----- | ------ | -------- | ------ |
| DX    | @aneki | high     | Ready  |

## Purpose

Fixes developer integration issues discovered during a walkthrough that rated the integration experience 5/10. Covers compile-error blockers in documentation, library hygiene violations (console.log, SQL injection, unhandled errors, dead parameters), and design gaps (adapter contract, method naming inconsistencies).

## In Scope

- Root and package README code example correctness
- Removal of console.log from library code
- SQL injection fix in provider scope filtering
- FTS query error handling for malformed input
- Deprecation of unused tokenBudget parameter (token-budgeted assembly is downstream)
- Adapter contract definition (BaseAdapter interface)
- Method name alias cleanup (insert/delete vs create/remove)

## Out of Scope

- Closed union type extensibility (ObservationKind, CapsuleType) -- requires breaking API change, deferred
- Async write API path (alternative to sync better-sqlite3) -- architectural decision needed
- OpenAPI spec / API documentation for the server -- separate module
- New adapter implementations (only the contract/interface)

## Interfaces

**Depends on:**

- kindling-core -- domain types, retrieval orchestrator, service API
- kindling-store-sqlite -- openDatabase, runMigrations
- kindling-provider-local -- LocalFtsProvider, FTS queries

**Exposes:**

- Corrected README Quick Start examples (root + packages)
- Configurable logger option for store initialization
- Parameterized SQL in provider scope filtering
- Graceful FTS error handling (empty results on malformed queries)
- Deprecated tokenBudget parameter with @deprecated JSDoc annotation
- BaseAdapter interface/abstract class in @kindling/core
- Consistent method naming across public API

## Boundary Rules

- Fixes must not break existing public API signatures (deprecate, do not remove)
- README examples must compile against the current published types
- SQL changes must be covered by existing or new tests
- Logger changes must default to silent (no stdout in library code)

## Acceptance Criteria

- [ ] Root README Quick Start compiles without errors
- [ ] No console.log calls in library packages (core, store-sqlite, provider-local)
- [ ] LocalFtsProvider uses parameterized queries for scope filtering
- [ ] Malformed FTS queries return empty results instead of throwing
- [ ] tokenBudget parameter is marked @deprecated with guidance to use maxCandidates
- [ ] BaseAdapter interface exists in @kindling/core with documented contract
- [ ] No duplicate method name aliases in public API (deprecated aliases still exist but marked)

## Risks & Mitigations

| Risk                                      | Mitigation                                       |
| ----------------------------------------- | ------------------------------------------------ |
| README fixes drift from code again        | Add compile-check test for README examples       |
| Logger option adds API surface            | Use optional config param with silent default    |
| Parameterized queries change FTS behavior | Test with existing query corpus                  |
| Deprecating aliases breaks downstream     | Mark deprecated, keep functional for one release |

## Tasks

### DX-001: Fix README Quick Start code examples

- **Intent:** Fix all 4 compile errors in root README Quick Start so developers can copy-paste and run
- **Expected Outcome:** Root README and individual package READMEs contain code examples that compile and run against current types
- **Scope:** `README.md`, `packages/*/README.md`
- **Non-scope:** New documentation, API reference, tutorials
- **Files:** `README.md`, `packages/kindling-core/README.md`, `packages/kindling-store-sqlite/README.md`, `packages/kindling-provider-local/README.md`
- **Dependencies:** (none)
- **Validation:** `npx tsx --eval "$(sed -n '/```typescript/,/```/p' README.md | sed '/```/d')"` compiles without errors
- **Confidence:** high
- **Risks:** Examples may need imports that complicate the snippet

**Deliverables:**

- Fix `openDatabase({ dbPath })` to `openDatabase({ path })`
- Fix `new LocalFtsProvider(store)` to `new LocalFtsProvider(db)`
- Fix `appendObservation()` to pass a full Observation object
- Fix `results.providerHits` to `results.candidates`
- Verify all package READMEs for consistency

### DX-002: Remove console.log from library code

- **Intent:** Eliminate stdout side effects from library packages so consumers control their own logging
- **Expected Outcome:** openDatabase() and runMigrations() are silent by default, with an optional logger/verbose config
- **Scope:** `packages/kindling-store-sqlite/src/`
- **Non-scope:** CLI output (CLI is expected to log), adapter logging
- **Files:** `packages/kindling-store-sqlite/src/database.ts`, `packages/kindling-store-sqlite/src/migrations.ts`
- **Dependencies:** (none)
- **Validation:** `grep -r 'console\.\(log\|info\|warn\)' packages/kindling-store-sqlite/src/ packages/kindling-core/src/ packages/kindling-provider-local/src/` returns no matches
- **Confidence:** high
- **Risks:** Removing logs may hide migration failures; mitigate with optional logger param

**Deliverables:**

- Remove or gate all console.log/info/warn calls in library packages
- Add optional `logger` or `verbose` option to openDatabase() and runMigrations()
- Default to silent operation
- Update tests to verify silent default

### DX-003: Fix SQL injection in provider

- **Intent:** Replace string interpolation with parameterized queries to prevent SQL injection in scope filtering
- **Expected Outcome:** LocalFtsProvider.buildScopeFilters() uses parameterized queries for all dynamic values
- **Scope:** `packages/kindling-provider-local/src/`
- **Non-scope:** Other SQL queries outside scope filtering
- **Files:** `packages/kindling-provider-local/src/local-fts-provider.ts`
- **Dependencies:** (none)
- **Validation:** `pnpm run test --filter @kindling/provider-local` passes; manual review confirms no string interpolation in SQL
- **Confidence:** high
- **Risks:** Parameterized queries may behave differently with FTS5 MATCH syntax

**Deliverables:**

- Replace string interpolation with `?` placeholders and parameter arrays
- Add test with adversarial scope values (SQL metacharacters)
- Verify existing provider tests pass

### DX-004: Add FTS query error handling

- **Intent:** Prevent application crashes from malformed FTS search terms
- **Expected Outcome:** Malformed FTS5 MATCH queries return empty results with a warning instead of throwing
- **Scope:** `packages/kindling-provider-local/src/`
- **Non-scope:** Query syntax validation, query rewriting
- **Files:** `packages/kindling-provider-local/src/local-fts-provider.ts`
- **Dependencies:** (none)
- **Validation:** `pnpm run test --filter @kindling/provider-local` passes; test with malformed queries (`"AND OR"`, `"*"`, `""`, `"foo(bar"`) returns empty results
- **Confidence:** high
- **Risks:** Swallowing errors may hide legitimate issues; mitigate by logging at debug level

**Deliverables:**

- Wrap FTS5 MATCH execution in try/catch
- Return empty results array on FTS syntax errors
- Add tests for malformed query inputs
- Log caught errors at debug level (not stdout)

### DX-005: Ensure retrieve() respects `limit` parameter for bounded results

- **Intent:** Make the `limit` parameter functional so consumers can bound retrieval output size
- **Expected Outcome:** retrieve() with `limit` returns at most N results, consistent with Kindling's mechanical retrieval contract (bounded result sets, not token-budgeted assembly)
- **Scope:** `packages/kindling-core/src/`
- **Non-scope:** Token-budgeted context assembly (downstream system responsibility), token counting
- **Files:** `packages/kindling-core/src/service.ts`
- **Dependencies:** (none)
- **Validation:** `pnpm run test --filter @kindling/core` passes; test that retrieve({ limit: 10 }) returns at most 10 results
- **Confidence:** high
- **Risks:** Existing callers may pass tokenBudget; deprecate gracefully

**Deliverables:**

- Ensure `limit` parameter flows through to provider queries
- Deprecate `tokenBudget` parameter with note that token-budgeted assembly belongs to downstream systems
- Add integration test verifying bounded result sets
- Document `limit` behavior in retrieve() JSDoc

> **Boundary note:** Kindling provides "give me N matching results" (bounded queries). "Assemble best context within N tokens" is a downstream responsibility.

### DX-006: Define adapter contract

- **Intent:** Establish a standard interface for building new platform adapters to reduce per-adapter boilerplate
- **Expected Outcome:** BaseAdapter interface or abstract class exists in @kindling/core with a standard event model and required methods
- **Scope:** `packages/kindling-core/src/`
- **Non-scope:** Refactoring existing adapters to use the contract (separate work), adapter development guide (docs module), intent inference (downstream system responsibility)
- **Files:** `packages/kindling-core/src/types/adapter.ts`, `packages/kindling-core/src/base-adapter.ts`
- **Dependencies:** (none)
- **Validation:** `pnpm run type-check` passes; BaseAdapter can be imported and extended in a test file
- **Confidence:** medium
- **Risks:** Existing adapters may not fit the contract cleanly; design for the common case, allow escape hatches

**Deliverables:**

- AdapterEvent type definition (platform-agnostic event model)
- BaseAdapter interface with onStart, onEvent, onStop methods
- Platform-specific override points: formatContent, mapEventToKind
- Export from @kindling/core public API
- Unit test demonstrating a minimal adapter implementation

> **Boundary note:** Adapters capture raw observations with provenance. Intent inference belongs to downstream systems and is not part of the adapter contract.

### DX-007: Clean up method name aliases

- **Intent:** Remove confusion from duplicate method names by establishing a single naming convention
- **Expected Outcome:** One consistent naming convention across the public API; deprecated aliases marked with @deprecated JSDoc
- **Scope:** `packages/kindling-core/src/`, `packages/kindling-store-sqlite/src/`
- **Non-scope:** Removing deprecated methods (deferred to next major version)
- **Files:** `packages/kindling-store-sqlite/src/store.ts`, `packages/kindling-core/src/service.ts`
- **Dependencies:** (none)
- **Validation:** `pnpm run type-check` passes; grep for @deprecated shows only alias methods
- **Confidence:** high
- **Risks:** Downstream consumers may use either name; deprecation warnings give migration time

**Deliverables:**

- Decide on canonical names (recommend: create/remove over insert/delete for user-facing API)
- Mark non-canonical aliases with @deprecated JSDoc tag
- Update internal usage to use canonical names
- Add deprecation note to CHANGELOG

## Decisions

- **D-001:** Library packages must not write to stdout/stderr by default; logging is opt-in via a logger option
- **D-002:** Deprecated method aliases are retained for one release cycle with @deprecated markers, then removed in the next major version
- **D-003:** FTS query errors are caught and return empty results rather than propagating exceptions to consumers

## Notes

- Issues 6-10 from the walkthrough are partially addressed here. Items 7 (closed unions) and 8 (async writes) require architectural decisions and are deferred. Item 10 (API docs) is a separate documentation effort.
- DX-006 overlaps with the planned kindling-adapter-framework module. This work item defines the contract only; the full framework module handles shared infrastructure and documentation.
