# Steps: STORAGE-002

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-store-sqlite.aps.md](../modules/kindling-store-sqlite.aps.md) |
| Task(s) | STORAGE-002 — Implement SqliteKindlingStore write path |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

The write path is where observations enter the system of record. It must be atomic, deterministic, and handle concurrent activity safely. A buggy write path leads to lost data or corrupted relationships.

## What We're Building

A store implementation that provides safe, transactional writes for all Kindling entities while maintaining referential integrity.

## Prerequisites

- [ ] STORAGE-001 complete (schema exists)
- [ ] KindlingStore interface defined (from kindling-core types)

## Steps

### 1. Define store interface implementation

- **Why:** Clear interface contract enables testing and swappability
- **What:** SqliteKindlingStore class skeleton implementing KindlingStore
- **Checkpoint:** `src/store/sqlite.ts` exports `SqliteKindlingStore` class
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement observation insert

- **Why:** Observations are the atomic unit of capture
- **What:** Insert with validation and timestamp handling
- **Checkpoint:** `insertObservation(obs)` method:
  - Validates observation shape
  - Inserts into observations table
  - Updates FTS index
  - Returns inserted observation
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement capsule lifecycle writes

- **Why:** Capsules provide bounded context for observations
- **What:** Create and close operations with status management
- **Checkpoint:** Methods implemented:
  - `createCapsule(opts)` — inserts with status='open'
  - `closeCapsule(id, signals)` — updates status='closed', sets closedAt
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement capsule-observation attachment

- **Why:** Observations must be linked to capsules for retrieval
- **What:** Junction table insert with ordering
- **Checkpoint:** `attachObservationToCapsule(capsuleId, observationId)`:
  - Inserts into capsule_observations
  - Assigns deterministic sequence number
  - Handles duplicate attachment gracefully
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement summary insert

- **Why:** Summaries compress capsule content for retrieval
- **What:** Insert with capsule linkage
- **Checkpoint:** `insertSummary(summary)`:
  - Validates summary shape
  - Inserts into summaries table
  - Updates FTS index
  - Links to capsule
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement pin CRUD

- **Why:** Pins mark important content that must always be retrieved
- **What:** Create, read, delete with TTL support
- **Checkpoint:** Pin methods:
  - `insertPin(pin)` — creates pin with optional TTL
  - `deletePin(id)` — removes pin
  - `listPins(scopeIds, now)` — returns non-expired pins
- **Validate:** `pnpm tsc --noEmit`

### 7. Implement transaction wrapper

- **Why:** Multi-step writes must be atomic
- **What:** Transaction helper for complex operations
- **Checkpoint:** `withTransaction(fn)`:
  - Begins transaction
  - Executes fn with store context
  - Commits on success, rolls back on error
- **Validate:** `pnpm tsc --noEmit`

### 8. Add write path tests

- **Why:** Data integrity is critical
- **What:** Tests for all write operations
- **Checkpoint:** `test/store.write.spec.ts` covers:
  - Observation insert and retrieval
  - Capsule create/close lifecycle
  - Attachment ordering is deterministic
  - Pin TTL filtering works
  - Transaction rollback on error
- **Validate:** `pnpm test -- store.write`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
