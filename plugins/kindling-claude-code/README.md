# Kindling for Claude Code

**Remember what you worked on across sessions.**

Kindling automatically captures your Claude Code sessions and injects prior context when you start a new one. All data is stored locally in SQLite with full-text search.

## Quick Start

```bash
# Install the plugin
claude plugin install github:EddaCraft/kindling

# Or for development, load directly:
claude --plugin-dir ./plugins/kindling-claude-code
```

If installing from source (within the monorepo):

```bash
cd plugins/kindling-claude-code
npm install        # Installs better-sqlite3
npm run build      # Builds the bundle (requires monorepo packages to be built)
```

## What It Does

When you start a Claude Code session, Kindling:

1. **Opens a session capsule** to track all activity
2. **Injects prior context** from previous sessions in this project
3. **Captures tool calls** (Read, Write, Edit, Bash, etc.)
4. **Captures your messages** as observations
5. **Closes the capsule** when the session ends

All captured data is stored in a project-scoped SQLite database with FTS5 full-text search.

## Commands

| Command                         | Description                         |
| ------------------------------- | ----------------------------------- |
| `/memory search <query>`        | Search past sessions                |
| `/memory status`                | Show database stats                 |
| `/memory pin [note] [--ttl 7d]` | Pin last observation (optional TTL) |
| `/memory pins`                  | List all pins                       |
| `/memory unpin <id>`            | Remove a pin                        |
| `/memory forget <id>`           | Redact an observation               |

## Use Cases

### Resume yesterday's work

```
/memory search authentication
```

Shows your recent work on auth, including files edited and commands run.

### Pin important decisions

```
/memory pin "Root cause: token expiry check was off by one"
```

Pins the last observation for quick retrieval.

### Forget something sensitive

```
/memory forget a3f2b1c4
```

Redacts an observation from search results while preserving referential integrity.

## Configuration

Environment variables:

| Variable                  | Default | Description                               |
| ------------------------- | ------- | ----------------------------------------- |
| `KINDLING_INJECT_CONTEXT` | `true`  | Enable context injection on session start |
| `KINDLING_MAX_CONTEXT`    | `10`    | Maximum results for context injection     |
| `KINDLING_DB_PATH`        | auto    | Override database path                    |

## Data Storage

Data is stored locally per-project:

```
~/.kindling/projects/<project-hash>/kindling.db
```

Each project gets its own isolated database. No data is shared between projects by default.

## Privacy

- **Local only** — no data leaves your machine
- **Secret filtering** — API keys and tokens are automatically masked
- **Per-project isolation** — projects don't share data
- **You control it** — delete `~/.kindling/` to clear all memory, or use `/memory forget` for individual items

## Requirements

- Claude Code
- Node.js >= 18 (already required by Claude Code)
- better-sqlite3 (installed automatically)

## License

Apache-2.0
