/**
 * @kindling/store-sqlite - SQLite-based system of record for Kindling
 */

export { openDatabase, type OpenDatabaseOptions } from './db/open.js';
export { SqliteKindlingStore } from './store/sqlite.js';
export type * from './store/types.js';
