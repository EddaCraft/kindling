---
name: memory unpin
description: Remove a pinned observation
arguments:
  - name: id
    description: The pin ID (first 8 characters are enough)
    required: true
---

# Memory Unpin

Remove a pin by its ID.

## Instructions

When the user runs `/memory unpin <id>`:

1. Open the SQLite database at `~/.kindling/kindling.db`
2. Find the pin matching the provided ID (prefix match supported)
3. Remove it
4. Confirm removal to the user

## Implementation

```bash
node --input-type=module -e "
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const dbPath = join(homedir(), '.kindling', 'kindling.db');
const pinId = process.argv[1] || '';

if (!pinId) {
  console.log('Usage: /memory unpin <id>');
  console.log('Get pin IDs from /memory pins');
  process.exit(0);
}

if (!existsSync(dbPath)) {
  console.log('No pins found.');
  process.exit(0);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Find pin by prefix match
const pin = db.prepare('SELECT id, reason FROM pins WHERE id LIKE ? LIMIT 1').get(pinId + '%');

if (!pin) {
  console.log('Pin not found: ' + pinId);
  console.log('Use /memory pins to see all pin IDs.');
  db.close();
  process.exit(0);
}

db.prepare('DELETE FROM pins WHERE id = ?').run(pin.id);
const remaining = db.prepare('SELECT COUNT(*) as count FROM pins').get().count;
db.close();

console.log('Removed pin:');
console.log('  ID: ' + pin.id.substring(0, 8));
console.log('  Note: ' + (pin.reason || 'No note'));
console.log('');
console.log('Remaining pins: ' + remaining);
" "$1"
```

## Example Output

```
Removed pin:
  ID: a3f2b1c4
  Note: Root cause fix for auth bug

Remaining pins: 2
```
