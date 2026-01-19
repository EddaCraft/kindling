/**
 * /memory forget command
 *
 * Redacts observations to protect privacy
 */

import type { ID } from '@eddacraft/kindling';

/**
 * Store interface for forget command
 */
export interface ForgetStore {
  redactObservation(id: ID): void;
  getObservationById(id: ID): { id: ID; redacted: boolean } | undefined;
}

/**
 * Forget options
 */
export interface ForgetOptions {
  /** ID of observation to forget */
  observationId: ID;
}

/**
 * Forget result
 */
export interface ForgetResult {
  /** Observation ID */
  observationId: ID;
  /** Whether observation was redacted */
  redacted: boolean;
  /** Error if any */
  error?: string;
}

/**
 * Execute /memory forget command
 *
 * @param store - Forget store
 * @param options - Forget options
 * @returns Forget result
 */
export function memoryForget(
  store: ForgetStore,
  options: ForgetOptions
): ForgetResult {
  const { observationId } = options;

  // Verify observation exists
  const observation = store.getObservationById(observationId);

  if (!observation) {
    return {
      observationId,
      redacted: false,
      error: `Observation ${observationId} not found`,
    };
  }

  // Check if already redacted
  if (observation.redacted) {
    return {
      observationId,
      redacted: true,
      error: 'Observation already redacted',
    };
  }

  // Redact observation
  try {
    store.redactObservation(observationId);

    return {
      observationId,
      redacted: true,
    };
  } catch (err) {
    return {
      observationId,
      redacted: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Format forget result as human-readable text
 *
 * @param result - Forget result
 * @returns Formatted forget result
 */
export function formatForgetResult(result: ForgetResult): string {
  if (result.error && !result.redacted) {
    return `❌ Failed to redact: ${result.error}`;
  }

  if (result.error && result.redacted) {
    return `⚠️  ${result.error}`;
  }

  return `🗑️  Redacted observation ${result.observationId}`;
}
