/**
 * Store-level export/import primitives
 *
 * Provides deterministic, ordered export of all entities for backup and portability.
 */

import type Database from 'better-sqlite3';
import type { Observation, Capsule, Summary, Pin, ScopeIds } from '@eddacraft/kindling-core';

/**
 * Export dataset containing all entities
 */
export interface ExportDataset {
  /** Schema version for forward compatibility */
  version: string;
  /** Export timestamp */
  exportedAt: number;
  /** Optional scope filter applied */
  scope?: Partial<ScopeIds>;
  /** Observations ordered by timestamp */
  observations: Observation[];
  /** Capsules ordered by openedAt */
  capsules: Capsule[];
  /** Summaries ordered by createdAt */
  summaries: Summary[];
  /** Pins ordered by createdAt */
  pins: Pin[];
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Optional scope filter */
  scope?: Partial<ScopeIds>;
  /** Include redacted observations (default: false) */
  includeRedacted?: boolean;
  /** Maximum observations to export (default: unlimited) */
  limit?: number;
}

/**
 * Import result
 */
export interface ImportResult {
  /** Number of observations imported */
  observations: number;
  /** Number of capsules imported */
  capsules: number;
  /** Number of summaries imported */
  summaries: number;
  /** Number of pins imported */
  pins: number;
  /** Any errors encountered */
  errors: string[];
}

/**
 * Export all entities from the database
 *
 * Produces a deterministically ordered dataset for backup/portability
 *
 * @param db - SQLite database instance
 * @param options - Export options
 * @returns Export dataset with all entities
 */
