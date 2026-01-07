import { describe, it, expect } from 'vitest';
import { openDatabase, getSchemaVersion } from '../src/index.js';

describe('Database Migrations', () => {
  it('should create database with all migrations applied', () => {
    const db = openDatabase();

    // Verify schema version
    const version = getSchemaVersion(db);
    expect(version).toBe(2);

    // Verify core tables exist
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('observations');
    expect(tableNames).toContain('capsules');
    expect(tableNames).toContain('capsule_observations');
    expect(tableNames).toContain('summaries');
    expect(tableNames).toContain('pins');
    expect(tableNames).toContain('schema_migrations');

    // Verify FTS tables exist
    expect(tableNames).toContain('observations_fts');
    expect(tableNames).toContain('summaries_fts');

    db.close();
  });

  it('should have WAL mode enabled', () => {
    const db = openDatabase();

    const result = db.pragma('journal_mode', { simple: true });
    expect(result).toBe('wal');

    db.close();
  });

  it('should have foreign keys enabled', () => {
    const db = openDatabase();

    const result = db.pragma('foreign_keys', { simple: true });
    expect(result).toBe(1);

    db.close();
  });

  it('should have required indexes', () => {
    const db = openDatabase();

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name")
      .all() as { name: string }[];

    const indexNames = indexes.map(i => i.name);

    // Verify key indexes exist
    expect(indexNames).toContain('idx_observations_session_ts');
    expect(indexNames).toContain('idx_observations_repo_ts');
    expect(indexNames).toContain('idx_observations_ts');
    expect(indexNames).toContain('idx_capsules_session_ts');
    expect(indexNames).toContain('idx_capsules_repo_ts');

    db.close();
  });
});
