# Steps: KINDLING-004

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-core.aps.md](../modules/kindling-core.aps.md) |
| Task(s) | KINDLING-004 — Retrieval orchestration |
| Created by | @aneki / AI |
| Status | Draft |

## Prerequisites

- [ ] KINDLING-001 complete (domain types exist)
- [ ] RETRIEVAL-001 complete (provider contract defined)
- [ ] STORAGE-004 complete (read helpers available)

## Steps

### 1. Define retrieval interface

- **Checkpoint:** `src/retrieval/types.ts` exports:
  - `RetrievalRequest` type (query?, scopeIds, intent?, maxTokens?)
  - `RetrievalResponse` type (tiers, totalTokens, truncated)
  - `RetrievalTier` type (name, items, tokenBudget)
  - `RetrievalItem` type (type, id, content, why, evidenceRefs)
- **Validate:** `pnpm tsc --noEmit`

### 2. Define tiering rules

- **Checkpoint:** `src/retrieval/tiering.ts` exports:
  - `TieringConfig` type (pinBudget, summaryBudget, candidateBudget)
  - `DEFAULT_TIERING` constant
  - Tier order: pins → current summary → provider candidates
- **Validate:** `pnpm tsc --noEmit`
- **Pattern:** Pins and current summary are non-evictable (D-003)

### 3. Implement tier assembly

- **Checkpoint:** `src/retrieval/tiering.ts` exports `assembleTiers()`:
  - Fetches pins for scope (always included)
  - Fetches current capsule summary (always included if exists)
  - Requests candidates from provider
  - Applies token budgets with truncation
  - Returns ordered tiers
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement retrieval orchestrator

- **Checkpoint:** `src/retrieval/orchestrator.ts` exports `retrieve()`:
  - Validates request
  - Calls assembleTiers with store and provider
  - Calculates total tokens
  - Sets truncated flag if budget exceeded
  - Returns RetrievalResponse
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement token counting

- **Checkpoint:** `src/retrieval/tokens.ts` exports:
  - `countTokens(content)` — estimates token count
  - `truncateToTokens(content, max)` — truncates preserving meaning
  - Uses simple heuristic (chars/4) for v0.1; pluggable for future
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement explainability

- **Checkpoint:** `src/retrieval/explain.ts` exports:
  - `explainItem(item)` — generates human-readable explanation
  - Combines provider `why` with tier context
  - Includes evidence refs summary
- **Validate:** `pnpm tsc --noEmit`

### 7. Add orchestration tests

- **Checkpoint:** `test/retrieval.spec.ts` covers:
  - Empty query returns recent context
  - Query returns matching candidates
  - Pins always included first
  - Current summary included if exists
  - Token budget respected
- **Validate:** `pnpm test -- retrieval`

### 8. Add tiering tests

- **Checkpoint:** `test/retrieval.tiering.spec.ts` covers:
  - Tier order is deterministic
  - Non-evictable tiers never truncated
  - Candidate tier truncated when over budget
  - Truncated flag set correctly
- **Validate:** `pnpm test -- retrieval.tiering`

### 9. Add determinism tests

- **Checkpoint:** `test/retrieval.determinism.spec.ts` covers:
  - Same request + same store state = same response
  - Ordering stable across multiple calls
  - No randomness in results
- **Validate:** `pnpm test -- retrieval.determinism`

## Completion

- [ ] All checkpoints validated
- [ ] Task(s) marked complete in source module

**Completed by:** ___
