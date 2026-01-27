/**
 * sql.js store tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'sql.js';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { openDatabase, closeDatabase, resetSqlCache } from '../db/open.js';
import { SqljsKindlingStore } from '../store/sqljs.js';
import type { Observation, Capsule, Summary, Pin } from '@kindling/core';

// Create require for resolving sql.js path
const require = createRequire(import.meta.url);

/**
 * Locate WASM files for Node.js testing
 */
function locateFile(file: string): string {
  // Resolve the sql.js package and find the dist folder
  const sqlJsMain = require.resolve('sql.js');
  const sqlJsDir = dirname(sqlJsMain);
  return join(sqlJsDir, file);
}

describe('SqljsKindlingStore', () => {
  let db: Database;
  let store: SqljsKindlingStore;

  beforeEach(async () => {
    resetSqlCache();
    db = await openDatabase({ verbose: false, locateFile });
    store = new SqljsKindlingStore(db);
  });

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
  });

  describe('observations', () => {
    it('should insert and retrieve an observation', () => {
      const obs: Observation = {
        id: 'obs_1',
        kind: 'tool_call',
        content: 'Test observation content',
        provenance: { source: 'test' },
        ts: Date.now(),
        scopeIds: { sessionId: 'session_1' },
        redacted: false,
      };

      store.insertObservation(obs);

      const retrieved = store.getObservationById('obs_1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('obs_1');
      expect(retrieved?.kind).toBe('tool_call');
      expect(retrieved?.content).toBe('Test observation content');
      expect(retrieved?.scopeIds.sessionId).toBe('session_1');
    });

    it('should query observations by scope', () => {
      const obs1: Observation = {
        id: 'obs_1',
        kind: 'tool_call',
        content: 'First',
        provenance: {},
        ts: Date.now() - 1000,
        scopeIds: { sessionId: 'session_1' },
        redacted: false,
      };

      const obs2: Observation = {
        id: 'obs_2',
        kind: 'command',
        content: 'Second',
        provenance: {},
        ts: Date.now(),
        scopeIds: { sessionId: 'session_2' },
        redacted: false,
      };

      store.insertObservation(obs1);
      store.insertObservation(obs2);

      const results = store.queryObservations({ sessionId: 'session_1' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('obs_1');
    });

    it('should redact an observation', () => {
      const obs: Observation = {
        id: 'obs_1',
        kind: 'tool_call',
        content: 'Sensitive data',
        provenance: {},
        ts: Date.now(),
        scopeIds: {},
        redacted: false,
      };

      store.insertObservation(obs);
      store.redactObservation('obs_1');

      const retrieved = store.getObservationById('obs_1');
      expect(retrieved?.content).toBe('[redacted]');
      expect(retrieved?.redacted).toBe(true);
    });
  });

  describe('capsules', () => {
    it('should create and retrieve a capsule', () => {
      const capsule: Capsule = {
        id: 'cap_1',
        type: 'session',
        intent: 'Test session',
        status: 'open',
        openedAt: Date.now(),
        scopeIds: { sessionId: 'session_1' },
        observationIds: [],
      };

      store.createCapsule(capsule);

      const retrieved = store.getCapsule('cap_1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('cap_1');
      expect(retrieved?.type).toBe('session');
      expect(retrieved?.status).toBe('open');
    });

    it('should close a capsule', () => {
      const capsule: Capsule = {
        id: 'cap_1',
        type: 'session',
        intent: 'Test session',
        status: 'open',
        openedAt: Date.now(),
        scopeIds: { sessionId: 'session_1' },
        observationIds: [],
      };

      store.createCapsule(capsule);
      store.closeCapsule('cap_1');

      const retrieved = store.getCapsule('cap_1');
      expect(retrieved?.status).toBe('closed');
      expect(retrieved?.closedAt).toBeDefined();
    });

    it('should attach observations to capsule', () => {
      const capsule: Capsule = {
        id: 'cap_1',
        type: 'session',
        intent: 'Test session',
        status: 'open',
        openedAt: Date.now(),
        scopeIds: { sessionId: 'session_1' },
        observationIds: [],
      };

      const obs: Observation = {
        id: 'obs_1',
        kind: 'tool_call',
        content: 'Test',
        provenance: {},
        ts: Date.now(),
        scopeIds: { sessionId: 'session_1' },
        redacted: false,
      };

      store.createCapsule(capsule);
      store.insertObservation(obs);
      store.attachObservationToCapsule('cap_1', 'obs_1');

      const retrieved = store.getCapsule('cap_1');
      expect(retrieved?.observationIds).toContain('obs_1');
    });

    it('should get open capsule for session', () => {
      const capsule: Capsule = {
        id: 'cap_1',
        type: 'session',
        intent: 'Test session',
        status: 'open',
        openedAt: Date.now(),
        scopeIds: { sessionId: 'session_1' },
        observationIds: [],
      };

      store.createCapsule(capsule);

      const open = store.getOpenCapsuleForSession('session_1');
      expect(open).toBeDefined();
      expect(open?.id).toBe('cap_1');
    });
  });

  describe('summaries', () => {
    it('should insert and retrieve a summary', () => {
      const capsule: Capsule = {
        id: 'cap_1',
        type: 'session',
        intent: 'Test',
        status: 'closed',
        openedAt: Date.now() - 1000,
        closedAt: Date.now(),
        scopeIds: {},
        observationIds: [],
      };

      const summary: Summary = {
        id: 'sum_1',
        capsuleId: 'cap_1',
        content: 'Summary content',
        confidence: 0.9,
        createdAt: Date.now(),
        evidenceRefs: ['obs_1'],
      };

      store.createCapsule(capsule);
      store.insertSummary(summary);

      const retrieved = store.getSummaryById('sum_1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Summary content');
      expect(retrieved?.confidence).toBe(0.9);
    });

    it('should get latest summary for capsule', () => {
      const capsule: Capsule = {
        id: 'cap_1',
        type: 'session',
        intent: 'Test',
        status: 'closed',
        openedAt: Date.now() - 1000,
        closedAt: Date.now(),
        scopeIds: {},
        observationIds: [],
      };

      store.createCapsule(capsule);

      // summaries table has UNIQUE on capsule_id, so we can only have one summary per capsule
      const summary: Summary = {
        id: 'sum_1',
        capsuleId: 'cap_1',
        content: 'Summary',
        confidence: 0.8,
        createdAt: Date.now(),
        evidenceRefs: [],
      };

      store.insertSummary(summary);

      const latest = store.getLatestSummaryForCapsule('cap_1');
      expect(latest?.id).toBe('sum_1');
    });
  });

  describe('pins', () => {
    it('should insert and list active pins', () => {
      const pin: Pin = {
        id: 'pin_1',
        targetType: 'observation',
        targetId: 'obs_1',
        reason: 'Important',
        createdAt: Date.now(),
        scopeIds: { sessionId: 'session_1' },
      };

      store.insertPin(pin);

      const pins = store.listActivePins({ sessionId: 'session_1' });
      expect(pins).toHaveLength(1);
      expect(pins[0].id).toBe('pin_1');
      expect(pins[0].reason).toBe('Important');
    });

    it('should delete a pin', () => {
      const pin: Pin = {
        id: 'pin_1',
        targetType: 'observation',
        targetId: 'obs_1',
        createdAt: Date.now(),
        scopeIds: {},
      };

      store.insertPin(pin);
      store.deletePin('pin_1');

      const pins = store.listActivePins();
      expect(pins).toHaveLength(0);
    });

    it('should filter expired pins', () => {
      const activePin: Pin = {
        id: 'pin_active',
        targetType: 'observation',
        targetId: 'obs_1',
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000, // Expires in 10 seconds
        scopeIds: {},
      };

      const expiredPin: Pin = {
        id: 'pin_expired',
        targetType: 'observation',
        targetId: 'obs_2',
        createdAt: Date.now() - 10000,
        expiresAt: Date.now() - 1000, // Already expired
        scopeIds: {},
      };

      store.insertPin(activePin);
      store.insertPin(expiredPin);

      const pins = store.listActivePins();
      expect(pins).toHaveLength(1);
      expect(pins[0].id).toBe('pin_active');
    });
  });

  describe('transactions', () => {
    it('should execute operations in a transaction', () => {
      const result = store.transaction(() => {
        const obs: Observation = {
          id: 'obs_tx',
          kind: 'tool_call',
          content: 'Transaction test',
          provenance: {},
          ts: Date.now(),
          scopeIds: {},
          redacted: false,
        };
        store.insertObservation(obs);
        return 'success';
      });

      expect(result).toBe('success');

      const retrieved = store.getObservationById('obs_tx');
      expect(retrieved).toBeDefined();
    });

    it('should rollback on error', () => {
      expect(() => {
        store.transaction(() => {
          const obs: Observation = {
            id: 'obs_rollback',
            kind: 'tool_call',
            content: 'Will be rolled back',
            provenance: {},
            ts: Date.now(),
            scopeIds: {},
            redacted: false,
          };
          store.insertObservation(obs);
          throw new Error('Force rollback');
        });
      }).toThrow('Force rollback');

      const retrieved = store.getObservationById('obs_rollback');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('export/import', () => {
    it('should export and import data', () => {
      const obs: Observation = {
        id: 'obs_export',
        kind: 'tool_call',
        content: 'Export test',
        provenance: {},
        ts: Date.now(),
        scopeIds: { sessionId: 'export_session' },
        redacted: false,
      };

      store.insertObservation(obs);

      const dataset = store.exportDatabase();
      expect(dataset.observations).toHaveLength(1);
      expect(dataset.version).toBe('1.0');

      // Create a new store and import
      store.transaction(() => {
        db.run('DELETE FROM observations');
      });

      const result = store.importDatabase(dataset);
      expect(result.observations).toBe(1);
      expect(result.errors).toHaveLength(0);

      const retrieved = store.getObservationById('obs_export');
      expect(retrieved).toBeDefined();
    });
  });
});
