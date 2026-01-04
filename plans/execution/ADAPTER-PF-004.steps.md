# Steps: ADAPTER-PF-004

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-adapter-pocketflow.aps.md](../modules/kindling-adapter-pocketflow.aps.md) |
| Task(s) | ADAPTER-PF-004 — Output bounding and privacy defaults |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

PocketFlow node outputs can be large (LLM responses, data transformations). Unbounded capture wastes storage and degrades retrieval quality. Privacy defaults prevent accidental capture of sensitive data passed through workflows.

## What We're Building

Output handling that:
- Truncates large outputs to reasonable sizes
- Allows configuration of captured fields
- Applies redaction policies
- Preserves useful context despite limits

## Prerequisites

- [ ] STORAGE-003 complete (redaction available)
- [ ] ADAPTER-PF-002 complete (output capture working)

## Steps

### 1. Define output limits

- **Why:** Clear limits prevent unbounded growth
- **What:** Configurable size limits
- **Checkpoint:** `src/pocketflow/truncate.ts` exports:
  - `OutputLimits` type (maxSize, maxFields, maxArrayItems)
  - `DEFAULT_LIMITS` constant (10KB, 50 fields, 100 items)
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement size truncation

- **Why:** Large outputs must be bounded
- **What:** Truncation with indicator
- **Checkpoint:** `src/pocketflow/truncate.ts` exports `truncateBySize()`:
  - Truncates string/JSON to maxSize
  - Adds `[TRUNCATED]` marker
  - Preserves structure where possible
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement field truncation

- **Why:** Deep objects waste space
- **What:** Depth and field limiting
- **Checkpoint:** `src/pocketflow/truncate.ts` exports `truncateObject()`:
  - Limits to maxFields top-level keys
  - Limits nested depth (default: 3)
  - Adds `[N fields omitted]` marker
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement array truncation

- **Why:** Large arrays are common in data flows
- **What:** Array size limiting
- **Checkpoint:** `src/pocketflow/truncate.ts` exports `truncateArray()`:
  - Keeps first/last items
  - Adds `[N items omitted]` marker
  - Preserves array type hint
- **Validate:** `pnpm tsc --noEmit`

### 5. Define output allowlist

- **Why:** Some outputs should only capture specific fields
- **What:** Per-node allowlist configuration
- **Checkpoint:** `src/pocketflow/truncate.ts` exports:
  - `OutputAllowlist` type (nodePattern, fields)
  - `applyAllowlist(output, allowlist)` function
  - Example: LLM node → only capture `content`, `model`
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement sensitive data detection

- **Why:** Workflows may pass sensitive data
- **What:** Detection for common sensitive patterns
- **Checkpoint:** `src/pocketflow/privacy.ts` exports `detectSensitive()`:
  - Detects keys: password, secret, token, key, credential
  - Detects patterns: API keys, JWTs
  - Returns list of detected issues
- **Validate:** `pnpm tsc --noEmit`

### 7. Implement sensitive data masking

- **Why:** Detected sensitive data should be masked
- **What:** Masking function
- **Checkpoint:** `src/pocketflow/privacy.ts` exports `maskSensitive()`:
  - Replaces sensitive values with `[MASKED]`
  - Preserves structure and key names
  - Logs masking actions (for debugging)
- **Validate:** `pnpm tsc --noEmit`

### 8. Integrate into output capture

- **Why:** All outputs should pass through bounding
- **What:** Pipeline integration
- **Checkpoint:** `src/pocketflow/lifecycle.ts` updated:
  - onNodeOutput applies truncation
  - onNodeOutput applies privacy masking
  - Allowlist checked before capture
- **Validate:** `pnpm tsc --noEmit`

### 9. Add truncation tests

- **Why:** Truncation must preserve useful content
- **What:** Tests for truncation behaviour
- **Checkpoint:** `test/pocketflow.truncate.spec.ts` covers:
  - Large strings truncated correctly
  - Deep objects flattened
  - Arrays bounded with markers
  - Allowlist filtering works
- **Validate:** `pnpm test -- pocketflow.truncate`

### 10. Add privacy tests

- **Why:** Privacy protection is critical
- **What:** Tests for sensitive data handling
- **Checkpoint:** `test/pocketflow.privacy.spec.ts` covers:
  - Common secrets detected
  - Masking replaces values correctly
  - Nested secrets found
  - Non-sensitive data preserved
- **Validate:** `pnpm test -- pocketflow.privacy`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
