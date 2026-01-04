# Steps: ADAPTER-PF-002

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-adapter-pocketflow.aps.md](../modules/kindling-adapter-pocketflow.aps.md) |
| Task(s) | ADAPTER-PF-002 — Implement node lifecycle ingestion |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

PocketFlow nodes provide explicit boundaries for work. Unlike heuristic session segmentation, node lifecycle events give us high-confidence capsule boundaries. This is the core value proposition of the PocketFlow adapter.

## What We're Building

Node lifecycle integration that:
- Captures node start/end events
- Creates capsules per node execution
- Attaches observations (inputs, outputs, errors)
- Preserves node metadata for retrieval

## Prerequisites

- [ ] ADAPTER-PF-001 complete (PocketFlow available)
- [ ] KINDLING-002 complete (CapsuleManager available)

## Steps

### 1. Identify PocketFlow hook points

- **Why:** Need to know where to attach instrumentation
- **What:** Discovery of available hooks
- **Checkpoint:** Documented hook points:
  - Node before/after hooks
  - Error handlers
  - Input/output access points
  - Flow-level lifecycle (optional)
- **Validate:** Hooks documented

### 2. Define node observation types

- **Why:** Node events need specific observation kinds
- **What:** Observation kind definitions
- **Checkpoint:** `src/pocketflow/types.ts` exports:
  - `node_start` kind (node name, id, intent)
  - `node_output` kind (output summary, refs)
  - `node_error` kind (error details)
  - `node_end` kind (status, duration)
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement onNodeStart handler

- **Why:** Node start triggers capsule creation
- **What:** Handler that creates capsule and start observation
- **Checkpoint:** `src/pocketflow/lifecycle.ts` exports `onNodeStart()`:
  - Creates capsule with type='pocketflow_node'
  - Derives intent from node name/config
  - Creates node_start observation
  - Returns context for subsequent handlers
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement onNodeEnd handler

- **Why:** Node end closes capsule and records outcome
- **What:** Handler that closes capsule
- **Checkpoint:** `src/pocketflow/lifecycle.ts` exports `onNodeEnd()`:
  - Creates node_end observation (status, duration)
  - Closes capsule with signals
  - Handles success/failure status
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement onNodeOutput handler

- **Why:** Node outputs are valuable evidence
- **What:** Handler that captures outputs
- **Checkpoint:** `src/pocketflow/lifecycle.ts` exports `onNodeOutput()`:
  - Creates node_output observation
  - Bounds output size (truncation)
  - Attaches to active capsule
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement onNodeError handler

- **Why:** Errors are critical for debugging
- **What:** Handler that captures errors
- **Checkpoint:** `src/pocketflow/lifecycle.ts` exports `onNodeError()`:
  - Creates node_error observation
  - Captures error message and stack
  - Does not close capsule (node_end still fires)
- **Validate:** `pnpm tsc --noEmit`

### 7. Implement instrumentation wrapper

- **Why:** Easy integration with existing flows
- **What:** Wrapper that adds all hooks
- **Checkpoint:** `src/pocketflow/instrument.ts` exports `instrumentFlow()`:
  - Accepts PocketFlow flow definition
  - Attaches all lifecycle handlers
  - Returns instrumented flow
  - Non-invasive (doesn't modify original)
- **Validate:** `pnpm tsc --noEmit`

### 8. Add lifecycle tests

- **Why:** Lifecycle correctness ensures data quality
- **What:** Tests for node handling
- **Checkpoint:** `test/pocketflow.lifecycle.spec.ts` covers:
  - Node start creates capsule
  - Outputs attach to capsule
  - Errors captured correctly
  - Node end closes capsule
  - Duration calculated correctly
- **Validate:** `pnpm test -- pocketflow.lifecycle`

### 9. Add integration test with sample flow

- **Why:** Real flow execution validates integration
- **What:** End-to-end test with simple flow
- **Checkpoint:** `test/pocketflow.integration.spec.ts`:
  - Creates simple 2-node flow
  - Instruments and runs flow
  - Verifies capsules created
  - Verifies observations attached
- **Validate:** `pnpm test -- pocketflow.integration`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
