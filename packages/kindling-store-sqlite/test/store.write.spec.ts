/**
 * Tests for SqliteKindlingStore write operations
 */

import { describe, it, expect, afterEach } from 'vitest';
import { openDatabase, SqliteKindlingStore } from '../src/index.js';
import { unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('SqliteKindlingStore write operations', () => {
  const testDbPath = join(tmpdir(), `kindling-test-write-${Date.now()}.db`);
  let store: SqliteKindlingStore;

  afterEach(() => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (existsSync(walPath)) {
      unlinkSync(walPath);
    }
    if (existsSync(shmPath)) {
      unlinkSync(shmPath);
    }
  });

  describe('insertObservation', () => {
    it('should insert observation with all fields', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      const now = Date.now();
      store.insertObservation({
        id: 'obs-1',
        kind: 'tool_call',
        content: 'Called grep',
        provenance: { toolName: 'grep', args: ['test'] },
        ts: now,
        sessionId: 'sess-1',
        repoId: 'repo-1',
        redacted: false,
      });

      const obs = store.getObservation('obs-1');
      expect(obs).toBeTruthy();
      expect(obs?.id).toBe('obs-1');
      expect(obs?.kind).toBe('tool_call');
      expect(obs?.content).toBe('Called grep');
      expect(JSON.parse(obs!.provenance)).toEqual({
        toolName: 'grep',
        args: ['test'],
      });
      expect(obs?.ts).toBe(now);
      expect(obs?.session_id).toBe('sess-1');
      expect(obs?.repo_id).toBe('repo-1');
      expect(obs?.redacted).toBe(0);

      db.close();
    });

    it('should insert observation with minimal fields', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      store.insertObservation({
        id: 'obs-2',
        kind: 'message',
        content: 'Test message',
        provenance: {},
        ts: Date.now(),
      });

      const obs = store.getObservation('obs-2');
      expect(obs).toBeTruthy();
      expect(obs?.session_id).toBeNull();
      expect(obs?.repo_id).toBeNull();

      db.close();
    });
  });

  describe('createCapsule and closeCapsule', () => {
    it('should create capsule with open status', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      const now = Date.now();
      store.createCapsule({
        id: 'cap-1',
        type: 'session',
        intent: 'Fix bug',
        openedAt: now,
        sessionId: 'sess-1',
      });

      const cap = store.getCapsule('cap-1');
      expect(cap).toBeTruthy();
      expect(cap?.status).toBe('open');
      expect(cap?.opened_at).toBe(now);
      expect(cap?.closed_at).toBeNull();
      expect(cap?.summary_id).toBeNull();

      db.close();
    });

    it('should close capsule', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      const openedAt = Date.now();
      store.createCapsule({
        id: 'cap-2',
        type: 'session',
        intent: 'Test',
        openedAt,
      });

      const closedAt = openedAt + 1000;
      store.closeCapsule({
        id: 'cap-2',
        closedAt,
      });

      const cap = store.getCapsule('cap-2');
      expect(cap?.status).toBe('closed');
      expect(cap?.closed_at).toBe(closedAt);

      db.close();
    });

    it('should close capsule with summary', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      store.createCapsule({
        id: 'cap-3',
        type: 'session',
        intent: 'Test',
        openedAt: Date.now(),
      });

      store.closeCapsule({
        id: 'cap-3',
        closedAt: Date.now(),
        summaryId: 'sum-1',
      });

      const cap = store.getCapsule('cap-3');
      expect(cap?.summary_id).toBe('sum-1');

      db.close();
    });
  });

  describe('attachObservationToCapsule', () => {
    it('should attach observations in deterministic order', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      // Create capsule and observations
      store.createCapsule({
        id: 'cap-4',
        type: 'session',
        intent: 'Test',
        openedAt: Date.now(),
      });

      for (let i = 1; i <= 3; i++) {
        store.insertObservation({
          id: `obs-${i}`,
          kind: 'message',
          content: `Message ${i}`,
          provenance: {},
          ts: Date.now(),
        });
      }

      // Attach observations
      store.attachObservationToCapsule({
        capsuleId: 'cap-4',
        observationId: 'obs-1',
      });
      store.attachObservationToCapsule({
        capsuleId: 'cap-4',
        observationId: 'obs-2',
      });
      store.attachObservationToCapsule({
        capsuleId: 'cap-4',
        observationId: 'obs-3',
      });

      // Verify order
      const obsIds = store.getCapsuleObservations('cap-4');
      expect(obsIds).toEqual(['obs-1', 'obs-2', 'obs-3']);

      db.close();
    });

    it('should maintain order when attaching to multiple capsules', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      // Create two capsules
      store.createCapsule({
        id: 'cap-5',
        type: 'session',
        intent: 'Test',
        openedAt: Date.now(),
      });
      store.createCapsule({
        id: 'cap-6',
        type: 'session',
        intent: 'Test',
        openedAt: Date.now(),
      });

      // Create observations
      for (let i = 1; i <= 4; i++) {
        store.insertObservation({
          id: `obs-${i}`,
          kind: 'message',
          content: `Message ${i}`,
          provenance: {},
          ts: Date.now(),
        });
      }

      // Attach to first capsule
      store.attachObservationToCapsule({
        capsuleId: 'cap-5',
        observationId: 'obs-1',
      });
      store.attachObservationToCapsule({
        capsuleId: 'cap-5',
        observationId: 'obs-2',
      });

      // Attach to second capsule
      store.attachObservationToCapsule({
        capsuleId: 'cap-6',
        observationId: 'obs-3',
      });
      store.attachObservationToCapsule({
        capsuleId: 'cap-6',
        observationId: 'obs-4',
      });

      // Verify each capsule has correct order
      expect(store.getCapsuleObservations('cap-5')).toEqual(['obs-1', 'obs-2']);
      expect(store.getCapsuleObservations('cap-6')).toEqual(['obs-3', 'obs-4']);

      db.close();
    });
  });

  describe('insertSummary', () => {
    it('should insert summary with evidence refs', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      // Create capsule and observations for evidence
      store.createCapsule({
        id: 'cap-7',
        type: 'session',
        intent: 'Test',
        openedAt: Date.now(),
      });

      store.insertObservation({
        id: 'obs-1',
        kind: 'message',
        content: 'Evidence 1',
        provenance: {},
        ts: Date.now(),
      });
      store.insertObservation({
        id: 'obs-2',
        kind: 'message',
        content: 'Evidence 2',
        provenance: {},
        ts: Date.now(),
      });

      // Insert summary
      const now = Date.now();
      store.insertSummary({
        id: 'sum-1',
        capsuleId: 'cap-7',
        content: 'Summary of session',
        confidence: 0.95,
        createdAt: now,
        evidenceRefs: ['obs-1', 'obs-2'],
      });

      const summary = store.getSummary('sum-1');
      expect(summary).toBeTruthy();
      expect(summary?.content).toBe('Summary of session');
      expect(summary?.confidence).toBe(0.95);

      const evidence = store.getSummaryEvidence('sum-1');
      expect(evidence).toEqual(['obs-1', 'obs-2']);

      db.close();
    });

    it('should insert summary with no evidence', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      store.createCapsule({
        id: 'cap-8',
        type: 'session',
        intent: 'Test',
        openedAt: Date.now(),
      });

      store.insertSummary({
        id: 'sum-2',
        capsuleId: 'cap-8',
        content: 'Summary',
        confidence: 0.8,
        createdAt: Date.now(),
        evidenceRefs: [],
      });

      const evidence = store.getSummaryEvidence('sum-2');
      expect(evidence).toEqual([]);

      db.close();
    });
  });

  describe('pin operations', () => {
    it('should insert and retrieve pin', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      store.insertObservation({
        id: 'obs-1',
        kind: 'message',
        content: 'Important',
        provenance: {},
        ts: Date.now(),
      });

      const now = Date.now();
      store.insertPin({
        id: 'pin-1',
        targetType: 'observation',
        targetId: 'obs-1',
        reason: 'Critical context',
        createdAt: now,
        sessionId: 'sess-1',
      });

      const pins = store.listPins({ sessionId: 'sess-1' });
      expect(pins.length).toBe(1);
      expect(pins[0].id).toBe('pin-1');
      expect(pins[0].target_type).toBe('observation');
      expect(pins[0].target_id).toBe('obs-1');
      expect(pins[0].reason).toBe('Critical context');

      db.close();
    });

    it('should delete pin', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      store.insertObservation({
        id: 'obs-1',
        kind: 'message',
        content: 'Test',
        provenance: {},
        ts: Date.now(),
      });

      store.insertPin({
        id: 'pin-2',
        targetType: 'observation',
        targetId: 'obs-1',
        createdAt: Date.now(),
      });

      let pins = store.listPins();
      expect(pins.length).toBe(1);

      store.deletePin('pin-2');

      pins = store.listPins();
      expect(pins.length).toBe(0);

      db.close();
    });

    it('should filter pins by TTL', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      store.insertObservation({
        id: 'obs-1',
        kind: 'message',
        content: 'Test',
        provenance: {},
        ts: Date.now(),
      });

      const now = Date.now();

      // Pin that expires in the past
      store.insertPin({
        id: 'pin-expired',
        targetType: 'observation',
        targetId: 'obs-1',
        createdAt: now - 2000,
        expiresAt: now - 1000,
      });

      // Pin that expires in the future
      store.insertPin({
        id: 'pin-valid',
        targetType: 'observation',
        targetId: 'obs-1',
        createdAt: now,
        expiresAt: now + 10000,
      });

      // Pin with no expiration
      store.insertPin({
        id: 'pin-permanent',
        targetType: 'observation',
        targetId: 'obs-1',
        createdAt: now,
      });

      // List pins with TTL filtering
      const pins = store.listPins({ now });
      expect(pins.length).toBe(2);
      expect(pins.map((p) => p.id).sort()).toEqual([
        'pin-permanent',
        'pin-valid',
      ]);

      db.close();
    });
  });

  describe('foreign key constraints', () => {
    it('should enforce capsule FK on attachObservationToCapsule', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      store.insertObservation({
        id: 'obs-1',
        kind: 'message',
        content: 'Test',
        provenance: {},
        ts: Date.now(),
      });

      expect(() => {
        store.attachObservationToCapsule({
          capsuleId: 'non-existent',
          observationId: 'obs-1',
        });
      }).toThrow();

      db.close();
    });

    it('should enforce observation FK on attachObservationToCapsule', () => {
      const db = openDatabase({ path: testDbPath });
      store = new SqliteKindlingStore(db);

      store.createCapsule({
        id: 'cap-1',
        type: 'session',
        intent: 'Test',
        openedAt: Date.now(),
      });

      expect(() => {
        store.attachObservationToCapsule({
          capsuleId: 'cap-1',
          observationId: 'non-existent',
        });
      }).toThrow();

      db.close();
    });
  });
});
