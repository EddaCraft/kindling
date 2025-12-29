/**
 * Tests for capsule lifecycle
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import {
  CapsuleManager,
  openCapsule,
  closeCapsule,
  getCapsule,
  getOpenCapsule,
} from '../src/index.js';
import { unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Capsule lifecycle', () => {
  const testDbPath = join(tmpdir(), `kindling-test-capsule-${Date.now()}.db`);
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

  describe('openCapsule', () => {
    it('should create capsule with correct state', async () => {
      const id = await openCapsule(store, {
        type: 'session',
        intent: 'Fix bug in auth',
        scopeIds: { sessionId: 'sess-1' },
      });

      expect(id).toBeTruthy();

      const capsule = await getCapsule(store, id);
      expect(capsule).toBeTruthy();
      expect(capsule?.status).toBe('open');
      expect(capsule?.type).toBe('session');
      expect(capsule?.intent).toBe('Fix bug in auth');
      expect(capsule?.scopeIds.sessionId).toBe('sess-1');
      expect(capsule?.closedAt).toBeUndefined();
    });

    it('should prevent duplicate open capsules for same session', async () => {
      await openCapsule(store, {
        type: 'session',
        intent: 'First',
        scopeIds: { sessionId: 'sess-1' },
      });

      await expect(
        openCapsule(store, {
          type: 'session',
          intent: 'Second',
          scopeIds: { sessionId: 'sess-1' },
        })
      ).rejects.toThrow(/already has an open capsule/);
    });

    it('should allow multiple open capsules for different sessions', async () => {
      const id1 = await openCapsule(store, {
        type: 'session',
        intent: 'Session 1',
        scopeIds: { sessionId: 'sess-1' },
      });

      const id2 = await openCapsule(store, {
        type: 'session',
        intent: 'Session 2',
        scopeIds: { sessionId: 'sess-2' },
      });

      expect(id1).not.toBe(id2);

      const capsule1 = await getCapsule(store, id1);
      const capsule2 = await getCapsule(store, id2);

      expect(capsule1?.scopeIds.sessionId).toBe('sess-1');
      expect(capsule2?.scopeIds.sessionId).toBe('sess-2');
    });

    it('should allow multiple pocketflow_node capsules', async () => {
      const id1 = await openCapsule(store, {
        type: 'pocketflow_node',
        intent: 'Node 1',
        scopeIds: { sessionId: 'sess-1' },
      });

      const id2 = await openCapsule(store, {
        type: 'pocketflow_node',
        intent: 'Node 2',
        scopeIds: { sessionId: 'sess-1' },
      });

      expect(id1).not.toBe(id2);
    });
  });

  describe('closeCapsule', () => {
    it('should close capsule and update status', async () => {
      const id = await openCapsule(store, {
        type: 'session',
        intent: 'Test',
        scopeIds: {},
      });

      await closeCapsule(store, id);

      const capsule = await getCapsule(store, id);
      expect(capsule?.status).toBe('closed');
      expect(capsule?.closedAt).toBeTruthy();
    });

    it('should reject closing non-existent capsule', async () => {
      await expect(
        closeCapsule(store, 'non-existent')
      ).rejects.toThrow(/not found/);
    });

    it('should reject closing already-closed capsule', async () => {
      const id = await openCapsule(store, {
        type: 'session',
        intent: 'Test',
        scopeIds: {},
      });

      await closeCapsule(store, id);

      await expect(closeCapsule(store, id)).rejects.toThrow(/already closed/);
    });

    it('should create summary when provided', async () => {
      const id = await openCapsule(store, {
        type: 'session',
        intent: 'Test',
        scopeIds: {},
      });

      // Add some observations as evidence
      store.insertObservation({
        id: 'obs-1',
        kind: 'message',
        content: 'Test observation',
        provenance: {},
        ts: Date.now(),
      });

      await closeCapsule(store, id, {
        summary: {
          content: 'Fixed the bug successfully',
          confidence: 0.95,
          evidenceRefs: ['obs-1'],
        },
      });

      const capsule = await getCapsule(store, id);
      expect(capsule?.summaryId).toBeTruthy();

      const summary = store.getSummary(capsule!.summaryId!);
      expect(summary).toBeTruthy();
      expect(summary?.content).toBe('Fixed the bug successfully');
      expect(summary?.confidence).toBe(0.95);
    });
  });

  describe('getOpenCapsule', () => {
    it('should find open capsule for session', async () => {
      const id = await openCapsule(store, {
        type: 'session',
        intent: 'Test',
        scopeIds: { sessionId: 'sess-1' },
      });

      const capsule = await getOpenCapsule(store, { sessionId: 'sess-1' });
      expect(capsule).toBeTruthy();
      expect(capsule?.id).toBe(id);
    });

    it('should return null when no open capsule exists', async () => {
      const capsule = await getOpenCapsule(store, { sessionId: 'sess-1' });
      expect(capsule).toBeNull();
    });

    it('should return null when capsule is closed', async () => {
      const id = await openCapsule(store, {
        type: 'session',
        intent: 'Test',
        scopeIds: { sessionId: 'sess-1' },
      });

      await closeCapsule(store, id);

      const capsule = await getOpenCapsule(store, { sessionId: 'sess-1' });
      expect(capsule).toBeNull();
    });
  });

  describe('CapsuleManager', () => {
    it('should wrap lifecycle functions', async () => {
      const manager = new CapsuleManager(store);

      const id = await manager.open({
        type: 'session',
        intent: 'Test',
        scopeIds: { sessionId: 'sess-1' },
      });

      expect(id).toBeTruthy();

      const capsule = await manager.get(id);
      expect(capsule?.status).toBe('open');

      await manager.close(id);

      const closedCapsule = await manager.get(id);
      expect(closedCapsule?.status).toBe('closed');
    });

    it('should cache active capsules', async () => {
      const manager = new CapsuleManager(store);

      const id = await manager.open({
        type: 'session',
        intent: 'Test',
        scopeIds: {},
      });

      // First get should cache it
      const capsule1 = await manager.get(id);

      // Second get should use cache (same instance)
      const capsule2 = await manager.get(id);

      expect(capsule1).toBe(capsule2);
    });

    it('should remove from cache on close', async () => {
      const manager = new CapsuleManager(store);

      const id = await manager.open({
        type: 'session',
        intent: 'Test',
        scopeIds: {},
      });

      await manager.get(id); // Cache it

      await manager.close(id);

      // Getting closed capsule should load from store, not cache
      const capsule = await manager.get(id);
      expect(capsule?.status).toBe('closed');
    });

    it('should find open capsule using getOpen', async () => {
      const manager = new CapsuleManager(store);

      await manager.open({
        type: 'session',
        intent: 'Test',
        scopeIds: { sessionId: 'sess-1' },
      });

      const capsule = await manager.getOpen({ sessionId: 'sess-1' });
      expect(capsule).toBeTruthy();
      expect(capsule?.status).toBe('open');
    });
  });
});