export function exportDatabase(db: Database.Database, options: ExportOptions = {}): ExportDataset {
  const { scope, includeRedacted = false, limit } = options;

  // Build scope filter SQL
  const buildScopeFilter = (tableName: string): { where: string; params: string[] } => {
    if (!scope) {
      return { where: '', params: [] };
    }

    const conditions: string[] = [];
    const params: string[] = [];

    if (scope.sessionId) {
      conditions.push(`json_extract(${tableName}.scope_ids, '$.sessionId') = ?`);
      params.push(scope.sessionId);
    }
    if (scope.repoId) {
      conditions.push(`json_extract(${tableName}.scope_ids, '$.repoId') = ?`);
      params.push(scope.repoId);
    }
    if (scope.agentId) {
      conditions.push(`json_extract(${tableName}.scope_ids, '$.agentId') = ?`);
      params.push(scope.agentId);
    }
    if (scope.userId) {
      conditions.push(`json_extract(${tableName}.scope_ids, '$.userId') = ?`);
      params.push(scope.userId);
    }

    return {
      where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  };

  // Export observations
  const obsFilter = buildScopeFilter('observations');
  const obsRedactedFilter = includeRedacted ? '' : 'AND redacted = 0';
  const obsLimitClause = limit ? `LIMIT ${limit}` : '';

  const observationsQuery = `
    SELECT id, kind, content, provenance, ts, scope_ids, redacted
    FROM observations
    ${obsFilter.where}
    ${obsRedactedFilter ? (obsFilter.where ? obsRedactedFilter : `WHERE ${obsRedactedFilter.substring(4)}`) : ''}
    ORDER BY ts ASC, id ASC
    ${obsLimitClause}
  `;

  const obsRows = db.prepare(observationsQuery).all(...obsFilter.params) as Array<{
    id: string;
    kind: string;
    content: string;
    provenance: string;
    ts: number;
    scope_ids: string;
    redacted: number;
  }>;

  const observations: Observation[] = obsRows.map((row) => ({
    id: row.id,
    kind: row.kind as Observation['kind'],
    content: row.content,
    provenance: JSON.parse(row.provenance),
    ts: row.ts,
    scopeIds: JSON.parse(row.scope_ids),
    redacted: row.redacted === 1,
  }));

  // Export capsules
  const capsuleFilter = buildScopeFilter('capsules');
  const capsulesQuery = `
    SELECT id, type, intent, status, opened_at, closed_at, scope_ids
    FROM capsules
    ${capsuleFilter.where}
    ORDER BY opened_at ASC, id ASC
  `;

  const capsuleRows = db.prepare(capsulesQuery).all(...capsuleFilter.params) as Array<{
    id: string;
    type: string;
    intent: string;
    status: string;
    opened_at: number;
    closed_at: number | null;
    scope_ids: string;
  }>;

  const capsules: Capsule[] = capsuleRows.map((row) => {
    // Get observation IDs for this capsule
    const obsIds = db
      .prepare(
        `
      SELECT observation_id
      FROM capsule_observations
      WHERE capsule_id = ?
      ORDER BY seq ASC
    `,
      )
      .all(row.id) as Array<{ observation_id: string }>;

    return {
      id: row.id,
      type: row.type as Capsule['type'],
      intent: row.intent,
      status: row.status as Capsule['status'],
      openedAt: row.opened_at,
      closedAt: row.closed_at ?? undefined,
      scopeIds: JSON.parse(row.scope_ids),
      observationIds: obsIds.map((o) => o.observation_id),
    };
  });

  // Export summaries
  const summariesQuery = `
    SELECT s.id, s.capsule_id, s.content, s.confidence, s.created_at, s.evidence_refs
    FROM summaries s
    INNER JOIN capsules c ON s.capsule_id = c.id
    ${capsuleFilter.where.replace('capsules.', 'c.')}
    ORDER BY s.created_at ASC, s.id ASC
  `;

  const summaryRows = db.prepare(summariesQuery).all(...capsuleFilter.params) as Array<{
    id: string;
    capsule_id: string;
    content: string;
    confidence: number;
    created_at: number;
    evidence_refs: string;
  }>;

  const summaries: Summary[] = summaryRows.map((row) => ({
    id: row.id,
    capsuleId: row.capsule_id,
    content: row.content,
    confidence: row.confidence,
    createdAt: row.created_at,
    evidenceRefs: JSON.parse(row.evidence_refs),
  }));

  // Export pins
  const pinFilter = buildScopeFilter('pins');
  const pinsQuery = `
    SELECT id, target_type, target_id, reason, created_at, expires_at, scope_ids
    FROM pins
    ${pinFilter.where}
    ORDER BY created_at ASC, id ASC
  `;

  const pinRows = db.prepare(pinsQuery).all(...pinFilter.params) as Array<{
    id: string;
    target_type: string;
    target_id: string;
    reason: string | null;
    created_at: number;
    expires_at: number | null;
    scope_ids: string;
  }>;

  const pins: Pin[] = pinRows.map((row) => ({
    id: row.id,
    targetType: row.target_type as 'observation' | 'summary',
    targetId: row.target_id,
    reason: row.reason ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
    scopeIds: JSON.parse(row.scope_ids),
  }));

  return {
    version: '1.0',
    exportedAt: Date.now(),
    scope,
    observations,
    capsules,
    summaries,
    pins,
  };
}

/**
 * Import entities into the database
 *
 * Performs integrity checks and imports all entities in a transaction
 *
 * @param db - SQLite database instance
 * @param dataset - Export dataset to import
 * @returns Import result with counts and errors
 */
export function importDatabase(db: Database.Database, dataset: ExportDataset): ImportResult {
  const errors: string[] = [];
  let obsCount = 0;
  let capsuleCount = 0;
  let summaryCount = 0;
  let pinCount = 0;

  // Validate schema version
  if (dataset.version !== '1.0') {
    errors.push(`Unsupported schema version: ${dataset.version}`);
    return {
      observations: 0,
      capsules: 0,
      summaries: 0,
      pins: 0,
      errors,
    };
  }

  // Import in a transaction for atomicity
  const importTxn = db.transaction(() => {
    // Import observations
    const obsStmt = db.prepare(`
      INSERT OR IGNORE INTO observations (id, kind, content, provenance, ts, scope_ids, redacted)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const obs of dataset.observations) {
      try {
        const result = obsStmt.run(
          obs.id,
          obs.kind,
          obs.content,
          JSON.stringify(obs.provenance),
          obs.ts,
          JSON.stringify(obs.scopeIds),
          obs.redacted ? 1 : 0,
        );
        if (result.changes > 0) obsCount++;
      } catch (err) {
        errors.push(`Failed to import observation ${obs.id}: ${err}`);
      }
    }

    // Import capsules
    const capsuleStmt = db.prepare(`
      INSERT OR IGNORE INTO capsules (id, type, intent, status, opened_at, closed_at, scope_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const capsuleObsStmt = db.prepare(`
      INSERT OR IGNORE INTO capsule_observations (capsule_id, observation_id, seq)
      VALUES (?, ?, ?)
    `);

    for (const capsule of dataset.capsules) {
      try {
        const result = capsuleStmt.run(
          capsule.id,
          capsule.type,
          capsule.intent,
          capsule.status,
          capsule.openedAt,
          capsule.closedAt ?? null,
          JSON.stringify(capsule.scopeIds),
        );
        if (result.changes > 0) {
          capsuleCount++;

          // Import capsule observations
          capsule.observationIds.forEach((obsId: string, seq: number) => {
            capsuleObsStmt.run(capsule.id, obsId, seq);
          });
        }
      } catch (err) {
        errors.push(`Failed to import capsule ${capsule.id}: ${err}`);
      }
    }

    // Import summaries
    const summaryStmt = db.prepare(`
      INSERT OR IGNORE INTO summaries (id, capsule_id, content, confidence, created_at, evidence_refs)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const summary of dataset.summaries) {
      try {
        const result = summaryStmt.run(
          summary.id,
          summary.capsuleId,
          summary.content,
          summary.confidence,
          summary.createdAt,
          JSON.stringify(summary.evidenceRefs),
        );
        if (result.changes > 0) summaryCount++;
      } catch (err) {
        errors.push(`Failed to import summary ${summary.id}: ${err}`);
      }
    }

    // Import pins
    const pinStmt = db.prepare(`
      INSERT OR IGNORE INTO pins (id, target_type, target_id, reason, created_at, expires_at, scope_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const pin of dataset.pins) {
      try {
        const result = pinStmt.run(
          pin.id,
          pin.targetType,
          pin.targetId,
          pin.reason ?? null,
          pin.createdAt,
          pin.expiresAt ?? null,
          JSON.stringify(pin.scopeIds),
        );
        if (result.changes > 0) pinCount++;
      } catch (err) {
        errors.push(`Failed to import pin ${pin.id}: ${err}`);
      }
    }
  });

  // Execute transaction
  try {
    importTxn();
  } catch (err) {
    errors.push(`Transaction failed: ${err}`);
  }

  return {
    observations: obsCount,
    capsules: capsuleCount,
    summaries: summaryCount,
    pins: pinCount,
    errors,
  };
}
