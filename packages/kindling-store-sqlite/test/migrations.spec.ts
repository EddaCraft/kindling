/**
 * Tests for database migrations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, closeDatabase, getMigrationStatus } from '../src/index.js';
import type Database from 'better-sqlite3';
import { unlinkSync } from 'fs';

describe('Database Migrations', () => {
  let db: Database.Database;
  const testDbPath = '/tmp/kindling-test-migrations.db';

  beforeEach(() => {
    // Remove test database if it exists
    try {
      unlinkSync(testDbPath);
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
    // Cleanup
    try {
      unlinkSync(testDbPath);
      unlinkSync(`${testDbPath}-shm`);
      unlinkSync(`${testDbPath}-wal`);
    } catch {
      // Ignore errors
    }
  });

  it('should create database with all tables', () => {
    db = openDatabase({ path: testDbPath });

    // Check that all expected tables exist
    const tables = db
      .prepare(
        `
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `,
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('schema_migrations');
    expect(tableNames).toContain('observations');
    expect(tableNames).toContain('capsules');
    expect(tableNames).toContain('capsule_observations');
    expect(tableNames).toContain('summaries');
    expect(tableNames).toContain('pins');
  });

  it('should create FTS tables', () => {
    db = openDatabase({ path: testDbPath });

    const ftsTablesexist = db
      .prepare(
        `
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE '%_fts'
        ORDER BY name
      `,
      )
      .all() as { name: string }[];

    const ftsNames = ftsTablesexist.map((t) => t.name);

    expect(ftsNames).toContain('observations_fts');
    expect(ftsNames).toContain('summaries_fts');
  });

  it('should track applied migrations', () => {
    db = openDatabase({ path: testDbPath });

    const migrations = db
      .prepare(
        `
        SELECT version, name FROM schema_migrations
        ORDER BY version
      `,
      )
      .all() as { version: number; name: string }[];

    expect(migrations).toHaveLength(4);
    expect(migrations[0]).toMatchObject({ version: 1, name: '001_init' });
    expect(migrations[1]).toMatchObject({ version: 2, name: '002_fts' });
    expect(migrations[2]).toMatchObject({ version: 3, name: '003_indexes' });
    expect(migrations[3]).toMatchObject({ version: 4, name: '004_denormalize_scopes' });
  });

  it('should be idempotent (safe to re-run)', () => {
    db = openDatabase({ path: testDbPath });
    closeDatabase(db);

    // Re-open database (should not error)
    db = openDatabase({ path: testDbPath });

    const migrations = db.prepare('SELECT COUNT(*) as count FROM schema_migrations').get() as {
      count: number;
    };

    // Should still have exactly 4 migrations
    expect(migrations.count).toBe(4);
  });

  it('should enable WAL mode', () => {
    db = openDatabase({ path: testDbPath });

    const journalMode = db.pragma('journal_mode', { simple: true }) as string;
    expect(journalMode.toLowerCase()).toBe('wal');
  });

  it('should enforce foreign keys', () => {
    db = openDatabase({ path: testDbPath });

    const fkEnabled = db.pragma('foreign_keys', { simple: true }) as number;
    expect(fkEnabled).toBe(1);
  });

  it('should have correct schema for observations table', () => {
    db = openDatabase({ path: testDbPath });

    const columns = db.prepare(`PRAGMA table_info(observations)`).all() as Array<{
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }>;

    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('kind');
    expect(columnNames).toContain('content');
    expect(columnNames).toContain('provenance');
    expect(columnNames).toContain('ts');
    expect(columnNames).toContain('scope_ids');
    expect(columnNames).toContain('redacted');
    // Denormalized scope columns
    expect(columnNames).toContain('session_id');
    expect(columnNames).toContain('repo_id');

    // Check primary key
    const pkColumn = columns.find((c) => c.pk === 1);
    expect(pkColumn?.name).toBe('id');
  });

  it('should have correct schema for capsules table', () => {
    db = openDatabase({ path: testDbPath });

    const columns = db.prepare(`PRAGMA table_info(capsules)`).all() as Array<{ name: string }>;

    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('type');
    expect(columnNames).toContain('intent');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('opened_at');
    expect(columnNames).toContain('closed_at');
    expect(columnNames).toContain('scope_ids');
  });

  it('should sync FTS on insert', () => {
    db = openDatabase({ path: testDbPath });

    // Insert an observation
    db.prepare(
      `
      INSERT INTO observations (id, kind, content, provenance, ts, scope_ids, redacted)
      VALUES ('obs1', 'message', 'test content', '{}', 1000, '{}', 0)
    `,
    ).run();

    // Check FTS table
    const ftsResult = db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM observations_fts
        WHERE content MATCH 'test'
      `,
      )
      .get() as { count: number };

    expect(ftsResult.count).toBe(1);
  });

  it('should not index redacted observations in FTS', () => {
    db = openDatabase({ path: testDbPath });

    // Insert a redacted observation
    db.prepare(
      `
      INSERT INTO observations (id, kind, content, provenance, ts, scope_ids, redacted)
      VALUES ('obs1', 'message', 'secret content', '{}', 1000, '{}', 1)
    `,
    ).run();

    // Check FTS table (should not contain redacted observation)
    const ftsResult = db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM observations_fts
        WHERE content MATCH 'secret'
      `,
      )
      .get() as { count: number };

    expect(ftsResult.count).toBe(0);
  });

  it('should get migration status correctly', () => {
    db = openDatabase({ path: testDbPath });

    const status = getMigrationStatus(db);

    expect(status.currentVersion).toBe(4);
    expect(status.latestVersion).toBe(4);
    expect(status.appliedMigrations).toHaveLength(4);
    expect(status.pendingMigrations).toHaveLength(0);
  });

  it('should have indexes for common queries', () => {
    db = openDatabase({ path: testDbPath });

    const indexes = db
      .prepare(
        `
        SELECT name FROM sqlite_master
        WHERE type='index' AND name LIKE 'idx_%'
        ORDER BY name
      `,
      )
      .all() as { name: string }[];

    const indexNames = indexes.map((i) => i.name);

    // Check key indexes exist (denormalized column indexes from migration 004)
    expect(indexNames).toContain('idx_observations_ts');
    expect(indexNames).toContain('idx_obs_session_ts');
    expect(indexNames).toContain('idx_obs_repo_ts');
    expect(indexNames).toContain('idx_caps_status_session');
    expect(indexNames).toContain('idx_pins_expires_at');
    expect(indexNames).toContain('idx_pins_session_id');
    expect(indexNames).toContain('idx_pins_repo_id');
  });
});
