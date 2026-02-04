---
name: memory pins
description: Show all pinned observations
---

# Memory Pins

List all pinned observations with their notes.

## Instructions

When the user runs `/memory pins`:

1. Open the SQLite database at `~/.kindling/kindling.db`
2. Query pins joined with their target observations
3. Display pins with their notes and content preview

## Implementation

```bash
node --input-type=module -e "
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const dbPath = join(homedir(), '.kindling', 'kindling.db');

if (!existsSync(dbPath)) {
  console.log('No pins yet. Use /memory pin to pin important observations.');
  process.exit(0);
}

const db = new Database(dbPath, { readonly: true });
db.pragma('journal_mode = WAL');

const pins = db.prepare(\`
  SELECT p.id, p.reason, p.created_at, p.target_id,
         o.kind, o.content
  FROM pins p
  LEFT JOIN observations o ON o.id = p.target_id
  WHERE p.expires_at IS NULL OR p.expires_at > ?
  ORDER BY p.created_at DESC
\`).all(Date.now());

db.close();

if (pins.length === 0) {
  console.log('No pins yet. Use /memory pin to pin important observations.');
  process.exit(0);
}

console.log('=== Pinned Observations ===\n');

pins.forEach((pin, i) => {
  const date = new Date(pin.created_at).toLocaleDateString();

  console.log((i + 1) + '. [' + date + '] ' + (pin.reason || 'No note'));
  console.log('   ID: ' + pin.id.substring(0, 8));

  if (pin.content) {
    const preview = pin.content.substring(0, 150).replace(/\n/g, ' ');
    console.log('   ' + pin.kind + ': ' + preview + '...');
  } else {
    console.log('   (observation not found)');
  }
  console.log('');
});

console.log('Use /memory unpin <id> to remove a pin.');
"
```

## Example Output

```
=== Pinned Observations ===

1. [1/27/2025] Root cause fix for auth bug
   ID: a3f2b1c4
   file_diff: Tool: Edit File: /src/auth/validate.ts Action: Edited file...

2. [1/26/2025] Important architecture decision
   ID: 7e8d9f0a
   message: We decided to use Redis for session storage because...

Use /memory unpin <id> to remove a pin.
```
