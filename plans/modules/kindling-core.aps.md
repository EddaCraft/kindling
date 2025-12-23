# Kindling Core

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| KINDLING | @aneki | high | Draft |

## Purpose

Provides the shared domain model and orchestration logic for memory capture, capsule management, and retrieval. This is the spine of Kindling.

Summarisation is conservative in v0.1: primary summaries occur on capsule close. Mid-capsule rollups are optional and triggered only by size or noise thresholds. Raw observations are retained by default.

## In Scope

- Observation ingestion API
- Capsule open/close lifecycle
- Summary registration
- Retrieval orchestration (pins + summaries + providers)
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
- `retrieve()` — orchestrated retrieval with tiering

## Boundary Rules

- KINDLING must not depend on any adapter
- KINDLING must not implement storage directly
- Capsules auto-close when the source provides a natural end signal (e.g. session end, workflow node end); otherwise explicit close is required, with a safety timeout for inactivity

## Acceptance Criteria

- [ ] Domain types compile and are reused by all packages
- [ ] Capsule lifecycle works end-to-end (open → observe → close)
- [ ] Retrieval returns deterministic, explainable results
- [ ] Export/import round-trips without data loss

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Type churn during early development | Lock types after M1; use migrations for schema |
| Capsule lifecycle edge cases | Explicit timeout + adapter-driven close signals |

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

### KINDLING-004: Retrieval orchestration

- **Intent:** Combine pins, summaries, and provider candidates into a single retrieval response
- **Expected Outcome:** Retrieval is deterministic, scoped, and explainable; tiering enforced
- **Scope:** `src/retrieval/`
- **Non-scope:** Ranking logic (provider), storage queries (store)
- **Files:** `src/retrieval/orchestrator.ts`, `src/retrieval/tiering.ts`
- **Dependencies:** KINDLING-001, RETRIEVAL-001
- **Validation:** `pnpm test -- retrieval`
- **Confidence:** medium
- **Risks:** Tiering rules may need tuning

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

- **D-001:** Summarisation is conservative; primary summaries on capsule close only
- **D-002:** Capsules auto-close on natural end signals; explicit close otherwise with timeout
- **D-003:** Retrieval tiering: pins and current summary are non-evictable

## Notes

- This module's job is orchestration and domain logic. Keep it thin.
- Storage and ranking live in their respective packages.
