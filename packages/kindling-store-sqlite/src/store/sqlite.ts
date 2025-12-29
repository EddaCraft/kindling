/**
 * SQLite implementation of KindlingStore
 */

import type Database from 'better-sqlite3';
import type {
  InsertObservationParams,
  CreateCapsuleParams,
  CloseCapsuleParams,
  AttachObservationParams,
  InsertSummaryParams,
  InsertPinParams,
  ObservationRow,
  CapsuleRow,
  SummaryRow,
  PinRow,
} from './types.js';

export class SqliteKindlingStore {
  constructor(private db: Database.Database) {}

  /**
   * Insert an observation into the store
   */
  insertObservation(params: InsertObservationParams): void {
    const stmt = this.db.prepare(`
      INSERT INTO observations (
        id, kind, content, provenance, ts,
        session_id, repo_id, agent_id, user_id, redacted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      params.id,
      params.kind,
      params.content,
      JSON.stringify(params.provenance),
      params.ts,
      params.sessionId ?? null,
      params.repoId ?? null,
      params.agentId ?? null,
      params.userId ?? null,
      params.redacted ? 1 : 0
    );
  }

  /**
   * Create a new capsule
   */
  createCapsule(params: CreateCapsuleParams): void {
    const stmt = this.db.prepare(`
      INSERT INTO capsules (
        id, type, intent, status, opened_at, closed_at,
        session_id, repo_id, agent_id, user_id, summary_id
      ) VALUES (?, ?, ?, 'open', ?, NULL, ?, ?, ?, ?, NULL)
    `);

    stmt.run(
      params.id,
      params.type,
      params.intent,
      params.openedAt,
      params.sessionId ?? null,
      params.repoId ?? null,
      params.agentId ?? null,
      params.userId ?? null
    );
  }

  /**
   * Close a capsule
   */
  closeCapsule(params: CloseCapsuleParams): void {
    const stmt = this.db.prepare(`
      UPDATE capsules
      SET status = 'closed', closed_at = ?, summary_id = ?
      WHERE id = ?
    `);

    stmt.run(params.closedAt, params.summaryId ?? null, params.id);
  }

  /**
   * Attach an observation to a capsule with deterministic ordering
   */
  attachObservationToCapsule(params: AttachObservationParams): void {
    // Get the next position for this capsule
    const positionStmt = this.db.prepare(`
      SELECT COALESCE(MAX(position), -1) + 1 as next_position
      FROM capsule_observations
      WHERE capsule_id = ?
    `);

    const { next_position } = positionStmt.get(params.capsuleId) as {
      next_position: number;
    };

    // Insert the observation attachment
    const insertStmt = this.db.prepare(`
      INSERT INTO capsule_observations (capsule_id, observation_id, position)
      VALUES (?, ?, ?)
    `);

    insertStmt.run(params.capsuleId, params.observationId, next_position);
  }

  /**
   * Insert a summary
   */
  insertSummary(params: InsertSummaryParams): void {
    const insertSummary = this.db.prepare(`
      INSERT INTO summaries (id, capsule_id, content, confidence, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertEvidence = this.db.prepare(`
      INSERT INTO summary_evidence (summary_id, observation_id)
      VALUES (?, ?)
    `);

    // Use transaction for atomicity
    const transaction = this.db.transaction(() => {
      insertSummary.run(
        params.id,
        params.capsuleId,
        params.content,
        params.confidence,
        params.createdAt
      );

      for (const evidenceId of params.evidenceRefs) {
        insertEvidence.run(params.id, evidenceId);
      }
    });

    transaction();
  }

  /**
   * Insert a pin
   */
  insertPin(params: InsertPinParams): void {
    const stmt = this.db.prepare(`
      INSERT INTO pins (
        id, target_type, target_id, reason, created_at, expires_at,
        session_id, repo_id, agent_id, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      params.id,
      params.targetType,
      params.targetId,
      params.reason ?? null,
      params.createdAt,
      params.expiresAt ?? null,
      params.sessionId ?? null,
      params.repoId ?? null,
      params.agentId ?? null,
      params.userId ?? null
    );
  }

  /**
   * Delete a pin by ID
   */
  deletePin(id: string): void {
    const stmt = this.db.prepare('DELETE FROM pins WHERE id = ?');
    stmt.run(id);
  }

  /**
   * List pins with optional TTL filtering
   */
  listPins(options?: {
    sessionId?: string;
    repoId?: string;
    now?: number;
  }): PinRow[] {
    let query = 'SELECT * FROM pins WHERE 1=1';
    const params: unknown[] = [];

    if (options?.sessionId) {
      query += ' AND session_id = ?';
      params.push(options.sessionId);
    }

    if (options?.repoId) {
      query += ' AND repo_id = ?';
      params.push(options.repoId);
    }

    if (options?.now) {
      query += ' AND (expires_at IS NULL OR expires_at > ?)';
      params.push(options.now);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as PinRow[];
  }

  /**
   * Get a capsule by ID
   */
  getCapsule(id: string): CapsuleRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM capsules WHERE id = ?');
    return stmt.get(id) as CapsuleRow | undefined;
  }

  /**
   * Get an observation by ID
   */
  getObservation(id: string): ObservationRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM observations WHERE id = ?');
    return stmt.get(id) as ObservationRow | undefined;
  }

  /**
   * Get a summary by ID
   */
  getSummary(id: string): SummaryRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM summaries WHERE id = ?');
    return stmt.get(id) as SummaryRow | undefined;
  }

  /**
   * Get observation IDs for a capsule in order
   */
  getCapsuleObservations(capsuleId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT observation_id
      FROM capsule_observations
      WHERE capsule_id = ?
      ORDER BY position ASC
    `);

    const rows = stmt.all(capsuleId) as { observation_id: string }[];
    return rows.map((row) => row.observation_id);
  }

  /**
   * Get evidence observation IDs for a summary
   */
  getSummaryEvidence(summaryId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT observation_id
      FROM summary_evidence
      WHERE summary_id = ?
    `);

    const rows = stmt.all(summaryId) as { observation_id: string }[];
    return rows.map((row) => row.observation_id);
  }
}
