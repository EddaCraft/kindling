/**
 * Summary types represent condensed representations of capsule contents.
 */

import type { ID, Timestamp } from './common.js';

/**
 * A summary is a condensed representation of a capsule's observations
 */
export interface Summary {
  /** Unique identifier */
  id: ID;
  /** ID of the capsule this summarizes */
  capsuleId: ID;
  /** Summary content */
  content: string;
  /** Confidence score (0-1) indicating summary quality */
  confidence: number;
  /** When the summary was created */
  createdAt: Timestamp;
  /** IDs of observations used as evidence */
  evidenceRefs: string[];
}

/**
 * Input for creating a summary
 */
export interface CreateSummaryInput {
  capsuleId: ID;
  content: string;
  confidence: number;
  evidenceRefs: string[];
}
