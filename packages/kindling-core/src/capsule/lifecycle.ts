/**
 * Capsule lifecycle functions
 */

import { randomUUID } from 'node:crypto';
import type {
  Capsule,
  CapsuleType,
  ScopeIds,
  ID,
} from '../types/index.js';
import type {
  OpenCapsuleOptions,
  CloseCapsuleSignals,
} from './types.js';
import type {
  SqliteKindlingStore,
  CapsuleRow,
} from '@kindling/store-sqlite';

/**
 * Convert database row to Capsule domain type
 */
function rowToCapsule(row: CapsuleRow): Capsule {
  return {
    id: row.id,
    type: row.type as CapsuleType,
    intent: row.intent,
    status: row.status as 'open' | 'closed',
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? undefined,
    scopeIds: {
      sessionId: row.session_id ?? undefined,
      repoId: row.repo_id ?? undefined,
      agentId: row.agent_id ?? undefined,
      userId: row.user_id ?? undefined,
    },
    observationIds: [],
    summaryId: row.summary_id ?? undefined,
  };
}

/**
 * Open a new capsule
 */
export async function openCapsule(
  store: SqliteKindlingStore,
  options: OpenCapsuleOptions
): Promise<ID> {
  const { type, intent, scopeIds } = options;

  // For session-type capsules, check if one is already open for this session
  if (type === 'session' && scopeIds.sessionId) {
    const existing = await getOpenCapsule(store, {
      sessionId: scopeIds.sessionId,
    });

    if (existing) {
      throw new Error(
        `Cannot open capsule: session ${scopeIds.sessionId} already has an open capsule (${existing.id})`
      );
    }
  }

  const id = randomUUID();
  const openedAt = Date.now();

  store.createCapsule({
    id,
    type,
    intent,
    openedAt,
    sessionId: scopeIds.sessionId,
    repoId: scopeIds.repoId,
    agentId: scopeIds.agentId,
    userId: scopeIds.userId,
  });

  return id;
}

/**
 * Close a capsule
 */
export async function closeCapsule(
  store: SqliteKindlingStore,
  capsuleId: ID,
  signals?: CloseCapsuleSignals
): Promise<void> {
  const capsuleRow = store.getCapsule(capsuleId);

  if (!capsuleRow) {
    throw new Error(`Capsule not found: ${capsuleId}`);
  }

  if (capsuleRow.status === 'closed') {
    throw new Error(`Capsule already closed: ${capsuleId}`);
  }

  const closedAt = Date.now();
  let summaryId: string | undefined;

  // Create summary if provided
  if (signals?.summary) {
    summaryId = randomUUID();
    store.insertSummary({
      id: summaryId,
      capsuleId,
      content: signals.summary.content,
      confidence: signals.summary.confidence,
      createdAt: closedAt,
      evidenceRefs: signals.summary.evidenceRefs,
    });
  }

  // Close the capsule
  store.closeCapsule({
    id: capsuleId,
    closedAt,
    summaryId,
  });
}

/**
 * Get a capsule by ID
 */
export async function getCapsule(
  store: SqliteKindlingStore,
  capsuleId: ID
): Promise<Capsule | null> {
  const row = store.getCapsule(capsuleId);

  if (!row) {
    return null;
  }

  const capsule = rowToCapsule(row);

  // Load observation IDs
  capsule.observationIds = store.getCapsuleObservations(capsuleId);

  return capsule;
}

/**
 * Get the currently open capsule for a scope (if any)
 */
export async function getOpenCapsule(
  store: SqliteKindlingStore,
  scopeIds: ScopeIds
): Promise<Capsule | null> {
  // Build a query to find open capsules matching the scope
  // Priority: sessionId > repoId > agentId > userId
  const db = (store as any).db;

  let query = "SELECT * FROM capsules WHERE status = 'open'";
  const params: unknown[] = [];

  if (scopeIds.sessionId) {
    query += ' AND session_id = ?';
    params.push(scopeIds.sessionId);
  } else if (scopeIds.repoId) {
    query += ' AND repo_id = ? AND session_id IS NULL';
    params.push(scopeIds.repoId);
  } else if (scopeIds.agentId) {
    query += ' AND agent_id = ? AND repo_id IS NULL AND session_id IS NULL';
    params.push(scopeIds.agentId);
  } else if (scopeIds.userId) {
    query +=
      ' AND user_id = ? AND agent_id IS NULL AND repo_id IS NULL AND session_id IS NULL';
    params.push(scopeIds.userId);
  } else {
    // No scope identifiers provided
    return null;
  }

  query += ' ORDER BY opened_at DESC LIMIT 1';

  const stmt = db.prepare(query);
  const row = stmt.get(...params) as CapsuleRow | undefined;

  if (!row) {
    return null;
  }

  const capsule = rowToCapsule(row);
  capsule.observationIds = store.getCapsuleObservations(capsule.id);

  return capsule;
}
