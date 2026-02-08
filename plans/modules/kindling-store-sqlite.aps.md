# Kindling SQLite Store

| Scope   | Owner  | Priority | Status      |
| ------- | ------ | -------- | ----------- |
| STORAGE | @aneki | high     | Implemented |

## Purpose

Provides the **embedded system of record** for Kindling. The SQLite store is the truth layer: it persists observations, capsules, summaries, pins, and provenance in a deterministic, portable format.

DB location is configurable. Default is `~/.kindling/kindling.db` (or platform equivalent), with support for per-repo paths and explicit overrides.

It must support:

- High write volume (observations)
- Predictable queries by scope + time
- Redaction/tombstones without breaking referential integrity
- Local retrieval indexing (FTS), with ranking handled elsewhere
- Safe evolution via migrations

## In Scope

- SQLite schema + migrations
- DB initialisation defaults (WAL, FK enforcement, busy timeout)
- Store implementation of the `KindlingStore` port
- FTS tables/indexes and maintenance strategy
- Export/import primitives (store-level)

## Out of Scope

- Ranking heuristics and truncation logic (provider responsibility)
- Semantic retrieval / embeddings
- Governance workflows (promotion, lifecycle)
- UI/CLI

## Interfaces

**Depends on:**

- (none)

**Exposes:**

- `SqliteKindlingStore` implementing `KindlingStore`
- `migrations/*` with schema versioning
- Query helpers: pins, latest summary, evidence snippets

## Boundary Rules

- STORAGE must not depend on KINDLING, RETRIEVAL, or ADAPTER scopes
- STORAGE owns schema; other packages query via store interface
- FTS tables created here; ranking belongs to providers

## Acceptance Criteria

- [x] WAL enabled, FKs enforced
- [x] Tables exist: observations, capsules, capsule_observations, summaries, pins, schema_migrations
- [x] Indexes support: (sessionId, ts), (repoId, ts), (agentId, ts), global time window queries
- [x] FTS exists for observations and summaries
- [x] Redacted content not retrievable via FTS; references remain resolvable
- [x] Export/import round-trips deterministically

## Risks & Mitigations

| Risk                              | Mitigation                                  |
| --------------------------------- | ------------------------------------------- |
| Schema changes break existing DBs | Additive migrations only; never destructive |
| FTS sync issues                   | Explicit writes or triggers with tests      |
| Concurrent write contention       | WAL mode + busy timeout                     |

## Tasks

### STORAGE-001: Create SQLite schema + initial migrations

- **Intent:** Produce the initial schema and migration set for Phase 1 capture + retrieval indexing
- **Expected Outcome:** DB initialises from scratch; migrations apply cleanly; smoke tests verify tables and indexes
- **Scope:** `migrations/`, `src/db/`
- **Non-scope:** Write path implementation, ranking
- **Files:** `migrations/001_init.sql`, `migrations/002_fts.sql`, `src/db/open.ts`, `test/storage.migrations.spec.ts`
- **Dependencies:** (none)
- **Validation:** `pnpm test -- migrations`
- **Confidence:** high
- **Risks:** Schema changes after M1 require careful migration

**Deliverables:**

- `migrations/001_init.sql`: observations, capsules, capsule_observations, summaries, pins, schema_migrations with indexes and FKs
- `migrations/002_fts.sql`: FTS tables for observations and summaries
- `src/db/open.ts`: opens DB with WAL, FK enforcement, busy timeout
- `test/storage.migrations.spec.ts`: create → migrate → verify

### STORAGE-002: Implement SqliteKindlingStore write path

- **Intent:** Provide atomic, deterministic writes for observations and capsule linking
- **Expected Outcome:** Adapters can record observations and attach them to capsules safely under concurrent activity
- **Scope:** `src/store/`
- **Non-scope:** Read helpers, export/import
- **Files:** `src/store/sqlite.ts`
- **Dependencies:** STORAGE-001
- **Validation:** `pnpm test -- store.write`
- **Confidence:** medium
- **Risks:** Transaction edge cases under load

**Deliverables:**

- `insertObservation()`
- `createCapsule()` / `closeCapsule()`
- `attachObservationToCapsule()` with deterministic ordering
- `insertSummary()`
- Pin CRUD (`insertPin`, `deletePin`, TTL-aware listing)
- Transactions for multi-step writes

### STORAGE-003: Implement redaction/tombstone support

- **Intent:** Enable privacy/safety actions without breaking provenance chains
- **Expected Outcome:** Redacted observations not retrievable via FTS; references remain resolvable
- **Scope:** `src/store/redaction.ts`
- **Non-scope:** Policy decisions (adapter/core responsibility)
- **Files:** `src/store/redaction.ts`, `test/storage.redaction.spec.ts`
- **Dependencies:** STORAGE-001, STORAGE-002
- **Validation:** `pnpm test -- redaction`
- **Confidence:** medium
- **Risks:** FTS sync after redaction

**Deliverables:**

- `redactObservation(id)` sets markers and updates FTS
- Optional tombstone marker for local-only deletions
- Tests: redacted content not retrieved; capsule joins intact

### STORAGE-004: Implement read helpers for retrieval orchestration

- **Intent:** Provide efficient query primitives for providers and service orchestration
- **Expected Outcome:** Providers can fetch pins, summaries, and evidence with predictable performance
- **Scope:** `src/store/queries.ts`
- **Non-scope:** Ranking, truncation
- **Files:** `src/store/queries.ts`, `test/storage.queries.spec.ts`
- **Dependencies:** STORAGE-002
- **Validation:** `pnpm test -- queries`
- **Confidence:** medium
- **Risks:** Query performance at scale

**Deliverables:**

- `listPins(scopeIds, now)` (TTL-aware)
- `getOpenCapsuleForSession(sessionId)`
- `getLatestSummaryForCapsule(capsuleId)`
- `getEvidenceSnippets(observationIds, maxChars)`
- Tests for scope filtering and TTL behaviour

### STORAGE-005: Implement store-level export/import primitives

- **Intent:** Support backup, portability, and later migration
- **Expected Outcome:** Export emits deterministic datasets; import restores without corruption
- **Scope:** `src/store/export.ts`
- **Non-scope:** Service-level bundling (KINDLING-005)
- **Files:** `src/store/export.ts`, `test/storage.export.spec.ts`
- **Dependencies:** STORAGE-001, STORAGE-002, STORAGE-003
- **Validation:** `pnpm test -- export`
- **Confidence:** low
- **Risks:** Large dataset streaming; integrity on partial import

**Deliverables:**

- Stream/export ordered entity rows by scope/time
- Import with integrity checks
- Round-trip tests with deterministic ordering

## Decisions

- **D-001:** SQLite is the default system of record (WAL + FK enforcement)
- **D-002:** Redaction is first-class; avoid silent deletion that breaks provenance
- **D-003:** FTS tables created/maintained by store; ranking belongs to providers
- **D-004:** Default DB location is `~/.kindling/kindling.db` with overrides supported

## Notes

- This module's job is correctness and portability. Ranking and token budgeting live above it.
- Keep schema changes additive; prefer migrations over rewrites.
- The summaries table stores artefacts generated by downstream systems on behalf. The pins table stores durability assertions from downstream systems on behalf. Kindling provides the storage mechanism; the generation and policy decisions belong elsewhere.
