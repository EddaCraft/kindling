# PLAN_NEXT.md

## Kindling OSS v0.1 – Local Memory & Continuity Engine

### Problem & Success Criteria

**Problem**
AI-assisted development produces large volumes of transient activity (tool calls, diffs, agent runs) but loses context between sessions. Developers and local agents repeatedly re-discover the same information, leading to wasted time, architectural drift, and brittle workflows.

**Why this work matters**
Kindling provides *continuity without judgement*. It captures what happened, preserves provenance, and makes context retrievable in a deterministic, explainable way, without asserting organisational truth or governance.

**Non-goals (explicit)**

* Kindling does **not** decide what memory is authoritative
* Kindling does **not** promote or curate institutional memory
* Kindling does **not** manage organisational lifecycle, conflict resolution, or approval workflows

Those concerns belong to downstream systems (e.g. Edda) and are intentionally out of scope for OSS v0.1.

**Success Criteria**

* A developer can resume work without re-explaining repo context
* Retrieval results are deterministic, scoped, and explainable
* All retrieved context can point to concrete evidence (files, diffs, commands, outputs)
* Kindling can be embedded and run locally with no external services
* The project is safe to open-source under Apache-2.0

---

## System Map

* `kindling-core` → depends on → `kindling-store-sqlite`
* `kindling-core` → depends on → `kindling-provider-local`
* `kindling-adapter-opencode` → depends on → `kindling-core`
* `kindling-adapter-pocketflow` → depends on → `kindling-core`
* `kindling-cli` → depends on → `kindling-core`

---

## Milestones

### M1: Kindling OSS Scaffolding

* Public repository created (`kindling`)
* Package boundaries enforced (core / store / provider / adapters)
* Architecture, data model, and retrieval contract docs published

**Target:** Repo builds, types compile, no runtime behaviour required

### M2: Local Capture + Continuity (OpenCode)

* Observation ingestion via OpenCode adapter
* Session capsules (open/close)
* SQLite-backed system of record
* Local retrieval provider (FTS + recency)
* `/memory` command surface

**Target:** End-to-end local memory works in OpenCode

### M3: High-Signal Workflows (PocketFlow)

* PocketFlow adapter (vendored or dependency)
* Node-level capsules with intent hints
* Structured evidence capture

**Target:** Workflow-driven capsules outperform heuristic session summaries

### M4: OSS Hardening

* Redaction + pinning semantics
* Export/import
* Minimal CLI for inspection, debugging, and standalone use
* Documentation polish (README, examples)

**Target:** Safe, understandable OSS v0.1 release

---

## Modules

### kindling-core

* **Path:** ./modules/kindling-core.aps.md
* **Scope:** KINDLING
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** high
* **Tags:** memory, domain, core
* **Dependencies:** kindling-store-sqlite, kindling-provider-local

### kindling-store-sqlite

* **Path:** ./modules/kindling-store-sqlite.aps.md
* **Scope:** STORAGE
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** high
* **Tags:** sqlite, persistence
* **Dependencies:** (none)

### kindling-provider-local

* **Path:** ./modules/kindling-provider-local.aps.md
* **Scope:** RETRIEVAL
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** high
* **Tags:** search, fts
* **Dependencies:** kindling-store-sqlite

### kindling-adapter-opencode

* **Path:** ./modules/kindling-adapter-opencode.aps.md
* **Scope:** ADAPTER
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** high
* **Tags:** opencode, ingestion
* **Dependencies:** kindling-core

### kindling-adapter-pocketflow

* **Path:** ./modules/kindling-adapter-pocketflow.aps.md
* **Scope:** ADAPTER
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** medium
* **Tags:** pocketflow, workflows
* **Dependencies:** kindling-core

### kindling-cli

* **Path:** ./modules/kindling-cli.aps.md
* **Scope:** CLI
* **Owner:** @aneki
* **Status:** Draft
* **Priority:** medium
* **Tags:** cli, tooling, debugging
* **Dependencies:** kindling-core

---

## Decisions

