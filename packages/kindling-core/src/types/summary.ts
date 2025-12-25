/**
 * Domain types for Summaries
 *
 * Summaries are generated context about capsules or observation groups.
 */

/**
 * Summary entity
 */
export interface Summary {
  id: string;
  capsuleId: string | null;
  content: string;
  confidence: number | null;
  evidenceRefs: string[];
  tsMs: number;
  createdAt: number;
}

/**
 * Input for creating a new summary
 */
export interface CreateSummaryInput {
  id?: string;
  capsuleId?: string | null;
  content: string;
  confidence?: number | null;
  evidenceRefs?: string[];
  tsMs?: number;
}

/**
 * Validates a confidence score (must be between 0.0 and 1.0)
 */
export function validateConfidence(confidence: number | null): boolean {
  if (confidence === null) return true;
  return confidence >= 0.0 && confidence <= 1.0;
}

/**
 * Generates a unique summary ID
 */
export function generateSummaryId(): string {
  return `sum_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
