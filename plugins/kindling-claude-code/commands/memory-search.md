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

1. Open the SQLite database at `~/.kindling/kindling.db`
2. Search observations using FTS5 full-text search
3. Return the most relevant matching observations (up to 10)
4. Format results showing: timestamp, tool/kind, and content preview

## Implementation

```bash
node --input-type=module -e "
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const dbPath = join(homedir(), '.kindling', 'kindling.db');

if (!existsSync(dbPath)) {
  console.log('No memory found. Run kindling init or start using Claude Code to build your memory.');
  process.exit(0);
}

const query = process.argv.slice(1).join(' ') || '';
if (!query) {
  console.log('Usage: /memory search <query>');
  process.exit(0);
}

const db = new Database(dbPath, { readonly: true });
db.pragma('journal_mode = WAL');

// Sanitize for FTS5: quote each token so special chars are treated as literals
const safeQuery = query.trim().split(/\\s+/).filter(Boolean)
  .map(t => '\"' + t.replace(/\"/g, '\"\"') + '\"').join(' ') || '\"\"';

let rows;
try {
  rows = db.prepare(\`
    SELECT o.id, o.kind, o.content, o.ts
    FROM observations_fts fts
    JOIN observations o ON o.rowid = fts.rowid
    WHERE observations_fts MATCH ?
    ORDER BY fts.rank
    LIMIT 10
  \`).all(safeQuery);
} catch (e) {
  // Fallback to LIKE search if FTS5 still fails
  rows = db.prepare(\`
    SELECT id, kind, content, ts FROM observations
    WHERE content LIKE '%' || ? || '%'
    ORDER BY ts DESC LIMIT 10
  \`).all(query);
}

db.close();

if (rows.length === 0) {
  console.log('No matches found for: ' + query);
  process.exit(0);
}

console.log('Found ' + rows.length + ' matches:\n');
rows.forEach((o, i) => {
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
