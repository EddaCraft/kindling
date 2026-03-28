import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';

describe('runMigrations', () => {
  let db: Database.Database;

  afterEach(() => {
    db?.close();
  });

  it('sets PRAGMA user_version to 5 after all migrations', () => {
    db = new Database(':memory:');
    runMigrations(db);

    const row = db.pragma('user_version', { simple: true });
    expect(row).toBe(5);
  });
});
