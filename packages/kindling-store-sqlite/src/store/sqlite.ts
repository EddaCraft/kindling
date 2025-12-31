/**
 * SQLite Kindling Store - Write Path
 *
 * Provides atomic, deterministic writes for observations, capsules, summaries, and pins
 */

import type Database from 'better-sqlite3';
import type { Observation, Capsule, Summary, Pin } from '@kindling/core';

/**
 * SQLite-based Kindling store implementation
 */
export class SqliteKindlingStore {
  constructor(private db: Database.Database) {}

  /**
   * Insert an observation
   *
   * FTS sync happens automatically via triggers
   *
   * @param observation - Observation to insert
   */
  insertObservation(observation: Observation): void {
    const stmt = this.db.prepare(`
      INSERT INTO observations (
        id, kind, content, provenance, ts, scope_ids, redacted
      ) VALUES (
        @id, @kind, @content, @provenance, @ts, @scopeIds, @redacted
      )
    `);

    stmt.run({
      id: observation.id,
      kind: observation.kind,
      content: observation.content,
      provenance: JSON.stringify(observation.provenance),
      ts: observation.ts,
      scopeIds: JSON.stringify(observation.scopeIds),
      redacted: observation.redacted ? 1 : 0,
    });
  }

  /**
   * Create a new capsule
   *
   * @param capsule - Capsule to create
   */
  createCapsule(capsule: Capsule): void {
    const stmt = this.db.prepare(`
      INSERT INTO capsules (
        id, type, intent, status, opened_at, closed_at, scope_ids
      ) VALUES (
        @id, @type, @intent, @status, @openedAt, @closedAt, @scopeIds
      )
    `);

    stmt.run({
      id: capsule.id,
      type: capsule.type,
      intent: capsule.intent,
      status: capsule.status,
      openedAt: capsule.openedAt,
      closedAt: capsule.closedAt ?? null,
      scopeIds: JSON.stringify(capsule.scopeIds),
    });
  }

  /**
   * Close a capsule
   *
   * Updates status to 'closed' and sets closedAt timestamp
   *
   * @param capsuleId - ID of capsule to close
   * @param closedAt - Timestamp when capsule was closed (defaults to now)
   * @param summaryId - Optional summary ID to attach
   */
  closeCapsule(capsuleId: string, closedAt?: number, summaryId?: string): void {
    const updateStmt = this.db.prepare(`
      UPDATE capsules
      SET status = 'closed',
          closed_at = @closedAt
      WHERE id = @id AND status = 'open'
    `);

    const result = updateStmt.run({
      id: capsuleId,
      closedAt: closedAt ?? Date.now(),
    });

    if (result.changes === 0) {
      throw new Error(`Capsule ${capsuleId} not found or already closed`);
    }

    // If summaryId provided, update the capsule
    if (summaryId) {
      // Note: In SQLite, we don't have a summaryId column in capsules table
      // The relationship is managed via summaries.capsule_id
      // This is just a validation that the summary exists
      const summaryCheck = this.db.prepare(`
        SELECT id FROM summaries WHERE id = ? AND capsule_id = ?
      `).get(summaryId, capsuleId);

      if (!summaryCheck) {
        throw new Error(`Summary ${summaryId} not found for capsule ${capsuleId}`);
      }
    }
  }

  /**
   * Attach an observation to a capsule
   *
   * Maintains deterministic ordering via seq column
   *
   * @param capsuleId - ID of capsule
   * @param observationId - ID of observation to attach
   */
  attachObservationToCapsule(capsuleId: string, observationId: string): void {
    // Get next sequence number for this capsule
    const seqResult = this.db.prepare(`
      SELECT COALESCE(MAX(seq), -1) + 1 as next_seq
      FROM capsule_observations
      WHERE capsule_id = ?
    `).get(capsuleId) as { next_seq: number };

    const stmt = this.db.prepare(`
      INSERT INTO capsule_observations (capsule_id, observation_id, seq)
      VALUES (?, ?, ?)
    `);

    stmt.run(capsuleId, observationId, seqResult.next_seq);
  }

