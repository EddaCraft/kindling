# @kindling/cli

Command-line interface for Kindling inspection, debugging, and export/import.

## Installation

```bash
npm install -g @kindling/cli
```

Or use directly with npx:

```bash
npx @kindling/cli status
```

## Overview

`@kindling/cli` provides a command-line interface for inspecting and managing Kindling databases. Use it to search for context, list entities, manage pins, and export/import data.

## Commands

### Status

Show database status and summary.

```bash
kindling status

# Example output:
# Database: /home/user/.kindling/memory.db
# Observations: 1,234
# Capsules: 56 (12 open)
# Pins: 8
```

### Search

Search for observations by query and scope.

```bash
# Basic search
kindling search "authentication error"

# Session-scoped search
kindling search "bug fix" --session session-123

# Repo-scoped search
kindling search "api endpoint" --repo /home/user/my-project

# Limit results
kindling search "deploy" --limit 10

# Filter by observation kind
kindling search "test" --kind Command
```

**Options:**
- `--session <id>` - Filter by session ID
- `--repo <path>` - Filter by repository path
- `--agent <id>` - Filter by agent ID
- `--user <id>` - Filter by user ID
- `--kind <type>` - Filter by observation kind
- `--limit <n>` - Limit number of results (default: 20)
- `--format <fmt>` - Output format: text, json (default: text)

### List

List entities in the database.

```bash
# List capsules
kindling list capsules
kindling list capsules --session session-123
kindling list capsules --open  # Only open capsules

# List observations
kindling list observations
kindling list observations --capsule capsule-123
kindling list observations --limit 50

# List pins
kindling list pins
kindling list pins --session session-123
```

**Options:**
- `--session <id>` - Filter by session ID
- `--repo <path>` - Filter by repository path
- `--capsule <id>` - Filter by capsule ID
- `--open` - Only show open capsules
- `--limit <n>` - Limit results (default: 50)
- `--format <fmt>` - Output format: text, json (default: text)

### Show

Show details of a specific entity.

```bash
# Show observation details
kindling show observation obs_abc123

# Show capsule details
kindling show capsule cap_xyz789

# Show pin details
kindling show pin pin_def456
```

**Options:**
- `--format <fmt>` - Output format: text, json (default: text)

### Pin

Pin an observation for priority retrieval.

```bash
# Pin an observation
kindling pin observation obs_abc123 --note "Root cause identified"

# Pin with TTL (time-to-live)
kindling pin observation obs_def456 --note "Important fix" --ttl 7d

# Pin a capsule summary
kindling pin capsule cap_xyz789 --note "Critical debugging session"
```

**Options:**
- `--note <text>` - Pin note/description
- `--ttl <duration>` - Time-to-live (e.g., 1h, 7d, 30d)

**TTL Format:**
- `1h`, `2h`, etc. - Hours
- `1d`, `7d`, etc. - Days
- `1w`, `4w`, etc. - Weeks
- `1m`, `6m`, etc. - Months

### Unpin

Remove a pin.

```bash
kindling unpin pin_abc123
```

### Export

Export database contents to a file.

```bash
# Export entire database
kindling export backup.json

# Export specific session
kindling export session-backup.json --session session-123

# Export specific repo
kindling export repo-backup.json --repo /home/user/my-project

# Export with compression
kindling export backup.json.gz
```

**Options:**
- `--session <id>` - Export specific session
- `--repo <path>` - Export specific repo
- `--format <fmt>` - Export format: json, jsonl (default: json)

### Import

Import database contents from a file.

```bash
# Import from file
kindling import backup.json

# Import with merge (skip conflicts)
kindling import backup.json --merge

# Import compressed file
kindling import backup.json.gz
```

**Options:**
- `--merge` - Skip existing entries instead of failing
- `--force` - Overwrite existing entries

## Configuration

### Database Location

By default, the CLI looks for the database at:

```
$HOME/.kindling/memory.db
```

Override with the `--db` flag:

```bash
kindling status --db /path/to/custom.db
```

Or set the `KINDLING_DB` environment variable:

```bash
export KINDLING_DB=/path/to/custom.db
kindling status
```

### Output Format

Most commands support `--format` flag:

- `text` - Human-readable output (default)
- `json` - JSON output for scripting

```bash
# JSON output
kindling search "error" --format json | jq '.results[].content'
```

## Examples

### Debug Recent Errors

```bash
# Find recent errors in current session
kindling search "error" --session session-123 --kind Error --limit 5
```

### Inspect Workflow Execution

```bash
# List capsules for a workflow run
kindling list capsules --repo /home/user/my-project

# Show specific capsule details
kindling show capsule cap_workflow_123

# List observations in that capsule
kindling list observations --capsule cap_workflow_123
```

### Pin Critical Findings

```bash
# Pin a critical error for later review
kindling pin observation obs_critical_error \
  --note "Production outage root cause" \
  --ttl 30d
```

### Export Session for Sharing

```bash
# Export debugging session for team review
kindling export debug-session.json --session session-123

# Share the file and others can import it
kindling import debug-session.json
```

## Scripting

The CLI is designed for scripting with JSON output:

```bash
#!/bin/bash

# Find all authentication errors
errors=$(kindling search "authentication" \
  --kind Error \
  --format json \
  | jq '.results[] | .content')

# Count errors
count=$(echo "$errors" | wc -l)
echo "Found $count authentication errors"

# Pin the most recent one
recent_id=$(kindling search "authentication" \
  --kind Error \
  --limit 1 \
  --format json \
  | jq -r '.results[0].id')

kindling pin observation "$recent_id" \
  --note "Latest auth error"
```

## Related Packages

- **[@kindling/core](../kindling-core)** - Core domain model
- **[@kindling/store-sqlite](../kindling-store-sqlite)** - SQLite persistence
- **[@kindling/provider-local](../kindling-provider-local)** - Local retrieval

## License

Apache-2.0