* **D-001:** Kindling is an infrastructure project; it captures context but does not assert truth
* **D-002:** SQLite is the default embedded system of record as it is deterministic, portable, auditable
* **D-003:** Retrieval must be deterministic and explainable
* **D-004:** All governance, promotion, and lifecycle logic is explicitly out of scope for Kindling OSS
* **D‑005:** Providers are accelerators, never sources of truth. This preserves provenance
* **D-006:** A minimal CLI ships in v0.1 to enable inspection, debugging, export/import, and use without adapters
* **D-007:** Summarisation is conservative in v0.1. Primary summaries occur on capsule close. Mid-capsule rollups are optional and triggered only by size or noise thresholds. Raw observations are retained by default
* **D-008:** DB location is configurable. Default is `~/.kindling/kindling.db` (or platform equivalent), with support for per-repo paths and explicit overrides
* **D-009:** Capsules auto-close when the source provides a natural end signal (e.g. session end, workflow node end). Otherwise, explicit close is required, with a safety timeout for inactivity
* **D-010:** Promotion and MemoryObjects are out of scope for Kindling OSS v0.1; pins and notes are the only persistence mechanism

---

## Open Questions

*No open questions at this time.*

---

# modules/kindling-core.aps.md

## Kindling Core

Scope: KINDLING
Owner: @josh
Priority: high

### Purpose

Provides the shared domain model and orchestration logic for memory capture, capsule management, and retrieval. This is the spine of both Kindling and Edda.

### In Scope

* Observation ingestion API
* Capsule open/close lifecycle
* Summary registration
* Retrieval orchestration (pins + summaries + providers)
* Export / import

### Out of Scope

* Storage implementation
* Workflow semantics
* Promotion, lifecycle, governance

### Interfaces

Depends on:

* kindling-store-sqlite — persistence
* kindling-provider-local — retrieval

Exposes:

* appendObservation()
* openCapsule() / closeCapsule()
* retrieve()

### Tasks

KINDLING‑001: Define domain types and validation
Intent: Establish stable core schema
Expected Outcome: Types compile and are reused everywhere
Confidence: high

KINDLING‑002: Capsule lifecycle implementation
Intent: Enable bounded units of meaning
Expected Outcome: Sessions and nodes form capsules
Confidence: medium

---

# modules/kindling-store-sqlite.aps.md

## Kindling SQLite Store

Scope: STORAGE
Owner: @josh
Priority: high

### Purpose

Provides the **embedded system of record** for Kindling (and therefore Edda later). The SQLite store is the truth layer: it persists observations, capsules, summaries, pins, and provenance in a deterministic, portable format.

It must support:

* high write volume (observations)
* predictable queries by scope + time
* redaction/tombstones without breaking referential integrity
* local retrieval indexing (FTS), with ranking handled elsewhere
* safe evolution via migrations

### In Scope / Out of Scope

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

### Interfaces

Depends on:

* (none)

Exposes:

* `SqliteKindlingStore` implementing `KindlingStore`
* `migrations/*` with schema versioning
* Query helpers used by providers/services (pins, latest summary, evidence snippets)

### Tasks

STORAGE-001: Create SQLite schema + initial migrations
Intent: Produce the initial schema and migration set needed for Phase 1 Kindling capture + retrieval indexing.
Expected Outcome: DB initialises from scratch; migrations apply cleanly; smoke tests verify required tables and indexes exist.
Confidence: high
Link: (TBC)
Scopes: [STORAGE]
Tags: [sqlite, schema, migrations]
Dependencies: (none)
Inputs:

* Domain types from `kindling-core` (Observation, Capsule, Summary, Pin)
* Retrieval needs (scope/time filters, deterministic ordering)

Deliverables:

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

Acceptance Criteria:

* WAL enabled, FKs enforced
* Tables exist: observations, capsules, capsule_observations, summaries, pins, schema_migrations
* Indexes exist to support: (sessionId, ts), (repoId, ts), (agentId, ts), global time window queries
* FTS exists for observations (and summaries if included)

STORAGE-002: Implement SqliteKindlingStore write path
Intent: Provide atomic, deterministic writes for observations and capsule linking.
Expected Outcome: Adapters can record observations and attach them to capsules safely under concurrent activity.
Confidence: medium
Link: (TBC)
Scopes: [STORAGE]
Tags: [store, write-path]
Dependencies: [STORAGE-001]
Inputs:

