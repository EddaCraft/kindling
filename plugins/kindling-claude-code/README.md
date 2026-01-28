# Kindling for Claude Code

**Remember what you worked on across sessions.**

Kindling automatically captures your Claude Code sessions so you can:

- **Resume yesterday's work** without re-explaining context
- **Find that decision** you made last week
- **Track patterns** in errors and fixes
- **Pin important findings** for quick access

## Quick Start

```bash
# Clone into your Claude Code plugins folder
git clone https://github.com/EddaCraft/kindling ~/.claude/plugins/kindling

# Restart Claude Code - that's it!
```

## Use Cases

### "What was I working on yesterday?"

You start a new session and can't remember where you left off:

```
/memory search authentication
```

→ Shows your recent work on auth, including files edited and commands run.

### "Why did we decide to use X?"

You need to remember a past decision:

```
/memory search "redis session"
```

→ Finds the conversation where you discussed Redis vs other options.

### "Pin this - it's important"

You just fixed a tricky bug and want to remember the solution:

```
/memory pin "Root cause: token expiry check was off by one"
```

→ Pins the last observation so it's easy to find later.

### "Show me my session history"

You want to see what Kindling has captured:

```
/memory status
```

→ Shows observation count, session history, and pins.

## Commands

| Command | Description |
|---------|-------------|
| `/memory search <query>` | Search past sessions |
| `/memory status` | Show database stats |
| `/memory pin [note]` | Pin last observation |
| `/memory pins` | List all pins |

## How It Works

Kindling uses Claude Code's hook system to automatically capture:

- **Tool calls** - Every Read, Write, Edit, Bash, etc.
- **File changes** - What files you modified
- **Commands** - Shell commands and their results
- **Session lifecycle** - When sessions start and end

Data is stored locally in `~/.kindling/` - nothing leaves your machine.

## Data Storage

All data is stored locally:

```
~/.kindling/
├── observations.jsonl   # Captured tool calls, edits, commands
├── capsules.json        # Session metadata
└── pins.json            # Your pinned items
```

## Privacy

- **Local only** - No data is sent anywhere
- **Secret filtering** - API keys and tokens are automatically masked
- **You control it** - Delete `~/.kindling/` anytime to clear all memory

## Requirements

- Claude Code
- Node.js (already required by Claude Code)

## Troubleshooting

### Plugin not loading?

1. Check the plugin is in `~/.claude/plugins/kindling/`
2. Restart Claude Code
3. Run `/memory status` to verify

### No observations captured?

The hooks run automatically. Try:
1. Read a file with Claude Code
2. Run `/memory status` - you should see 1 observation

### Want to start fresh?

```bash
rm -rf ~/.kindling
```

## License

Apache-2.0

---

Built by [EddaCraft](https://eddacraft.ai) - making AI development tools better.
