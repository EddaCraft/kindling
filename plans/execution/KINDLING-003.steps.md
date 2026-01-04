# Steps: KINDLING-003

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-core.aps.md](../modules/kindling-core.aps.md) |
| Task(s) | KINDLING-003 — Observation ingestion API |
| Created by | @aneki / AI |
| Status | Draft |

## Prerequisites

- [ ] KINDLING-001 complete (Observation type exists)
- [ ] KINDLING-002 complete (CapsuleManager available)
- [ ] STORAGE-002 complete (store write path available)

## Steps

### 1. Define ingestion interface

- **Checkpoint:** `src/observation/types.ts` exports:
  - `AppendObservationInput` type (kind, content, provenance, scopeIds, capsuleId?)
  - `AppendObservationResult` type (observationId, capsuleId)
  - `ObservationService` interface
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement provenance helpers

- **Checkpoint:** `src/observation/provenance.ts` exports:
  - `extractProvenance(kind, raw)` — extracts relevant provenance fields by kind
  - `validateProvenance(kind, provenance)` — ensures required fields present
  - Provenance schemas per observation kind
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement appendObservation

- **Checkpoint:** `src/observation/ingest.ts` exports `appendObservation()`:
  - Validates input
  - Generates observation ID
  - Sets timestamp
  - Extracts/validates provenance
  - Persists observation via store
  - Attaches to capsule if capsuleId provided or active capsule exists
  - Returns observation ID and capsule ID
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement auto-attach to active capsule

- **Checkpoint:** `src/observation/ingest.ts` handles:
  - If capsuleId not provided, looks up open capsule for scopeIds
  - If open capsule found, attaches observation
  - If no open capsule, observation stored without capsule attachment
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement ObservationService

- **Checkpoint:** `src/observation/service.ts` exports `ObservationService` class:
  - Wraps ingestion with store and capsule manager dependencies
  - Provides `append()`, `get()`, `listByCapsule()` methods
- **Validate:** `pnpm tsc --noEmit`

### 6. Add ingestion tests

- **Checkpoint:** `test/observation.spec.ts` covers:
  - Valid observation created with correct fields
  - Invalid input rejected with clear error
  - Provenance extracted correctly per kind
  - Timestamp set automatically
- **Validate:** `pnpm test -- observation`

### 7. Add capsule attachment tests

- **Checkpoint:** `test/observation.capsule.spec.ts` covers:
  - Observation attaches to specified capsule
  - Observation auto-attaches to open capsule
  - Observation stored without capsule if none open
  - Attachment order is deterministic
- **Validate:** `pnpm test -- observation.capsule`

### 8. Add provenance tests per kind

- **Checkpoint:** `test/observation.provenance.spec.ts` covers:
  - tool_call: toolName, args extracted
  - command: cmd, exitCode extracted
  - file_diff: paths extracted
  - error: stack extracted
  - message: no special provenance
  - node_*: node name/id, intent extracted
- **Validate:** `pnpm test -- observation.provenance`

## Completion

- [ ] All checkpoints validated
- [ ] Task(s) marked complete in source module

**Completed by:** ___
