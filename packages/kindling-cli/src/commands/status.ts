import type { SqliteKindlingStore } from '@kindling/store-sqlite';
import { getMigrationStatus } from '@kindling/store-sqlite';

export interface StatusResult {
  dbPath: string;
  schemaVersion: number;
  migrationStatus: {
    current: number;
    latest: number;
    pending: string[];
  };
}

export function statusCommand(
  _store: SqliteKindlingStore,
  dbPath: string,
  db: unknown
): StatusResult {
  const status = getMigrationStatus(db as Parameters<typeof getMigrationStatus>[0]);

  return {
    dbPath,
    schemaVersion: status.currentVersion,
    migrationStatus: {
      current: status.currentVersion,
      latest: status.latestVersion,
      pending: status.pendingMigrations,
    },
  };
}

export function formatStatus(result: StatusResult): string {
  const lines = [
    'Kindling Memory Store Status',
    '============================',
    '',
    `Database: ${result.dbPath}`,
    `Schema Version: ${result.schemaVersion}`,
    '',
    'Migration Status:',
    `  Current: ${result.migrationStatus.current}`,
    `  Latest: ${result.migrationStatus.latest}`,
    `  Pending: ${result.migrationStatus.pending.length > 0 ? result.migrationStatus.pending.join(', ') : 'none'}`,
  ];

  return lines.join('\n');
}
