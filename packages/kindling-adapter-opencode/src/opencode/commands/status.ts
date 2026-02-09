/**
 * /memory status command
 *
 * Shows memory system status and statistics
 */

import type { ScopeIds } from '@eddacraft/kindling-core';

/**
 * Store interface for status command
 */
export interface StatusStore {
  queryObservations(
    scopeIds?: Partial<ScopeIds>,
    fromTs?: number,
    toTs?: number,
    limit?: number,
  ): { id: string }[];

  getCapsules(scopeIds?: Partial<ScopeIds>): { id: string; status: string }[];
  getSummaries(scopeIds?: Partial<ScopeIds>): { id: string; createdAt: number }[];
  getPins(scopeIds?: Partial<ScopeIds>): { id: string }[];
}

/**
 * Status command options
 */
export interface StatusOptions {
  /** Scope to show status for */
  scopeIds?: Partial<ScopeIds>;
  /** Database file path */
  dbPath?: string;
}

/**
 * Status result
 */
export interface StatusResult {
  observations: number;
  capsules: { total: number; open: number; closed: number };
  summaries: number;
  pins: number;
  lastSummaryAt?: number;
  dbPath?: string;
}

/**
 * Execute /memory status command
 *
 * @param store - Status store
 * @param options - Command options
 * @returns Status result
 */
export function memoryStatus(store: StatusStore, options: StatusOptions = {}): StatusResult {
  const { scopeIds, dbPath } = options;

  // Count observations
  const observations = store.queryObservations(scopeIds);

  // Count capsules
  const capsules = store.getCapsules(scopeIds);
  const open = capsules.filter((c) => c.status === 'open').length;
  const closed = capsules.filter((c) => c.status === 'closed').length;

  // Count summaries and get latest
  const summaries = store.getSummaries(scopeIds);
  const lastSummary = summaries.sort((a, b) => b.createdAt - a.createdAt)[0];

  // Count pins
  const pins = store.getPins(scopeIds);

  return {
    observations: observations.length,
    capsules: {
      total: capsules.length,
      open,
      closed,
    },
    summaries: summaries.length,
    pins: pins.length,
    lastSummaryAt: lastSummary?.createdAt,
    dbPath,
  };
}

/**
 * Format status result as human-readable text
 *
 * @param result - Status result
 * @returns Formatted status text
 */
export function formatStatus(result: StatusResult): string {
  const lines: string[] = [];

  lines.push('Memory Status');
  lines.push('=============');
  lines.push('');
  lines.push(`Observations: ${result.observations}`);
  lines.push(
    `Capsules: ${result.capsules.total} (${result.capsules.open} open, ${result.capsules.closed} closed)`,
  );
  lines.push(`Summaries: ${result.summaries}`);
  lines.push(`Pins: ${result.pins}`);

  if (result.lastSummaryAt) {
    const date = new Date(result.lastSummaryAt);
    lines.push(`Last summary: ${date.toISOString()}`);
  }

  if (result.dbPath) {
    lines.push('');
    lines.push(`Database: ${result.dbPath}`);
  }

  return lines.join('\n');
}
