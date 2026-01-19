/**
 * /memory pin command
 *
 * Pins observations or summaries for persistent retrieval
 */

import type { Pin, ScopeIds, ID } from '@eddacraft/kindling';

/**
 * Store interface for pin command
 */
export interface PinStore {
  insertPin(pin: Pin): void;
  getObservationById(id: ID): { id: ID } | undefined;
  getSummaryById(id: ID): { id: ID } | undefined;
}

/**
 * Pin options
 */
export interface PinOptions {
  /** Type of target to pin */
  targetType: 'observation' | 'summary';
  /** ID of target to pin */
  targetId: ID;
  /** Optional reason for pinning */
  reason?: string;
  /** Scope for the pin */
  scopeIds: ScopeIds;
  /** Optional expiry time (timestamp) */
  expiresAt?: number;
}

/**
 * Pin result
 */
export interface PinResult {
  /** Pin ID */
  pinId: ID;
  /** Target ID that was pinned */
  targetId: ID;
  /** Target type */
  targetType: 'observation' | 'summary';
  /** Whether pin was created */
  created: boolean;
  /** Error if any */
  error?: string;
}

/**
 * Execute /memory pin command
 *
 * @param store - Pin store
 * @param options - Pin options
 * @returns Pin result
 */
export function memoryPin(
  store: PinStore,
  options: PinOptions
): PinResult {
  const { targetType, targetId, reason, scopeIds, expiresAt } = options;

  // Verify target exists
  let targetExists = false;

  if (targetType === 'observation') {
    targetExists = !!store.getObservationById(targetId);
  } else if (targetType === 'summary') {
    targetExists = !!store.getSummaryById(targetId);
  }

  if (!targetExists) {
    return {
      pinId: '',
      targetId,
      targetType,
      created: false,
      error: `${targetType} ${targetId} not found`,
    };
  }

  // Create pin
  const pinId = `pin-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const pin: Pin = {
    id: pinId,
    targetType,
    targetId,
    reason,
    createdAt: Date.now(),
    scopeIds,
    expiresAt,
  };

  try {
    store.insertPin(pin);

    return {
      pinId,
      targetId,
      targetType,
      created: true,
    };
  } catch (err) {
    return {
      pinId: '',
      targetId,
      targetType,
      created: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Format pin result as human-readable text
 *
 * @param result - Pin result
 * @returns Formatted pin result
 */
export function formatPinResult(result: PinResult): string {
  if (!result.created) {
    return `❌ Failed to pin: ${result.error}`;
  }

  return `📌 Pinned ${result.targetType} ${result.targetId}`;
}
