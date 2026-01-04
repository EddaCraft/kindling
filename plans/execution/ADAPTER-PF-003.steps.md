# Steps: ADAPTER-PF-003

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-adapter-pocketflow.aps.md](../modules/kindling-adapter-pocketflow.aps.md) |
| Task(s) | ADAPTER-PF-003 — Derive intent and confidence signals |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Intent and confidence improve retrieval relevance without requiring LLM inference. PocketFlow provides structural signals (node names, execution outcomes) that can be mapped to intent and confidence heuristics. This is higher-quality signal than time-based guessing.

## What We're Building

Intent and confidence derivation that:
- Maps node metadata to intent tags
- Derives confidence from execution outcome
- Provides explainable signals for retrieval ranking

## Prerequisites

- [ ] ADAPTER-PF-002 complete (node lifecycle working)

## Steps

### 1. Define intent taxonomy

- **Why:** Consistent intents improve retrieval matching
- **What:** Enumerated intent values
- **Checkpoint:** `src/pocketflow/intent.ts` exports:
  - `Intent` type (research, implementation, testing, debugging, documentation, general)
  - Intent descriptions for documentation
- **Validate:** `pnpm tsc --noEmit`

### 2. Define node name to intent mapping

- **Why:** Node names often indicate purpose
- **What:** Pattern-based mapping
- **Checkpoint:** `src/pocketflow/intent.ts` exports `NODE_INTENT_MAP`:
  - Patterns: `*search*`, `*research*` → research
  - Patterns: `*implement*`, `*code*`, `*write*` → implementation
  - Patterns: `*test*`, `*verify*` → testing
  - Patterns: `*debug*`, `*fix*` → debugging
  - Fallback: general
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement intent derivation

- **Why:** Capsules need intent for retrieval
- **What:** Function that derives intent
- **Checkpoint:** `src/pocketflow/intent.ts` exports `deriveIntent()`:
  - Accepts node name, node config
  - Matches against NODE_INTENT_MAP
  - Falls back to config hints if available
  - Returns Intent value
- **Validate:** `pnpm tsc --noEmit`

### 4. Define confidence model

- **Why:** Confidence affects retrieval ranking
- **What:** Rules for confidence scoring
- **Checkpoint:** `src/pocketflow/confidence.ts` exports:
  - `ConfidenceSignals` type (success, retries, downstream_use)
  - Documented scoring rules
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement success-based confidence

- **Why:** Successful execution increases confidence
- **What:** Confidence from execution outcome
- **Checkpoint:** `src/pocketflow/confidence.ts` exports `confidenceFromOutcome()`:
  - Success: base confidence 0.7
  - Failure: base confidence 0.3
  - Partial (some outputs): confidence 0.5
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement retry-based confidence adjustment

- **Why:** Repeated failures decrease confidence
- **What:** Confidence penalty for retries
- **Checkpoint:** `src/pocketflow/confidence.ts` exports `adjustForRetries()`:
  - Each retry: -0.1 confidence
  - Minimum confidence: 0.1
  - Rationale: flaky results are less reliable
- **Validate:** `pnpm tsc --noEmit`

### 7. Implement downstream use signal

- **Why:** Content used by later nodes is more valuable
- **What:** Confidence boost for reused outputs
- **Checkpoint:** `src/pocketflow/confidence.ts` exports `adjustForDownstreamUse()`:
  - Output used by N downstream nodes: +0.05 * N
  - Maximum boost: +0.2
  - Requires flow-level tracking
- **Validate:** `pnpm tsc --noEmit`

### 8. Integrate signals into lifecycle

- **Why:** Signals must be captured during execution
- **What:** Signal attachment to observations/capsules
- **Checkpoint:** `src/pocketflow/lifecycle.ts` updated:
  - Intent set on capsule creation
  - Confidence calculated on node_end
  - Summary includes confidence
- **Validate:** `pnpm tsc --noEmit`

### 9. Add intent tests

- **Why:** Intent mapping must be predictable
- **What:** Tests for intent derivation
- **Checkpoint:** `test/pocketflow.intent.spec.ts` covers:
  - Known patterns map correctly
  - Unknown names fall back to general
  - Config hints override name patterns
  - Case insensitivity works
- **Validate:** `pnpm test -- pocketflow.intent`

### 10. Add confidence tests

- **Why:** Confidence rules must be consistent
- **What:** Tests for confidence scoring
- **Checkpoint:** `test/pocketflow.confidence.spec.ts` covers:
  - Success/failure scoring correct
  - Retry penalty applied correctly
  - Downstream use boost works
  - Confidence stays in [0,1] range
- **Validate:** `pnpm test -- pocketflow.confidence`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
