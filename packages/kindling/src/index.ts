/**
 * @eddacraft/kindling
 *
 * Local memory and continuity engine for AI-assisted development.
 * This is the main package that bundles core functionality, SQLite storage,
 * and local FTS retrieval.
 *
 * @example
 * ```typescript
 * import { KindlingService, openDatabase, SqliteKindlingStore, LocalFtsProvider } from '@eddacraft/kindling';
 *
 * const db = openDatabase({ path: './memory.db' });
 * const store = new SqliteKindlingStore(db);
 * const provider = new LocalFtsProvider(db);
 * const service = new KindlingService({ store, provider });
 * ```
 */

// Core: types, service, validation
export * from '@eddacraft/kindling-core';

// SQLite store: persistence with FTS5
// Note: ImportResult is excluded to avoid collision with core's ImportResult
export {
  openDatabase,
  closeDatabase,
  type DatabaseOptions,
  runMigrations,
  getMigrationStatus,
  SqliteKindlingStore,
  type ExportDataset,
  type ExportOptions,
  exportDatabase,
  importDatabase,
} from '@eddacraft/kindling-store-sqlite';

// Local FTS provider: retrieval with ranking
export * from '@eddacraft/kindling-provider-local';
