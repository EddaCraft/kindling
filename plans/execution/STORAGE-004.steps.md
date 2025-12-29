# Steps: STORAGE-004

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-store-sqlite.aps.md](../modules/kindling-store-sqlite.aps.md) |
| Task(s) | STORAGE-004 — Implement read helpers for retrieval orchestration |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

The retrieval system depends on efficient, well-structured queries from the store. Without optimised read helpers, retrieval becomes slow and unpredictable. These helpers are the interface between storage and retrieval.

## What We're Building

Query primitives that providers and the retrieval orchestrator use to fetch:
- Pins (with TTL awareness)
- Summaries (by capsule)
- Open capsules (by session)
- Evidence snippets (bounded extracts)

## Prerequisites

- [ ] STORAGE-002 complete (write path available for test data)

## Steps

### 1. Implement pin listing

- **Why:** Pins are always included in retrieval (non-evictable tier)
- **What:** Query that respects TTL and scope
- **Checkpoint:** `listPins(scopeIds, now)`:
  - Returns pins where expires_at is null or > now
  - Filters by scope (session, repo, agent, user)
  - Orders by created_at desc
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement open capsule lookup

- **Why:** Observations auto-attach to open capsules
- **What:** Query for active capsule by session
- **Checkpoint:** `getOpenCapsuleForSession(sessionId)`:
  - Returns capsule with status='open' for session
  - Returns null if no open capsule
  - Handles multiple sessions gracefully
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement summary lookup

- **Why:** Current summary is included in retrieval (non-evictable)
- **What:** Query for latest summary by capsule
- **Checkpoint:** `getLatestSummaryForCapsule(capsuleId)`:
  - Returns most recent summary for capsule
  - Returns null if no summary exists
  - Ordered by created_at desc
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement evidence snippet retrieval

- **Why:** Retrieval results need bounded evidence extracts
- **What:** Query that fetches and truncates observation content
- **Checkpoint:** `getEvidenceSnippets(observationIds, maxChars)`:
  - Fetches observations by IDs
  - Truncates content to maxChars per observation
  - Returns '[redacted]' for redacted observations
  - Preserves order of input IDs
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement capsule with observations

- **Why:** Inspection needs full capsule context
- **What:** Query that joins capsule with its observations
- **Checkpoint:** `getCapsuleWithObservations(capsuleId)`:
  - Returns capsule with observations array
  - Observations ordered by attachment sequence
  - Includes summary if exists
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement scope-filtered queries

- **Why:** Retrieval scopes to session/repo/agent/user
- **What:** Query builder for scope filtering
- **Checkpoint:** `buildScopeFilter(scopeIds)`:
  - Produces SQL conditions for scope matching
  - Handles partial scope (e.g., just repoId)
  - Supports hierarchical matching (session includes repo)
- **Validate:** `pnpm tsc --noEmit`

### 7. Add read helper tests

- **Why:** Queries must return correct data
- **What:** Tests for all read helpers
- **Checkpoint:** `test/storage.queries.spec.ts` covers:
  - Pin TTL filtering works correctly
  - Open capsule lookup returns correct result
  - Evidence snippets truncate properly
  - Scope filtering matches expected observations
  - Empty results handled gracefully
- **Validate:** `pnpm test -- queries`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
