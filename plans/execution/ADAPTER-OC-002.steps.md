# Steps: ADAPTER-OC-002

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-adapter-opencode.aps.md](../modules/kindling-adapter-opencode.aps.md) |
| Task(s) | ADAPTER-OC-002 — Implement session capsule lifecycle |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Capsules provide bounded context for observations. By mapping OpenCode sessions to capsules, we ensure that observations from a single coding session are grouped together, making retrieval more relevant and efficient.

## What We're Building

Session lifecycle integration that:
- Opens a capsule when an OpenCode session starts
- Attaches observations to the active capsule
- Closes the capsule when the session ends
- Handles edge cases (crashes, timeouts)

## Prerequisites

- [ ] KINDLING-002 complete (CapsuleManager available)
- [ ] ADAPTER-OC-001 complete (event mapping defined)

## Steps

### 1. Define session context type

- **Why:** Track state needed for capsule management
- **What:** Type for session tracking
- **Checkpoint:** `src/opencode/session.ts` exports:
  - `SessionContext` type (sessionId, repoId?, capsuleId, startedAt)
  - `SessionRegistry` for tracking active sessions
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement onSessionStart handler

- **Why:** Session start triggers capsule creation
- **What:** Handler that opens a capsule
- **Checkpoint:** `src/opencode/session.ts` exports `onSessionStart()`:
  - Accepts sessionId, repoId (optional)
  - Calls `kindling.openCapsule(type='session', intent='general')`
  - Stores capsuleId in session registry
  - Returns SessionContext
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement onEvent handler

- **Why:** Events must attach to the active capsule
- **What:** Handler that processes events
- **Checkpoint:** `src/opencode/session.ts` exports `onEvent()`:
  - Looks up active capsule for session
  - Maps event via ADAPTER-OC-001 mapping
  - Calls `kindling.appendObservation()` with capsuleId
  - Handles missing capsule gracefully (creates one)
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement onSessionEnd handler

- **Why:** Session end triggers capsule close
- **What:** Handler that closes the capsule
- **Checkpoint:** `src/opencode/session.ts` exports `onSessionEnd()`:
  - Looks up capsule for session
  - Calls `kindling.closeCapsule()` with signals
  - Removes session from registry
  - Handles already-closed capsule gracefully
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement missing repoId handling

- **Why:** Not all sessions have a repo context
- **What:** Graceful handling of missing scope
- **Checkpoint:** Session handling:
  - Missing repoId: capsule created with sessionId only
  - RepoId discovered mid-session: can be attached
  - All observations still recorded
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement crash recovery

- **Why:** Sessions may end without clean shutdown
- **What:** Detection and cleanup of orphan capsules
- **Checkpoint:** `src/opencode/session.ts` exports `recoverOrphanSessions()`:
  - Finds open capsules without recent activity
  - Closes with reason='orphan_recovery'
  - Run on adapter initialisation
- **Validate:** `pnpm tsc --noEmit`

### 7. Add session lifecycle tests

- **Why:** Lifecycle correctness ensures data integrity
- **What:** Tests for session handling
- **Checkpoint:** `test/opencode.session.spec.ts` covers:
  - Session start creates capsule
  - Events attach to correct capsule
  - Session end closes capsule
  - Multiple concurrent sessions handled
  - Missing repoId handled gracefully
- **Validate:** `pnpm test -- opencode.session`

### 8. Add edge case tests

- **Why:** Edge cases cause data loss if not handled
- **What:** Tests for unusual scenarios
- **Checkpoint:** `test/opencode.session.edge.spec.ts` covers:
  - Event before session start (creates capsule)
  - Double session end (idempotent)
  - Session end without start (no crash)
  - Orphan recovery works
- **Validate:** `pnpm test -- opencode.session.edge`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
