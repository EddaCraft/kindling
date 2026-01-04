# Kindling PocketFlow Adapter

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| ADAPTER-PF | @aneki | medium | Draft |

## Purpose

Transforms PocketFlow workflow execution into **high-signal memory capsules**. PocketFlow provides explicit node boundaries and intent-like structure, which makes capsule creation more reliable than heuristic time windows.

This adapter should:

- Capture node lifecycle as observations
- Create a capsule per node run (or per flow run if configured)
- Attach node inputs/outputs as evidence
- Emit confidence signals from execution structure (success/failure, downstream reuse)

PocketFlow may be vendored internally (MIT license, explicitly supports copying source). The adapter boundary remains the same either way.

## In Scope

- Node start/end event capture
- Node input/output observation capture
- Capsule creation per node
- Intent derivation (from node name/type/config)
- Confidence signals (basic)

## Out of Scope

- Modifying PocketFlow execution semantics
- Building a new workflow engine
- Governance and promotion (Edda concerns)

## Interfaces

**Depends on:**

- kindling-core — primary API

**Exposes:**

- Adapter hooks/instrumentation for PocketFlow runs

## Boundary Rules

- ADAPTER-PF must not modify PocketFlow execution semantics
- ADAPTER-PF must not access storage directly; use kindling-core API
- Capsules are node-scoped by default for highest signal

## Acceptance Criteria

- [ ] PocketFlow vendoring/dependency approach documented
- [ ] Node lifecycle produces observations and capsules
- [ ] Intent derived from node metadata
- [ ] Confidence signals reflect execution outcome
- [ ] Outputs bounded and privacy-safe

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| PocketFlow API changes | Vendoring with pinned version |
| Large node outputs | Truncation + allowlist |
| Intent derivation too naive | Start simple; iterate based on usage |

## Tasks

### ADAPTER-PF-001: Confirm PocketFlow license and vendoring approach

- **Intent:** Ensure vendoring is legally and operationally clean
- **Expected Outcome:** PocketFlow included as dependency or vendored with licence preserved; approach documented
- **Scope:** `docs/third-party/`
- **Non-scope:** Implementation
- **Files:** `docs/third-party/pocketflow.md`
- **Dependencies:** (none)
- **Validation:** Manual review
- **Confidence:** high
- **Risks:** License interpretation

**Deliverables:**

- `docs/third-party/pocketflow.md` (origin, commit/tag, licence text, update procedure)
- Repo implementation choice recorded (dependency vs vendored)

### ADAPTER-PF-002: Implement node lifecycle ingestion

- **Intent:** Make PocketFlow runs produce structured observations and capsules automatically
- **Expected Outcome:** Each node run opens/closes a capsule and attaches observations deterministically
- **Scope:** `src/pocketflow/`
- **Non-scope:** Intent derivation, confidence signals
- **Files:** `src/pocketflow/lifecycle.ts`, `test/pocketflow.lifecycle.spec.ts`
- **Dependencies:** KINDLING-002
- **Validation:** `pnpm test -- pocketflow.lifecycle`
- **Confidence:** medium
- **Risks:** PocketFlow hook availability

**Deliverables:**

- Observations emitted:
  - `node_start` (node name/id, intent)
  - `node_output` (bounded output summary, refs)
  - `node_error` (error details)
  - `node_end` (status, timings)
- Capsule: type=`pocketflow_node`, intent derived from node label/config
- Tests with minimal sample flow

### ADAPTER-PF-003: Derive intent and confidence signals

- **Intent:** Improve retrieval relevance using workflow structure instead of LLM guesswork
- **Expected Outcome:** Capsules include intent tags and confidence hints for retrieval
- **Scope:** `src/pocketflow/`
- **Non-scope:** Ranking (provider responsibility)
- **Files:** `src/pocketflow/intent.ts`, `src/pocketflow/confidence.ts`
- **Dependencies:** ADAPTER-PF-002
- **Validation:** `pnpm test -- pocketflow.intent`
- **Confidence:** medium
- **Risks:** Intent mapping may need iteration

**Deliverables:**

- Intent derivation rules (v1): mapping table from node naming conventions → intent
- Confidence signals (v1):
  - Success increases confidence
  - Repeated failure decreases confidence
  - Optional downstream reuse flag
- Tests with fixtures

### ADAPTER-PF-004: Output bounding and privacy defaults

- **Intent:** Prevent huge node outputs from polluting storage and retrieval
- **Expected Outcome:** Outputs truncated/summarised before storage; redaction policy applied
- **Scope:** `src/pocketflow/`
- **Non-scope:** Redaction implementation (STORAGE-003)
- **Files:** `src/pocketflow/truncate.ts`
- **Dependencies:** STORAGE-003
- **Validation:** `pnpm test -- pocketflow.truncate`
- **Confidence:** low
- **Risks:** Truncation loses important context

**Deliverables:**

- Output size limits + truncation strategy
- Optional allowlist for fields persisted from node I/O

## Decisions

- **D-001:** PocketFlow is treated as a workflow input source; Kindling core remains orchestration-agnostic
- **D-002:** Capsules are node-scoped by default for highest signal

## Notes

- Keep this adapter small. The value is the boundary signal, not extra features.
