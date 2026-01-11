# @kindling/store-sqlite

SQLite-based system of record for Kindling with full-text search indexing.

## Installation

```bash
npm install @kindling/store-sqlite
```

## Overview

`@kindling/store-sqlite` provides a durable, local-first storage layer for Kindling using SQLite with WAL mode and FTS5 full-text search. It implements the `KindlingStore` contract defined in `@kindling/core`.

## Features

- **Embedded SQLite** with WAL mode for concurrent reads
- **FTS5 Full-Text Search** for content indexing
- **Schema Migrations** for version upgrades
- **Transaction Support** for atomic operations
- **Scoped Queries** by session, repo, agent, user
- **Deterministic Ordering** by timestamp and sequence

## Usage

### Initialize Database

```typescript
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';

// Open database file
const db = openDatabase({ path: './my-memory.db' });

// Or use in-memory database for testing
const memDb = openDatabase({ path: ':memory:' });

// Create store
const store = new SqliteKindlingStore(db);
```

### Store Operations

```typescript
import { ObservationKind } from '@kindling/core';

// Insert observation
const obs = await store.insertObservation({
  kind: ObservationKind.Command,
  content: 'npm test',
  provenance: { command: 'npm test', exitCode: 0 },
  scope: { sessionId: 'session-1' },
  capsuleId: 'capsule-123',
});

// Query observations
const observations = await store.queryObservations({
  scope: { sessionId: 'session-1' },
  limit: 50,
});

// Full-text search
const results = await store.searchObservations({
  query: 'authentication error',
  scope: { sessionId: 'session-1' },
});
```

### Capsule Management

```typescript
import { CapsuleType } from '@kindling/core';

// Create capsule
const capsule = await store.insertCapsule({
  type: CapsuleType.Session,
  intent: 'debug',
  scope: { sessionId: 'session-1', repoId: 'my-project' },
  openedAt: Date.now(),
});

// Close capsule with summary
await store.closeCapsule(capsule.id, {
  closedAt: Date.now(),
  summaryObservationId: summaryObs.id,
});

// Query capsules
const capsules = await store.queryCapsules({
  scope: { sessionId: 'session-1' },
  open: false,
});
```

### Pin Management

```typescript
// Pin an observation for priority retrieval
const pin = await store.insertPin({
  targetType: 'observation',
  targetId: obs.id,
  note: 'Root cause of production outage',
  ttlMs: 7 * 24 * 60 * 60 * 1000, // 1 week
});

// List pins
const pins = await store.queryPins({
  scope: { sessionId: 'session-1' },
});

// Remove pin
await store.deletePin(pin.id);
```

## Database Schema

The store maintains several tables:

- **observations** - Atomic units of context
- **capsules** - Bounded groups of observations
- **pins** - User-controlled priority content
- **observations_fts** - Full-text search index

Indexes are created for efficient querying by:
- Scope (sessionId, repoId, agentId, userId)
- Timestamp and sequence
- Capsule membership
- Pin status

## Migrations

The store includes a migration system for schema upgrades. Migrations are stored in the `migrations/` directory and applied automatically on database initialization.

### Custom Migrations

You can check the current schema version and apply migrations manually:

```typescript
import { getMigrations, applyMigrations } from '@kindling/store-sqlite';

const migrations = getMigrations();
applyMigrations(db, migrations);
```

## Configuration

### Database Options

```typescript
interface DatabaseOptions {
  path?: string;           // Path to database file (defaults to ~/.kindling/kindling.db)
  verbose?: boolean;       // Enable SQL query logging
}
```

### Performance Tuning

The store uses recommended SQLite settings for performance:

- **WAL mode** - Write-Ahead Logging for concurrent reads
- **NORMAL synchronous** - Balance between safety and speed
- **1GB cache size** - In-memory page cache
- **Memory-mapped I/O** - Fast file access

## Data Storage

All data is stored locally in a single SQLite database file. The database:

- **Is portable** - Copy the file to back up or transfer
- **Has no external dependencies** - Fully self-contained
- **Supports concurrent access** - Multiple readers, single writer
- **Is queryable with SQL** - Use standard SQLite tools for inspection

## Privacy & Security

- **Local-only** - No network access, no external services
- **User-controlled** - You own and control your data
- **Redactable** - Observations can be updated or deleted
- **Portable** - Export/import support for data migration

## Related Packages

- **[@kindling/core](../kindling-core)** - Core domain model
- **[@kindling/provider-local](../kindling-provider-local)** - FTS-based retrieval
- **[@kindling/cli](../kindling-cli)** - CLI for inspection

## License

Apache-2.0
