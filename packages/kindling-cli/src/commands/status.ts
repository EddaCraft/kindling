/**
 * Status command
 *
 * Displays database location, counts, and health information.
 */

import type { KindlingStore } from '@kindling/store-sqlite';
import { getSchemaVersion } from '@kindling/store-sqlite';

export interface StatusResult {
  dbPath: string;
  schemaVersion: number;
  counts: {
    observations: number;
    capsules: number;
    summaries: number;
    pins: number;
  };
  openCapsules: number;
}

export function statusCommand(store: KindlingStore, dbPath: string, db: any): StatusResult {
  const schemaVersion = getSchemaVersion(db);

  // Get counts
  const observations = store.listObservations({ limit: 999999 }).length;
  const capsules = store.listCapsules({ limit: 999999 }).length;
  const summaries = store.listSummaries({ limit: 999999 }).length;
  const pins = store.listPins({}).length;
  const openCapsules = store.listCapsules({ status: 'open', limit: 999999 }).length;

  return {
    dbPath,
    schemaVersion,
    counts: {
      observations,
      capsules,
      summaries,
      pins,
    },
    openCapsules,
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
    'Counts:',
    `  Observations: ${result.counts.observations}`,
    `  Capsules: ${result.counts.capsules} (${result.openCapsules} open)`,
    `  Summaries: ${result.counts.summaries}`,
    `  Pins: ${result.counts.pins}`,
  ];

  return lines.join('\n');
}
