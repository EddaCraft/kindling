# STORAGE-001: Create SQLite schema + initial migrations

| Module | Task ID | Owner | Status |
|--------|---------|-------|--------|
| [kindling-store-sqlite](../modules/kindling-store-sqlite.aps.md) | STORAGE-001 | @aneki | Draft |

---

## Prerequisites

- [ ] Package structure for `kindling-store-sqlite` exists
- [ ] Build tooling configured (TypeScript, tests)
- [ ] Domain types from `kindling-core` are defined (or stubs exist)
- [ ] Decision D-002 reviewed: SQLite is the system of record

---

## Steps

### 1. Create package structure for kindling-store-sqlite

**Checkpoint:** Package directory exists with package.json configured

**Validate:**
```bash
ls -la packages/kindling-store-sqlite/
cat packages/kindling-store-sqlite/package.json
```

**Pattern:** Monorepo package setup; follow existing conventions from scaffolding

---

### 2. Create migrations directory and schema_migrations tracking

**Checkpoint:** `migrations/` directory exists; versioning strategy documented

**Validate:**
```bash
ls -la packages/kindling-store-sqlite/migrations/
cat packages/kindling-store-sqlite/migrations/README.md
```

**Pattern:** Migrations are sequential, immutable SQL files with clear naming (001_init.sql, 002_fts.sql)

---

### 3. Write migration 001_init.sql with core tables

**Checkpoint:** Initial schema SQL file exists with all core tables defined

**Deliverables:**

Tables to create:
- `schema_migrations` — track applied migrations (version, applied_at)
- `observations` — raw captured events with type, content, provenance, timestamp
- `capsules` — bounded units of meaning with type, intent, open/close timestamps, scope identifiers
- `capsule_observations` — junction table linking observations to capsules with deterministic ordering
- `summaries` — capsule summaries with content, confidence, evidence references
- `pins` — explicit context pins with TTL support

Indexes to create:
- Observations: `(session_id, ts)`, `(repo_id, ts)`, `(agent_id, ts)`, `(ts)` for time-window queries
- Capsules: `(session_id)`, `(repo_id)`, `(agent_id)`, `(closed_at)` for retrieval scoping
- Capsule_observations: `(capsule_id, seq)` for ordered retrieval
- Summaries: `(capsule_id)`, `(ts)` for latest summary lookups
- Pins: `(scope_id, expires_at)` for TTL-aware listing

**Validate:**
```bash
cat packages/kindling-store-sqlite/migrations/001_init.sql
```

**Schema Requirements:**
- Foreign keys enforced where appropriate (capsule_observations → observations, summaries → capsules)
- Timestamps stored as INTEGER (Unix epoch ms) for SQLite portability
- Scope identifiers: session_id, repo_id, agent_id, user_id as TEXT
- Observation content as TEXT (JSON serialized)
- Redaction support: `redacted_at` timestamp, `redacted_reason` text

**Pattern:** Follow SQLite best practices; use INTEGER PRIMARY KEY for rowid optimization

---

### 4. Write migration 002_fts.sql with FTS5 tables

**Checkpoint:** FTS schema SQL file exists with indexed content tables

**Deliverables:**

FTS tables to create:
- `observations_fts` — FTS5 virtual table over observation content and provenance
- `summaries_fts` — FTS5 virtual table over summary content (optional but recommended)

Triggers to create (if using trigger-based sync):
- INSERT/UPDATE/DELETE triggers to keep FTS tables synchronized
- OR document explicit write strategy if not using triggers

**Validate:**
```bash
cat packages/kindling-store-sqlite/migrations/002_fts.sql
grep -i "CREATE VIRTUAL TABLE" packages/kindling-store-sqlite/migrations/002_fts.sql
```

**FTS Requirements:**
- FTS5 (not FTS4) for better performance and features
- Include observation_id as rowid reference for joins
- Index: kind, content, provenance JSON fields (flattened)
- Redacted observations must not appear in FTS results

**Pattern:** FTS5 with content='' external content pattern OR direct content storage; document choice

---

### 5. Implement DB initialization with PRAGMAs

**Checkpoint:** Database opens with correct configuration; PRAGMAs verified

**Deliverables:**

