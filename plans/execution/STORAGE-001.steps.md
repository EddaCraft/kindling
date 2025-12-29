# Steps: STORAGE-001

| Field | Value |
|-------|-------|
| Source | [../modules/kindling-store-sqlite.aps.md](../modules/kindling-store-sqlite.aps.md) |
| Task(s) | STORAGE-001 — Create SQLite schema + initial migrations |
| Created by | @aneki / AI |
| Status | Draft |

## Why This Matters

The SQLite schema is the foundation of Kindling's system of record. Without a stable, well-designed schema, all downstream functionality (capture, retrieval, export) will be unreliable. This task establishes the data layer that everything else depends on.

## What We're Building

A migration-based SQLite schema that supports:
- High-volume observation writes
- Capsule-observation relationships
- Full-text search indexing
- Safe evolution over time

## Prerequisites

- [ ] Package structure exists (`packages/kindling-store-sqlite/`)
- [ ] better-sqlite3 or equivalent driver available

## Steps

### 1. Create migration infrastructure

- **Why:** Migrations enable safe schema evolution without data loss
- **What:** Migration runner that tracks applied migrations
- **Checkpoint:** `src/db/migrate.ts` exists with `runMigrations()` function
- **Validate:** `pnpm tsc --noEmit`

### 2. Create initial schema migration

- **Why:** Establishes the core tables for observations, capsules, and their relationship
- **What:** SQL migration defining tables with proper constraints
- **Checkpoint:** `migrations/001_init.sql` creates:
  - `observations` (id, kind, content, provenance, ts, scope_ids, redacted)
  - `capsules` (id, type, intent, status, opened_at, closed_at, scope_ids)
  - `capsule_observations` (capsule_id, observation_id, seq)
  - `summaries` (id, capsule_id, content, confidence, created_at, evidence_refs)
  - `pins` (id, target_type, target_id, reason, created_at, expires_at, scope_ids)
  - `schema_migrations` (version, applied_at)
- **Validate:** Migration applies without error

### 3. Create FTS migration

- **Why:** Full-text search is essential for retrieval performance
- **What:** FTS5 virtual tables for observations and summaries
- **Checkpoint:** `migrations/002_fts.sql` creates:
  - `observations_fts` (FTS5 on content)
  - `summaries_fts` (FTS5 on content)
  - Triggers to sync FTS on insert/update/delete
- **Validate:** Migration applies without error

### 4. Create indexes migration

- **Why:** Query performance depends on proper indexing
- **What:** Indexes for common query patterns
- **Checkpoint:** `migrations/003_indexes.sql` creates indexes on:
  - `observations(scope_ids->>'sessionId', ts)`
  - `observations(scope_ids->>'repoId', ts)`
  - `capsules(status, scope_ids->>'sessionId')`
  - `pins(expires_at)` for TTL queries
- **Validate:** Migration applies without error

### 5. Implement database open with defaults

- **Why:** Consistent DB configuration prevents subtle bugs
- **What:** Database opener with WAL mode, FK enforcement, busy timeout
- **Checkpoint:** `src/db/open.ts` exports `openDatabase(path)`:
  - Enables WAL mode
  - Enables foreign key enforcement
  - Sets busy timeout (5000ms default)
  - Runs pending migrations
- **Validate:** `pnpm tsc --noEmit`

### 6. Add migration tests

- **Why:** Schema correctness must be verified before use
- **What:** Tests that verify migration idempotency and table structure
- **Checkpoint:** `test/storage.migrations.spec.ts` covers:
  - Fresh DB migrates successfully
  - Migrations are idempotent
  - All expected tables exist
  - FTS tables populated on insert
- **Validate:** `pnpm test -- migrations`

## Completion

- [ ] All checkpoints validated
- [ ] Task marked complete in source module

**Completed by:** ___