* `KindlingStore` interface from `kindling-core`

Deliverables:

* `SqliteKindlingStore.insertObservation()`
* `createCapsule()` / `closeCapsule()`
* `attachObservationToCapsule()` with deterministic per-capsule ordering
* `insertSummary()`
* Pin CRUD (`insertPin`, `deletePin`, TTL-aware listing)
* Transactions for multi-step writes (observation + attach)

STORAGE-003: Implement redaction/tombstone support
Intent: Enable privacy/safety actions without breaking provenance chains.
Expected Outcome: Redacted observations are not retrievable via FTS, but references remain resolvable.
Confidence: medium
Link: (TBC)
Scopes: [STORAGE]
Tags: [privacy, redaction]
Dependencies: [STORAGE-001, STORAGE-002]
Inputs:

* Redaction policy (v1): prefer redaction over deletion

Deliverables:

* `redactObservation(id)` sets redaction markers and removes/updates FTS
* Optional tombstone marker for deletions permitted in local-only mode
* Tests: redacted content cannot be retrieved; capsule joins remain intact

STORAGE-004: Implement read helpers for retrieval orchestration
Intent: Provide efficient query primitives for providers and Kindling service orchestration.
Expected Outcome: Providers can fetch pins, latest summaries, and evidence snippets with predictable performance.
Confidence: medium
Link: (TBC)
Scopes: [STORAGE]
Tags: [queries, retrieval]
Dependencies: [STORAGE-002]

Deliverables:

* `listPins(scopeIds, now)` (TTL-aware)
* `getOpenCapsuleForSession(sessionId)` (Phase 1 convenience)
* `getLatestSummaryForCapsule(capsuleId)`
* `getEvidenceSnippets(observationIds, maxChars)`
* Tests for scope filtering and TTL behaviour

STORAGE-005: Implement store-level export/import primitives
Intent: Support backup, portability, and later migration to Edda server mode.
Expected Outcome: Export emits deterministic datasets; import restores without corruption.
Confidence: low
Link: (TBC)
Scopes: [STORAGE]
Tags: [export, import]
Dependencies: [STORAGE-001, STORAGE-002, STORAGE-003]

Deliverables:

* Store methods to stream/export ordered entity rows by scope/time
* Store methods to import entity rows with integrity checks
* Round-trip tests with deterministic export ordering

Decisions
• D-001: SQLite is the default system of record (WAL + FK enforcement)
• D-002: Redaction is first-class; avoid silent deletion that breaks provenance
• D-003: FTS tables are created/maintained by the store; ranking belongs to providers

Notes
• This module’s job is correctness and portability. Ranking and token budgeting live above it.
• Keep schema changes additive; prefer migrations over rewrites.

# modules/kindling-provider-local.aps.md

## Local Retrieval Provider

Scope: RETRIEVAL
Owner: @josh
Priority: high

### Purpose

Implements **deterministic local retrieval** over Kindling’s system-of-record (SQLite). This provider is responsible for:

* searching indexed content (FTS)
* applying ranking signals (scope, intent, recency, confidence)
* producing *explainable candidates* for Kindling Core’s retrieval orchestrator
* ensuring stable ordering and predictable truncation behaviour

Kindling Core decides tiering (pins + current summary are non-evictable). This provider ranks only *candidate hits* returned from the store.

### In Scope / Out of Scope

**In Scope:**

* Candidate search over SQLite FTS (observations + optionally summaries)
* Ranking + stable sorting of candidates
* Scope filtering (session/repo/agent/user)
* Intent-aware boosts (when intent provided)
* Explainability: each hit includes a concise reason and evidence references

**Out of Scope:**

* Token budgeting and tier enforcement (Kindling Core)
* Semantic retrieval (mem0) and embeddings
* UI commands
* Any write-side storage responsibilities

### Interfaces

Depends on:

* kindling-store-sqlite — provides FTS-backed candidate queries + evidence snippets

Exposes:

* `searchCandidates(request): ProviderHit[]`

Where a ProviderHit includes:

