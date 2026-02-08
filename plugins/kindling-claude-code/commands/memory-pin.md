---
name: memory pin
description: Pin an important observation for easy retrieval
arguments:
  - name: note
    description: Note describing why this is important
    required: false
---

# Memory Pin

Pin the most recent observation to mark it as important. Pinned items are highlighted in search results.

## Instructions

When the user runs `/memory pin [note]`:

1. Open the SQLite database at `~/.kindling/kindling.db`
2. Get the most recent observation
3. Create a pin record linking to that observation
4. Confirm to the user what was pinned

## Implementation

```bash
node --input-type=module -e "
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const dbPath = join(homedir(), '.kindling', 'kindling.db');

if (!existsSync(dbPath)) {
  console.log('No observations to pin yet.');
  process.exit(0);
}

const note = process.argv.slice(1).join(' ') || 'Pinned observation';

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const lastObs = db.prepare('SELECT id, kind, content, ts FROM observations ORDER BY ts DESC LIMIT 1').get();
if (!lastObs) {
  console.log('No observations to pin yet.');
  db.close();
  process.exit(0);
}

// Check if already pinned
const existing = db.prepare('SELECT id FROM pins WHERE target_id = ?').get(lastObs.id);
if (existing) {
  console.log('This observation is already pinned.');
  db.close();
  process.exit(0);
}

const pinId = randomUUID();
db.prepare(\`
  INSERT INTO pins (id, target_type, target_id, reason, created_at, scope_ids)
  VALUES (?, 'observation', ?, ?, ?, '{}')
\`).run(pinId, lastObs.id, note, Date.now());

db.close();

console.log('Pinned observation:');
console.log('');
console.log('  Kind: ' + lastObs.kind);
console.log('  Note: ' + note);
console.log('  Content: ' + (lastObs.content?.substring(0, 100) || '').replace(/\n/g, ' ') + '...');
console.log('');
console.log('Use /memory pins to see all pinned items.');
" "$@"
```

## Example Output

```
Pinned observation:

  Kind: file_diff
  Note: Root cause fix for auth bug
  Content: Tool: Edit File: /src/auth/validate.ts Action: Edited file...

Use /memory pins to see all pinned items.
```