  /**
   * Insert a summary
   *
   * FTS sync happens automatically via triggers
   *
   * @param summary - Summary to insert
   */
  insertSummary(summary: Summary): void {
    const stmt = this.db.prepare(`
      INSERT INTO summaries (
        id, capsule_id, content, confidence, created_at, evidence_refs
      ) VALUES (
        @id, @capsuleId, @content, @confidence, @createdAt, @evidenceRefs
      )
    `);

    stmt.run({
      id: summary.id,
      capsuleId: summary.capsuleId,
      content: summary.content,
      confidence: summary.confidence,
      createdAt: summary.createdAt,
      evidenceRefs: JSON.stringify(summary.evidenceRefs),
    });
  }

  /**
   * Insert a pin
   *
   * @param pin - Pin to insert
   */
  insertPin(pin: Pin): void {
    const stmt = this.db.prepare(`
      INSERT INTO pins (
        id, target_type, target_id, reason, created_at, expires_at, scope_ids
      ) VALUES (
        @id, @targetType, @targetId, @reason, @createdAt, @expiresAt, @scopeIds
      )
    `);

    stmt.run({
      id: pin.id,
      targetType: pin.targetType,
      targetId: pin.targetId,
      reason: pin.reason ?? null,
      createdAt: pin.createdAt,
      expiresAt: pin.expiresAt ?? null,
      scopeIds: JSON.stringify(pin.scopeIds),
    });
  }

  /**
   * Delete a pin
   *
   * @param pinId - ID of pin to delete
   */
  deletePin(pinId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM pins WHERE id = ?
    `);

    const result = stmt.run(pinId);

    if (result.changes === 0) {
      throw new Error(`Pin ${pinId} not found`);
    }
  }

  /**
   * Get active pins (TTL-aware)
   *
   * @param scopeIds - Optional scope filter
   * @param now - Current timestamp for TTL check (defaults to Date.now())
   * @returns Array of active pins
   */
  listActivePins(scopeIds?: Partial<Record<string, string>>, now?: number): Pin[] {
    const currentTime = now ?? Date.now();
    let query = `
      SELECT id, target_type, target_id, reason, created_at, expires_at, scope_ids
      FROM pins
      WHERE (expires_at IS NULL OR expires_at > ?)
    `;

    const params: any[] = [currentTime];

    // Add scope filtering if provided
    if (scopeIds) {
      if (scopeIds.sessionId) {
        query += ` AND json_extract(scope_ids, '$.sessionId') = ?`;
        params.push(scopeIds.sessionId);
      }
      if (scopeIds.repoId) {
        query += ` AND json_extract(scope_ids, '$.repoId') = ?`;
        params.push(scopeIds.repoId);
      }
      if (scopeIds.agentId) {
        query += ` AND json_extract(scope_ids, '$.agentId') = ?`;
        params.push(scopeIds.agentId);
      }
      if (scopeIds.userId) {
        query += ` AND json_extract(scope_ids, '$.userId') = ?`;
        params.push(scopeIds.userId);
      }
    }

    query += ` ORDER BY created_at DESC`;

    const rows = this.db.prepare(query).all(...params) as Array<{
      id: string;
      target_type: string;
      target_id: string;
      reason: string | null;
      created_at: number;
      expires_at: number | null;
      scope_ids: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      targetType: row.target_type as 'observation' | 'summary',
      targetId: row.target_id,
      reason: row.reason ?? undefined,
      createdAt: row.created_at,
      expiresAt: row.expires_at ?? undefined,
      scopeIds: JSON.parse(row.scope_ids),
    }));
  }

  /**
   * Execute a function within a transaction
   *
   * Automatically commits on success, rolls back on error
   *
   * @param fn - Function to execute within transaction
   * @returns Result of function
   */
  transaction<T>(fn: () => T): T {
    const txn = this.db.transaction(fn);
    return txn();
  }

  /**
   * Redact an observation
   *
   * Sets content to '[redacted]', marks redacted flag, and removes from FTS
   *
   * @param observationId - ID of observation to redact
   */
  redactObservation(observationId: string): void {
    const stmt = this.db.prepare(`
      UPDATE observations
      SET content = '[redacted]',
          redacted = 1
      WHERE id = ?
    `);

    const result = stmt.run(observationId);

    if (result.changes === 0) {
      throw new Error(`Observation ${observationId} not found`);
    }
  }
}