* `targetType` (observation|summary)
* `targetId`
* `score` (normalised)
* `why` (short string)
* `evidenceRefs` (observation IDs)
* `ts_ms` (for deterministic tiebreak)

### Tasks

RETRIEVAL-001: Define provider contract + stable scoring model
Intent: Lock in the provider output shape and deterministic ordering rules used across all retrieval providers.
Expected Outcome: Provider contract is implemented and tested; ordering is stable given identical store state.
Confidence: high
Link: (TBC)
Scopes: [RETRIEVAL]
Tags: [contract, determinism]
Dependencies: (none)
Inputs:

* `docs/retrieval-contract.md`
* Kindling Core retrieval tier rules

Deliverables:

* `src/provider/types.ts` (ProviderRequest, ProviderHit)
* `src/provider/scoring.ts` (scoring inputs + stable sort strategy)
* Tests:

  * stable ordering under ties (score → ts → id)
  * scope filter correctness

RETRIEVAL-002: Implement SQLite FTS candidate search
Intent: Provide fast, filtered candidate sets from SQLite for ranking.
Expected Outcome: Queries return relevant candidates for typical developer prompts within acceptable latency.
Confidence: medium
Link: (TBC)
Scopes: [RETRIEVAL]
Tags: [fts, sqlite, query]
Dependencies: [STORAGE-001]
Inputs:

* FTS tables created by store migrations
* Query parameters: query text, scopeIds, intent

Deliverables:

* `src/provider/sqliteFts.ts`:

  * `searchObservationsFts(query, scopeIds, limit)`
  * `searchSummariesFts(query, scopeIds, limit)` (optional)
  * `fallbackRecent(scopeIds, limit)` when query absent
* Tests:

  * returns empty on fully redacted content
  * respects scope constraints

RETRIEVAL-003: Implement ranking + explainability
Intent: Turn raw FTS matches into predictable, explainable ranked hits.
Expected Outcome: Ranking matches expectations across common use cases (resume work, find a decision, find a failure).
Confidence: medium
Link: (TBC)
Scopes: [RETRIEVAL]
Tags: [ranking, explainability]
Dependencies: [RETRIEVAL-001, RETRIEVAL-002]
Inputs:

* Signals available in store: ts, scope match, kind/type, confidence (if summary)
* Intent (if provided)

Deliverables:

* `rankHits(hits, request)` implementing:

  * boosts: exact scope match (session > repo > agent/user)
  * boosts: intent match (if summary/capsule intent known)
  * boosts: recency (time decay)
  * demotes: low-confidence summaries if confidence tracked
  * stable sort: score desc → ts desc → id asc
* `why` generation rules:

  * e.g. “matched command output from this session”, “matched capsule summary for repo”, “recent error trace”
* Tests with fixed fixtures:

  * “resume work” query returns latest capsule summary candidates first
  * “why did tests fail” surfaces error observations

RETRIEVAL-004: Evidence snippet retrieval and safe truncation
Intent: Return small, safe evidence snippets for explainability without leaking sensitive content or blowing budgets.
Expected Outcome: Provider returns bounded snippets with consistent truncation and redaction compliance.
Confidence: medium
Link: (TBC)
Scopes: [RETRIEVAL]
Tags: [evidence, safety]
Dependencies: [STORAGE-004]
Inputs:

* Store helper for evidence snippets

Deliverables:

* `attachEvidenceSnippets(hits, maxChars)`
* Truncation rules:

  * hard char cap
  * preserve first/last lines for stack traces (where applicable)
* Tests:

  * redacted observations yield placeholder snippet
  * truncation is deterministic

RETRIEVAL-005: Provider performance & regression harness
Intent: Ensure retrieval stays fast and stable as DB grows during dogfooding.
Expected Outcome: Simple benchmark harness + regression fixtures in repo.
Confidence: low
Link: (TBC)
Scopes: [RETRIEVAL]
Tags: [benchmark, regression]
Dependencies: [RETRIEVAL-002, RETRIEVAL-003]
Inputs:

* Seed dataset generator (synthetic) or recorded dogfood export

Deliverables:

