# Steps: ADAPTER-OC-004

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-adapter-opencode.aps.md](../modules/kindling-adapter-opencode.aps.md) |
| Task(s) | ADAPTER-OC-004 — Dogfood instrumentation + safety defaults |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Memory capture must not leak secrets or create noise that makes retrieval useless. Default safety rules prevent common mistakes. Dogfooding reveals real-world issues before users encounter them.

## What We're Building

Safety defaults that:
- Filter obvious secrets (env vars, tokens)
- Truncate oversized outputs
- Provide opt-out mechanisms
- Document what gets captured

## Prerequisites

- [ ] STORAGE-003 complete (redaction available for corrections)
- [ ] ADAPTER-OC-001 complete (mapping exists)
- [ ] ADAPTER-OC-002 complete (ingestion working)

## Steps

### 1. Define filtering interface

- **Why:** Clear rules for what gets filtered
- **What:** Types and filter configuration
- **Checkpoint:** `src/opencode/filter.ts` exports:
  - `FilterConfig` type (patterns, maxSize, allowlist)
  - `FilterResult` type (allowed, reason?)
  - `DEFAULT_FILTER_CONFIG` constant
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement secret pattern detection

- **Why:** Prevent accidental capture of credentials
- **What:** Regex-based detection
- **Checkpoint:** `src/opencode/filter.ts` exports `detectSecrets()`:
  - Detects common patterns: API keys, tokens, passwords
  - Patterns: `sk-...`, `ghp_...`, `password=...`, etc.
  - Returns list of detected secret types
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement content sanitisation

- **Why:** Remove or mask detected secrets
- **What:** Sanitiser that preserves structure
- **Checkpoint:** `src/opencode/filter.ts` exports `sanitise()`:
  - Replaces detected secrets with `[REDACTED:type]`
  - Preserves surrounding context
  - Logs sanitisation (for debugging)
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement size truncation

- **Why:** Large outputs waste storage and slow retrieval
- **What:** Truncation with clear indicators
- **Checkpoint:** `src/opencode/filter.ts` exports `truncateOutput()`:
  - Configurable max size (default: 10KB)
  - Truncates with `[TRUNCATED: N bytes omitted]`
  - Preserves start and end (configurable)
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement allowlist for tool results

- **Why:** Some tool results should capture specific fields only
- **What:** Per-tool field allowlisting
- **Checkpoint:** `src/opencode/filter.ts` exports `allowlistToolResult()`:
  - Configurable allowlist per tool name
  - Extracts only specified fields
  - Falls back to full result if no allowlist
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement pre-ingest filter pipeline

- **Why:** All content should pass through filters
- **What:** Pipeline that applies all filters
- **Checkpoint:** `src/opencode/filter.ts` exports `filterPipeline()`:
  - Applies in order: secret detection, sanitisation, truncation
  - Returns filtered content and filter report
  - Used by onEvent before ingestion
- **Validate:** `pnpm tsc --noEmit`

### 7. Document captured data

- **Why:** Users need to know what's being stored
- **What:** Clear documentation
- **Checkpoint:** `docs/opencode-capture.md` documents:
  - What events are captured
  - What filtering is applied
  - How to opt out (env var, config)
  - How to review/redact captured data
- **Validate:** Documentation exists

### 8. Add filter tests

- **Why:** Filters must work correctly for safety
- **What:** Tests for filtering behaviour
- **Checkpoint:** `test/opencode.filter.spec.ts` covers:
  - Known secret patterns detected
  - Secrets sanitised correctly
  - Large outputs truncated
  - Allowlist filtering works
  - Empty/null inputs handled
- **Validate:** `pnpm test -- opencode.filter`

### 9. Add integration tests

- **Why:** Filters must work in real ingestion flow
- **What:** End-to-end filter tests
- **Checkpoint:** `test/opencode.filter.integration.spec.ts`:
  - Event with secret is sanitised before storage
  - Large tool result is truncated
  - Filtered content searchable (without secrets)
- **Validate:** `pnpm test -- opencode.filter.integration`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
