/**
 * Summary types and definitions
 *
 * A Summary is a high-level description of a capsule's content
 * (typically LLM-generated on capsule close)
 */

import type { ID, Timestamp } from './common.js';

/**
 * Summary entity
 *
 * Fully immutable once created
 */
export interface Summary {
  /** Unique identifier (UUIDv4) */
  id: ID;

  /** Reference to parent capsule (one-to-one relationship) */
  capsuleId: ID;

  /** Summary text (human-readable, typically LLM-generated) */
  content: string;

  /**
   * Quality/confidence score (0.0 = low, 1.0 = high)
   * Indicates reliability of the summary
   */
  confidence: number;

  /** Timestamp when summary was created (epoch milliseconds) */
  createdAt: Timestamp;

  /**
   * Observation IDs that support this summary (provenance)
   * Shows which observations informed the summary
   */
  evidenceRefs: ID[];
}

/**
 * Input for creating a new summary
 * Makes id and createdAt optional (will be auto-generated)
 */
export interface SummaryInput {
  id?: ID;
  capsuleId: ID;
  content: string;
  confidence: number;
  createdAt?: Timestamp;
  evidenceRefs: ID[];
}

/**
 * Validate that confidence score is in valid range [0.0, 1.0]
 */
export function isValidConfidence(value: number): boolean {
  return typeof value === 'number' && value >= 0.0 && value <= 1.0 && !isNaN(value);
}
