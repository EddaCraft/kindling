/**
 * Database infrastructure
 */

export { openDatabase, closeDatabase } from './open.js';
export type { DatabaseOptions } from './open.js';
export { runMigrations, getMigrationStatus } from './migrate.js';