* `bench/retrieval.local.ts` (simple CLI benchmark)
* `fixtures/*.ndjson` (small stable dataset)
* Guardrails (not hard SLAs yet): e.g. <200ms on typical queries at N=10k observations (local machine)

Decisions
• D-001: Provider outputs are ranked *candidates*; Kindling Core enforces tiers and budgets
• D-002: Ordering must be stable and explainable; no stochastic ranking
• D-003: Start with FTS + recency; add embeddings only when proven necessary

Notes
• Keep the first version boring and predictable. Retrieval systems become un-debuggable when they’re “clever”.

# modules/kindling-adapter-opencode.aps.md

## OpenCode Adapter

Scope: ADAPTER
Owner: @josh
Priority: high

### Purpose

Ingests OpenCode sessions and tool activity into Kindling. This adapter translates OpenCode’s observable actions into:

* Observations (tool calls, command runs, file diffs, errors, messages)
* Session capsules (open on session start, close on session end)
* `/memory` command surface for user control

The adapter must remain thin: mapping and plumbing only. The rules for capsules, retrieval, and provenance live in Kindling Core.

### In Scope / Out of Scope

**In Scope:**

* Event mapping: OpenCode → Kindling observations
* Session capsule lifecycle management
* Provenance extraction (paths, command args, exit codes, diff summaries)
* `/memory` commands:

  * status, search, pin, forget, export

**Out of Scope:**

* Storage and retrieval logic
* Any attempt to re-implement OpenCode session management
* Governance (promotion, lifecycle)

### Interfaces

Depends on:

* kindling-core — primary API

Exposes:

* Adapter initialiser for OpenCode server/client hooks
* `/memory` command handlers

### Tasks

ADAPTER-OC-001: Discover OpenCode event surfaces and define mapping table
Intent: Identify the concrete OpenCode hooks/events available and map them to observation kinds with provenance fields.
Expected Outcome: A single mapping table exists and is used by all ingestion code; no ad-hoc event handling.
Confidence: medium
Link: (TBC)
Scopes: [ADAPTER]
Tags: [opencode, ingestion, mapping]
Dependencies: (none)
Inputs:

* OpenCode server/client event APIs (actual code)

Deliverables:

* `src/opencode/mapping.ts` mapping:

  * tool_call → Observation(kind=tool_call, provenance=toolName, args)
  * command → Observation(kind=command, provenance=cmd, exitCode)
  * file_diff → Observation(kind=file_diff, provenance=paths)
  * error → Observation(kind=error, provenance=stack)
  * message → Observation(kind=message)
* Unit tests for mapping output shapes

ADAPTER-OC-002: Implement session capsule lifecycle
Intent: Ensure each OpenCode session becomes a bounded capsule by default.
Expected Outcome: Session start opens a capsule; events attach to that capsule; session end closes it.
Confidence: high
Link: (TBC)
Scopes: [ADAPTER]
Tags: [capsules, sessions]
Dependencies: [KINDLING-003]
Inputs:

* Session identifiers from OpenCode

Deliverables:

* `src/opencode/session.ts`:

  * `onSessionStart(sessionId, repoId?) → openCapsule(type=session, intent=general)`
  * `onEvent(...) → appendObservation(capsuleId=current)`
  * `onSessionEnd(...) → closeCapsule(signals)`
* Tests:

  * events always attach to correct capsule
  * adapter handles missing repoId gracefully

ADAPTER-OC-003: Implement `/memory` command handlers
Intent: Provide user control over local memory without leaving OpenCode.
Expected Outcome: Commands call Kindling service methods and print deterministic output.
Confidence: medium
Link: (TBC)
Scopes: [ADAPTER]
Tags: [commands, ux]
Dependencies: [KINDLING-004, KINDLING-005]
Inputs:

* OpenCode command/extension mechanism

Deliverables:

* `/memory status` → counts, DB location, last summary time
* `/memory search <q>` → retrieval response formatted as a block
* `/memory pin` → pin last assistant/user message or selected snippet (implementation choice)
* `/memory forget <id>` → redact/forget
* `/memory export` → writes export bundle path
* Tests:

  * command outputs are stable

