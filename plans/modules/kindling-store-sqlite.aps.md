# Kindling SQLite Store

| Scope    | Owner  | Priority | Status |
|----------|--------|----------|--------|
| STORAGE  | @aneki | high     | Draft  |

## Purpose

Provides the **embedded system of record** for Kindling (and therefore Edda later). The SQLite store is the truth layer: it persists observations, capsules, summaries, pins, and provenance in a deterministic, portable format.

It must support:

* high write volume (observations)
* predictable queries by scope + time
* redaction/tombstones without breaking referential integrity
* local retrieval indexing (FTS), with ranking handled elsewhere
* safe evolution via migrations

## In Scope / Out of Scope

**In Scope:**

* SQLite schema + migrations (Phase 1)
* DB initialisation defaults (WAL, FK enforcement, busy timeout)
* Store implementation of the `KindlingStore` port
* FTS tables/indexes and maintenance strategy (created here, ranked elsewhere)
* Export/import primitives (store-level), aligned to Kindling core envelope

**Out of Scope:**

* Ranking heuristics and truncation logic (provider responsibility)
* Semantic retrieval / embeddings / mem0 integration
* Governance workflows (promotion, lifecycle)
* UI/CLI

## Interfaces

**Depends on:**
* (none)

**Exposes:**
* `SqliteKindlingStore` implementing `KindlingStore`
* `migrations/*` with schema versioning
* Query helpers used by providers/services (pins, latest summary, evidence snippets)

## Tasks

### STORAGE-001: Create SQLite schema + initial migrations

**Intent:** Produce the initial schema and migration set needed for Phase 1 Kindling capture + retrieval indexing.

**Expected Outcome:** DB initialises from scratch; migrations apply cleanly; smoke tests verify required tables and indexes exist.

**Confidence:** high

**Scopes:** [STORAGE]

**Tags:** [sqlite, schema, migrations]

**Dependencies:** (none)

**Inputs:**
* Domain types from `kindling-core` (Observation, Capsule, Summary, Pin)
* Retrieval needs (scope/time filters, deterministic ordering)

**Deliverables:**
* `migrations/001_init.sql`:
  * observations, capsules, capsule_observations, summaries, pins, schema_migrations
  * required indexes for scope + time queries
  * referential integrity via FKs where appropriate
* `migrations/002_fts.sql`:
  * FTS tables for observations (required) and summaries (optional but recommended)
  * defined strategy for keeping FTS updated (explicit writes or triggers)
* `src/db/open.ts`:
  * opens DB with `PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`, and a sane busy timeout
* `test/storage.migrations.spec.ts`:
  * create → migrate → verify tables and indexes exist

**Acceptance Criteria:**
* WAL enabled, FKs enforced
* Tables exist: observations, capsules, capsule_observations, summaries, pins, schema_migrations
* Indexes exist to support: (sessionId, ts), (repoId, ts), (agentId, ts), global time window queries
* FTS exists for observations (and summaries if included)

**Execution:** See [plans/execution/STORAGE-001.steps.md](../execution/STORAGE-001.steps.md)

---

### STORAGE-002: Implement SqliteKindlingStore write path

**Intent:** Provide atomic, deterministic writes for observations and capsule linking.

**Expected Outcome:** Adapters can record observations and attach them to capsules safely under concurrent activity.

**Confidence:** medium

**Scopes:** [STORAGE]

**Tags:** [store, write-path]

**Dependencies:** [STORAGE-001]

**Inputs:**
* `KindlingStore` interface from `kindling-core`

**Deliverables:**
* `SqliteKindlingStore.insertObservation()`
* `createCapsule()` / `closeCapsule()`
* `attachObservationToCapsule()` with deterministic per-capsule ordering
* `insertSummary()`
* Pin CRUD (`insertPin`, `deletePin`, TTL-aware listing)
* Transactions for multi-step writes (observation + attach)

---

### STORAGE-003: Implement redaction/tombstone support

**Intent:** Enable privacy/safety actions without breaking provenance chains.

**Expected Outcome:** Redacted observations are not retrievable via FTS, but references remain resolvable.

**Confidence:** medium

**Scopes:** [STORAGE]

**Tags:** [privacy, redaction]

**Dependencies:** [STORAGE-001, STORAGE-002]

**Inputs:**
* Redaction policy (v1): prefer redaction over deletion

**Deliverables:**
* `redactObservation(id)` sets redaction markers and removes/updates FTS
* Optional tombstone marker for deletions permitted in local-only mode
* Tests: redacted content cannot be retrieved; capsule joins remain intact

---

### STORAGE-004: Implement read helpers for retrieval orchestration

**Intent:** Provide efficient query primitives for providers and Kindling service orchestration.

**Expected Outcome:** Providers can fetch pins, latest summaries, and evidence snippets with predictable performance.

**Confidence:** medium

**Scopes:** [STORAGE]

**Tags:** [queries, retrieval]

**Dependencies:** [STORAGE-002]

**Deliverables:**
* `listPins(scopeIds, now)` (TTL-aware)
* `getOpenCapsuleForSession(sessionId)` (Phase 1 convenience)
* `getLatestSummaryForCapsule(capsuleId)`
* `getEvidenceSnippets(observationIds, maxChars)`
* Tests for scope filtering and TTL behaviour

---

### STORAGE-005: Implement store-level export/import primitives

**Intent:** Support backup, portability, and later migration to Edda server mode.

**Expected Outcome:** Export emits deterministic datasets; import restores without corruption.

**Confidence:** low

**Scopes:** [STORAGE]

**Tags:** [export, import]

**Dependencies:** [STORAGE-001, STORAGE-002, STORAGE-003]

**Deliverables:**
* Store methods to stream/export ordered entity rows by scope/time
* Store methods to import entity rows with integrity checks
* Round-trip tests with deterministic export ordering

---

## Decisions

* **D-001:** SQLite is the default system of record (WAL + FK enforcement)
* **D-002:** Redaction is first-class; avoid silent deletion that breaks provenance
* **D-003:** FTS tables are created/maintained by the store; ranking belongs to providers

## Notes

* This module's job is correctness and portability. Ranking and token budgeting live above it.
* Keep schema changes additive; prefer migrations over rewrites.
