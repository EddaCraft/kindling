# Kindling CLI Quick Start

| Scope  | Owner  | Priority | Status               |
| ------ | ------ | -------- | -------------------- |
| CLI-QS | @aneki | medium   | Complete: 2025-01-29 |

## Purpose

Add `kindling init` and `kindling serve` commands to the CLI for quick setup:

```bash
# One command to set up everything
npx @eddacraft/kindling-cli init

# Optional: API server for programmatic access
kindling serve
```

This bridges the gap between "zero-config plugin" and "full TypeScript integration".

## In Scope

- `kindling init` command that:
  - Creates ~/.kindling/kindling.db
  - Optionally configures Claude Code hooks in .claude/settings.json
  - Prints next steps
- `kindling serve` command that:
  - Starts HTTP API server
  - Exposes capture/retrieve endpoints
  - Allows multi-tool integration
- Clear documentation

## Out of Scope

- Plugin creation (separate modules)
- Adapter library improvements
- Cloud features

## User Journey

```
1. User has npm/pnpm installed

2. User runs:
   npx @eddacraft/kindling-cli init

   Output:
   ✓ Created database at ~/.kindling/kindling.db
   ✓ Added hooks to .claude/settings.json

   Kindling is ready! Your Claude Code sessions will now be captured.

   Commands:
     kindling status     - Show database stats
     kindling search     - Search past sessions
     kindling serve      - Start API server

3. User continues using Claude Code normally

4. Later, user runs:
   kindling search "that auth bug"

   → Gets relevant observations from past sessions
```

## Ready Checklist

Change status to **Ready** when:

- [x] Purpose and scope are clear
- [x] User journey defined
- [x] At least one task defined

## Tasks

### CLI-QS-001: Implement `kindling init` command

- **Status:** Complete: 2025-01-29
- **Intent:** One-command setup for new users
- **Expected Outcome:** Running `kindling init` creates DB and configures hooks
- **Scope:** `packages/kindling-cli/src/commands/`
- **Non-scope:** API server
- **Files:** `init.ts`
- **Dependencies:** (none)
- **Validation:** Fresh machine → `npx @eddacraft/kindling-cli init` → working setup
- **Confidence:** high

**Deliverables:**

- Create ~/.kindling/ directory if needed
- Create kindling.db with schema
- Detect Claude Code installation
- Add hooks to .claude/settings.json (with user confirmation)
- Print success message with next steps

### CLI-QS-002: Implement `kindling serve` command

- **Status:** Complete: 2025-01-26
- **Intent:** HTTP API for programmatic access and multi-tool integration
- **Expected Outcome:** Running `kindling serve` starts API server
- **Scope:** `packages/kindling-cli/src/commands/` or `packages/kindling-api-server/`
- **Files:** `serve.ts`
- **Dependencies:** CLI-QS-001, existing api-server package
- **Validation:** Can POST observations and GET search results via HTTP
- **Confidence:** high

**Deliverables:**

- Start Fastify server on configurable port (default 8765)
- Endpoints: POST /observations, GET /search, GET /status
- Graceful shutdown
- Print URL on start

### CLI-QS-003: Improve CLI help and documentation

- **Intent:** Make CLI discoverable and self-documenting
- **Expected Outcome:** `kindling --help` shows clear, useful information
- **Scope:** CLI
- **Files:** All command files, README
- **Dependencies:** CLI-QS-001, CLI-QS-002
- **Validation:** New user can understand CLI from help output alone
- **Confidence:** high

## Decisions

- **D-001:** `init` modifies .claude/settings.json only with user confirmation
- **D-002:** `serve` uses existing api-server package internally
- **D-003:** Default port 8765 (memorable, unlikely to conflict)

## Risks & Mitigations

| Risk                            | Mitigation                 |
| ------------------------------- | -------------------------- |
| User doesn't have Claude Code   | Detect and skip hook setup |
| Permission issues with .claude/ | Clear error messages       |
| Port conflicts                  | Allow --port flag          |
