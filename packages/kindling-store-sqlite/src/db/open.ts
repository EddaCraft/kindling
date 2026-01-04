import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface OpenDbOptions {
  /**
   * Path to the SQLite database file.
   * Defaults to ':memory:' for in-memory database.
   */
  dbPath?: string;

  /**
   * Whether to run migrations on open.
   * Defaults to true.
   */
  runMigrations?: boolean;
}

/**
 * Opens a Kindling SQLite database with recommended settings.
 *
 * - Enables WAL mode for better concurrency
 * - Enables foreign key enforcement
 * - Sets a reasonable busy timeout (5 seconds)
 * - Optionally runs migrations
 */
export function openDatabase(options: OpenDbOptions = {}): Database.Database {
  const { dbPath = ':memory:', runMigrations = true } = options;

  const db = new Database(dbPath);

  // Enable Write-Ahead Logging for better concurrency
  db.pragma('journal_mode = WAL');

  // Enable foreign key enforcement
  db.pragma('foreign_keys = ON');

  // Set busy timeout to 5 seconds
  db.pragma('busy_timeout = 5000');

  if (runMigrations) {
    applyMigrations(db);
  }

  return db;
}

/**
 * Applies all pending migrations to the database.
 */
function applyMigrations(db: Database.Database): void {
  // Ensure schema_migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  const migrations = [
    { version: 1, file: '001_init.sql' },
    { version: 2, file: '002_fts.sql' }
  ];

  const getVersion = db.prepare('SELECT version FROM schema_migrations WHERE version = ?');
  const recordMigration = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)');

  for (const migration of migrations) {
    const exists = getVersion.get(migration.version);

    if (!exists) {
      console.log(`Applying migration ${migration.version}: ${migration.file}`);

      const migrationPath = join(__dirname, '..', 'migrations', migration.file);
      const sql = readFileSync(migrationPath, 'utf-8');

      db.exec(sql);
      recordMigration.run(migration.version);

      console.log(`Migration ${migration.version} applied successfully`);
    }
  }
}

/**
 * Gets the current schema version of the database.
 */
export function getSchemaVersion(db: Database.Database): number {
  try {
    const result = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
    return result.version ?? 0;
  } catch {
    return 0;
  }
}
