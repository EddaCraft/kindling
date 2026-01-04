# Steps: RETRIEVAL-001

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-provider-local.aps.md](../modules/kindling-provider-local.aps.md) |
| Task(s) | RETRIEVAL-001 — Define provider contract + stable scoring model |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

The provider contract is the interface between retrieval orchestration and search implementation. A well-defined contract enables deterministic behaviour, testability, and future provider swaps. The scoring model must be stable to prevent unpredictable retrieval results.

## What We're Building

A provider interface that:
- Defines clear input/output types
- Specifies deterministic ordering rules
- Enables stable scoring across queries

## Prerequisites

- [ ] Package structure exists (`packages/kindling-provider-local/`)
- [ ] Domain types available from kindling-core

## Steps

### 1. Define provider request type

- **Why:** Clear input contract prevents ambiguity
- **What:** Type for search requests
- **Checkpoint:** `src/provider/types.ts` exports `ProviderRequest`:
  - `query?: string` (optional text query)
  - `scopeIds: ScopeIds` (session/repo/agent/user filter)
  - `intent?: string` (optional retrieval intent)
  - `limit: number` (max candidates)
- **Validate:** `pnpm tsc --noEmit`

### 2. Define provider hit type

- **Why:** Output shape must be consistent and explainable
- **What:** Type for search results
- **Checkpoint:** `src/provider/types.ts` exports `ProviderHit`:
  - `targetType: 'observation' | 'summary'`
  - `targetId: string`
  - `score: number` (0-1 normalised)
  - `why: string` (short explanation)
  - `evidenceRefs: string[]` (observation IDs)
  - `ts_ms: number` (for deterministic tiebreak)
- **Validate:** `pnpm tsc --noEmit`

### 3. Define provider interface

- **Why:** Interface enables testing and alternative implementations
- **What:** Provider contract
- **Checkpoint:** `src/provider/types.ts` exports `RetrievalProvider`:
  - `searchCandidates(request: ProviderRequest): Promise<ProviderHit[]>`
- **Validate:** `pnpm tsc --noEmit`

### 4. Define scoring model

- **Why:** Scoring must be documented and deterministic
- **What:** Scoring rules and weights
- **Checkpoint:** `src/provider/scoring.ts` exports:
  - `ScoringWeights` type (fts, recency, scope, intent)
  - `DEFAULT_WEIGHTS` constant
  - `calculateScore(hit, request, weights)` pure function
- **Validate:** `pnpm tsc --noEmit`

### 5. Define stable sort rules

- **Why:** Ordering must be reproducible given same data
- **What:** Tiebreak rules documented and implemented
- **Checkpoint:** `src/provider/scoring.ts` exports `stableSort(hits)`:
  - Primary: score descending
  - Secondary: ts_ms descending (newer first)
  - Tertiary: targetId ascending (lexicographic)
  - No randomness anywhere
- **Validate:** `pnpm tsc --noEmit`

### 6. Add contract tests

- **Why:** Contract compliance must be verified
- **What:** Tests for type shapes and sort stability
- **Checkpoint:** `test/provider.contract.spec.ts` covers:
  - ProviderHit has all required fields
  - Score is normalised (0-1)
  - stableSort produces identical results on repeated calls
  - Tiebreak rules work correctly
- **Validate:** `pnpm test -- provider.contract`

### 7. Add scoring tests

- **Why:** Scoring model must behave predictably
- **What:** Tests for score calculation
- **Checkpoint:** `test/provider.scoring.spec.ts` covers:
  - FTS match increases score
  - Recency increases score
  - Scope match increases score
  - Intent match increases score (when provided)
  - Score normalisation works
- **Validate:** `pnpm test -- provider.scoring`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
