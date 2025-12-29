/**
 * Capsule manager types and interfaces
 */

import type { Capsule, CapsuleType, ScopeIds, ID } from '../types/index.js';

/**
 * Options for opening a new capsule
 */
export interface OpenCapsuleOptions {
  /** Type of capsule to create */
  type: CapsuleType;
  /** Intent/purpose of this capsule */
  intent: string;
  /** Scope identifiers */
  scopeIds: ScopeIds;
}

/**
 * Signals for closing a capsule
 */
export interface CloseCapsuleSignals {
  /** Reason for closing */
  reason?: string;
  /** Optional summary content to create */
  summary?: {
    content: string;
    confidence: number;
    evidenceRefs: string[];
  };
}

/**
 * Interface for capsule lifecycle management
 */
export interface ICapsuleManager {
  /**
   * Open a new capsule
   * @throws Error if a capsule is already open for the same session
   */
  open(options: OpenCapsuleOptions): Promise<ID>;

  /**
   * Close an existing capsule
   * @throws Error if capsule doesn't exist or is already closed
   */
  close(capsuleId: ID, signals?: CloseCapsuleSignals): Promise<void>;

  /**
   * Get a capsule by ID
   */
  get(capsuleId: ID): Promise<Capsule | null>;

  /**
   * Get the currently open capsule for a scope (if any)
   */
  getOpen(scopeIds: ScopeIds): Promise<Capsule | null>;
}
