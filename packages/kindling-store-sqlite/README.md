# @kindling/store-sqlite

SQLite persistence layer for Kindling with FTS5 full-text search and WAL mode.

[![npm version](https://img.shields.io/npm/v/@kindling/store-sqlite.svg)](https://www.npmjs.com/package/@kindling/store-sqlite)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](../../LICENSE)

## Installation

```bash
npm install @kindling/store-sqlite
```

## Overview

`@kindling/store-sqlite` provides the persistence layer for Kindling using embedded SQLite:

- **WAL Mode** - Write-ahead logging for concurrent access
- **FTS5 Indexing** - Full-text search on observations and summaries
- **Automatic Migrations** - Schema versioning with migration support
- **Local-First** - No external services required

## Usage

### Opening a Database

```typescript
import { openDatabase, closeDatabase } from '@kindling/store-sqlite';

// Open with file path
const db = openDatabase({ dbPath: './kindling.db' });

// Or use in-memory for testing
const testDb = openDatabase({ dbPath: ':memory:' });

// Close when done
closeDatabase(db);
```

### Using the Store

```typescript
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';

const db = openDatabase({ dbPath: './kindling.db' });
const store = new SqliteKindlingStore(db);

// Insert an observation
store.insertObservation({
  id: 'obs-1',
  kind: 'tool_call',
  content: 'Read file src/auth.ts',
  provenance: { toolName: 'read_file', path: 'src/auth.ts' },
  ts: Date.now(),
  scopeIds: { sessionId: 's1', repoId: '/repo' },
  redacted: false,
});

// Query observations
const observations = store.getObservations({
  scopeIds: { sessionId: 's1' },
  limit: 100,
});

// Insert a capsule
store.insertCapsule({
  id: 'cap-1',
  type: 'session',
  intent: 'Fix authentication bug',
  status: 'open',
  openedAt: Date.now(),
  scopeIds: { sessionId: 's1', repoId: '/repo' },
  observationIds: [],
});

// Attach observation to capsule
store.attachObservation('cap-1', 'obs-1');

// Full-text search
const results = store.searchObservations({
  query: 'authentication',
  scopeIds: { repoId: '/repo' },
  limit: 50,
});
```

### Migrations

Migrations run automatically when opening the database:

```typescript
import { openDatabase, getMigrationStatus } from '@kindling/store-sqlite';

const db = openDatabase({ dbPath: './kindling.db' });

// Check migration status
const status = getMigrationStatus(db);
console.log('Current version:', status.currentVersion);
console.log('Pending migrations:', status.pending);
```

### Export/Import

```typescript
import { exportDatabase, importBundle } from '@kindling/store-sqlite';

// Export all data
const bundle = exportDatabase(db, {
  scopeIds: { repoId: '/repo' },
});

// Import into another database
importBundle(targetDb, bundle);
```

## Database Schema

The store manages these tables:

| Table | Purpose |
|-------|---------|
| `observations` | Atomic event records |
| `observations_fts` | FTS5 index for observation content |
| `capsules` | Bounded units of meaning |
| `capsule_observations` | Join table with ordering |
| `summaries` | Capsule summaries |
| `summaries_fts` | FTS5 index for summary content |
| `pins` | User-marked important items |
| `schema_migrations` | Migration version tracking |

## Configuration

```typescript
interface DatabaseOptions {
  dbPath: string;           // File path or ':memory:'
  walMode?: boolean;        // Enable WAL mode (default: true)
  busyTimeout?: number;     // Busy timeout in ms (default: 5000)
}
```

## Requirements

- Node.js >= 20.0.0
- SQLite support via `better-sqlite3`

## Related Packages

- [`@kindling/core`](../kindling-core) - Domain types and interfaces
- [`@kindling/provider-local`](../kindling-provider-local) - FTS retrieval using this store

## License

Apache-2.0
