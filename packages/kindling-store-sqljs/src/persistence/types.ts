/**
 * Persistence adapter types
 */

/**
 * Result of a persistence operation
 */
export interface PersistenceResult {
  success: boolean;
  error?: string;
  bytesWritten?: number;
}

/**
 * Interface for persistence adapters
 *
 * Persistence adapters handle saving and loading the sql.js database
 * to/from durable storage (IndexedDB, localStorage, file system, etc.)
 */
export interface PersistenceAdapter {
  /**
   * Save database to persistent storage
   *
   * @param data - Database bytes from db.export()
   * @returns Promise resolving to persistence result
   */
  save(data: Uint8Array): Promise<PersistenceResult>;

  /**
   * Load database from persistent storage
   *
   * @returns Promise resolving to database bytes, or undefined if not found
   */
  load(): Promise<Uint8Array | undefined>;

  /**
   * Delete persisted database
   *
   * @returns Promise resolving to persistence result
   */
  delete(): Promise<PersistenceResult>;

  /**
   * Check if a persisted database exists
   *
   * @returns Promise resolving to true if database exists
   */
  exists(): Promise<boolean>;
}