ADAPTER-OC-004: Dogfood instrumentation + safety defaults
Intent: Prevent accidental capture of secrets and reduce noise early.
Expected Outcome: Adapter has basic filtering rules and opt-outs; redaction is supported.
Confidence: low
Link: (TBC)
Scopes: [ADAPTER]
Tags: [privacy, filtering]
Dependencies: [STORAGE-003]
Inputs:

* A small allow/deny list of observation kinds or fields

Deliverables:

* Filtering rules (v1):

  * allowlist tool result fields when possible
  * truncate large outputs
  * optional patterns to mask obvious secrets
* Notes in README on what is captured

Decisions
• D-001: Adapter stays thin; mapping table is the contract
• D-002: Default behaviour is session capsule per OpenCode session

Notes
• Keep output formatting readable; do not make the user parse JSON in their terminal.

# modules/kindling-adapter-pocketflow.aps.md

## PocketFlow Adapter

Scope: ADAPTER
Owner: @josh
Priority: medium

### Purpose

Transforms PocketFlow workflow execution into **high-signal memory capsules**. PocketFlow provides explicit node boundaries and intent-like structure, which makes capsule creation more reliable than heuristic time windows.

This adapter should:

* capture node lifecycle as observations
* create a capsule per node run (or per flow run if configured)
* attach node inputs/outputs as evidence
* emit confidence signals from execution structure (success/failure, downstream reuse)

PocketFlow may be vendored internally (MIT and explicitly supports copying source). The adapter boundary remains the same either way.

### In Scope / Out of Scope

**In Scope:**

* Node start/end event capture
* Node input/output observation capture
* Capsule creation per node
* Intent derivation (from node name/type/config)
* Confidence signals (basic)

**Out of Scope:**

* Modifying PocketFlow execution semantics (beyond light instrumentation)
* Building a new workflow engine
* Governance and promotion

### Interfaces

Depends on:

* kindling-core

Exposes:

* Adapter hooks/instrumentation for PocketFlow runs

### Tasks

ADAPTER-PF-001: Confirm PocketFlow license and vendoring approach
Intent: Ensure vendoring is legally and operationally clean for internal dogfooding and potential open-source boundaries.
Expected Outcome: PocketFlow code is included as dependency or vendored with licence notices preserved; approach documented.
Confidence: high
Link: (TBC)
Scopes: [ADAPTER]
Tags: [license, vendoring]
Dependencies: (none)
Inputs:

* PocketFlow-Typescript repository licence and README guidance

Deliverables:

* `docs/third-party/pocketflow.md` (origin, commit/tag, licence text, update procedure)
* Repo implementation choice recorded (dependency vs vendored)

ADAPTER-PF-002: Implement node lifecycle ingestion
Intent: Make PocketFlow runs produce structured observations and capsules automatically.
Expected Outcome: Each node run opens/closes a capsule and attaches observations deterministically.
Confidence: medium
Link: (TBC)
Scopes: [ADAPTER]
Tags: [pocketflow, capsules]
Dependencies: [KINDLING-003]
Inputs:

* PocketFlow node lifecycle hooks (or instrumentation wrapper)

Deliverables:

* Observations emitted:

  * `node_start` (node name/id, intent)
  * `node_output` (bounded output summary, refs)
  * `node_error` (error details)
  * `node_end` (status, timings)
* Capsule:

  * type=`pocketflow_node`
  * intent derived from node label/config
* Tests with a minimal sample flow

ADAPTER-PF-003: Derive intent and confidence signals
Intent: Improve retrieval relevance and trust by using workflow structure instead of LLM guesswork.
Expected Outcome: Capsules include intent tags and confidence hints that can be used by retrieval and later promotion.
Confidence: medium
Link: (TBC)
Scopes: [ADAPTER]
Tags: [intent, confidence]
Dependencies: [ADAPTER-PF-002]
Inputs:

* Node metadata (name/type)
* Execution outcome (success/failure)

Deliverables:

* Intent derivation rules (v1):

  * mapping table from node naming conventions → intent
* Confidence signals (v1):

  * success increases confidence
  * repeated failure decreases confidence
  * optional downstream reuse flag (if flow engine exposes it)
