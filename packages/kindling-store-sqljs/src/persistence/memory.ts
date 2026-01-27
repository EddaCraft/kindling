/**
 * In-memory persistence adapter (for testing)
 *
 * Stores the database in memory - useful for testing or
 * scenarios where persistence isn't needed.
 */

import type { PersistenceAdapter, PersistenceResult } from './types.js';

/**
 * In-memory persistence adapter
 *
 * Useful for:
 * - Testing
 * - Temporary/ephemeral databases
 * - Server-side Node.js usage where file system isn't needed
 */
export class MemoryPersistence implements PersistenceAdapter {
  private data: Uint8Array | undefined;

  /**
   * Save database to memory
   */
  async save(data: Uint8Array): Promise<PersistenceResult> {
    // Make a copy to prevent external modifications
    this.data = new Uint8Array(data);
    return {
      success: true,
      bytesWritten: data.byteLength,
    };
  }

  /**
   * Load database from memory
   */
  async load(): Promise<Uint8Array | undefined> {
    if (!this.data) {
      return undefined;
    }
    // Return a copy to prevent external modifications
    return new Uint8Array(this.data);
  }

  /**
   * Delete database from memory
   */
  async delete(): Promise<PersistenceResult> {
    this.data = undefined;
    return { success: true };
  }

  /**
   * Check if database exists in memory
   */
  async exists(): Promise<boolean> {
    return this.data !== undefined;
  }

  /**
   * Get the size of stored data (for debugging)
   */
  getSize(): number {
    return this.data?.byteLength ?? 0;
  }
}
