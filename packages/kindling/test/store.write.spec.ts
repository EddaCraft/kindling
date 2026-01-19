/**
 * Tests for store write path
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, closeDatabase, SqliteKindlingStore, validateObservation, validateCapsule, validateSummary, validatePin } from '../src/index.js';
import type Database from 'better-sqlite3';
import { unlinkSync } from 'fs';

describe('SqliteKindlingStore - Write Path', () => {
  let db: Database.Database;
  let store: SqliteKindlingStore;
  const testDbPath = '/tmp/kindling-test-write.db';

  beforeEach(() => {
    // Remove test database if it exists
    try {
      unlinkSync(testDbPath);
      unlinkSync(`${testDbPath}-shm`);
      unlinkSync(`${testDbPath}-wal`);
    } catch {
      // Ignore if doesn't exist
    }

    db = openDatabase({ path: testDbPath });
    store = new SqliteKindlingStore(db);
  });

  afterEach(() => {
    closeDatabase(db);
    // Cleanup
    try {
      unlinkSync(testDbPath);
      unlinkSync(`${testDbPath}-shm`);
      unlinkSync(`${testDbPath}-wal`);
    } catch {
      // Ignore errors
    }
  });

  describe('insertObservation', () => {
    it('should insert a valid observation', () => {
      const obsResult = validateObservation({
        kind: 'tool_call',
        content: 'grep pattern file.txt',
        provenance: { toolName: 'grep' },
        scopeIds: { sessionId: 's1', repoId: '/repo' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      // Verify insertion
      const row = db.prepare('SELECT * FROM observations WHERE id = ?').get(obsResult.value.id) as any;
      expect(row).toBeDefined();
      expect(row.kind).toBe('tool_call');
      expect(row.content).toBe('grep pattern file.txt');
      expect(JSON.parse(row.provenance)).toEqual({ toolName: 'grep' });
      expect(row.redacted).toBe(0);
    });

    it('should sync observation to FTS table', () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'authentication bug fixed',
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      // Check FTS table
      const ftsResult = db.prepare(`
        SELECT COUNT(*) as count FROM observations_fts WHERE content MATCH 'authentication'
      `).get() as { count: number };

      expect(ftsResult.count).toBe(1);
    });

    it('should not sync redacted observations to FTS', () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'secret password',
        scopeIds: { sessionId: 's1' },
        redacted: true,
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      // Check FTS table (should not contain redacted observation)
      const ftsResult = db.prepare(`
        SELECT COUNT(*) as count FROM observations_fts WHERE content MATCH 'secret'
      `).get() as { count: number };

      expect(ftsResult.count).toBe(0);
    });
  });

  describe('createCapsule', () => {
    it('should create a valid capsule', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Fix authentication bug',
        scopeIds: { sessionId: 's1', repoId: '/repo' },
      });

      expect(capsuleResult.ok).toBe(true);
      if (!capsuleResult.ok) return;

      store.createCapsule(capsuleResult.value);

      // Verify insertion
      const row = db.prepare('SELECT * FROM capsules WHERE id = ?').get(capsuleResult.value.id) as any;
      expect(row).toBeDefined();
      expect(row.type).toBe('session');
      expect(row.intent).toBe('Fix authentication bug');
      expect(row.status).toBe('open');
      expect(row.closed_at).toBeNull();
    });
  });

  describe('closeCapsule', () => {
    it('should close an open capsule', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test session',
        scopeIds: { sessionId: 's1' },
      });

      expect(capsuleResult.ok).toBe(true);
      if (!capsuleResult.ok) return;

      store.createCapsule(capsuleResult.value);

      const closedAt = Date.now();
      store.closeCapsule(capsuleResult.value.id, closedAt);

      // Verify closure
      const row = db.prepare('SELECT * FROM capsules WHERE id = ?').get(capsuleResult.value.id) as any;
      expect(row.status).toBe('closed');
      expect(row.closed_at).toBe(closedAt);
    });

    it('should throw error when closing non-existent capsule', () => {
      expect(() => {
        store.closeCapsule('non-existent-id');
      }).toThrow('not found or already closed');
    });

    it('should throw error when closing already closed capsule', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test session',
        scopeIds: { sessionId: 's1' },
      });

      expect(capsuleResult.ok).toBe(true);
      if (!capsuleResult.ok) return;

      store.createCapsule(capsuleResult.value);
      store.closeCapsule(capsuleResult.value.id);

      // Try to close again
      expect(() => {
        store.closeCapsule(capsuleResult.value.id);
      }).toThrow('not found or already closed');
    });
  });

  describe('attachObservationToCapsule', () => {
    it('should attach observation to capsule with correct ordering', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test session',
        scopeIds: { sessionId: 's1' },
      });

      const obs1Result = validateObservation({
        kind: 'message',
        content: 'first',
        scopeIds: { sessionId: 's1' },
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'second',
        scopeIds: { sessionId: 's1' },
      });

      expect(capsuleResult.ok && obs1Result.ok && obs2Result.ok).toBe(true);
      if (!capsuleResult.ok || !obs1Result.ok || !obs2Result.ok) return;

      store.createCapsule(capsuleResult.value);
      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      store.attachObservationToCapsule(capsuleResult.value.id, obs1Result.value.id);
      store.attachObservationToCapsule(capsuleResult.value.id, obs2Result.value.id);

      // Verify ordering
      const rows = db.prepare(`
        SELECT observation_id, seq FROM capsule_observations
        WHERE capsule_id = ?
        ORDER BY seq
      `).all(capsuleResult.value.id) as Array<{ observation_id: string; seq: number }>;

      expect(rows).toHaveLength(2);
      expect(rows[0].observation_id).toBe(obs1Result.value.id);
      expect(rows[0].seq).toBe(0);
      expect(rows[1].observation_id).toBe(obs2Result.value.id);
      expect(rows[1].seq).toBe(1);
    });
  });

  describe('insertSummary', () => {
    it('should insert a valid summary', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test session',
        scopeIds: { sessionId: 's1' },
      });

      const summaryResult = validateSummary({
        capsuleId: capsuleResult.ok ? capsuleResult.value.id : 'cap1',
        content: 'Fixed authentication bug by updating auth check',
        confidence: 0.9,
        evidenceRefs: ['obs1', 'obs2'],
      });

      expect(capsuleResult.ok && summaryResult.ok).toBe(true);
      if (!capsuleResult.ok || !summaryResult.ok) return;

      store.createCapsule(capsuleResult.value);
      store.insertSummary(summaryResult.value);

      // Verify insertion
      const row = db.prepare('SELECT * FROM summaries WHERE id = ?').get(summaryResult.value.id) as any;
      expect(row).toBeDefined();
      expect(row.capsule_id).toBe(capsuleResult.value.id);
      expect(row.content).toBe('Fixed authentication bug by updating auth check');
      expect(row.confidence).toBe(0.9);
      expect(JSON.parse(row.evidence_refs)).toEqual(['obs1', 'obs2']);
    });

    it('should sync summary to FTS table', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test session',
        scopeIds: { sessionId: 's1' },
      });

      const summaryResult = validateSummary({
        capsuleId: capsuleResult.ok ? capsuleResult.value.id : 'cap1',
        content: 'Refactored authentication module for better security',
        confidence: 0.85,
        evidenceRefs: [],
      });

      expect(capsuleResult.ok && summaryResult.ok).toBe(true);
      if (!capsuleResult.ok || !summaryResult.ok) return;

      store.createCapsule(capsuleResult.value);
      store.insertSummary(summaryResult.value);

      // Check FTS table
      const ftsResult = db.prepare(`
        SELECT COUNT(*) as count FROM summaries_fts WHERE content MATCH 'authentication'
      `).get() as { count: number };

      expect(ftsResult.count).toBe(1);
    });
  });

  describe('Pin operations', () => {
    it('should insert a pin', () => {
      const pinResult = validatePin({
        targetType: 'observation',
        targetId: 'obs1',
        reason: 'Important context',
        scopeIds: { sessionId: 's1' },
      });

      expect(pinResult.ok).toBe(true);
      if (!pinResult.ok) return;

      store.insertPin(pinResult.value);

      // Verify insertion
      const row = db.prepare('SELECT * FROM pins WHERE id = ?').get(pinResult.value.id) as any;
      expect(row).toBeDefined();
      expect(row.target_type).toBe('observation');
      expect(row.target_id).toBe('obs1');
      expect(row.reason).toBe('Important context');
    });

    it('should delete a pin', () => {
      const pinResult = validatePin({
        targetType: 'observation',
        targetId: 'obs1',
        scopeIds: { sessionId: 's1' },
      });

      expect(pinResult.ok).toBe(true);
      if (!pinResult.ok) return;

      store.insertPin(pinResult.value);
      store.deletePin(pinResult.value.id);

      // Verify deletion
      const row = db.prepare('SELECT * FROM pins WHERE id = ?').get(pinResult.value.id);
      expect(row).toBeUndefined();
    });

    it('should throw error when deleting non-existent pin', () => {
      expect(() => {
        store.deletePin('non-existent-id');
      }).toThrow('not found');
    });

    it('should list active pins (excluding expired)', () => {
      const now = Date.now();

      const activePin = validatePin({
        targetType: 'observation',
        targetId: 'obs1',
        scopeIds: { sessionId: 's1' },
        expiresAt: now + 10000, // Expires in future
      });

      const expiredPin = validatePin({
        targetType: 'observation',
        targetId: 'obs2',
        scopeIds: { sessionId: 's1' },
        expiresAt: now - 10000, // Already expired
      });

      const neverExpiresPin = validatePin({
        targetType: 'observation',
        targetId: 'obs3',
        scopeIds: { sessionId: 's1' },
        // No expiresAt
      });

      expect(activePin.ok && expiredPin.ok && neverExpiresPin.ok).toBe(true);
      if (!activePin.ok || !expiredPin.ok || !neverExpiresPin.ok) return;

      store.insertPin(activePin.value);
      store.insertPin(expiredPin.value);
      store.insertPin(neverExpiresPin.value);

      const activePins = store.listActivePins({ sessionId: 's1' }, now);

      expect(activePins).toHaveLength(2);
      expect(activePins.map(p => p.targetId).sort()).toEqual(['obs1', 'obs3']);
    });

    it('should filter pins by scope', () => {
      const pin1 = validatePin({
        targetType: 'observation',
        targetId: 'obs1',
        scopeIds: { sessionId: 's1', repoId: '/repo1' },
      });

      const pin2 = validatePin({
        targetType: 'observation',
        targetId: 'obs2',
        scopeIds: { sessionId: 's2', repoId: '/repo2' },
      });

      expect(pin1.ok && pin2.ok).toBe(true);
      if (!pin1.ok || !pin2.ok) return;

      store.insertPin(pin1.value);
      store.insertPin(pin2.value);

      const s1Pins = store.listActivePins({ sessionId: 's1' });
      expect(s1Pins).toHaveLength(1);
      expect(s1Pins[0].targetId).toBe('obs1');

      const repo2Pins = store.listActivePins({ repoId: '/repo2' });
      expect(repo2Pins).toHaveLength(1);
      expect(repo2Pins[0].targetId).toBe('obs2');
    });
  });

  describe('transaction', () => {
    it('should commit transaction on success', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test transaction',
        scopeIds: { sessionId: 's1' },
      });

      const obsResult = validateObservation({
        kind: 'message',
        content: 'test',
        scopeIds: { sessionId: 's1' },
      });

      expect(capsuleResult.ok && obsResult.ok).toBe(true);
      if (!capsuleResult.ok || !obsResult.ok) return;

      store.transaction(() => {
        store.createCapsule(capsuleResult.value);
        store.insertObservation(obsResult.value);
        store.attachObservationToCapsule(capsuleResult.value.id, obsResult.value.id);
      });

      // Verify all operations succeeded
      const capsule = db.prepare('SELECT * FROM capsules WHERE id = ?').get(capsuleResult.value.id);
      const observation = db.prepare('SELECT * FROM observations WHERE id = ?').get(obsResult.value.id);
      const link = db.prepare('SELECT * FROM capsule_observations WHERE capsule_id = ?').get(capsuleResult.value.id);

      expect(capsule).toBeDefined();
      expect(observation).toBeDefined();
      expect(link).toBeDefined();
    });

    it('should rollback transaction on error', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test rollback',
        scopeIds: { sessionId: 's1' },
      });

      expect(capsuleResult.ok).toBe(true);
      if (!capsuleResult.ok) return;

      try {
        store.transaction(() => {
          store.createCapsule(capsuleResult.value);
          // Intentionally cause an error
          throw new Error('Rollback test');
        });
      } catch (err: any) {
        expect(err.message).toBe('Rollback test');
      }

      // Verify capsule was not inserted (transaction rolled back)
      const capsule = db.prepare('SELECT * FROM capsules WHERE id = ?').get(capsuleResult.value.id);
      expect(capsule).toBeUndefined();
    });
  });

  describe('redactObservation', () => {
    it('should redact observation content and remove from FTS', () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'sensitive information',
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      // Verify FTS contains the observation
      let ftsResult = db.prepare(`
        SELECT COUNT(*) as count FROM observations_fts WHERE content MATCH 'sensitive'
      `).get() as { count: number };
      expect(ftsResult.count).toBe(1);

      // Redact
      store.redactObservation(obsResult.value.id);

      // Verify content is redacted
      const row = db.prepare('SELECT * FROM observations WHERE id = ?').get(obsResult.value.id) as any;
      expect(row.content).toBe('[redacted]');
      expect(row.redacted).toBe(1);

      // Verify removed from FTS
      ftsResult = db.prepare(`
        SELECT COUNT(*) as count FROM observations_fts WHERE content MATCH 'sensitive'
      `).get() as { count: number };
      expect(ftsResult.count).toBe(0);
    });
  });
});
