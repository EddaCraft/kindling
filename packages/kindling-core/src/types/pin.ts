/**
 * Pin types represent prioritized memory items that should always be retrieved.
 */

import type { ID, Timestamp, ScopeIds } from './common.js';

/**
 * Type of entity being pinned
 */
export type PinTargetType = 'observation' | 'summary';

/**
 * A pin marks an observation or summary as high-priority for retrieval
 */
export interface Pin {
  /** Unique identifier */
  id: ID;
  /** Type of entity being pinned */
  targetType: PinTargetType;
  /** ID of the pinned entity */
  targetId: ID;
  /** Optional reason for pinning */
  reason?: string;
  /** When the pin was created */
  createdAt: Timestamp;
  /** Optional expiration timestamp (TTL support) */
  expiresAt?: Timestamp;
  /** Scope identifiers */
  scopeIds: ScopeIds;
}

/**
 * Input for creating a pin
 */
export interface CreatePinInput {
  targetType: PinTargetType;
  targetId: ID;
  reason?: string;
  expiresAt?: Timestamp;
  scopeIds: ScopeIds;
}
