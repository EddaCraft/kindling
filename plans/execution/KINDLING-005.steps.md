# Steps: KINDLING-005

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-core.aps.md](../modules/kindling-core.aps.md) |
| Task(s) | KINDLING-005 — Export/import coordination |
| Created by | @aneki / AI |
| Status | Draft |

## Prerequisites

- [ ] KINDLING-001 complete (domain types exist)
- [ ] STORAGE-005 complete (store-level export/import primitives)

## Steps

### 1. Define export/import interface

- **Checkpoint:** `src/export/types.ts` exports:
  - `ExportOptions` type (scopeIds?, fromTs?, toTs?, format?)
  - `ExportBundle` type (version, exportedAt, metadata, entities)
  - `ImportOptions` type (conflictStrategy: 'skip' | 'overwrite' | 'error')
  - `ImportResult` type (imported, skipped, errors)
- **Validate:** `pnpm tsc --noEmit`

### 2. Define bundle format

- **Checkpoint:** `src/export/format.ts` exports:
  - `BUNDLE_VERSION` constant (e.g., "1.0")
  - `BundleMetadata` type (sourceDb, kindlingVersion, scopeFilter)
  - Entity ordering: observations → capsules → summaries → pins
  - Format: NDJSON for streaming support
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement export bundle creation

- **Checkpoint:** `src/export/bundle.ts` exports `createExportBundle()`:
  - Accepts ExportOptions
  - Calls store export primitives with filters
  - Streams entities in deterministic order
  - Adds metadata header
  - Returns readable stream or file path
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement export to file

- **Checkpoint:** `src/export/bundle.ts` exports `exportToFile()`:
  - Wraps createExportBundle
  - Writes to specified path
  - Returns file path and stats (entity counts, size)
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement bundle validation

- **Checkpoint:** `src/export/validate.ts` exports `validateBundle()`:
  - Checks version compatibility
  - Validates metadata structure
  - Validates entity shapes (using type validators)
  - Returns validation result with errors
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement import restore

- **Checkpoint:** `src/export/restore.ts` exports `restoreFromBundle()`:
  - Accepts bundle stream/path and ImportOptions
  - Validates bundle first
  - Imports entities in order (observations first for FK integrity)
  - Handles conflicts per strategy
  - Returns ImportResult
- **Validate:** `pnpm tsc --noEmit`

### 7. Implement conflict handling

- **Checkpoint:** `src/export/restore.ts` handles:
  - `skip`: existing entities preserved, imported skipped
  - `overwrite`: existing entities replaced
  - `error`: import fails on first conflict
  - Conflict detection by ID
- **Validate:** `pnpm tsc --noEmit`

### 8. Add export tests

- **Checkpoint:** `test/export.spec.ts` covers:
  - Export produces valid bundle format
  - Scope filtering works
  - Time range filtering works
  - Entity ordering is deterministic
  - Metadata is correct
- **Validate:** `pnpm test -- export`

### 9. Add import tests

- **Checkpoint:** `test/import.spec.ts` covers:
  - Import restores all entities
  - Conflict strategies work correctly
  - Invalid bundle rejected with clear error
  - Partial import on error leaves DB consistent
- **Validate:** `pnpm test -- import`

### 10. Add round-trip tests

- **Checkpoint:** `test/export.roundtrip.spec.ts` covers:
  - Export → import → export produces identical bundles
  - All entity types preserved
  - Relationships (capsule→observations) preserved
  - Timestamps preserved exactly
- **Validate:** `pnpm test -- export.roundtrip`

## Completion

- [ ] All checkpoints validated
- [ ] Task(s) marked complete in source module

**Completed by:** ___
