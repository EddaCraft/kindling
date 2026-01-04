# Steps: RETRIEVAL-003

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-provider-local.aps.md](../modules/kindling-provider-local.aps.md) |
| Task(s) | RETRIEVAL-003 — Implement ranking + explainability |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Ranking transforms raw FTS matches into useful, predictable results. Without good ranking, users get irrelevant content. Without explainability, users can't understand or debug retrieval results. Both are essential for trust.

## What We're Building

A ranking system that:
- Combines multiple signals (FTS, recency, scope, intent)
- Produces deterministic, stable ordering
- Generates human-readable explanations

## Prerequisites

- [ ] RETRIEVAL-001 complete (scoring model defined)
- [ ] RETRIEVAL-002 complete (FTS search available)

## Steps

### 1. Implement signal extraction

- **Why:** Ranking needs normalised inputs
- **What:** Functions to extract ranking signals from hits
- **Checkpoint:** `src/provider/ranking.ts` exports signal extractors:
  - `extractFtsSignal(hit)` — normalised FTS rank (0-1)
  - `extractRecencySignal(hit, now)` — time decay (0-1)
  - `extractScopeSignal(hit, request)` — scope match quality (0-1)
  - `extractIntentSignal(hit, request)` — intent match (0-1)
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement score combination

- **Why:** Multiple signals must combine predictably
- **What:** Weighted combination function
- **Checkpoint:** `src/provider/ranking.ts` exports `combineScores()`:
  - Accepts signals and weights
  - Produces final score (0-1)
  - Pure function, no side effects
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement rankHits function

- **Why:** This is the main ranking entry point
- **What:** Full ranking pipeline
- **Checkpoint:** `src/provider/ranking.ts` exports `rankHits(hits, request)`:
  - Extracts signals for each hit
  - Combines scores
  - Applies stable sort
  - Returns ranked hits
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement scope boost rules

- **Why:** Closer scope should rank higher
- **What:** Scope hierarchy scoring
- **Checkpoint:** Scope boost implementation:
  - Session match: highest boost (1.0)
  - Repo match: medium boost (0.7)
  - Agent match: lower boost (0.5)
  - No match: no boost (0.0)
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement intent boost rules

- **Why:** Intent-aware retrieval improves relevance
- **What:** Intent matching when available
- **Checkpoint:** Intent boost implementation:
  - Capsule intent matches request intent: boost
  - Summary content relates to intent: boost
  - No intent provided: no boost applied
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement why generation

- **Why:** Users need to understand why content was retrieved
- **What:** Human-readable explanation generator
- **Checkpoint:** `src/provider/explain.ts` exports `generateWhy(hit, request)`:
  - Produces short string (< 100 chars)
  - Mentions primary ranking factor
  - Examples: "matched 'auth' in this session", "recent command output"
- **Validate:** `pnpm tsc --noEmit`

### 7. Add ranking tests

- **Why:** Ranking correctness is critical
- **What:** Tests for ranking behaviour
- **Checkpoint:** `test/provider.ranking.spec.ts` covers:
  - FTS match outranks non-match
  - Recency tiebreaks similar scores
  - Session scope outranks repo scope
  - Intent match boosts relevance
  - Ranking is deterministic
- **Validate:** `pnpm test -- provider.ranking`

### 8. Add scenario tests

- **Why:** Real-world queries should produce sensible results
- **What:** Tests for common retrieval scenarios
- **Checkpoint:** `test/provider.scenarios.spec.ts` covers:
  - "Resume work" query returns recent session context
  - "Why did tests fail" returns error observations
  - "What was decided" returns summaries with decision content
- **Validate:** `pnpm test -- provider.scenarios`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
