---
name: memory status
description: Show your session memory statistics
---

# Memory Status

Show statistics about your Kindling memory database.

## Instructions

When the user runs `/memory status`:

1. Open the SQLite database at `~/.kindling/kindling.db`
2. Count observations, capsules, and pins
3. Show recent session activity
4. Display the database location

## Implementation

```bash
node --input-type=module -e "
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const dbPath = join(homedir(), '.kindling', 'kindling.db');

if (!existsSync(dbPath)) {
  console.log('Kindling not initialized yet.');
  console.log('Run kindling init or memory will be captured automatically as you use Claude Code.');
  process.exit(0);
}

const db = new Database(dbPath, { readonly: true });
db.pragma('journal_mode = WAL');

const obsCount = db.prepare('SELECT COUNT(*) as count FROM observations').get().count;
const capsuleCount = db.prepare('SELECT COUNT(*) as count FROM capsules').get().count;
const openCount = db.prepare(\"SELECT COUNT(*) as count FROM capsules WHERE status = 'open'\").get().count;
const closedCount = capsuleCount - openCount;
const pinCount = db.prepare('SELECT COUNT(*) as count FROM pins WHERE expires_at IS NULL OR expires_at > ?').get(Date.now()).count;

const recentSessions = db.prepare(\`
  SELECT id, intent, status, opened_at, closed_at,
    (SELECT COUNT(*) FROM capsule_observations WHERE capsule_id = capsules.id) as obs_count
  FROM capsules
  ORDER BY opened_at DESC
  LIMIT 5
\`).all();

db.close();

console.log('=== Kindling Memory Status ===\n');
console.log('Observations: ' + obsCount);
console.log('Sessions:     ' + capsuleCount + ' (' + openCount + ' open, ' + closedCount + ' closed)');
console.log('Pins:         ' + pinCount);
console.log('Database:     ' + dbPath);
console.log('');

if (recentSessions.length > 0) {
  console.log('Recent Sessions:');
  recentSessions.forEach((c, i) => {
    const date = new Date(c.opened_at).toLocaleDateString();
    const status = c.status === 'open' ? '(active)' : '';
    console.log('  ' + (i+1) + '. ' + date + ' - ' + c.obs_count + ' observations ' + status);
  });
}
"
```

## Example Output

```
=== Kindling Memory Status ===

Observations: 247
Sessions:     12 (1 open, 11 closed)
Pins:         3
Database:     /home/user/.kindling/kindling.db

Recent Sessions:
  1. 1/27/2025 - 45 observations (active)
  2. 1/26/2025 - 32 observations
  3. 1/25/2025 - 28 observations
  4. 1/24/2025 - 51 observations
  5. 1/23/2025 - 19 observations
```
