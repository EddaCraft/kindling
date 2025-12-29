/**
 * Observation ingestion types and interfaces
 */

import type { ObservationKind, ScopeIds, ID } from '../types/index.js';

/**
 * Input for appending an observation
 */
export interface AppendObservationInput {
  /** Type of observation */
  kind: ObservationKind;
  /** Content/payload */
  content: string;
  /** Raw provenance data (will be extracted/validated) */
  provenance: Record<string, unknown>;
  /** Scope identifiers */
  scopeIds: ScopeIds;
  /** Optional explicit capsule ID to attach to */
  capsuleId?: ID;
}

/**
 * Result of appending an observation
 */
export interface AppendObservationResult {
  /** ID of the created observation */
  observationId: ID;
  /** ID of the capsule it was attached to (if any) */
  capsuleId?: ID;
}

/**
 * Interface for observation service
 */
export interface IObservationService {
  /**
   * Append a new observation to the store
   */
  append(input: AppendObservationInput): Promise<AppendObservationResult>;

  /**
   * Get an observation by ID
   */
  get(id: ID): Promise<any | null>;

  /**
   * List observations for a capsule
   */
  listByCapsule(capsuleId: ID): Promise<any[]>;
}
