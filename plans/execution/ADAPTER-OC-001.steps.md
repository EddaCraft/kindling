# Steps: ADAPTER-OC-001

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-adapter-opencode.aps.md](../modules/kindling-adapter-opencode.aps.md) |
| Task(s) | ADAPTER-OC-001 — Discover OpenCode event surfaces and define mapping table |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

OpenCode produces rich activity data (tool calls, commands, diffs, errors). To capture this reliably, we need a clear mapping from OpenCode's event model to Kindling's observation model. A mapping table ensures consistency and makes changes traceable.

## What We're Building

A documented mapping that:
- Identifies all relevant OpenCode events
- Maps each to a Kindling observation kind
- Defines provenance extraction rules
- Provides a single source of truth for ingestion

## Prerequisites

- [ ] Package structure exists (`packages/kindling-adapter-opencode/`)
- [ ] OpenCode event types documented or discoverable
- [ ] KINDLING-001 complete (Observation types defined)

## Steps

### 1. Discover OpenCode event surfaces

- **Why:** We need to know what events OpenCode emits
- **What:** Inventory of available events
- **Checkpoint:** Documentation lists:
  - Tool call events (name, args, result)
  - Command execution events (cmd, exit code, output)
  - File change events (paths, diff)
  - Error events (message, stack)
  - Message events (user/assistant messages)
  - Session lifecycle events (start, end)
- **Validate:** Events match actual OpenCode behaviour

### 2. Define observation kind mapping

- **Why:** Each event type needs a corresponding observation kind
- **What:** Mapping table
- **Checkpoint:** `src/opencode/mapping.ts` exports `EVENT_TO_KIND_MAP`:
  - `tool_call` event → `tool_call` kind
  - `command` event → `command` kind
  - `file_change` event → `file_diff` kind
  - `error` event → `error` kind
  - `message` event → `message` kind
- **Validate:** `pnpm tsc --noEmit`

### 3. Define provenance extraction per kind

- **Why:** Provenance makes observations queryable and explainable
- **What:** Extraction rules for each kind
- **Checkpoint:** `src/opencode/mapping.ts` defines provenance schemas:
  - `tool_call`: { toolName, args (sanitised), duration_ms }
  - `command`: { cmd, exitCode, cwd }
  - `file_diff`: { paths, additions, deletions }
  - `error`: { message, stack (truncated) }
  - `message`: { role, model? }
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement mapEvent function

- **Why:** Single entry point for all event mapping
- **What:** Function that transforms OpenCode events to observations
- **Checkpoint:** `src/opencode/mapping.ts` exports `mapEvent(event)`:
  - Accepts raw OpenCode event
  - Returns Observation (without id, ts — those added on ingest)
  - Throws/returns error for unknown event types
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement provenance extractors

- **Why:** Each kind has different provenance rules
- **What:** Per-kind extraction functions
- **Checkpoint:** `src/opencode/provenance.ts` exports:
  - `extractToolCallProvenance(event)`
  - `extractCommandProvenance(event)`
  - `extractFileDiffProvenance(event)`
  - `extractErrorProvenance(event)`
  - `extractMessageProvenance(event)`
- **Validate:** `pnpm tsc --noEmit`

### 6. Add mapping tests

- **Why:** Mapping correctness is critical for data quality
- **What:** Tests for each event type
- **Checkpoint:** `test/opencode.mapping.spec.ts` covers:
  - Each event type maps to correct kind
  - Provenance extracted correctly
  - Unknown events handled gracefully
  - Empty/malformed events handled
- **Validate:** `pnpm test -- opencode.mapping`

### 7. Document mapping table

- **Why:** Mapping should be human-readable for debugging
- **What:** Markdown documentation of mapping
- **Checkpoint:** `docs/opencode-mapping.md` documents:
  - Table of event → kind mappings
  - Provenance fields per kind
  - Examples of input/output
- **Validate:** Documentation exists

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
