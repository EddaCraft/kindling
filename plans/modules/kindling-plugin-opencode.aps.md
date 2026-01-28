# Kindling OpenCode Plugin

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| PLUGIN-OC | @aneki | high | Draft |

## Purpose

A zero-installation OpenCode extension that provides memory continuity. Users install via OpenCode's extension mechanism and immediately have:

- Automatic session capture
- `/memory` commands for search, status, pin
- Shared SQLite database with Claude Code plugin
- No npm, no configuration required

## In Scope

- OpenCode extension structure
- Event handlers for OpenCode's tool/command events
- Slash commands: `/memory search`, `/memory status`, `/memory pin`
- Shared database layer (compatible with Claude Code plugin)
- Documentation with use cases

## Out of Scope

- TypeScript library integration (that's adapter-opencode)
- Cloud sync
- Multi-user scenarios

## Ready Checklist

Change status to **Ready** when:

- [x] Purpose and scope are clear
- [x] Dependencies identified
- [ ] OpenCode extension API researched
- [ ] At least one task defined

## Tasks

### PLUGIN-OC-001: Research OpenCode extension system

- **Intent:** Understand how to create OpenCode extensions
- **Expected Outcome:** Clear understanding of extension structure, hooks, commands
- **Scope:** Research only
- **Non-scope:** Implementation
- **Files:** (none - research task)
- **Dependencies:** (none)
- **Validation:** Can document extension creation process
- **Confidence:** medium
- **Risks:** OpenCode extension API may differ from expectations

### PLUGIN-OC-002: Create extension scaffold

- **Intent:** Establish extension structure that OpenCode recognizes
- **Expected Outcome:** Extension loads in OpenCode without errors
- **Scope:** `plugins/kindling-opencode/`
- **Files:** Extension manifest, directory structure
- **Dependencies:** PLUGIN-OC-001
- **Validation:** Extension appears in OpenCode
- **Confidence:** medium

### PLUGIN-OC-003: Implement shared database layer

- **Intent:** Reuse database schema from Claude Code plugin
- **Expected Outcome:** Both plugins read/write same DB
- **Scope:** `lib/`
- **Files:** Shared or copied DB module
- **Dependencies:** PLUGIN-CC-002, PLUGIN-OC-002
- **Validation:** Observations from both tools appear together
- **Confidence:** high

### PLUGIN-OC-004: Implement event handlers

- **Intent:** Capture OpenCode activity automatically
- **Expected Outcome:** Tool calls become observations
- **Scope:** Extension event handlers
- **Dependencies:** PLUGIN-OC-003
- **Validation:** Observations appear in DB
- **Confidence:** medium

### PLUGIN-OC-005: Implement /memory commands

- **Intent:** Port commands from Claude Code plugin
- **Expected Outcome:** Same UX across both tools
- **Scope:** Commands
- **Dependencies:** PLUGIN-OC-004
- **Validation:** Commands work identically to Claude Code
- **Confidence:** high

## Decisions

- **D-001:** Share database with Claude Code plugin for unified memory
- **D-002:** Mirror command structure from Claude Code plugin

## Notes

- Depends on PLUGIN-CC being implemented first (shared patterns)
- May need to adapt based on OpenCode's specific extension API
