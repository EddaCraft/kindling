/**
 * Store-level export/import primitives for sql.js
 *
 * Provides deterministic, ordered export of all entities for backup and portability.
 */

import type { Database, QueryExecResult } from 'sql.js';
import type {
  Observation,
  Capsule,
  Summary,
  Pin,
  ScopeIds,
} from '@kindling/core';

/**
 * Export dataset containing all entities
 */
export interface ExportDataset {
  version: string;
  exportedAt: number;
  scope?: Partial<ScopeIds>;
  observations: Observation[];
  capsules: Capsule[];
  summaries: Summary[];
  pins: Pin[];
}

/**
 * Export options
 */
export interface ExportOptions {
  scope?: Partial<ScopeIds>;
  includeRedacted?: boolean;
  limit?: number;
}

/**
 * Import result
 */
export interface ImportResult {
  observations: number;
  capsules: number;
  summaries: number;
  pins: number;
  errors: string[];
}

/**
 * Helper to get all rows from query result
 */
function getAll<T>(result: QueryExecResult[]): T[] {
  if (result.length === 0) {
    return [];
  }

  const columns = result[0].columns;
  return result[0].values.map(values => {
    const row: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
      row[columns[i]] = values[i];
    }
    return row as T;
  });
}

/**
 * Export all entities from the database
 */
