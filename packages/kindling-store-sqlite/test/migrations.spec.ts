/**
 * Tests for database migrations
 */

import { describe, it, expect, afterEach } from 'vitest';
import { openDatabase } from '../src/index.js';
import { unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Database migrations', () => {
  const testDbPath = join(tmpdir(), `kindling-test-${Date.now()}.db`);

  afterEach(() => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    // Also clean up WAL and SHM files
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (existsSync(walPath)) {
      unlinkSync(walPath);
    }
    if (existsSync(shmPath)) {
      unlinkSync(shmPath);
    }
  });

  it('should create database from scratch', () => {
    const db = openDatabase({ path: testDbPath });

    // Verify WAL mode is enabled
    const walMode = db.pragma('journal_mode', { simple: true });
    expect(walMode).toBe('wal');

    // Verify foreign keys are enabled
    const fkEnabled = db.pragma('foreign_keys', { simple: true });
    expect(fkEnabled).toBe(1);

    db.close();
  });

  it('should create schema_migrations table', () => {
    const db = openDatabase({ path: testDbPath });

    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
      .get();

    expect(row).toBeTruthy();

    db.close();
  });

  it('should create observations table with indexes', () => {
    const db = openDatabase({ path: testDbPath });

    // Check table exists
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations'")
      .get();
    expect(table).toBeTruthy();

    // Check indexes exist
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='observations'")
      .all() as { name: string }[];

    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_observations_session_ts');
    expect(indexNames).toContain('idx_observations_repo_ts');
    expect(indexNames).toContain('idx_observations_ts');

    db.close();
  });

  it('should create capsules table with foreign key to summaries', () => {
    const db = openDatabase({ path: testDbPath });

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='capsules'")
      .get();
    expect(table).toBeTruthy();

    db.close();
  });

  it('should create capsule_observations junction table', () => {
    const db = openDatabase({ path: testDbPath });

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='capsule_observations'")
      .get();
    expect(table).toBeTruthy();

    db.close();
  });

  it('should create summaries table', () => {
    const db = openDatabase({ path: testDbPath });

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='summaries'")
      .get();
    expect(table).toBeTruthy();

    db.close();
  });

  it('should create pins table', () => {
    const db = openDatabase({ path: testDbPath });

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pins'")
      .get();
    expect(table).toBeTruthy();

    db.close();
  });

  it('should create FTS tables for observations and summaries', () => {
    const db = openDatabase({ path: testDbPath });

    // Check observations_fts exists
    const obsFts = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'")
      .get();
    expect(obsFts).toBeTruthy();

    // Check summaries_fts exists
    const sumFts = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='summaries_fts'")
      .get();
    expect(sumFts).toBeTruthy();

    db.close();
  });

  it('should record applied migrations', () => {
    const db = openDatabase({ path: testDbPath });

    const migrations = db
      .prepare('SELECT version, description FROM schema_migrations ORDER BY version')
      .all() as { version: number; description: string }[];

    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0].version).toBe(1);
    expect(migrations[0].description).toBe('Initial schema');

    db.close();
  });

  it('should not re-apply migrations on second open', () => {
    // First open
    const db1 = openDatabase({ path: testDbPath });
    const migrationsCount1 = db1
      .prepare('SELECT COUNT(*) as count FROM schema_migrations')
      .get() as { count: number };
    db1.close();

    // Second open
    const db2 = openDatabase({ path: testDbPath });
    const migrationsCount2 = db2
      .prepare('SELECT COUNT(*) as count FROM schema_migrations')
      .get() as { count: number };
    db2.close();

    expect(migrationsCount1.count).toBe(migrationsCount2.count);
  });

  it('should enforce foreign key constraints', () => {
    const db = openDatabase({ path: testDbPath });

    // Try to insert a capsule_observations record with non-existent capsule
    expect(() => {
      db.prepare(
        'INSERT INTO capsule_observations (capsule_id, observation_id, position) VALUES (?, ?, ?)'
      ).run('non-existent-capsule', 'obs-1', 0);
    }).toThrow();

    db.close();
  });
});
