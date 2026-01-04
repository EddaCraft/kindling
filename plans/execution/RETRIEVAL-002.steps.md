# Steps: RETRIEVAL-002

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-provider-local.aps.md](../modules/kindling-provider-local.aps.md) |
| Task(s) | RETRIEVAL-002 — Implement SQLite FTS candidate search |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Full-text search is the primary mechanism for finding relevant content. FTS must be fast, accurate, and respect privacy (redaction). Without efficient FTS, retrieval becomes either slow or inaccurate.

## What We're Building

SQLite FTS5 search implementation that:
- Queries observations and summaries
- Respects scope filters
- Falls back to recency when no query provided
- Excludes redacted content

## Prerequisites

- [ ] STORAGE-001 complete (FTS tables exist)
- [ ] RETRIEVAL-001 complete (provider types defined)

## Steps

### 1. Implement observation FTS search

- **Why:** Observations contain the raw captured content
- **What:** FTS query with scope filtering
- **Checkpoint:** `src/provider/sqliteFts.ts` exports `searchObservationsFts()`:
  - Accepts query, scopeIds, limit
  - Uses FTS5 MATCH syntax
  - Filters by scope
  - Returns raw hits with FTS rank
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement summary FTS search

- **Why:** Summaries provide compressed context
- **What:** FTS query for summaries
- **Checkpoint:** `src/provider/sqliteFts.ts` exports `searchSummariesFts()`:
  - Accepts query, scopeIds, limit
  - Uses FTS5 MATCH syntax
  - Filters by scope (via capsule)
  - Returns raw hits with FTS rank
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement query sanitisation

- **Why:** User queries may contain FTS syntax that breaks queries
- **What:** Query cleaner for safe FTS execution
- **Checkpoint:** `src/provider/sqliteFts.ts` exports `sanitiseQuery()`:
  - Escapes FTS special characters
  - Handles empty/whitespace queries
  - Preserves meaningful tokens
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement recency fallback

- **Why:** No-query retrieval should return recent context
- **What:** Time-based query when no search terms
- **Checkpoint:** `src/provider/sqliteFts.ts` exports `fallbackRecent()`:
  - Returns most recent observations for scope
  - Orders by timestamp descending
  - Respects limit
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement scope filtering

- **Why:** Retrieval must respect scope boundaries
- **What:** SQL builder for scope conditions
- **Checkpoint:** Scope filtering:
  - Session scope: exact sessionId match
  - Repo scope: exact repoId match
  - Agent scope: exact agentId match
  - Hierarchical: session implies repo
- **Validate:** `pnpm tsc --noEmit`

### 6. Add FTS tests

- **Why:** Search accuracy is critical
- **What:** Tests for FTS behaviour
- **Checkpoint:** `test/provider.fts.spec.ts` covers:
  - Query matches expected content
  - Redacted observations excluded
  - Scope filtering works correctly
  - Empty query returns recency fallback
  - Special characters don't break search
- **Validate:** `pnpm test -- provider.fts`

### 7. Add performance baseline test

- **Why:** FTS must be fast enough for interactive use
- **What:** Simple latency check
- **Checkpoint:** `test/provider.fts.perf.spec.ts`:
  - Search on 1k observations < 100ms
  - Documents baseline for regression detection
- **Validate:** `pnpm test -- provider.fts.perf`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
