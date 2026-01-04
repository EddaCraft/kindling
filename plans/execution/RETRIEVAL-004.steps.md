# Steps: RETRIEVAL-004

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-provider-local.aps.md](../modules/kindling-provider-local.aps.md) |
| Task(s) | RETRIEVAL-004 — Evidence snippet retrieval and safe truncation |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Evidence snippets provide concrete backing for retrieval results. They must be bounded (to fit token budgets), safe (respecting redaction), and useful (preserving important content like stack traces). Poor truncation loses critical context.

## What We're Building

Evidence extraction that:
- Fetches observation content for hits
- Truncates to configurable limits
- Handles special content (stack traces, diffs)
- Respects redaction

## Prerequisites

- [ ] STORAGE-004 complete (evidence snippet queries available)
- [ ] RETRIEVAL-001 complete (ProviderHit type defined)

## Steps

### 1. Define evidence interface

- **Why:** Clear contract for evidence handling
- **What:** Types and function signatures
- **Checkpoint:** `src/provider/evidence.ts` exports:
  - `EvidenceSnippet` type (observationId, content, truncated)
  - `EvidenceOptions` type (maxChars, preserveEnds)
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement basic truncation

- **Why:** Content must fit token budgets
- **What:** Simple character-based truncation
- **Checkpoint:** `src/provider/evidence.ts` exports `truncate(content, maxChars)`:
  - Truncates to maxChars
  - Adds '...' indicator when truncated
  - Preserves word boundaries where possible
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement smart truncation for stack traces

- **Why:** Stack traces have important content at start and end
- **What:** Truncation that preserves first and last lines
- **Checkpoint:** `src/provider/evidence.ts` exports `truncateStackTrace()`:
  - Keeps first N lines (error message)
  - Keeps last M lines (root cause)
  - Indicates omitted middle section
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement smart truncation for diffs

- **Why:** Diffs have context around changes
- **What:** Truncation that preserves change context
- **Checkpoint:** `src/provider/evidence.ts` exports `truncateDiff()`:
  - Keeps lines around +/- changes
  - Preserves file path headers
  - Indicates omitted sections
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement attachEvidenceSnippets

- **Why:** Main entry point for evidence retrieval
- **What:** Batch evidence fetching with truncation
- **Checkpoint:** `src/provider/evidence.ts` exports `attachEvidenceSnippets()`:
  - Accepts hits and maxChars
  - Fetches evidence from store (via STORAGE-004)
  - Applies appropriate truncation per observation kind
  - Returns '[redacted]' for redacted observations
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement content-type detection

- **Why:** Different content needs different truncation
- **What:** Heuristic detection of content type
- **Checkpoint:** `src/provider/evidence.ts` exports `detectContentType()`:
  - Detects stack traces (error patterns)
  - Detects diffs (unified diff patterns)
  - Falls back to plain text
- **Validate:** `pnpm tsc --noEmit`

### 7. Add truncation tests

- **Why:** Truncation must preserve useful content
- **What:** Tests for truncation behaviour
- **Checkpoint:** `test/provider.evidence.spec.ts` covers:
  - Basic truncation at character limit
  - Stack trace preserves first/last lines
  - Diff preserves change context
  - Redacted yields placeholder
  - Empty content handled
- **Validate:** `pnpm test -- provider.evidence`

### 8. Add determinism tests

- **Why:** Truncation must be reproducible
- **What:** Tests for consistent output
- **Checkpoint:** `test/provider.evidence.determinism.spec.ts`:
  - Same input produces same output
  - No randomness in truncation
  - Order of snippets matches input order
- **Validate:** `pnpm test -- provider.evidence.determinism`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
