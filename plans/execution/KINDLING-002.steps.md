# Steps: KINDLING-002

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-core.aps.md](../modules/kindling-core.aps.md) |
| Task(s) | KINDLING-002 — Capsule lifecycle implementation |
| Created by | @aneki / AI |
| Status | Draft |

## Prerequisites

- [ ] KINDLING-001 complete (domain types exist)
- [ ] STORAGE-001 complete (store interface available)

## Steps

### 1. Define CapsuleManager interface

- **Checkpoint:** `src/capsule/types.ts` exports:
  - `CapsuleManager` interface with `open()`, `close()`, `get()`, `getOpen()`
  - `OpenCapsuleOptions` type (type, intent, scopeIds)
  - `CloseCapsuleSignals` type (reason, summary?)
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement openCapsule

- **Checkpoint:** `src/capsule/lifecycle.ts` exports `openCapsule()`:
  - Creates new Capsule with status=open
  - Validates no duplicate open capsule for same session (if session-scoped)
  - Persists via store
  - Returns capsule ID
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement closeCapsule

- **Checkpoint:** `src/capsule/lifecycle.ts` exports `closeCapsule()`:
  - Sets status=closed, closedAt timestamp
  - Accepts optional summary content
  - Triggers summary creation if content provided
  - Persists via store
  - Returns closed capsule
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement capsule lookup

- **Checkpoint:** `src/capsule/lifecycle.ts` exports:
  - `getCapsule(id)` — returns capsule by ID
  - `getOpenCapsule(scopeIds)` — returns open capsule for scope (if any)
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement CapsuleManager

- **Checkpoint:** `src/capsule/manager.ts` exports `CapsuleManager` class:
  - Wraps lifecycle functions with store dependency
  - Tracks active capsules in memory for fast lookup
  - Handles concurrent access safely
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement timeout handling

- **Checkpoint:** `src/capsule/timeout.ts` exports:
  - `CapsuleTimeoutWatcher` that monitors open capsules
  - Configurable inactivity timeout (default: 30 minutes)
  - Auto-closes capsules on timeout with reason="timeout"
- **Validate:** `pnpm tsc --noEmit`

### 7. Add lifecycle tests

- **Checkpoint:** `test/capsule.spec.ts` covers:
  - Open creates capsule with correct state
  - Close updates status and timestamp
  - Cannot close already-closed capsule
  - getOpenCapsule returns correct capsule
  - Timeout triggers auto-close
- **Validate:** `pnpm test -- capsule`

### 8. Add concurrent access tests

- **Checkpoint:** `test/capsule.concurrent.spec.ts` covers:
  - Multiple capsules can be open for different scopes
  - Same scope cannot have multiple open capsules (session type)
  - Concurrent open/close operations handled safely
- **Validate:** `pnpm test -- capsule.concurrent`

## Completion

- [ ] All checkpoints validated
- [ ] Task(s) marked complete in source module

**Completed by:** ___
