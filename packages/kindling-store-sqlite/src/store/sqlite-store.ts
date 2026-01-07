/**
 * SqliteKindlingStore implementation
 *
 * SQLite-backed implementation of the KindlingStore interface.
 */

import Database from 'better-sqlite3';
import {
  Observation,
  CreateObservationInput,
  Capsule,
  OpenCapsuleInput,
  CloseCapsuleInput,
  Summary,
  CreateSummaryInput,
  Pin,
  CreatePinInput,
  CapsuleStatus,
  generateObservationId,
  generateCapsuleId,
  generateSummaryId,
  generatePinId,
  isPinExpired,
} from '@kindling/core';
import type {
  KindlingStore,
  ObservationFilters,
  CapsuleFilters,
  SummaryFilters,
  PinFilters,
  EvidenceSnippet,
} from '@kindling/core';

export class SqliteKindlingStore implements KindlingStore {
  constructor(private db: Database.Database) {}

  // === Observation Operations ===

  insertObservation(input: CreateObservationInput): Observation {
    const id = input.id ?? generateObservationId();
    const tsMs = input.tsMs ?? Date.now();
    const now = Math.floor(Date.now() / 1000);

    const observation: Observation = {
      id,
      kind: input.kind,
      content: input.content ?? null,
      provenance: input.provenance ?? {},
      tsMs,
      scope: input.scope ?? {},
      redacted: false,
      createdAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO observations (
        id, kind, content, provenance, ts_ms,
        session_id, repo_id, agent_id, user_id,
        redacted, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      observation.id,
      observation.kind,
      observation.content,
      JSON.stringify(observation.provenance),
      observation.tsMs,
      observation.scope.sessionId ?? null,
      observation.scope.repoId ?? null,
      observation.scope.agentId ?? null,
      observation.scope.userId ?? null,
      observation.redacted ? 1 : 0,
      observation.createdAt
    );

    return observation;
  }

  getObservation(id: string): Observation | null {
    const stmt = this.db.prepare(`
      SELECT * FROM observations WHERE id = ?
    `);
    const row = stmt.get(id) as any;

    return row ? this.rowToObservation(row) : null;
  }

  listObservations(filters?: ObservationFilters): Observation[] {
    let query = 'SELECT * FROM observations WHERE 1=1';
    const params: any[] = [];

    if (filters?.sessionId) {
      query += ' AND session_id = ?';
      params.push(filters.sessionId);
    }
    if (filters?.repoId) {
      query += ' AND repo_id = ?';
      params.push(filters.repoId);
    }
    if (filters?.agentId) {
      query += ' AND agent_id = ?';
      params.push(filters.agentId);
    }
    if (filters?.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.kind) {
      query += ' AND kind = ?';
      params.push(filters.kind);
    }

    query += ' ORDER BY ts_ms DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToObservation(row));
  }

  countObservations(filters?: ObservationFilters): number {
    let query = 'SELECT COUNT(*) as count FROM observations WHERE 1=1';
    const params: any[] = [];

    if (filters?.sessionId) {
      query += ' AND session_id = ?';
      params.push(filters.sessionId);
    }
    if (filters?.repoId) {
      query += ' AND repo_id = ?';
      params.push(filters.repoId);
    }
    if (filters?.agentId) {
      query += ' AND agent_id = ?';
      params.push(filters.agentId);
    }
    if (filters?.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.kind) {
      query += ' AND kind = ?';
      params.push(filters.kind);
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as { count: number };
    return row.count;
  }

  // === Capsule Operations ===

  createCapsule(input: OpenCapsuleInput): Capsule {
    const id = input.id ?? generateCapsuleId();
    const openedAtMs = input.openedAtMs ?? Date.now();
    const now = Math.floor(Date.now() / 1000);

    const capsule: Capsule = {
      id,
      type: input.type,
      intent: input.intent ?? 'general',
      status: CapsuleStatus.Open,
      scope: input.scope ?? {},
      openedAtMs,
      closedAtMs: null,
      createdAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO capsules (
        id, type, intent, status, session_id, repo_id, agent_id, user_id,
        opened_at_ms, closed_at_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      capsule.id,
      capsule.type,
      capsule.intent,
      capsule.status,
      capsule.scope.sessionId ?? null,
      capsule.scope.repoId ?? null,
      capsule.scope.agentId ?? null,
      capsule.scope.userId ?? null,
      capsule.openedAtMs,
      capsule.closedAtMs,
      capsule.createdAt
    );

    return capsule;
  }

  getCapsule(id: string): Capsule | null {
    const stmt = this.db.prepare('SELECT * FROM capsules WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.rowToCapsule(row) : null;
  }

  closeCapsule(id: string, input: CloseCapsuleInput): Capsule {
    const closedAtMs = input.closedAtMs ?? Date.now();

    const stmt = this.db.prepare(`
      UPDATE capsules
      SET status = ?, closed_at_ms = ?
      WHERE id = ?
    `);

    stmt.run(CapsuleStatus.Closed, closedAtMs, id);

    const capsule = this.getCapsule(id);
    if (!capsule) {
      throw new Error(`Capsule ${id} not found after closing`);
    }

    return capsule;
  }

  getOpenCapsuleForSession(sessionId: string): Capsule | null {
    const stmt = this.db.prepare(`
      SELECT * FROM capsules
      WHERE session_id = ? AND status = ?
      ORDER BY opened_at_ms DESC
      LIMIT 1
    `);

    const row = stmt.get(sessionId, CapsuleStatus.Open) as any;
    return row ? this.rowToCapsule(row) : null;
  }

  listCapsules(filters?: CapsuleFilters): Capsule[] {
    let query = 'SELECT * FROM capsules WHERE 1=1';
    const params: any[] = [];

    if (filters?.sessionId) {
      query += ' AND session_id = ?';
      params.push(filters.sessionId);
    }
    if (filters?.repoId) {
      query += ' AND repo_id = ?';
      params.push(filters.repoId);
    }
    if (filters?.agentId) {
      query += ' AND agent_id = ?';
      params.push(filters.agentId);
    }
    if (filters?.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY opened_at_ms DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToCapsule(row));
  }

  countCapsules(filters?: CapsuleFilters): number {
    let query = 'SELECT COUNT(*) as count FROM capsules WHERE 1=1';
    const params: any[] = [];

    if (filters?.sessionId) {
      query += ' AND session_id = ?';
      params.push(filters.sessionId);
    }
    if (filters?.repoId) {
      query += ' AND repo_id = ?';
      params.push(filters.repoId);
    }
    if (filters?.agentId) {
      query += ' AND agent_id = ?';
      params.push(filters.agentId);
    }
    if (filters?.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as { count: number };
    return row.count;
  }

  // === Capsule-Observation Linking ===

  attachObservationToCapsule(capsuleId: string, observationId: string): void {
    // Get next sequence number for this capsule
    const seqStmt = this.db.prepare(`
      SELECT COALESCE(MAX(seq), 0) + 1 as next_seq
      FROM capsule_observations
      WHERE capsule_id = ?
    `);
    const { next_seq } = seqStmt.get(capsuleId) as { next_seq: number };

    const stmt = this.db.prepare(`
      INSERT INTO capsule_observations (capsule_id, observation_id, seq)
      VALUES (?, ?, ?)
    `);

    stmt.run(capsuleId, observationId, next_seq);
  }

  listCapsuleObservations(capsuleId: string): Observation[] {
    const stmt = this.db.prepare(`
      SELECT o.*
      FROM observations o
      JOIN capsule_observations co ON o.id = co.observation_id
      WHERE co.capsule_id = ?
      ORDER BY co.seq ASC
    `);

    const rows = stmt.all(capsuleId) as any[];
    return rows.map(row => this.rowToObservation(row));
  }

  // === Summary Operations ===

  insertSummary(input: CreateSummaryInput): Summary {
    const id = input.id ?? generateSummaryId();
    const tsMs = input.tsMs ?? Date.now();
    const now = Math.floor(Date.now() / 1000);

    const summary: Summary = {
      id,
      capsuleId: input.capsuleId ?? null,
      content: input.content,
      confidence: input.confidence ?? null,
      evidenceRefs: input.evidenceRefs ?? [],
      tsMs,
      createdAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO summaries (
        id, capsule_id, content, confidence, evidence_refs, ts_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      summary.id,
      summary.capsuleId,
      summary.content,
      summary.confidence,
      JSON.stringify(summary.evidenceRefs),
      summary.tsMs,
      summary.createdAt
    );

    return summary;
  }

  getSummary(id: string): Summary | null {
    const stmt = this.db.prepare('SELECT * FROM summaries WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.rowToSummary(row) : null;
  }

  getLatestSummaryForCapsule(capsuleId: string): Summary | null {
    const stmt = this.db.prepare(`
      SELECT * FROM summaries
      WHERE capsule_id = ?
      ORDER BY ts_ms DESC
      LIMIT 1
    `);

    const row = stmt.get(capsuleId) as any;
    return row ? this.rowToSummary(row) : null;
  }

  listSummaries(filters?: SummaryFilters): Summary[] {
    let query = 'SELECT * FROM summaries WHERE 1=1';
    const params: any[] = [];

    if (filters?.capsuleId) {
      query += ' AND capsule_id = ?';
      params.push(filters.capsuleId);
    }

    query += ' ORDER BY ts_ms DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToSummary(row));
  }

  countSummaries(filters?: SummaryFilters): number {
    let query = 'SELECT COUNT(*) as count FROM summaries WHERE 1=1';
    const params: any[] = [];

    if (filters?.capsuleId) {
      query += ' AND capsule_id = ?';
      params.push(filters.capsuleId);
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as { count: number };
    return row.count;
  }

  // === Pin Operations ===

  insertPin(input: CreatePinInput): Pin {
    const id = input.id ?? generatePinId();
    const pinnedAtMs = input.pinnedAtMs ?? Date.now();
    const now = Math.floor(Date.now() / 1000);

    const pin: Pin = {
      id,
      targetType: input.targetType,
      targetId: input.targetId,
      note: input.note ?? null,
      ttlMs: input.ttlMs ?? null,
      pinnedAtMs,
      createdAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO pins (
        id, target_type, target_id, note, ttl_ms, pinned_at_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      pin.id,
      pin.targetType,
      pin.targetId,
      pin.note,
      pin.ttlMs,
      pin.pinnedAtMs,
      pin.createdAt
    );

    return pin;
  }

  deletePin(id: string): void {
    const stmt = this.db.prepare('DELETE FROM pins WHERE id = ?');
    stmt.run(id);
  }

  listPins(filters?: PinFilters): Pin[] {
    let query = 'SELECT * FROM pins WHERE 1=1';
    const params: any[] = [];

    if (filters?.targetType) {
      query += ' AND target_type = ?';
      params.push(filters.targetType);
    }
    if (filters?.targetId) {
      query += ' AND target_id = ?';
      params.push(filters.targetId);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    const pins = rows.map(row => this.rowToPin(row));

    // Filter out expired pins if requested
    if (!filters?.includeExpired) {
      const nowMs = filters?.nowMs ?? Date.now();
      return pins.filter(pin => !isPinExpired(pin, nowMs));
    }

    return pins;
  }

  countPins(filters?: PinFilters): number {
    let query = 'SELECT COUNT(*) as count FROM pins WHERE 1=1';
    const params: any[] = [];

    if (filters?.targetType) {
      query += ' AND target_type = ?';
      params.push(filters.targetType);
    }
    if (filters?.targetId) {
      query += ' AND target_id = ?';
      params.push(filters.targetId);
    }

    // Filter out expired pins unless includeExpired is set
    if (!filters?.includeExpired) {
      const nowMs = filters?.nowMs ?? Date.now();
      // Pin is expired if ttl_ms is set AND (pinned_at_ms + ttl_ms) < nowMs
      query += ' AND (ttl_ms IS NULL OR (pinned_at_ms + ttl_ms) >= ?)';
      params.push(nowMs);
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as { count: number };
    return row.count;
  }

  // === Redaction ===

  redactObservation(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE observations
      SET redacted = 1, content = '[REDACTED]', provenance = '{}'
      WHERE id = ?
    `);

    stmt.run(id);
  }

  // === Evidence Helpers ===

  getEvidenceSnippets(observationIds: string[], maxChars: number): EvidenceSnippet[] {
    if (observationIds.length === 0) return [];

    const placeholders = observationIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT id, content, redacted
      FROM observations
      WHERE id IN (${placeholders})
    `);

    const rows = stmt.all(...observationIds) as any[];

    return rows.map(row => {
      if (row.redacted) {
        return {
          observationId: row.id,
          snippet: '[REDACTED]',
          truncated: false,
        };
      }

      const content = row.content ?? '';
      if (content.length <= maxChars) {
        return {
          observationId: row.id,
          snippet: content,
          truncated: false,
        };
      }

      // Truncate with ellipsis
      return {
        observationId: row.id,
        snippet: content.substring(0, maxChars) + '...',
        truncated: true,
      };
    });
  }

  // === Database Management ===

  close(): void {
    this.db.close();
  }

  // === Helper Methods ===

  private rowToObservation(row: any): Observation {
    return {
      id: row.id,
      kind: row.kind,
      content: row.content,
      provenance: row.provenance ? JSON.parse(row.provenance) : {},
      tsMs: row.ts_ms,
      scope: {
        sessionId: row.session_id,
        repoId: row.repo_id,
        agentId: row.agent_id,
        userId: row.user_id,
      },
      redacted: row.redacted === 1,
      createdAt: row.created_at,
    };
  }

  private rowToCapsule(row: any): Capsule {
    return {
      id: row.id,
      type: row.type,
      intent: row.intent,
      status: row.status,
      scope: {
        sessionId: row.session_id,
        repoId: row.repo_id,
        agentId: row.agent_id,
        userId: row.user_id,
      },
      openedAtMs: row.opened_at_ms,
      closedAtMs: row.closed_at_ms,
      createdAt: row.created_at,
    };
  }

  private rowToSummary(row: any): Summary {
    return {
      id: row.id,
      capsuleId: row.capsule_id,
      content: row.content,
      confidence: row.confidence,
      evidenceRefs: row.evidence_refs ? JSON.parse(row.evidence_refs) : [],
      tsMs: row.ts_ms,
      createdAt: row.created_at,
    };
  }

  private rowToPin(row: any): Pin {
    return {
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      note: row.note,
      ttlMs: row.ttl_ms,
      pinnedAtMs: row.pinned_at_ms,
      createdAt: row.created_at,
    };
  }
}
