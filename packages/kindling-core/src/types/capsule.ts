/**
 * Capsule types represent bounded units of work (sessions, workflow nodes).
 */

import type { ID, Timestamp, ScopeIds } from './common.js';

/**
 * Types of capsules
 */
export type CapsuleType = 'session' | 'pocketflow_node';

/**
 * Capsule lifecycle status
 */
export type CapsuleStatus = 'open' | 'closed';

/**
 * A capsule is a bounded unit of work containing observations
 */
export interface Capsule {
  /** Unique identifier */
  id: ID;
  /** Type of capsule */
  type: CapsuleType;
  /** Intent/purpose of this capsule */
  intent: string;
  /** Current status */
  status: CapsuleStatus;
  /** When the capsule was opened */
  openedAt: Timestamp;
  /** When the capsule was closed (if closed) */
  closedAt?: Timestamp;
  /** Scope identifiers */
  scopeIds: ScopeIds;
  /** IDs of observations in this capsule */
  observationIds: string[];
  /** ID of summary (if generated) */
  summaryId?: ID;
}

/**
 * Input for creating a capsule
 */
export interface CreateCapsuleInput {
  type: CapsuleType;
  intent: string;
  scopeIds: ScopeIds;
}
