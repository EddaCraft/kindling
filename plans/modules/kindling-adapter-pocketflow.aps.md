# Kindling PocketFlow Adapter

| Scope      | Owner  | Priority | Status      |
| ---------- | ------ | -------- | ----------- |
| ADAPTER-PF | @aneki | medium   | Implemented |

## Purpose

Transforms PocketFlow **library** workflow execution into structured observations and capsules. PocketFlow provides explicit node boundaries which makes capsule creation more reliable than heuristic time windows.

This adapter should:

- Capture node lifecycle as observations (node_start, node_output, node_error, node_end)
- Create a capsule per node run (or per flow run if configured)
- Attach node inputs/outputs as evidence with provenance

PocketFlow may be vendored internally (MIT license, explicitly supports copying source). The adapter boundary remains the same either way.

> **Important distinction:** This adapter is for users of the PocketFlow _library_ in their own workflows who want Kindling capture. The PocketFlow _orchestration layer_ described in `docs/system-spec.md` is a separate system component that mediates agents and the memory stack. These coexist — this adapter is one of many integration points.

## In Scope

- Node start/end event capture
- Node input/output observation capture with provenance
- Capsule creation per node

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

- [x] PocketFlow vendoring/dependency approach documented
- [x] Node lifecycle produces observations and capsules
- [x] Intent derived from node metadata
- [x] Confidence signals reflect execution outcome
- [x] Outputs bounded and privacy-safe

## Risks & Mitigations

| Risk                        | Mitigation                           |
| --------------------------- | ------------------------------------ |
| PocketFlow API changes      | Vendoring with pinned version        |
| Large node outputs          | Truncation + allowlist               |
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

### ADAPTER-PF-003: Capture structured provenance from node metadata

- **Intent:** Preserve workflow structure information in observation provenance for downstream use
- **Expected Outcome:** Observations include node name, type, config, and execution outcome in provenance fields
- **Scope:** `src/pocketflow/`
- **Non-scope:** Intent inference, confidence scoring (downstream system responsibilities)
- **Files:** `src/pocketflow/provenance.ts`
- **Dependencies:** ADAPTER-PF-002
- **Validation:** `pnpm test -- pocketflow.provenance`
- **Confidence:** high
- **Risks:** Node metadata shape may vary across PocketFlow versions

**Deliverables:**

- Provenance extraction from node name, type, config
- Execution outcome recording (success/failure/error) as raw facts
- Tests with fixtures

> **Boundary note:** Intent derivation and confidence scoring belong to downstream systems. This adapter captures raw structured facts; interpretation happens elsewhere.

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

- **D-001:** This adapter is for users of the PocketFlow _library_ in their own workflows. The vendored orchestration layer is a separate system component — not this adapter.
- **D-002:** Capsules are node-scoped by default for highest signal
- **D-003:** Adapter captures raw facts with provenance; intent inference and confidence scoring are downstream system responsibilities

## Notes

- Keep this adapter small. The value is the boundary signal, not extra features.
