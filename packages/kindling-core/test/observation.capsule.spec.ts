/**
 * Tests for observation capsule attachment
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import {
  ObservationService,
  CapsuleManager,
  openCapsule,
} from '../src/index.js';
import { unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Observation capsule attachment', () => {
  const testDbPath = join(
    tmpdir(),
    `kindling-test-obs-capsule-${Date.now()}.db`
  );
  let store: SqliteKindlingStore;
  let service: ObservationService;

  beforeEach(() => {
    const db = openDatabase({ path: testDbPath });
    store = new SqliteKindlingStore(db);
    service = new ObservationService(store);
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

  it('should attach observation to specified capsule', async () => {
    // Create capsule
    const capsuleId = await openCapsule(store, {
      type: 'session',
      intent: 'Test',
      scopeIds: {},
    });

    // Append observation with explicit capsule ID
    const result = await service.append({
      kind: 'message',
      content: 'Test message',
      provenance: {},
      scopeIds: {},
      capsuleId,
    });

    expect(result.capsuleId).toBe(capsuleId);

    // Verify attachment
    const observations = await service.listByCapsule(capsuleId);
    expect(observations).toHaveLength(1);
    expect(observations[0].id).toBe(result.observationId);
  });

  it('should auto-attach to open capsule for scope', async () => {
    // Create open capsule for session
    const capsuleId = await openCapsule(store, {
      type: 'session',
      intent: 'Test',
      scopeIds: { sessionId: 'sess-1' },
    });

    // Append observation with same session scope (no explicit capsule ID)
    const result = await service.append({
      kind: 'message',
      content: 'Test message',
      provenance: {},
      scopeIds: { sessionId: 'sess-1' },
    });

    expect(result.capsuleId).toBe(capsuleId);

    // Verify attachment
    const observations = await service.listByCapsule(capsuleId);
    expect(observations).toHaveLength(1);
  });

  it('should store observation without capsule if none open', async () => {
    // No open capsule exists
    const result = await service.append({
      kind: 'message',
      content: 'Test message',
      provenance: {},
      scopeIds: { sessionId: 'sess-1' },
    });

    // Observation created but not attached
    expect(result.observationId).toBeTruthy();
    expect(result.capsuleId).toBeUndefined();

    // Verify observation exists
    const obs = await service.get(result.observationId);
    expect(obs).toBeTruthy();
  });

  it('should maintain attachment order deterministically', async () => {
    const capsuleId = await openCapsule(store, {
      type: 'session',
      intent: 'Test',
      scopeIds: { sessionId: 'sess-1' },
    });

    // Append multiple observations
    const obs1 = await service.append({
      kind: 'message',
      content: 'First',
      provenance: {},
      scopeIds: { sessionId: 'sess-1' },
    });

    const obs2 = await service.append({
      kind: 'message',
      content: 'Second',
      provenance: {},
      scopeIds: { sessionId: 'sess-1' },
    });

    const obs3 = await service.append({
      kind: 'message',
      content: 'Third',
      provenance: {},
      scopeIds: { sessionId: 'sess-1' },
    });

    // Verify order is preserved
    const observations = await service.listByCapsule(capsuleId);
    expect(observations.map((o) => o.id)).toEqual([
      obs1.observationId,
      obs2.observationId,
      obs3.observationId,
    ]);
  });

  it('should handle observations for different scopes', async () => {
    // Create capsule for session 1
    const cap1 = await openCapsule(store, {
      type: 'session',
      intent: 'Session 1',
      scopeIds: { sessionId: 'sess-1' },
    });

    // Create capsule for session 2
    const cap2 = await openCapsule(store, {
      type: 'session',
      intent: 'Session 2',
      scopeIds: { sessionId: 'sess-2' },
    });

    // Append to session 1
    await service.append({
      kind: 'message',
      content: 'For session 1',
      provenance: {},
      scopeIds: { sessionId: 'sess-1' },
    });

    // Append to session 2
    await service.append({
      kind: 'message',
      content: 'For session 2',
      provenance: {},
      scopeIds: { sessionId: 'sess-2' },
    });

    // Verify separate attachments
    const obs1 = await service.listByCapsule(cap1);
    const obs2 = await service.listByCapsule(cap2);

    expect(obs1).toHaveLength(1);
    expect(obs2).toHaveLength(1);
    expect(obs1[0].content).toBe('For session 1');
    expect(obs2[0].content).toBe('For session 2');
  });

  it('should not attach to closed capsule', async () => {
    const manager = new CapsuleManager(store);

    // Create and close capsule
    const capsuleId = await manager.open({
      type: 'session',
      intent: 'Test',
      scopeIds: { sessionId: 'sess-1' },
    });

    await manager.close(capsuleId);

    // Append observation - should not attach to closed capsule
    const result = await service.append({
      kind: 'message',
      content: 'After close',
      provenance: {},
      scopeIds: { sessionId: 'sess-1' },
    });

    expect(result.capsuleId).toBeUndefined();
  });
});
