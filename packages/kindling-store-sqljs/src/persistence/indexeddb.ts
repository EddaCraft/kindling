/**
 * IndexedDB persistence adapter for sql.js
 *
 * Stores the entire SQLite database as a Uint8Array in IndexedDB,
 * providing durable persistence in browser environments.
 */

import type { PersistenceAdapter, PersistenceResult } from './types.js';

/**
 * IndexedDB persistence options
 */
export interface IndexedDBPersistenceOptions {
  /**
   * IndexedDB database name
   * @default 'kindling'
   */
  dbName?: string;

  /**
   * Object store name within the IndexedDB database
   * @default 'databases'
   */
  storeName?: string;

  /**
   * Key to store the database under
   * @default 'main'
   */
  key?: string;
}

/**
 * IndexedDB persistence adapter
 *
 * Usage:
 * ```ts
 * const persistence = new IndexedDBPersistence();
 *
 * // Load existing database or create new
 * const existingData = await persistence.load();
 * const db = await openDatabase({ data: existingData });
 * const store = new SqljsKindlingStore(db);
 *
 * // Save after operations
 * await persistence.save(db.export());
 * ```
 */
export class IndexedDBPersistence implements PersistenceAdapter {
  private dbName: string;
  private storeName: string;
  private key: string;

  constructor(options: IndexedDBPersistenceOptions = {}) {
    this.dbName = options.dbName ?? 'kindling';
    this.storeName = options.storeName ?? 'databases';
    this.key = options.key ?? 'main';
  }

  /**
   * Open IndexedDB connection
   */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  /**
   * Save database to IndexedDB
   */
  async save(data: Uint8Array): Promise<PersistenceResult> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const request = store.put(data, this.key);

        request.onsuccess = () => {
          db.close();
          resolve({
            success: true,
            bytesWritten: data.byteLength,
          });
        };

        request.onerror = () => {
          db.close();
          resolve({
            success: false,
            error: `Failed to save to IndexedDB: ${request.error?.message}`,
          });
        };
      });
    } catch (err) {
      return {
        success: false,
        error: `IndexedDB error: ${err}`,
      };
    }
  }

  /**
   * Load database from IndexedDB
   */
  async load(): Promise<Uint8Array | undefined> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);

        const request = store.get(this.key);

        request.onsuccess = () => {
          db.close();
          const result = request.result;

          if (result instanceof Uint8Array) {
            resolve(result);
          } else if (result instanceof ArrayBuffer) {
            resolve(new Uint8Array(result));
          } else {
            resolve(undefined);
          }
        };

        request.onerror = () => {
          db.close();
          resolve(undefined);
        };
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Delete persisted database
   */
  async delete(): Promise<PersistenceResult> {
    try {
      const db = await this.openDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const request = store.delete(this.key);

        request.onsuccess = () => {
          db.close();
          resolve({ success: true });
        };

        request.onerror = () => {
          db.close();
          resolve({
            success: false,
            error: `Failed to delete from IndexedDB: ${request.error?.message}`,
          });
        };
      });
    } catch (err) {
      return {
        success: false,
        error: `IndexedDB error: ${err}`,
      };
    }
  }

  /**
   * Check if database exists in IndexedDB
   */
  async exists(): Promise<boolean> {
    const data = await this.load();
    return data !== undefined;
  }

  /**
   * Delete the entire IndexedDB database
   *
   * Use with caution - this removes all stored databases
   */
  async deleteDatabase(): Promise<PersistenceResult> {
    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(this.dbName);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        resolve({
          success: false,
          error: `Failed to delete IndexedDB database: ${request.error?.message}`,
        });
      };
    });
  }
}
