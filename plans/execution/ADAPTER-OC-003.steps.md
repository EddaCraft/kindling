# Steps: ADAPTER-OC-003

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-adapter-opencode.aps.md](../modules/kindling-adapter-opencode.aps.md) |
| Task(s) | ADAPTER-OC-003 — Implement /memory command handlers |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

Users need direct control over their local memory without leaving OpenCode. The `/memory` commands provide inspection, search, pinning, and export capabilities. Good UX here builds user trust in the memory system.

## What We're Building

Command handlers that:
- Provide status and diagnostics
- Search memory and format results
- Pin important content
- Forget/redact sensitive content
- Export memory for backup

## Prerequisites

- [ ] KINDLING-004 complete (retrieval orchestration available)
- [ ] KINDLING-005 complete (export coordination available)
- [ ] ADAPTER-OC-002 complete (session integration available)

## Steps

### 1. Define command interface

- **Why:** Consistent command structure improves UX
- **What:** Types for command inputs/outputs
- **Checkpoint:** `src/opencode/commands/types.ts` exports:
  - `CommandResult` type (success, output, error?)
  - `CommandHandler` type (name, execute, description)
- **Validate:** `pnpm tsc --noEmit`

### 2. Implement /memory status

- **Why:** Users need visibility into memory state
- **What:** Status command showing diagnostics
- **Checkpoint:** `src/opencode/commands/status.ts`:
  - Shows DB location
  - Shows observation count
  - Shows capsule count (open/closed)
  - Shows last summary time
  - Shows disk usage
- **Validate:** `pnpm tsc --noEmit`

### 3. Implement /memory search

- **Why:** Users need to find specific context
- **What:** Search command with formatted output
- **Checkpoint:** `src/opencode/commands/search.ts`:
  - Accepts query string
  - Calls retrieval orchestrator
  - Formats results as readable block
  - Shows match count, snippets, and why
- **Validate:** `pnpm tsc --noEmit`

### 4. Implement /memory pin

- **Why:** Users need to mark important content
- **What:** Pin command for persistence
- **Checkpoint:** `src/opencode/commands/pin.ts`:
  - Without args: pins last assistant message
  - With ID: pins specific observation
  - Optional TTL flag
  - Confirms pin creation
- **Validate:** `pnpm tsc --noEmit`

### 5. Implement /memory forget

- **Why:** Users need to remove sensitive content
- **What:** Redaction command
- **Checkpoint:** `src/opencode/commands/forget.ts`:
  - Accepts observation ID
  - Calls redaction API
  - Confirms redaction
  - Warns about irreversibility
- **Validate:** `pnpm tsc --noEmit`

### 6. Implement /memory export

- **Why:** Users need backup capability
- **What:** Export command
- **Checkpoint:** `src/opencode/commands/export.ts`:
  - Optional scope filter
  - Optional time range
  - Calls export coordination
  - Shows output file path and stats
- **Validate:** `pnpm tsc --noEmit`

### 7. Implement command router

- **Why:** Commands need to be dispatched to handlers
- **What:** Router that parses and routes commands
- **Checkpoint:** `src/opencode/commands/router.ts`:
  - Parses `/memory <subcommand> [args]`
  - Routes to appropriate handler
  - Shows help for unknown subcommands
  - Handles errors gracefully
- **Validate:** `pnpm tsc --noEmit`

### 8. Add command tests

- **Why:** Commands must work correctly
- **What:** Tests for each command
- **Checkpoint:** `test/opencode.commands.spec.ts` covers:
  - Status returns expected fields
  - Search returns formatted results
  - Pin creates pin successfully
  - Forget redacts content
  - Export produces file
  - Unknown command shows help
- **Validate:** `pnpm test -- opencode.commands`

### 9. Add output formatting tests

- **Why:** Output readability is important UX
- **What:** Tests for formatting consistency
- **Checkpoint:** `test/opencode.commands.format.spec.ts`:
  - Output fits terminal width
  - No raw JSON in default output
  - Errors are human-readable
  - Empty results handled nicely
- **Validate:** `pnpm test -- opencode.commands.format`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
