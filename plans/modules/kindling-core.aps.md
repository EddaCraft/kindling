# Kindling Core

| Scope    | Owner  | Priority | Status      |
| -------- | ------ | -------- | ----------- |
| KINDLING | @aneki | high     | Implemented |

## Purpose

Provides the shared domain model and orchestration logic for memory capture, capsule management, and mechanical retrieval. This is the spine of Kindling.

Kindling Core owns observation ingestion, capsule storage, and a built-in mechanical retrieval layer (BM25 + scope + bounded results). It does not generate summaries, infer intent, or perform ranked/budgeted context assembly — those responsibilities belong to downstream systems.

When PocketFlow (the orchestration layer) is present, it drives capsule lifecycle (open/close). In standalone mode, Kindling manages its own capsule lifecycle.

## In Scope

- Observation ingestion API
- Capsule open/close lifecycle (standalone mode; PocketFlow drives when present)
- Mechanical retrieval: BM25 FTS + scope filtering + bounded result sets
- Storage of summaries and pins on behalf of downstream systems
- Export/import coordination

## Out of Scope

- Storage implementation (kindling-store-sqlite)
- Ranking heuristics (kindling-provider-local)
- Workflow semantics
- Promotion, lifecycle, governance (Edda concerns)

## Interfaces

**Depends on:**

- kindling-store-sqlite — persistence
- kindling-provider-local — retrieval candidates

**Exposes:**

- `appendObservation()` — record an observation
- `openCapsule()` / `closeCapsule()` — capsule lifecycle
- `retrieve()` — mechanical retrieval (BM25 + scope + bounded results)

## Boundary Rules

- KINDLING must not depend on any adapter
- KINDLING must not implement storage directly
- Capsules auto-close when the source provides a natural end signal (e.g. session end, workflow node end); otherwise explicit close is required, with a safety timeout for inactivity

## Acceptance Criteria

- [x] Domain types compile and are reused by all packages
- [x] Capsule lifecycle works end-to-end (open → observe → close)
- [x] Retrieval returns deterministic, explainable results
- [x] Export/import round-trips without data loss

## Risks & Mitigations

| Risk                                | Mitigation                                      |
| ----------------------------------- | ----------------------------------------------- |
| Type churn during early development | Lock types after M1; use migrations for schema  |
| Capsule lifecycle edge cases        | Explicit timeout + adapter-driven close signals |

## Tasks

### KINDLING-001: Define domain types and validation

- **Intent:** Establish stable core schema for observations, capsules, summaries, and pins
- **Expected Outcome:** Types compile and are reused everywhere; validation rejects malformed input
- **Scope:** `src/types/`, `src/validation/`
- **Non-scope:** Storage, retrieval, adapters
- **Files:** `src/types/observation.ts`, `src/types/capsule.ts`, `src/types/summary.ts`, `src/types/pin.ts`, `src/validation/`
- **Dependencies:** (none)
- **Validation:** `pnpm test -- types`
- **Confidence:** high
- **Risks:** Type changes after M1 require migrations

### KINDLING-002: Capsule lifecycle implementation

- **Intent:** Enable bounded units of meaning with open/close semantics
- **Expected Outcome:** Sessions and workflow nodes form capsules; observations attach correctly
- **Scope:** `src/capsule/`
- **Non-scope:** Storage implementation, adapter-specific logic
- **Files:** `src/capsule/lifecycle.ts`, `src/capsule/manager.ts`
- **Dependencies:** KINDLING-001
- **Validation:** `pnpm test -- capsule`
- **Confidence:** medium
- **Risks:** Edge cases around timeout and concurrent capsules

### KINDLING-003: Observation ingestion API

- **Intent:** Provide a clean API for adapters to record observations
- **Expected Outcome:** Adapters can append observations with provenance; observations attach to active capsule
- **Scope:** `src/observation/`
- **Non-scope:** Adapter-specific mapping
- **Files:** `src/observation/ingest.ts`, `src/observation/provenance.ts`
- **Dependencies:** KINDLING-001, KINDLING-002
- **Validation:** `pnpm test -- observation`
- **Confidence:** high
- **Risks:** Provenance schema may need iteration

### KINDLING-004: Mechanical retrieval layer

- **Intent:** Provide bounded, scope-filtered retrieval over captured observations
- **Expected Outcome:** Retrieval is deterministic, scoped, and explainable; returns bounded result sets via BM25 + recency + scope filtering
- **Scope:** `src/retrieval/`
- **Non-scope:** Ranked/budgeted context assembly, intent-aware retrieval, summary generation (all downstream system concerns)
- **Files:** `src/retrieval/orchestrator.ts`, `src/retrieval/tiering.ts`
- **Dependencies:** KINDLING-001, RETRIEVAL-001
- **Validation:** `pnpm test -- retrieval`
- **Confidence:** medium
- **Risks:** Existing tiered retrieval code includes features beyond mechanical scope; may need refactoring

> **Boundary note:** The current implementation includes tiered retrieval (pins + summaries + candidates) which straddles the boundary. For v0.1, this exists as a stopgap. The mechanical contract is: BM25 FTS, recency/temporal filtering, scope-filtered queries, session-start context dump, bounded result sets.

### KINDLING-005: Export/import coordination

- **Intent:** Enable backup, portability, and data migration at the service level
- **Expected Outcome:** Export produces portable bundles; import restores cleanly
- **Scope:** `src/export/`
- **Non-scope:** Store-level primitives (STORAGE-005)
- **Files:** `src/export/bundle.ts`, `src/export/restore.ts`
- **Dependencies:** KINDLING-001, STORAGE-005
- **Validation:** `pnpm test -- export`
- **Confidence:** medium
- **Risks:** Schema versioning for forward compatibility

## Decisions

- **D-001:** Summary generation is a downstream system responsibility. Kindling stores summaries on behalf but does not generate them. (v0.1 may include a conservative stopgap.)
- **D-002:** Capsules auto-close on natural end signals; explicit close otherwise with timeout. PocketFlow drives lifecycle when present; Kindling manages standalone.
- **D-003:** Retrieval is mechanical: BM25 + scope + bounded results. Tiered retrieval (pins + summaries + candidates) exists as a v0.1 stopgap; ranked/budgeted assembly is a downstream responsibility.
- **D-004:** Pins are stored by Kindling on behalf of downstream systems (durability assertions). Pin CRUD remains in Kindling for standalone use.

## Notes

- This module's job is orchestration and domain logic. Keep it thin.
- Storage and ranking live in their respective packages.