export function exportDatabase(
  db: Database,
  options: ExportOptions = {}
): ExportDataset {
  const { scope, includeRedacted = false, limit } = options;

  // Build scope filter
  const buildScopeFilter = (tableName: string): { where: string; params: (string | number)[] } => {
    if (!scope) {
      return { where: '', params: [] };
    }

    const conditions: string[] = [];
    const params: (string | number)[] = [];

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
  let obsQuery = `
    SELECT id, kind, content, provenance, ts, scope_ids, redacted
    FROM observations
  `;

  const obsConditions: string[] = [];
  const obsParams: (string | number)[] = [...obsFilter.params];

  if (obsFilter.where) {
    obsConditions.push(obsFilter.where.replace('WHERE ', ''));
  }
  if (!includeRedacted) {
    obsConditions.push('redacted = 0');
  }

  if (obsConditions.length > 0) {
    obsQuery += ` WHERE ${obsConditions.join(' AND ')}`;
  }

  obsQuery += ` ORDER BY ts ASC, id ASC`;
  if (limit) {
    obsQuery += ` LIMIT ${limit}`;
  }

  const obsResult = db.exec(obsQuery, obsParams);
  const obsRows = getAll<{
    id: string;
    kind: string;
    content: string;
    provenance: string;
    ts: number;
    scope_ids: string;
    redacted: number;
  }>(obsResult);

  const observations: Observation[] = obsRows.map(row => ({
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

  const capsuleResult = db.exec(capsulesQuery, capsuleFilter.params);
  const capsuleRows = getAll<{
    id: string;
    type: string;
    intent: string;
    status: string;
    opened_at: number;
    closed_at: number | null;
    scope_ids: string;
  }>(capsuleResult);

  const capsules: Capsule[] = capsuleRows.map(row => {
    const obsIdsResult = db.exec(
      `SELECT observation_id
       FROM capsule_observations
       WHERE capsule_id = ?
       ORDER BY seq ASC`,
      [row.id]
    );
    const obsIds = getAll<{ observation_id: string }>(obsIdsResult);

    return {
      id: row.id,
      type: row.type as Capsule['type'],
      intent: row.intent,
      status: row.status as Capsule['status'],
      openedAt: row.opened_at,
      closedAt: row.closed_at ?? undefined,
      scopeIds: JSON.parse(row.scope_ids),
      observationIds: obsIds.map(o => o.observation_id),
    };
  });

  // Export summaries
  const summariesQuery = capsuleFilter.where
    ? `SELECT s.id, s.capsule_id, s.content, s.confidence, s.created_at, s.evidence_refs
       FROM summaries s
       INNER JOIN capsules c ON s.capsule_id = c.id
       ${capsuleFilter.where.replace('capsules.', 'c.')}
       ORDER BY s.created_at ASC, s.id ASC`
    : `SELECT id, capsule_id, content, confidence, created_at, evidence_refs
       FROM summaries
       ORDER BY created_at ASC, id ASC`;

  const summaryResult = db.exec(summariesQuery, capsuleFilter.params);
  const summaryRows = getAll<{
    id: string;
    capsule_id: string;
    content: string;
    confidence: number;
    created_at: number;
    evidence_refs: string;
  }>(summaryResult);

  const summaries: Summary[] = summaryRows.map(row => ({
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

  const pinResult = db.exec(pinsQuery, pinFilter.params);
  const pinRows = getAll<{
    id: string;
    target_type: string;
    target_id: string;
    reason: string | null;
    created_at: number;
    expires_at: number | null;
    scope_ids: string;
  }>(pinResult);

  const pins: Pin[] = pinRows.map(row => ({
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
 */
export function importDatabase(
  db: Database,
  dataset: ExportDataset
): ImportResult {
  const errors: string[] = [];
  let obsCount = 0;
  let capsuleCount = 0;
  let summaryCount = 0;
  let pinCount = 0;

  if (dataset.version !== '1.0') {
    errors.push(`Unsupported schema version: ${dataset.version}`);
    return { observations: 0, capsules: 0, summaries: 0, pins: 0, errors };
  }

  db.run('BEGIN TRANSACTION');

  try {
    // Import observations
    for (const obs of dataset.observations) {
      try {
        db.run(
          `INSERT OR IGNORE INTO observations (id, kind, content, provenance, ts, scope_ids, redacted)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            obs.id,
            obs.kind,
            obs.content,
            JSON.stringify(obs.provenance),
            obs.ts,
            JSON.stringify(obs.scopeIds),
            obs.redacted ? 1 : 0,
          ]
        );
        if (db.getRowsModified() > 0) obsCount++;
      } catch (err) {
        errors.push(`Failed to import observation ${obs.id}: ${err}`);
      }
    }

    // Import capsules
    for (const capsule of dataset.capsules) {
      try {
        db.run(
          `INSERT OR IGNORE INTO capsules (id, type, intent, status, opened_at, closed_at, scope_ids)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            capsule.id,
            capsule.type,
            capsule.intent,
            capsule.status,
            capsule.openedAt,
            capsule.closedAt ?? null,
            JSON.stringify(capsule.scopeIds),
          ]
        );
        if (db.getRowsModified() > 0) {
          capsuleCount++;

          // Import capsule observations
          capsule.observationIds.forEach((obsId: string, seq: number) => {
            db.run(
              `INSERT OR IGNORE INTO capsule_observations (capsule_id, observation_id, seq)
               VALUES (?, ?, ?)`,
              [capsule.id, obsId, seq]
            );
          });
        }
      } catch (err) {
        errors.push(`Failed to import capsule ${capsule.id}: ${err}`);
      }
    }

    // Import summaries
    for (const summary of dataset.summaries) {
      try {
        db.run(
          `INSERT OR IGNORE INTO summaries (id, capsule_id, content, confidence, created_at, evidence_refs)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            summary.id,
            summary.capsuleId,
            summary.content,
            summary.confidence,
            summary.createdAt,
            JSON.stringify(summary.evidenceRefs),
          ]
        );
        if (db.getRowsModified() > 0) summaryCount++;
      } catch (err) {
        errors.push(`Failed to import summary ${summary.id}: ${err}`);
      }
    }

    // Import pins
    for (const pin of dataset.pins) {
      try {
        db.run(
          `INSERT OR IGNORE INTO pins (id, target_type, target_id, reason, created_at, expires_at, scope_ids)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            pin.id,
            pin.targetType,
            pin.targetId,
            pin.reason ?? null,
            pin.createdAt,
            pin.expiresAt ?? null,
            JSON.stringify(pin.scopeIds),
          ]
        );
        if (db.getRowsModified() > 0) pinCount++;
      } catch (err) {
        errors.push(`Failed to import pin ${pin.id}: ${err}`);
      }
    }

    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
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
