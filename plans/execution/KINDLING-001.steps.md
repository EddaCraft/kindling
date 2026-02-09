# Steps: KINDLING-001

| Field      | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| Source     | [../modules/kindling-core.aps.md](../modules/kindling-core.aps.md) |
| Task(s)    | KINDLING-001 — Define domain types and validation                  |
| Created by | @aneki / AI                                                        |
| Status     | Draft                                                              |

## Prerequisites

- [ ] Package structure exists (`packages/kindling-core/`)
- [ ] TypeScript configured with strict mode

## Steps

### 1. Create base type definitions

- **Checkpoint:** `src/types/common.ts` exists with shared types (ID, Timestamp, Scope)
- **Validate:** `pnpm tsc --noEmit`

### 2. Define Observation type

- **Checkpoint:** `src/types/observation.ts` exports `Observation` type with:
  - `id: string`
  - `kind: ObservationKind` (tool_call, command, file_diff, error, message, node_start, node_end, node_output, node_error)
  - `content: string`
  - `provenance: Record<string, unknown>`
  - `ts: number` (epoch ms)
  - `scopeIds: ScopeIds` (sessionId?, repoId?, agentId?, userId?)
  - `redacted: boolean`
- **Validate:** `pnpm tsc --noEmit`

### 3. Define Capsule type

- **Checkpoint:** `src/types/capsule.ts` exports `Capsule` type with:
  - `id: string`
  - `type: CapsuleType` (session, pocketflow_node)
  - `intent: string`
  - `status: CapsuleStatus` (open, closed)
  - `openedAt: number`
  - `closedAt?: number`
  - `scopeIds: ScopeIds`
  - `observationIds: string[]`
  - `summaryId?: string`
- **Validate:** `pnpm tsc --noEmit`

### 4. Define Summary type

- **Checkpoint:** `src/types/summary.ts` exports `Summary` type with:
  - `id: string`
  - `capsuleId: string`
  - `content: string`
  - `confidence: number` (0-1)
  - `createdAt: number`
  - `evidenceRefs: string[]` (observation IDs)
- **Validate:** `pnpm tsc --noEmit`

### 5. Define Pin type

- **Checkpoint:** `src/types/pin.ts` exports `Pin` type with:
  - `id: string`
  - `targetType: 'observation' | 'summary'`
  - `targetId: string`
  - `reason?: string`
  - `createdAt: number`
  - `expiresAt?: number` (TTL support)
  - `scopeIds: ScopeIds`
- **Validate:** `pnpm tsc --noEmit`

### 6. Create barrel export

- **Checkpoint:** `src/types/index.ts` re-exports all types
- **Validate:** `pnpm tsc --noEmit`

### 7. Implement validation functions

- **Checkpoint:** `src/validation/` contains validators for each type:
  - `validateObservation(input): Result<Observation, ValidationError>`
  - `validateCapsule(input): Result<Capsule, ValidationError>`
  - `validateSummary(input): Result<Summary, ValidationError>`
  - `validatePin(input): Result<Pin, ValidationError>`
- **Validate:** `pnpm tsc --noEmit`

### 8. Add validation tests

- **Checkpoint:** `test/types.spec.ts` covers:
  - Valid inputs pass validation
  - Missing required fields rejected
  - Invalid field types rejected
  - Edge cases (empty strings, negative timestamps)
- **Validate:** `pnpm test -- types`

### 9. Export from package root

- **Checkpoint:** `src/index.ts` exports types and validators
- **Validate:** Types importable from `@eddacraft/kindling-core`

## Completion

- [ ] All checkpoints validated
- [ ] Task(s) marked complete in source module

**Completed by:** \_\_\_
