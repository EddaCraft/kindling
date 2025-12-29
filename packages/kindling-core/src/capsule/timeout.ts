/**
 * Capsule timeout handling
 */

import type { SqliteKindlingStore } from '@kindling/store-sqlite';
import type { ID } from '../types/index.js';
import { closeCapsule } from './lifecycle.js';

export interface TimeoutWatcherOptions {
  /** Inactivity timeout in milliseconds (default: 30 minutes) */
  inactivityTimeout?: number;
  /** Check interval in milliseconds (default: 5 minutes) */
  checkInterval?: number;
}

/**
 * Watches open capsules and auto-closes them on timeout
 */
export class CapsuleTimeoutWatcher {
  private inactivityTimeout: number;
  private checkInterval: number;
  private intervalHandle: NodeJS.Timeout | null;

  constructor(
    private store: SqliteKindlingStore,
    options: TimeoutWatcherOptions = {}
  ) {
    this.inactivityTimeout = options.inactivityTimeout ?? 30 * 60 * 1000; // 30 minutes
    this.checkInterval = options.checkInterval ?? 5 * 60 * 1000; // 5 minutes
    this.intervalHandle = null;
  }

  /**
   * Start watching for timeouts
   */
  start(): void {
    if (this.intervalHandle) {
      return; // Already started
    }

    this.intervalHandle = setInterval(() => {
      this.checkTimeouts().catch((error) => {
        console.error('Error checking capsule timeouts:', error);
      });
    }, this.checkInterval);
  }

  /**
   * Stop watching for timeouts
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Check for timed out capsules and close them
   */
  async checkTimeouts(): Promise<ID[]> {
    const now = Date.now();
    const cutoffTime = now - this.inactivityTimeout;

    // Find open capsules that haven't been updated since cutoff
    const db = (this.store as any).db;
    const query = `
      SELECT id, opened_at
      FROM capsules
      WHERE status = 'open'
        AND opened_at < ?
    `;

    const rows = db.prepare(query).all(cutoffTime) as {
      id: string;
      opened_at: number;
    }[];

    const timedOut: ID[] = [];

    for (const row of rows) {
      try {
        await closeCapsule(this.store, row.id, {
          reason: 'timeout',
        });
        timedOut.push(row.id);
      } catch (error) {
        console.error(`Failed to close timed out capsule ${row.id}:`, error);
      }
    }

    return timedOut;
  }
}
