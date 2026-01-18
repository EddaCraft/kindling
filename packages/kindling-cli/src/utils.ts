/**
 * CLI utility functions
 */

import { homedir } from 'os';
import { join } from 'path';
import { openDatabase } from '@kindling/store-sqlite';
import { SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalFtsProvider } from '@kindling/provider-local';
import { KindlingService } from '@kindling/core';
import type Database from 'better-sqlite3';

/**
 * Get default database path
 */
export function getDefaultDbPath(): string {
  return join(homedir(), '.kindling', 'kindling.db');
}

/**
 * Initialize Kindling service with database
 *
 * @param dbPath - Optional database path (defaults to ~/.kindling/kindling.db)
 * @returns Service instance and database instance
 */
export function initializeService(dbPath?: string): {
  service: KindlingService;
  db: Database.Database;
} {
  const path = dbPath || getDefaultDbPath();
  const db = openDatabase({ path });
  const store = new SqliteKindlingStore(db);
  const provider = new LocalFtsProvider(db);
  const service = new KindlingService({ store, provider });

  return { service, db };
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format JSON output
 */
export function formatJson(data: any, pretty = false): string {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

/**
 * Handle command errors
 */
export function handleError(error: unknown, asJson = false): void {
  const message = error instanceof Error ? error.message : String(error);

  if (asJson) {
    console.error(formatJson({ error: message }));
  } else {
    console.error(`Error: ${message}`);
  }

  process.exit(1);
}
