/**
 * Tests for store-level export/import primitives
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { unlinkSync } from 'fs';
import type { Observation, Capsule, Summary, Pin } from '../src/types/index.js';
import { openDatabase, closeDatabase } from '../src/store/db/open.js';
import { SqliteKindlingStore } from '../src/store/store/sqlite.js';
import { exportDatabase, importDatabase, type ExportDataset } from '../src/store/store/export.js';

describe('Export/Import', () => {
  let dbPath: string;
  let db: Database.Database;
  let store: SqliteKindlingStore;

  beforeEach(() => {
    dbPath = `/tmp/kindling-test-export-${Date.now()}.db`;
    db = openDatabase({ path: dbPath });
    store = new SqliteKindlingStore(db);
  });

  afterEach(() => {
    db.close();
    try {
      unlinkSync(dbPath);
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('exportDatabase', () => {
    it('should export empty database', () => {
      const dataset = exportDatabase(db);

      expect(dataset.version).toBe('1.0');
      expect(dataset.exportedAt).toBeGreaterThan(0);
      expect(dataset.observations).toEqual([]);
      expect(dataset.capsules).toEqual([]);
      expect(dataset.summaries).toEqual([]);
      expect(dataset.pins).toEqual([]);
    });

    it('should export observations in timestamp order', () => {
      // Insert observations out of order
      const obs1: Observation = {
        id: 'obs-3',
        kind: 'message',
        content: 'Third',
        provenance: {},
        ts: 3000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      const obs2: Observation = {
        id: 'obs-1',
        kind: 'message',
        content: 'First',
        provenance: {},
        ts: 1000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      const obs3: Observation = {
        id: 'obs-2',
        kind: 'message',
        content: 'Second',
        provenance: {},
        ts: 2000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      store.insertObservation(obs1);
      store.insertObservation(obs2);
      store.insertObservation(obs3);

      const dataset = exportDatabase(db);

      expect(dataset.observations).toHaveLength(3);
      expect(dataset.observations[0].id).toBe('obs-1');
      expect(dataset.observations[1].id).toBe('obs-2');
      expect(dataset.observations[2].id).toBe('obs-3');
    });

    it('should exclude redacted observations by default', () => {
      const obs1: Observation = {
        id: 'obs-1',
        kind: 'message',
        content: 'Normal',
        provenance: {},
        ts: 1000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      const obs2: Observation = {
        id: 'obs-2',
        kind: 'message',
        content: 'Redacted',
        provenance: {},
        ts: 2000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      store.insertObservation(obs1);
      store.insertObservation(obs2);

      // Redact second observation
      store.redactObservation('obs-2');

      const dataset = exportDatabase(db);

      expect(dataset.observations).toHaveLength(1);
      expect(dataset.observations[0].id).toBe('obs-1');
    });

    it('should include redacted observations when requested', () => {
      const obs: Observation = {
        id: 'obs-1',
        kind: 'message',
        content: 'Redacted',
        provenance: {},
        ts: 1000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      store.insertObservation(obs);
      store.redactObservation('obs-1');

      const dataset = exportDatabase(db, { includeRedacted: true });

      expect(dataset.observations).toHaveLength(1);
      expect(dataset.observations[0].redacted).toBe(true);
      expect(dataset.observations[0].content).toBe('[redacted]');
    });

    it('should export capsules with observation IDs', () => {
      const capsule: Capsule = {
        id: 'cap-1',
        type: 'session',
        intent: 'Test',
        status: 'open',
        openedAt: Date.now(),
        scopeIds: { sessionId: 's1' },
        observationIds: [],
      };

      store.createCapsule(capsule);

      const obs1: Observation = {
        id: 'obs-1',
        kind: 'message',
        content: 'First',
        provenance: {},
        ts: 1000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      const obs2: Observation = {
        id: 'obs-2',
        kind: 'message',
        content: 'Second',
        provenance: {},
        ts: 2000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      store.insertObservation(obs1);
      store.insertObservation(obs2);
      store.attachObservationToCapsule('cap-1', 'obs-1');
      store.attachObservationToCapsule('cap-1', 'obs-2');

      const dataset = exportDatabase(db);

      expect(dataset.capsules).toHaveLength(1);
      expect(dataset.capsules[0].observationIds).toEqual(['obs-1', 'obs-2']);
    });

    it('should filter by scope', () => {
      const obs1: Observation = {
        id: 'obs-1',
        kind: 'message',
        content: 'Session 1',
        provenance: {},
        ts: 1000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      const obs2: Observation = {
        id: 'obs-2',
        kind: 'message',
        content: 'Session 2',
        provenance: {},
        ts: 2000,
        scopeIds: { sessionId: 's2' },
        redacted: false,
      };

      store.insertObservation(obs1);
      store.insertObservation(obs2);

      const dataset = exportDatabase(db, {
        scope: { sessionId: 's1' },
      });

      expect(dataset.observations).toHaveLength(1);
      expect(dataset.observations[0].id).toBe('obs-1');
      expect(dataset.scope).toEqual({ sessionId: 's1' });
    });

    it('should limit exported observations', () => {
      for (let i = 0; i < 10; i++) {
        const obs: Observation = {
          id: `obs-${i}`,
          kind: 'message',
          content: `Message ${i}`,
          provenance: {},
          ts: 1000 + i,
          scopeIds: { sessionId: 's1' },
          redacted: false,
        };
        store.insertObservation(obs);
      }

      const dataset = exportDatabase(db, { limit: 5 });

      expect(dataset.observations).toHaveLength(5);
      expect(dataset.observations[0].id).toBe('obs-0');
      expect(dataset.observations[4].id).toBe('obs-4');
    });

    it('should export summaries and pins', () => {
      const capsule: Capsule = {
        id: 'cap-1',
        type: 'session',
        intent: 'Test',
        status: 'open',
        openedAt: Date.now(),
        scopeIds: { sessionId: 's1' },
        observationIds: [],
      };

      store.createCapsule(capsule);

      const summary: Summary = {
        id: 'sum-1',
        capsuleId: 'cap-1',
        content: 'Test summary',
        confidence: 0.9,
        createdAt: Date.now(),
        evidenceRefs: [],
      };

      store.insertSummary(summary);

      const pin: Pin = {
        id: 'pin-1',
        targetType: 'summary',
        targetId: 'sum-1',
        createdAt: Date.now(),
        scopeIds: { sessionId: 's1' },
      };

      store.insertPin(pin);

      const dataset = exportDatabase(db);

      expect(dataset.summaries).toHaveLength(1);
      expect(dataset.summaries[0].id).toBe('sum-1');
      expect(dataset.pins).toHaveLength(1);
      expect(dataset.pins[0].id).toBe('pin-1');
    });
  });

  describe('importDatabase', () => {
    it('should import empty dataset', () => {
      const dataset: ExportDataset = {
        version: '1.0',
        exportedAt: Date.now(),
        observations: [],
        capsules: [],
        summaries: [],
        pins: [],
      };

      const result = importDatabase(db, dataset);

      expect(result.observations).toBe(0);
      expect(result.capsules).toBe(0);
      expect(result.summaries).toBe(0);
      expect(result.pins).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should import observations', () => {
      const dataset: ExportDataset = {
        version: '1.0',
        exportedAt: Date.now(),
        observations: [
          {
            id: 'obs-1',
            kind: 'message',
            content: 'Test',
            provenance: {},
            ts: 1000,
            scopeIds: { sessionId: 's1' },
            redacted: false,
          },
        ],
        capsules: [],
        summaries: [],
        pins: [],
      };

      const result = importDatabase(db, dataset);

      expect(result.observations).toBe(1);
      expect(result.errors).toHaveLength(0);

      const obs = store.getObservationById('obs-1');
      expect(obs).toBeDefined();
      expect(obs!.content).toBe('Test');
    });

    it('should skip duplicate observations', () => {
      const obs: Observation = {
        id: 'obs-1',
        kind: 'message',
        content: 'Original',
        provenance: {},
        ts: 1000,
        scopeIds: { sessionId: 's1' },
        redacted: false,
      };

      store.insertObservation(obs);

      const dataset: ExportDataset = {
        version: '1.0',
        exportedAt: Date.now(),
        observations: [
          {
            id: 'obs-1',
            kind: 'message',
            content: 'Duplicate',
            provenance: {},
            ts: 2000,
            scopeIds: { sessionId: 's1' },
            redacted: false,
          },
        ],
        capsules: [],
        summaries: [],
        pins: [],
      };

      const result = importDatabase(db, dataset);

      expect(result.observations).toBe(0); // No new observations inserted
      expect(result.errors).toHaveLength(0);

      // Original should remain
      const retrieved = store.getObservationById('obs-1');
      expect(retrieved!.content).toBe('Original');
    });

    it('should reject unsupported schema version', () => {
      const dataset: ExportDataset = {
        version: '2.0',
        exportedAt: Date.now(),
        observations: [],
        capsules: [],
        summaries: [],
        pins: [],
      };

      const result = importDatabase(db, dataset);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unsupported schema version');
    });

    it('should import capsules with observations', () => {
      const dataset: ExportDataset = {
        version: '1.0',
        exportedAt: Date.now(),
        observations: [
          {
            id: 'obs-1',
            kind: 'message',
            content: 'First',
            provenance: {},
            ts: 1000,
            scopeIds: { sessionId: 's1' },
            redacted: false,
          },
          {
            id: 'obs-2',
            kind: 'message',
            content: 'Second',
            provenance: {},
            ts: 2000,
            scopeIds: { sessionId: 's1' },
            redacted: false,
          },
        ],
        capsules: [
          {
            id: 'cap-1',
            type: 'session',
            intent: 'Test',
            status: 'closed',
            openedAt: 1000,
            closedAt: 3000,
            scopeIds: { sessionId: 's1' },
            observationIds: ['obs-1', 'obs-2'],
          },
        ],
        summaries: [],
        pins: [],
      };

      const result = importDatabase(db, dataset);

      expect(result.observations).toBe(2);
      expect(result.capsules).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify capsule observations are linked
      const obsRows = db.prepare(`
        SELECT observation_id, seq
        FROM capsule_observations
        WHERE capsule_id = ?
        ORDER BY seq
      `).all('cap-1') as Array<{ observation_id: string; seq: number }>;

      expect(obsRows).toHaveLength(2);
      expect(obsRows[0].observation_id).toBe('obs-1');
      expect(obsRows[1].observation_id).toBe('obs-2');
    });
  });

  describe('Round-trip export/import', () => {
    it('should preserve all data in round-trip', () => {
      // Create a complete dataset
      const capsule: Capsule = {
        id: 'cap-1',
        type: 'session',
        intent: 'Test session',
        status: 'closed',
        openedAt: 1000,
        closedAt: 5000,
        scopeIds: { sessionId: 's1', repoId: '/repo' },
        observationIds: [],
      };

      store.createCapsule(capsule);

      const obs1: Observation = {
        id: 'obs-1',
        kind: 'tool_call',
        content: 'Tool call',
        provenance: { toolName: 'test' },
        ts: 2000,
        scopeIds: { sessionId: 's1', repoId: '/repo' },
        redacted: false,
      };

      const obs2: Observation = {
        id: 'obs-2',
        kind: 'command',
        content: 'Command output',
        provenance: { command: 'test' },
        ts: 3000,
        scopeIds: { sessionId: 's1', repoId: '/repo' },
        redacted: false,
      };

      store.insertObservation(obs1);
      store.insertObservation(obs2);
      store.attachObservationToCapsule('cap-1', 'obs-1');
      store.attachObservationToCapsule('cap-1', 'obs-2');

      const summary: Summary = {
        id: 'sum-1',
        capsuleId: 'cap-1',
        content: 'Session completed successfully',
        confidence: 0.95,
        createdAt: 4000,
        evidenceRefs: ['obs-1', 'obs-2'],
      };

      store.insertSummary(summary);

      const pin: Pin = {
        id: 'pin-1',
        targetType: 'summary',
        targetId: 'sum-1',
        reason: 'Important result',
        createdAt: 4500,
        scopeIds: { sessionId: 's1', repoId: '/repo' },
      };

      store.insertPin(pin);

      // Export
      const exported = exportDatabase(db);

      // Create new database
      const db2Path = `/tmp/kindling-test-import-${Date.now()}.db`;
      const db2 = openDatabase({ path: db2Path });
      const store2 = new SqliteKindlingStore(db2);

      try {
        // Import
        const result = importDatabase(db2, exported);

        expect(result.observations).toBe(2);
        expect(result.capsules).toBe(1);
        expect(result.summaries).toBe(1);
        expect(result.pins).toBe(1);
        expect(result.errors).toHaveLength(0);

        // Export again to verify determinism
        const reexported = exportDatabase(db2);

        // Compare datasets
        expect(reexported.observations).toEqual(exported.observations);
        expect(reexported.capsules).toEqual(exported.capsules);
        expect(reexported.summaries).toEqual(exported.summaries);
        expect(reexported.pins).toEqual(exported.pins);
      } finally {
        db2.close();
        try {
          unlinkSync(db2Path);
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    });
  });
});
