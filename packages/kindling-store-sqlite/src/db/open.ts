/**
 * Database initialization and migration logic
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface OpenDatabaseOptions {
  /** Path to database file */
  path: string;
  /** Whether to open in readonly mode (default: false) */
  readonly?: boolean;
  /** Busy timeout in milliseconds (default: 5000) */
  busyTimeout?: number;
}

/**
 * Opens a SQLite database with recommended settings:
 * - WAL mode for better concurrency
 * - Foreign key enforcement
 * - Busy timeout for handling contention
 */
export function openDatabase(options: OpenDatabaseOptions): Database.Database {
  const { path, readonly = false, busyTimeout = 5000 } = options;

  const db = new Database(path, {
    readonly,
    fileMustExist: false,
  });

  // Enable WAL mode for better concurrency
  if (!readonly) {
    db.pragma('journal_mode = WAL');
  }

  // Enable foreign key constraints
  db.pragma('foreign_keys = ON');

  // Set busy timeout for handling concurrent access
  db.pragma(`busy_timeout = ${busyTimeout}`);

  // Apply migrations if not readonly
  if (!readonly) {
    applyMigrations(db);
  }

  return db;
}

interface Migration {
  version: number;
  description: string;
  sql: string;
}

/**
 * Gets all available migrations in order
 */
function getMigrations(): Migration[] {
  const migrationsDir = join(__dirname, '../../migrations');

  return [
    {
      version: 1,
      description: 'Initial schema',
      sql: readFileSync(join(migrationsDir, '001_init.sql'), 'utf-8'),
    },
    {
      version: 2,
      description: 'Full-text search tables',
      sql: readFileSync(join(migrationsDir, '002_fts.sql'), 'utf-8'),
    },
  ];
}

/**
 * Gets the current schema version from the database
 */
function getCurrentVersion(db: Database.Database): number {
  try {
    const row = db
      .prepare('SELECT MAX(version) as version FROM schema_migrations')
      .get() as { version: number | null };
    return row.version ?? 0;
  } catch (error) {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Applies pending migrations to the database
 */
function applyMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);
  const migrations = getMigrations();

  const pendingMigrations = migrations.filter(
    (m) => m.version > currentVersion
  );

  if (pendingMigrations.length === 0) {
    return;
  }

  for (const migration of pendingMigrations) {
    console.log(
      `Applying migration ${migration.version}: ${migration.description}`
    );

    // Execute migration in a transaction
    const apply = db.transaction(() => {
      db.exec(migration.sql);
    });

    try {
      apply();
    } catch (error) {
      console.error(
        `Failed to apply migration ${migration.version}:`,
        error
      );
      throw error;
    }
  }

  console.log(
    `Applied ${pendingMigrations.length} migration(s). Current version: ${migrations[migrations.length - 1].version}`
  );
}
