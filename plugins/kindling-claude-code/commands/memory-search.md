---
name: memory search
description: Search your session memory for past work
arguments:
  - name: query
    description: What to search for
    required: true
---

# Memory Search

Search through your past Claude Code sessions to find relevant context.

## Instructions

When the user runs `/memory search <query>`:

1. Read the observations file at `~/.kindling/observations.jsonl`
2. Search for observations where the content contains the query (case-insensitive)
3. Return the most recent matching observations (up to 10)
4. Format results showing: timestamp, tool/kind, and content preview

## Implementation

```bash
# Read and search observations
node -e "
const fs = require('fs');
const path = require('path');
const file = path.join(require('os').homedir(), '.kindling', 'observations.jsonl');

if (!fs.existsSync(file)) {
  console.log('No memory found. Start using Claude Code to build your memory.');
  process.exit(0);
}

const query = process.argv.slice(1).join(' ').toLowerCase() || '';
const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
const observations = lines.map(l => JSON.parse(l));

const matches = observations
  .filter(o => o.content?.toLowerCase().includes(query))
  .slice(-10)
  .reverse();

if (matches.length === 0) {
  console.log('No matches found for: ' + query);
  process.exit(0);
}

console.log('Found ' + matches.length + ' matches:\n');
matches.forEach((o, i) => {
  const date = new Date(o.ts).toLocaleString();
  const preview = o.content?.substring(0, 200).replace(/\n/g, ' ') || '';
  console.log((i+1) + '. [' + date + '] ' + o.kind);
  console.log('   ' + preview + (o.content?.length > 200 ? '...' : ''));
  console.log('');
});
" "$@"
```

## Example Output

```
Found 3 matches:

1. [1/27/2025, 2:30:45 PM] tool_call
   Tool: Read File: /src/auth/validate.ts ...

2. [1/27/2025, 2:28:12 PM] command
   $ npm test -- auth ...

3. [1/27/2025, 2:25:33 PM] file_diff
   File: /src/auth/middleware.ts Action: Edited file ...
```
