# Kindling CLI

| Scope | Owner  | Priority | Status      |
| ----- | ------ | -------- | ----------- |
| CLI   | @aneki | medium   | Implemented |

## Purpose

Provides a minimal command-line interface for Kindling, enabling inspection, debugging, export/import, and standalone use without requiring adapters. The CLI ships in v0.1 to support developers who want direct access to their local memory store.

## In Scope

- Memory inspection and search
- Pin management
- Export/import operations
- Database status and diagnostics
- Capsule listing and inspection

## Out of Scope

- Adapter functionality (handled by dedicated adapters)
- Workflow orchestration
- Governance and promotion (Edda concerns)
- Interactive/TUI modes (v0.1 is simple CLI)

## Interfaces

**Depends on:**

- kindling-core — primary API

**Exposes:**

- `kindling status` — DB location, counts, health
- `kindling search <query>` — retrieve matching context
- `kindling pin <id>` / `kindling unpin <id>` — manage pins
- `kindling list [capsules|pins|observations]` — list entities
- `kindling export [--scope <scope>]` — export to file
- `kindling import <file>` — import from file

## Boundary Rules

- CLI must not implement storage or retrieval logic directly
- CLI must use kindling-core API for all operations
- Output is human-readable by default; JSON available via `--json` flag

## Acceptance Criteria

- [x] CLI runs and displays help
- [x] `kindling status` shows DB location and counts
- [x] `kindling search` returns formatted results
- [x] `kindling list` shows entities with pagination
- [x] Pin management works end-to-end
- [x] Export/import round-trips successfully

## Risks & Mitigations

| Risk                          | Mitigation                                      |
| ----------------------------- | ----------------------------------------------- |
| Output formatting preferences | Human-readable default; JSON flag for scripting |
| Large result sets             | Pagination with sensible defaults               |
| DB not found                  | Clear error message with path hint              |

## Tasks

### CLI-001: Implement core CLI scaffold and status command

- **Intent:** Establish CLI structure and provide basic diagnostics
- **Expected Outcome:** CLI runs, displays DB location and basic counts
- **Scope:** `src/cli/`
- **Non-scope:** Search, list, pin, export/import
- **Files:** `src/cli/index.ts`, `src/cli/commands/status.ts`
- **Dependencies:** STORAGE-001
- **Validation:** `pnpm test -- cli.status`
- **Confidence:** high
- **Risks:** Argument parsing library choice

**Deliverables:**

- CLI entry point with argument parsing
- `kindling status` command
- Tests for CLI invocation

### CLI-002: Implement search and list commands

- **Intent:** Enable developers to query and browse their local memory
- **Expected Outcome:** Search returns formatted results; list shows entities
- **Scope:** `src/cli/commands/`
- **Non-scope:** Pin management, export/import
- **Files:** `src/cli/commands/search.ts`, `src/cli/commands/list.ts`
- **Dependencies:** RETRIEVAL-001, STORAGE-004
- **Validation:** `pnpm test -- cli.search cli.list`
- **Confidence:** medium
- **Risks:** Output formatting for different terminal widths

**Deliverables:**

- `kindling search <query>` with formatted output
- `kindling list capsules|pins|observations` with pagination
- Tests for output formatting

### CLI-003: Implement pin management commands

- **Intent:** Allow direct pin creation and removal from command line
- **Expected Outcome:** Users can pin/unpin content without an adapter
- **Scope:** `src/cli/commands/`
- **Non-scope:** Search, export/import
- **Files:** `src/cli/commands/pin.ts`
- **Dependencies:** STORAGE-002
- **Validation:** `pnpm test -- cli.pin`
- **Confidence:** high
- **Risks:** TTL input parsing

**Deliverables:**

- `kindling pin <id>` with optional `--ttl` flag
- `kindling unpin <id>`
- `kindling list pins` with TTL display
- Tests for pin lifecycle

### CLI-004: Implement export/import commands

- **Intent:** Support backup, portability, and data migration
- **Expected Outcome:** Export produces portable files; import restores cleanly
- **Scope:** `src/cli/commands/`
- **Non-scope:** Search, list, pin
- **Files:** `src/cli/commands/export.ts`, `src/cli/commands/import.ts`
- **Dependencies:** STORAGE-005
- **Validation:** `pnpm test -- cli.export cli.import`
- **Confidence:** medium
- **Risks:** Large file handling

**Deliverables:**

- `kindling export` with `--scope` filtering
- `kindling import <file>` with validation
- Round-trip tests

## Decisions

- **D-001:** CLI is minimal and focused on inspection/debugging; not a replacement for adapters
- **D-002:** Output is human-readable by default; machine-readable formats (JSON) available via flags

## Notes

- Keep the CLI simple and predictable. It's a debugging and power-user tool, not a primary interface.
- CLI search uses Kindling's built-in mechanical retrieval (BM25 + scope + bounded results). When downstream systems are available, search can delegate to them for ranked/budgeted results.