* Tests with fixtures

ADAPTER-PF-004: Output bounding and privacy defaults
Intent: Prevent huge node outputs from polluting storage and retrieval; keep evidence usable.
Expected Outcome: Outputs are truncated/summarised before storage; redaction policy is applied consistently.
Confidence: low
Link: (TBC)
Scopes: [ADAPTER]
Tags: [privacy, truncation]
Dependencies: [STORAGE-003]

Deliverables:

* Output size limits + truncation strategy
* Optional allowlist for fields persisted from node I/O

Decisions
• D-001: PocketFlow is treated as a workflow input source; Kindling core remains orchestration-agnostic
• D-002: Capsules are node-scoped by default for highest signal

Notes
• Keep this adapter small. The value is the boundary signal, not extra features.

# modules/kindling-cli.aps.md

## Kindling CLI

Scope: CLI
Owner: @aneki
Priority: medium

### Purpose

Provides a minimal command-line interface for Kindling, enabling inspection, debugging, export/import, and standalone use without requiring adapters. The CLI ships in v0.1 to support developers who want direct access to their local memory store.

### In Scope

* Memory inspection and search
* Pin management
* Export/import operations
* Database status and diagnostics
* Capsule listing and inspection

### Out of Scope

* Adapter functionality (handled by dedicated adapters)
* Workflow orchestration
* Governance and promotion (Edda concerns)

### Interfaces

Depends on:

* kindling-core — primary API

Exposes:

* `kindling status` — DB location, counts, health
* `kindling search <query>` — retrieve matching context
* `kindling pin <id>` / `kindling unpin <id>` — manage pins
* `kindling list [capsules|pins|observations]` — list entities
* `kindling export [--scope <scope>]` — export to file
* `kindling import <file>` — import from file

### Tasks

CLI-001: Implement core CLI scaffold and status command
Intent: Establish CLI structure and provide basic diagnostics.
Expected Outcome: CLI runs, displays DB location and basic counts.
Confidence: high
Link: (TBC)
Scopes: [CLI]
Tags: [cli, scaffold]
Dependencies: [STORAGE-001]
Inputs:

* DB path configuration from kindling-core

Deliverables:

* CLI entry point with argument parsing
* `kindling status` command
* Tests for CLI invocation

CLI-002: Implement search and list commands
Intent: Enable developers to query and browse their local memory.
Expected Outcome: Search returns formatted results; list shows entities.
Confidence: medium
Link: (TBC)
Scopes: [CLI]
Tags: [cli, search]
Dependencies: [RETRIEVAL-001, STORAGE-004]

Deliverables:

* `kindling search <query>` with formatted output
* `kindling list capsules|pins|observations` with pagination
* Tests for output formatting

CLI-003: Implement pin management commands
Intent: Allow direct pin creation and removal from command line.
Expected Outcome: Users can pin/unpin content without an adapter.
Confidence: high
Link: (TBC)
Scopes: [CLI]
Tags: [cli, pins]
Dependencies: [STORAGE-002]

Deliverables:

* `kindling pin <id>` with optional TTL flag
* `kindling unpin <id>`
* `kindling list pins` with TTL display
* Tests for pin lifecycle

CLI-004: Implement export/import commands
Intent: Support backup, portability, and data migration.
Expected Outcome: Export produces portable files; import restores cleanly.
Confidence: medium
Link: (TBC)
Scopes: [CLI]
Tags: [cli, export, import]
Dependencies: [STORAGE-005]

Deliverables:

* `kindling export` with scope filtering
* `kindling import <file>` with validation
* Round-trip tests

Decisions
• D-001: CLI is minimal and focused on inspection/debugging; not a replacement for adapters
• D-002: Output is human-readable by default; machine-readable formats (JSON) available via flags

Notes
• Keep the CLI simple and predictable. It's a debugging and power-user tool, not a primary interface.

---

# modules/edda-core.aps.md

## Edda Core

Scope: EDDA
Owner: @josh
Priority: medium

### Purpose

Provides the **curation layer**: converting captured capsules into durable, trusted MemoryObjects with lifecycle and conflict handling.

