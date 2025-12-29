/**
 * Observation types represent individual events or activities captured during development.
 */

import type { ID, Timestamp, ScopeIds } from './common.js';

/**
 * Types of observations that can be captured
 */
export type ObservationKind =
  | 'tool_call'
  | 'command'
  | 'file_diff'
  | 'error'
  | 'message'
  | 'node_start'
  | 'node_end'
  | 'node_output'
  | 'node_error';

/**
 * An observation is a single captured event with provenance
 */
export interface Observation {
  /** Unique identifier */
  id: ID;
  /** Type of observation */
  kind: ObservationKind;
  /** Content/payload of the observation */
  content: string;
  /** Provenance metadata (structure depends on kind) */
  provenance: Record<string, unknown>;
  /** Timestamp in epoch milliseconds */
  ts: Timestamp;
  /** Scope identifiers for filtering */
  scopeIds: ScopeIds;
  /** Whether content has been redacted */
  redacted: boolean;
}

/**
 * Input for creating an observation (id, ts, and redacted are set by the system)
 */
export interface CreateObservationInput {
  kind: ObservationKind;
  content: string;
  provenance?: Record<string, unknown>;
  scopeIds: ScopeIds;
}
