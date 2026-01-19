/**
 * Database migration infrastructure
 */

import type Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migration definition
 */
interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * Get all available migrations
 */
function getMigrations(): Migration[] {
  const migrationsDir = join(__dirname, '../../../migrations');

  return [
    {
      version: 1,
      name: '001_init',
      sql: readFileSync(join(migrationsDir, '001_init.sql'), 'utf-8'),
    },
    {
      version: 2,
      name: '002_fts',
      sql: readFileSync(join(migrationsDir, '002_fts.sql'), 'utf-8'),
    },
    {
      version: 3,
      name: '003_indexes',
      sql: readFileSync(join(migrationsDir, '003_indexes.sql'), 'utf-8'),
    },
  ];
}

/**
 * Get the current schema version
 */
function getCurrentVersion(db: Database.Database): number {
  try {
    const row = db.prepare(`
      SELECT MAX(version) as version FROM schema_migrations
    `).get() as { version: number | null };

    return row?.version ?? 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Run all pending migrations
 *
 * Migrations are:
 * - Additive only (never destructive)
 * - Idempotent (safe to re-run)
 * - Applied in order
 *
 * @param db - Database instance
 * @returns Number of migrations applied
 */
export function runMigrations(db: Database.Database): number {
  const currentVersion = getCurrentVersion(db);
  const migrations = getMigrations();

  let applied = 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Applying migration ${migration.name}...`);

      // Run migration in a transaction
      const applyMigration = db.transaction(() => {
        db.exec(migration.sql);
      });

      applyMigration();
      applied++;

      console.log(`✓ Applied migration ${migration.name}`);
    }
  }

  if (applied === 0) {
    console.log('Database is up to date');
  } else {
    console.log(`Applied ${applied} migration(s)`);
  }

  return applied;
}

/**
 * Get migration status
 */
export function getMigrationStatus(db: Database.Database): {
  currentVersion: number;
  latestVersion: number;
  appliedMigrations: string[];
  pendingMigrations: string[];
} {
  const currentVersion = getCurrentVersion(db);
  const migrations = getMigrations();
  const latestVersion = Math.max(...migrations.map(m => m.version));

  const appliedMigrations: string[] = [];
  const pendingMigrations: string[] = [];

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      appliedMigrations.push(migration.name);
    } else {
      pendingMigrations.push(migration.name);
    }
  }

  return {
    currentVersion,
    latestVersion,
    appliedMigrations,
    pendingMigrations,
  };
}
