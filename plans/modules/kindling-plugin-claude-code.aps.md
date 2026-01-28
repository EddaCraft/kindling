# Kindling Claude Code Plugin

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| PLUGIN-CC | @aneki | critical | Draft |

## Purpose

A zero-installation Claude Code plugin that provides memory continuity out of the box. Users clone a repository into `~/.claude/plugins/` and immediately have:

- Automatic session capture via hooks
- `/memory` commands for search, status, pin
- SQLite database created on first use
- No npm, no TypeScript, no configuration required

This is the "quick to value" solution for Claude Code users.

## In Scope

- Self-contained plugin directory structure
- Hook scripts (bash/node) for SessionStart, PostToolUse, Stop
- Slash commands: `/memory search`, `/memory status`, `/memory pin`, `/memory forget`
- Embedded SQLite database management
- First-run initialization
- Clear documentation with use cases

## Out of Scope

- TypeScript library integration (that's adapter-claude-code)
- Multi-user scenarios
- Cloud sync
- OpenCode integration (separate plugin)

## User Journey

```
1. User: "I want session memory in Claude Code"

2. User runs:
   git clone https://github.com/EddaCraft/kindling-claude-plugin ~/.claude/plugins/kindling

3. User restarts Claude Code

4. Plugin automatically:
   - Creates ~/.kindling/kindling.db on first session
   - Captures tool calls, file changes, commands
   - Closes session capsules on stop

5. Next session, user types:
   /memory search "authentication bug"

   → Gets relevant context from previous sessions

6. User thinks: "This is exactly what I needed"
```

## Plugin Structure

```
kindling/
├── plugin.json                 # Plugin manifest
├── README.md                   # User documentation
├── hooks/
│   ├── session-start.js        # Opens capsule
│   ├── post-tool-use.js        # Captures observations
│   ├── stop.js                 # Closes capsule
│   └── lib/
│       ├── db.js               # SQLite operations
│       ├── filter.js           # Secret filtering
│       └── mapping.js          # Event mapping
├── commands/
│   ├── memory-search.md        # /memory search <query>
│   ├── memory-status.md        # /memory status
│   ├── memory-pin.md           # /memory pin [note]
│   └── memory-forget.md        # /memory forget <id>
└── agents/
    └── memory-assistant.md     # Optional: agent for memory queries
```

## Ready Checklist

Change status to **Ready** when:

- [x] Purpose and scope are clear
- [x] User journey defined
- [x] Plugin structure designed
- [x] At least one task defined

## Tasks

### PLUGIN-CC-001: Create plugin scaffold and manifest

- **Intent:** Establish plugin structure that Claude Code recognizes
- **Expected Outcome:** Plugin directory loads in Claude Code without errors
- **Scope:** `plugins/kindling-claude-code/`
- **Non-scope:** Hook implementations, commands
- **Files:** `plugin.json`, `README.md`, directory structure
- **Dependencies:** (none)
- **Validation:** Plugin appears in Claude Code plugin list
- **Confidence:** high

### PLUGIN-CC-002: Implement SQLite database layer

- **Intent:** Self-contained database operations without external dependencies
- **Expected Outcome:** DB created on first use, CRUD operations work
- **Scope:** `hooks/lib/`
- **Non-scope:** FTS5 (keep simple for v1)
- **Files:** `hooks/lib/db.js`
- **Dependencies:** PLUGIN-CC-001
- **Validation:** Can create DB, insert observations, query
- **Confidence:** high

### PLUGIN-CC-003: Implement hook handlers

- **Intent:** Capture session activity automatically via hooks
- **Expected Outcome:** Every tool call becomes a stored observation
- **Scope:** `hooks/`
- **Non-scope:** Complex provenance extraction
- **Files:** `hooks/session-start.js`, `hooks/post-tool-use.js`, `hooks/stop.js`
- **Dependencies:** PLUGIN-CC-002
- **Validation:** Observations appear in DB after using tools
- **Confidence:** high

### PLUGIN-CC-004: Implement /memory search command

- **Intent:** Allow users to query past sessions
- **Expected Outcome:** User searches, gets relevant results with context
- **Scope:** `commands/`
- **Non-scope:** Fancy ranking (simple LIKE search for v1)
- **Files:** `commands/memory-search.md`
- **Dependencies:** PLUGIN-CC-002
- **Validation:** `/memory search "query"` returns relevant observations
- **Confidence:** high

### PLUGIN-CC-005: Implement /memory status command

- **Intent:** Show database status and recent activity
- **Expected Outcome:** User sees observation count, recent sessions, DB size
- **Scope:** `commands/`
- **Files:** `commands/memory-status.md`
- **Dependencies:** PLUGIN-CC-002
- **Validation:** `/memory status` shows meaningful stats
- **Confidence:** high

### PLUGIN-CC-006: Implement /memory pin command

- **Intent:** Allow users to mark important observations
- **Expected Outcome:** Pinned items persist and show first in search
- **Scope:** `commands/`
- **Files:** `commands/memory-pin.md`
- **Dependencies:** PLUGIN-CC-004
- **Validation:** Can pin last observation, pins appear in search
- **Confidence:** medium

### PLUGIN-CC-007: Documentation and use cases

- **Intent:** Make the plugin compelling and easy to understand
- **Expected Outcome:** README with clear value proposition and examples
- **Scope:** `README.md`
- **Files:** `README.md`, possibly `docs/use-cases.md`
- **Dependencies:** PLUGIN-CC-001 through PLUGIN-CC-006
- **Validation:** New user can understand value in 30 seconds
- **Confidence:** high

## Decisions

- **D-001:** Use Node.js for hooks (not bash) for SQLite access
- **D-002:** Keep v1 simple - LIKE search, not FTS5
- **D-003:** Single database at ~/.kindling/kindling.db
- **D-004:** No external npm dependencies - self-contained

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude Code plugin API changes | Keep plugin.json minimal |
| SQLite access from hooks | Use better-sqlite3 or sql.js bundled |
| Large observation storage | Truncate content, filter noisy tools |

## Use Cases to Highlight

1. **Resume Yesterday's Work**
   > "What was I debugging yesterday?" → Search, get context, continue

2. **Find That Decision**
   > "Why did we use Redis instead of Postgres?" → Search conversations

3. **Track Error Patterns**
   > "What errors have I seen in auth?" → Pattern recognition

4. **Onboard to Codebase**
   > "What did the previous session learn about this repo?"
