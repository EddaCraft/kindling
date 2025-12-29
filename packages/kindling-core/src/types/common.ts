/**
 * Common type definitions shared across Kindling domain types.
 */

/**
 * Unique identifier (typically UUID or nanoid)
 */
export type ID = string;

/**
 * Timestamp in epoch milliseconds
 */
export type Timestamp = number;

/**
 * Scope identifiers for filtering and attribution
 */
export interface ScopeIds {
  /** Session identifier (e.g., OpenCode session) */
  sessionId?: string;
  /** Repository identifier */
  repoId?: string;
  /** Agent identifier */
  agentId?: string;
  /** User identifier */
  userId?: string;
}

/**
 * Generic result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
