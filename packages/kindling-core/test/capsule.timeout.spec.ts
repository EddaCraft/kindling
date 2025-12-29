/**
 * Tests for capsule timeout handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import {
  CapsuleTimeoutWatcher,
  openCapsule,
  getCapsule,
} from '../src/index.js';
import { unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('CapsuleTimeoutWatcher', () => {
  const testDbPath = join(
    tmpdir(),
    `kindling-test-timeout-${Date.now()}.db`
  );
  let store: SqliteKindlingStore;

  beforeEach(() => {
    const db = openDatabase({ path: testDbPath });
    store = new SqliteKindlingStore(db);
  });

  afterEach(() => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (existsSync(walPath)) unlinkSync(walPath);
    if (existsSync(shmPath)) unlinkSync(shmPath);
  });

  it('should auto-close capsules after timeout', async () => {
    const watcher = new CapsuleTimeoutWatcher(store, {
      inactivityTimeout: 100, // 100ms for testing
      checkInterval: 50,
    });

    // Create a capsule with old timestamp
    const id = await openCapsule(store, {
      type: 'session',
      intent: 'Test',
      scopeIds: {},
    });

    // Manually update opened_at to be old
    const db = (store as any).db;
    db.prepare('UPDATE capsules SET opened_at = ? WHERE id = ?').run(
      Date.now() - 200,
      id
    );

    // Check for timeouts
    const timedOut = await watcher.checkTimeouts();

    expect(timedOut).toContain(id);

    const capsule = await getCapsule(store, id);
    expect(capsule?.status).toBe('closed');
  });

  it('should not close capsules within timeout period', async () => {
    const watcher = new CapsuleTimeoutWatcher(store, {
      inactivityTimeout: 1000, // 1 second
    });

    const id = await openCapsule(store, {
      type: 'session',
      intent: 'Test',
      scopeIds: {},
    });

    const timedOut = await watcher.checkTimeouts();

    expect(timedOut).not.toContain(id);

    const capsule = await getCapsule(store, id);
    expect(capsule?.status).toBe('open');
  });

  it('should start and stop watching', async () => {
    const watcher = new CapsuleTimeoutWatcher(store, {
      inactivityTimeout: 50,
      checkInterval: 30,
    });

    // Start watching
    watcher.start();

    // Create old capsule
    const id = await openCapsule(store, {
      type: 'session',
      intent: 'Test',
      scopeIds: {},
    });

    const db = (store as any).db;
    db.prepare('UPDATE capsules SET opened_at = ? WHERE id = ?').run(
      Date.now() - 100,
      id
    );

    // Wait for check interval
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should be closed by watcher
    const capsule = await getCapsule(store, id);
    expect(capsule?.status).toBe('closed');

    // Stop watching
    watcher.stop();
  });

  it('should handle multiple timed out capsules', async () => {
    const watcher = new CapsuleTimeoutWatcher(store, {
      inactivityTimeout: 100,
    });

    // Create multiple old capsules
    const id1 = await openCapsule(store, {
      type: 'session',
      intent: 'Test 1',
      scopeIds: { sessionId: 'sess-1' },
    });

    const id2 = await openCapsule(store, {
      type: 'session',
      intent: 'Test 2',
      scopeIds: { sessionId: 'sess-2' },
    });

    // Make both old
    const db = (store as any).db;
    const oldTime = Date.now() - 200;
    db.prepare('UPDATE capsules SET opened_at = ?').run(oldTime);

    const timedOut = await watcher.checkTimeouts();

    expect(timedOut).toHaveLength(2);
    expect(timedOut).toContain(id1);
    expect(timedOut).toContain(id2);
  });
});
