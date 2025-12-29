/**
 * Observation service implementation
 */

import type { SqliteKindlingStore, ObservationRow } from '@kindling/store-sqlite';
import type { Observation, ID } from '../types/index.js';
import type {
  IObservationService,
  AppendObservationInput,
  AppendObservationResult,
} from './types.js';
import { appendObservation } from './ingest.js';

/**
 * Convert database row to Observation domain type
 */
function rowToObservation(row: ObservationRow): Observation {
  return {
    id: row.id,
    kind: row.kind as any,
    content: row.content,
    provenance: JSON.parse(row.provenance),
    ts: row.ts,
    scopeIds: {
      sessionId: row.session_id ?? undefined,
      repoId: row.repo_id ?? undefined,
      agentId: row.agent_id ?? undefined,
      userId: row.user_id ?? undefined,
    },
    redacted: row.redacted === 1,
  };
}

/**
 * ObservationService provides high-level observation operations
 */
export class ObservationService implements IObservationService {
  constructor(private store: SqliteKindlingStore) {}

  /**
   * Append a new observation
   */
  async append(input: AppendObservationInput): Promise<AppendObservationResult> {
    return appendObservation(this.store, input);
  }

  /**
   * Get an observation by ID
   */
  async get(id: ID): Promise<Observation | null> {
    const row = this.store.getObservation(id);
    if (!row) {
      return null;
    }
    return rowToObservation(row);
  }

  /**
   * List observations for a capsule
   */
  async listByCapsule(capsuleId: ID): Promise<Observation[]> {
    const observationIds = this.store.getCapsuleObservations(capsuleId);

    const observations: Observation[] = [];
    for (const obsId of observationIds) {
      const row = this.store.getObservation(obsId);
      if (row) {
        observations.push(rowToObservation(row));
      }
    }

    return observations;
  }
}