Create `src/db/open.ts` with:
- Function to open/create SQLite database
- Apply PRAGMAs:
  - `PRAGMA journal_mode=WAL` — better concurrency
  - `PRAGMA foreign_keys=ON` — enforce referential integrity
  - `PRAGMA busy_timeout=5000` — sane timeout for concurrent writes
  - `PRAGMA synchronous=NORMAL` — balance safety and performance (WAL mode)
- Create tables if not exist (run migrations)
- Verify schema_migrations table exists

**Validate:**
```bash
node -e "const { openDb } = require('./packages/kindling-store-sqlite/dist/db/open.js'); \
         openDb(':memory:').then(db => { \
           db.get('PRAGMA journal_mode').then(r => console.log('journal_mode:', r)); \
           db.get('PRAGMA foreign_keys').then(r => console.log('foreign_keys:', r)); \
         })"
```

**Pattern:** Use better-sqlite3 or node-sqlite for Node.js; ensure sync API available for simplicity

---

### 6. Implement migration runner

**Checkpoint:** Migrations can be applied programmatically; idempotent execution

**Deliverables:**

Create `src/db/migrate.ts` with:
- Function to read migration files from `migrations/` directory
- Check `schema_migrations` to determine which migrations have been applied
- Apply pending migrations in order
- Record applied migrations in `schema_migrations` table
- Fail fast on SQL errors with clear messages

**Validate:**
```bash
# Create fresh DB
node -e "const { openDb, migrate } = require('./packages/kindling-store-sqlite/dist/db'); \
         openDb('/tmp/test-kindling.db').then(db => migrate(db)).then(() => console.log('OK'))"

# Verify tables exist
sqlite3 /tmp/test-kindling.db ".tables"
```

**Expected Output:** observations, capsules, capsule_observations, summaries, pins, schema_migrations, observations_fts, summaries_fts

**Pattern:** Migrations are immutable; never modify an applied migration; always add new ones

---

### 7. Write smoke tests for schema verification

**Checkpoint:** Tests pass; all required tables and indexes exist

**Deliverables:**

Create `test/storage.migrations.spec.ts` with:
- Test: Fresh DB initialization creates all tables
- Test: Migrations are idempotent (running twice is safe)
- Test: Foreign key constraints are enforced
- Test: FTS tables are queryable
- Test: Indexes exist (verify via sqlite_master)

**Validate:**
```bash
npm test --workspace=kindling-store-sqlite -- test/storage.migrations.spec.ts
```

**Test Cases:**
```typescript
// Test: Tables exist
const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
expect(tables.map(t => t.name)).toContain('observations');

// Test: FKs enforced
await expect(
  db.run("INSERT INTO capsule_observations (capsule_id, observation_id) VALUES (999, 999)")
).rejects.toThrow();

// Test: FTS queryable
await db.run("INSERT INTO observations_fts (observation_id, content) VALUES (1, 'test')");
const results = await db.all("SELECT * FROM observations_fts WHERE content MATCH 'test'");
expect(results.length).toBe(1);
```

**Pattern:** Use test DB in :memory: or temp file; clean up after each test

---

### 8. Document schema and migration strategy

**Checkpoint:** Schema documentation exists; migration strategy clear for future changes

**Deliverables:**

Create `packages/kindling-store-sqlite/SCHEMA.md` with:
- Entity-relationship diagram (Mermaid or ASCII)
- Table descriptions and key fields
- Index strategy and rationale
- Migration workflow for future changes
- Redaction strategy

Update `packages/kindling-store-sqlite/README.md` with:
- Overview of store responsibilities
- How to run migrations
- How to add new migrations

**Validate:**
```bash
cat packages/kindling-store-sqlite/SCHEMA.md
cat packages/kindling-store-sqlite/README.md
```

**Pattern:** Keep schema docs in sync with actual schema; use migration version references

---

## Completion Checklist

- [ ] All steps completed with passing checkpoints
- [ ] Tests pass: `npm test --workspace=kindling-store-sqlite`
- [ ] Schema verified: Tables, indexes, FKs, FTS all correct
- [ ] Documentation complete: SCHEMA.md and README.md updated
- [ ] STORAGE-001 task marked complete in module file
- [ ] Ready for STORAGE-002: Implement write path

**Completed by:** _____________

**Date:** _____________

---

## Notes

* SQLite version requirement: ≥3.35 (for modern FTS5 features)
* Use parameterized queries everywhere; never string concatenation
* Consider tooling: `sqlite3` CLI for manual inspection during development
* FTS indexing strategy: Start simple with trigger-based sync; optimize later if needed
