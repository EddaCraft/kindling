/**
 * Capsule lifecycle types and interfaces
 */

import type { ID, ScopeIds } from '../types/common.js';
import type { Capsule, CapsuleType } from '../types/capsule.js';

/**
 * Options for opening a new capsule
 */
export interface OpenCapsuleOptions {
  /** Type of capsule (session, task, etc.) */
  type: CapsuleType;

  /** Human-readable intent/purpose */
  intent: string;

  /** Scope dimensions for isolation */
  scopeIds: ScopeIds;

  /** Optional pre-generated ID */
  id?: ID;
}

/**
 * Signals/metadata for closing a capsule
 */
export interface CloseCapsuleSignals {
  /** Reason for closure (completion, timeout, error, etc.) */
  reason?: string;

  /** Optional summary content to generate on close */
  summaryContent?: string;

  /** Confidence score for summary (0.0-1.0) */
  summaryConfidence?: number;

  /** Evidence observation IDs that support the summary */
  evidenceRefs?: ID[];
}

/**
 * Capsule manager interface
 *
 * Manages capsule lifecycle: opening, closing, and lookup
 */
export interface CapsuleManager {
  /**
   * Open a new capsule
   *
   * @param options - Capsule creation options
   * @returns The created capsule
   * @throws Error if a capsule is already open for the same scope (session type)
   */
  open(options: OpenCapsuleOptions): Capsule;

  /**
   * Close an open capsule
   *
   * @param capsuleId - ID of capsule to close
   * @param signals - Closure signals/metadata
   * @returns The closed capsule
   * @throws Error if capsule not found or already closed
   */
  close(capsuleId: ID, signals?: CloseCapsuleSignals): Capsule;

  /**
   * Get a capsule by ID
   *
   * @param capsuleId - Capsule ID to lookup
   * @returns Capsule or undefined if not found
   */
  get(capsuleId: ID): Capsule | undefined;

  /**
   * Get the open capsule for a scope (if any)
   *
   * @param scopeIds - Partial scope to match
   * @returns Open capsule or undefined
   */
  getOpen(scopeIds: Partial<ScopeIds>): Capsule | undefined;
}
