/**
 * Capsule manager implementation
 */

import type { SqliteKindlingStore } from '@kindling/store-sqlite';
import type { Capsule, ID, ScopeIds } from '../types/index.js';
import type {
  ICapsuleManager,
  OpenCapsuleOptions,
  CloseCapsuleSignals,
} from './types.js';
import {
  openCapsule,
  closeCapsule,
  getCapsule,
  getOpenCapsule,
} from './lifecycle.js';

/**
 * CapsuleManager coordinates capsule lifecycle operations
 */
export class CapsuleManager implements ICapsuleManager {
  private activeCapsules: Map<ID, Capsule>;

  constructor(private store: SqliteKindlingStore) {
    this.activeCapsules = new Map();
  }

  /**
   * Open a new capsule
   */
  async open(options: OpenCapsuleOptions): Promise<ID> {
    const id = await openCapsule(this.store, options);

    // Cache in active capsules
    const capsule = await getCapsule(this.store, id);
    if (capsule) {
      this.activeCapsules.set(id, capsule);
    }

    return id;
  }

  /**
   * Close an existing capsule
   */
  async close(capsuleId: ID, signals?: CloseCapsuleSignals): Promise<void> {
    await closeCapsule(this.store, capsuleId, signals);

    // Remove from active capsules
    this.activeCapsules.delete(capsuleId);
  }

  /**
   * Get a capsule by ID
   */
  async get(capsuleId: ID): Promise<Capsule | null> {
    // Check cache first
    if (this.activeCapsules.has(capsuleId)) {
      return this.activeCapsules.get(capsuleId)!;
    }

    // Load from store
    return getCapsule(this.store, capsuleId);
  }

  /**
   * Get the currently open capsule for a scope
   */
  async getOpen(scopeIds: ScopeIds): Promise<Capsule | null> {
    // Try to find in cache first
    for (const capsule of this.activeCapsules.values()) {
      if (
        capsule.status === 'open' &&
        this.matchesScope(capsule.scopeIds, scopeIds)
      ) {
        return capsule;
      }
    }

    // Load from store
    return getOpenCapsule(this.store, scopeIds);
  }

  /**
   * Check if two scope IDs match
   */
  private matchesScope(a: ScopeIds, b: ScopeIds): boolean {
    return (
      a.sessionId === b.sessionId &&
      a.repoId === b.repoId &&
      a.agentId === b.agentId &&
      a.userId === b.userId
    );
  }

  /**
   * Clear the active capsules cache
   */
  clearCache(): void {
    this.activeCapsules.clear();
  }
}