Edda Core consumes Kindling artefacts (capsules, summaries, evidence refs) and adds:

* review states
* promotion workflow
* lifecycle operations (supersede, deprecate, expire)
* conflict surfacing and resolution metadata

### In Scope / Out of Scope

**In Scope:**

* Capsule review queue mechanics (data model + API)
* Promotion: capsule → MemoryObject
* MemoryObject lifecycle management
* Conflict detection primitives (heuristics + metadata)

**Out of Scope:**

* UI for review (Phase 2+)
* Multi-user RBAC and audit logging (Phase 2+)
* External connectors beyond what Kindling captures

### Interfaces

Depends on:

* kindling-core (capsules, summaries, evidence)

Exposes:

* `reviewCapsule()` / `approveCapsule()` / `rejectCapsule()`
* `promoteToMemoryObject()`
* `supersedeMemoryObject()` / `deprecateMemoryObject()` / `expireMemoryObject()`
* `listConflicts()`

### Tasks

EDDA-001: Define MemoryObject model + lifecycle states
Intent: Establish the durable memory entity and the lifecycle rules that keep memory truthful over time.
Expected Outcome: MemoryObject type exists with status transitions and evidence/provenance requirements.
Confidence: medium
Link: (TBC)
Scopes: [EDDA]
Tags: [memory-object, lifecycle]
Dependencies: [KINDLING-001]
Inputs:

* `docs/data-model.md` MemoryObject definition

Deliverables:

* `src/edda/memoryObject.ts` types + validators
* Lifecycle rules:

  * active → superseded (with `supersedesId`)
  * active → deprecated (reason)
  * active → expired (TTL)
  * never delete without tombstone
* Unit tests for transition rules

EDDA-002: Implement capsule review workflow (headless)
Intent: Add a human-in-the-loop gate for what becomes institutional memory without requiring a UI in Phase 1.
Expected Outcome: Capsules can be marked reviewed/approved/rejected and promoted only when approved.
Confidence: low
Link: (TBC)
Scopes: [EDDA]
Tags: [review, governance]
Dependencies: [KINDLING-003, STORAGE-002]
Inputs:

* Capsule status field exists in store

Deliverables:

* Functions:

  * `reviewCapsule(capsuleId, reviewer, notes)`
  * `approveCapsule(capsuleId)`
  * `rejectCapsule(capsuleId, reason)`
* Minimal storage additions (if needed) via migrations (Phase 3+)
* Tests for allowed transitions

EDDA-003: Implement promotion pipeline (capsule → MemoryObjects)
Intent: Convert high-signal capsule summaries into durable MemoryObjects with evidence refs and confidence.
Expected Outcome: Promotion creates MemoryObjects; retrieval can surface them as durable knowledge.
Confidence: low
Link: (TBC)
Scopes: [EDDA]
Tags: [promotion]
Dependencies: [EDDA-001, EDDA-002]
Inputs:

* Capsule summaries and evidence refs

Deliverables:

* `promoteToMemoryObject(capsuleId, selection)`

  * selection can be manual in v1 (no LLM required)
* Enforced requirements:

  * evidenceRefs non-empty
  * scope specified (repo/user/agent)
  * confidence specified
* Tests:

  * promotion blocked unless approved
  * evidence refs preserved

EDDA-004: Conflict detection primitives
Intent: Surface disagreements in memory rather than silently selecting one truth.
Expected Outcome: Conflicts are discoverable and resolvable by superseding rather than deleting.
Confidence: low
Link: (TBC)
Scopes: [EDDA]
Tags: [conflict]
Dependencies: [EDDA-001]
Inputs:

* MemoryObjects list

Deliverables:

* Heuristic conflict detection (v1):

  * same scope + same intentTags + similar statement but different content
* `listConflicts()` returns pairs with reasons
* Tests with fixture objects

Decisions
• D-001: Edda is downstream: capture is Kindling; governance is Edda
• D-002: MemoryObjects must carry evidence refs; otherwise they are not promotable
• D-003: Conflict is surfaced, not erased; resolution uses lifecycle transitions

Notes
• Edda Core stays headless in Phase 1; UI is a later layer.
