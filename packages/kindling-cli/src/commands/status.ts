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

  const observations = store.countObservations();
  const capsules = store.countCapsules();
  const summaries = store.countSummaries();
  const pins = store.countPins();
  const openCapsules = store.countCapsules({ status: 'open' });

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
