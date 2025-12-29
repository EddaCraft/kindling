/**
 * Observation ingestion implementation
 */

import { randomUUID } from 'node:crypto';
import type { SqliteKindlingStore } from '@kindling/store-sqlite';
import type { ID } from '../types/index.js';
import type {
  AppendObservationInput,
  AppendObservationResult,
} from './types.js';
import { extractProvenance } from './provenance.js';
import { getOpenCapsule } from '../capsule/lifecycle.js';

/**
 * Append an observation to the store
 */
export async function appendObservation(
  store: SqliteKindlingStore,
  input: AppendObservationInput
): Promise<AppendObservationResult> {
  const { kind, content, provenance: rawProvenance, scopeIds, capsuleId } = input;

  // Generate ID and timestamp
  const id = randomUUID();
  const ts = Date.now();

  // Extract and validate provenance
  const provenance = extractProvenance(kind, rawProvenance);

  // Insert observation
  store.insertObservation({
    id,
    kind,
    content,
    provenance,
    ts,
    sessionId: scopeIds.sessionId,
    repoId: scopeIds.repoId,
    agentId: scopeIds.agentId,
    userId: scopeIds.userId,
    redacted: false,
  });

  // Determine which capsule to attach to
  let targetCapsuleId: ID | undefined = capsuleId;

  // If no explicit capsule ID, look for open capsule in scope
  if (!targetCapsuleId) {
    const openCapsule = await getOpenCapsule(store, scopeIds);
    if (openCapsule) {
      targetCapsuleId = openCapsule.id;
    }
  }

  // Attach to capsule if found
  if (targetCapsuleId) {
    try {
      store.attachObservationToCapsule({
        capsuleId: targetCapsuleId,
        observationId: id,
      });
    } catch (error) {
      // If attachment fails, observation is still stored
      console.warn(
        `Failed to attach observation ${id} to capsule ${targetCapsuleId}:`,
        error
      );
      targetCapsuleId = undefined;
    }
  }

  return {
    observationId: id,
    capsuleId: targetCapsuleId,
  };
}
