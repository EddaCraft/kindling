# Steps: STORAGE-005

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-store-sqlite.aps.md](../modules/kindling-store-sqlite.aps.md) |
| Task(s) | STORAGE-005 — Implement store-level export/import primitives |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Users need to backup, migrate, and share their local memory. Export/import at the store level provides the raw data primitives that the service layer (KINDLING-005) builds upon. Without reliable primitives, data portability is impossible.

## What We're Building

Low-level export/import functions that:
- Stream entities in deterministic order
- Preserve all relationships
- Handle large datasets without memory exhaustion
- Support integrity verification

## Prerequisites

- [ ] STORAGE-001 complete (schema exists)
- [ ] STORAGE-002 complete (write path for import)
- [ ] STORAGE-003 complete (redaction preserved in export)

## Steps

### 1. Define export primitives interface

- **Why:** Clear interface enables service-level composition
- **What:** Types and function signatures
- **Checkpoint:** `src/store/export.ts` exports:
  - `ExportStreamOptions` (scopeIds?, fromTs?, toTs?)
  - `exportObservations(opts): AsyncIterable<Observation>`
  - `exportCapsules(opts): AsyncIterable<Capsule>`
  - Similar for summaries, pins
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement observation export

- **Why:** Observations are the primary data
- **What:** Streaming query with filters
- **Checkpoint:** `exportObservations(opts)`:
  - Streams observations in ts order
  - Applies scope and time filters
  - Includes redacted observations (marked as such)
  - Memory-efficient for large datasets
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement capsule export

- **Why:** Capsules provide context structure
- **What:** Streaming query with relationships
- **Checkpoint:** `exportCapsules(opts)`:
  - Streams capsules in opened_at order
  - Includes observation IDs (not full observations)
  - Applies scope and time filters
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement summary and pin export

- **Why:** Complete export includes all entity types
- **What:** Similar streaming exports
- **Checkpoint:** Export functions for:
  - `exportSummaries(opts)` — by created_at
  - `exportPins(opts)` — by created_at
- **Validate:** `pnpm tsc --noEmit`

### 5. Define import primitives interface

- **Why:** Import must handle conflicts and ordering
- **What:** Types and function signatures
- **Checkpoint:** `src/store/export.ts` exports:
  - `ImportEntityResult` (imported, skipped, error?)
  - `importObservation(obs, conflict)` 
  - `importCapsule(capsule, conflict)`
  - Similar for summaries, pins
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement import with conflict handling

- **Why:** Merging data requires conflict resolution
- **What:** Insert with configurable conflict strategy
- **Checkpoint:** Import functions handle:
  - 'skip': existing entity preserved
  - 'overwrite': existing entity replaced
  - 'error': import fails on conflict
  - Returns result indicating action taken
- **Validate:** `pnpm tsc --noEmit`

### 7. Implement integrity verification

- **Why:** Import must not corrupt the database
- **What:** Post-import integrity checks
- **Checkpoint:** `verifyImportIntegrity()`:
  - Checks FK constraints satisfied
  - Verifies FTS sync (sample check)
  - Returns integrity report
- **Validate:** `pnpm tsc --noEmit`

### 8. Add export tests

- **Why:** Export must be deterministic and complete
- **What:** Tests for export primitives
- **Checkpoint:** `test/storage.export.spec.ts` covers:
  - Export order is deterministic
  - Filters work correctly
  - Large dataset doesn't exhaust memory
  - Redacted observations included with marker
- **Validate:** `pnpm test -- export`

### 9. Add import tests

- **Why:** Import must be safe and correct
- **What:** Tests for import primitives
- **Checkpoint:** `test/storage.import.spec.ts` covers:
  - All conflict strategies work
  - FK ordering handled (observations before capsules)
  - Integrity verification catches issues
  - Partial import leaves DB consistent
- **Validate:** `pnpm test -- import`

### 10. Add round-trip tests

- **Why:** Export-import must be lossless
- **What:** Tests verifying data preservation
- **Checkpoint:** `test/storage.roundtrip.spec.ts`:
  - Export → import to new DB → export produces identical data
  - All entity types preserved
  - Relationships intact
- **Validate:** `pnpm test -- roundtrip`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
