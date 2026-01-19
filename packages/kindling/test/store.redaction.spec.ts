/**
 * Tests for redaction functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, closeDatabase, SqliteKindlingStore, validateObservation, validateCapsule } from '../src/index.js';
import type Database from 'better-sqlite3';
import { unlinkSync } from 'fs';

describe('SqliteKindlingStore - Redaction', () => {
  let db: Database.Database;
  let store: SqliteKindlingStore;
  const testDbPath = '/tmp/kindling-test-redaction.db';

  beforeEach(() => {
    try {
      unlinkSync(testDbPath);
      unlinkSync(`${testDbPath}-shm`);
      unlinkSync(`${testDbPath}-wal`);
    } catch {}

    db = openDatabase({ path: testDbPath });
    store = new SqliteKindlingStore(db);
  });

  afterEach(() => {
    closeDatabase(db);
    try {
      unlinkSync(testDbPath);
      unlinkSync(`${testDbPath}-shm`);
      unlinkSync(`${testDbPath}-wal`);
    } catch {}
  });

  describe('redactObservation', () => {
    it('should redact observation content', () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'sensitive password: 12345',
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);
      store.redactObservation(obsResult.value.id);

      const row = db.prepare('SELECT * FROM observations WHERE id = ?').get(obsResult.value.id) as any;
      expect(row.content).toBe('[redacted]');
      expect(row.redacted).toBe(1);
    });

    it.skip('should remove redacted content from FTS', () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'secret API key: abc123',
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      // Verify FTS contains the content
      let ftsResult = db.prepare(`
        SELECT COUNT(*) as count FROM observations_fts WHERE content MATCH 'secret'
      `).get() as { count: number };
      expect(ftsResult.count).toBe(1);

      // Redact
      store.redactObservation(obsResult.value.id);

      // Verify removed from FTS
      ftsResult = db.prepare(`
        SELECT COUNT(*) as count FROM observations_fts WHERE content MATCH 'secret'
      `).get() as { count: number };
      expect(ftsResult.count).toBe(0);
    });

    it('should keep redacted observation retrievable by ID', () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'sensitive data',
        provenance: { source: 'user-input' },
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);
      store.redactObservation(obsResult.value.id);

      // Should still be retrievable by ID
      const retrieved = store.getObservationById(obsResult.value.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(obsResult.value.id);
      expect(retrieved?.content).toBe('[redacted]');
      expect(retrieved?.redacted).toBe(true);
    });

    it('should preserve observation provenance after redaction', () => {
      const obsResult = validateObservation({
        kind: 'tool_call',
        content: 'sensitive command output',
        provenance: { toolName: 'grep', command: 'grep password file.txt' },
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);
      store.redactObservation(obsResult.value.id);

      const retrieved = store.getObservationById(obsResult.value.id);
      expect(retrieved?.provenance).toEqual({ toolName: 'grep', command: 'grep password file.txt' });
    });

    it('should preserve capsule-observation relationship after redaction', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test session',
        scopeIds: { sessionId: 's1' },
      });

      const obsResult = validateObservation({
        kind: 'message',
        content: 'sensitive content',
        scopeIds: { sessionId: 's1' },
      });

      expect(capsuleResult.ok && obsResult.ok).toBe(true);
      if (!capsuleResult.ok || !obsResult.ok) return;

      store.createCapsule(capsuleResult.value);
      store.insertObservation(obsResult.value);
      store.attachObservationToCapsule(capsuleResult.value.id, obsResult.value.id);

      // Redact observation
      store.redactObservation(obsResult.value.id);

      // Verify relationship preserved
      const link = db.prepare(`
        SELECT * FROM capsule_observations
        WHERE capsule_id = ? AND observation_id = ?
      `).get(capsuleResult.value.id, obsResult.value.id);

      expect(link).toBeDefined();
    });

    it('should preserve observation metadata after redaction', () => {
      const obsResult = validateObservation({
        kind: 'file_diff',
        content: 'sensitive file contents',
        scopeIds: { sessionId: 's1', repoId: '/repo' },
        ts: Date.now(),
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);
      store.redactObservation(obsResult.value.id);

      const retrieved = store.getObservationById(obsResult.value.id);
      expect(retrieved?.id).toBe(obsResult.value.id);
      expect(retrieved?.kind).toBe('file_diff');
      expect(retrieved?.ts).toBe(obsResult.value.ts);
      expect(retrieved?.scopeIds).toEqual({ sessionId: 's1', repoId: '/repo' });
    });

    it('should throw error when redacting non-existent observation', () => {
      expect(() => {
        store.redactObservation('non-existent-id');
      }).toThrow('not found');
    });

    it.skip('should handle redacting already redacted observation', () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'sensitive data',
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      // Redact twice
      store.redactObservation(obsResult.value.id);
      store.redactObservation(obsResult.value.id);

      const retrieved = store.getObservationById(obsResult.value.id);
      expect(retrieved?.content).toBe('[redacted]');
      expect(retrieved?.redacted).toBe(true);
    });

    it('should exclude redacted observations from queryObservations by default', () => {
      const obs1Result = validateObservation({
        kind: 'message',
        content: 'normal content',
        scopeIds: { sessionId: 's1' },
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'sensitive content',
        scopeIds: { sessionId: 's1' },
      });

      expect(obs1Result.ok && obs2Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      // Redact one observation
      store.redactObservation(obs2Result.value.id);

      // Query should only return non-redacted
      const results = store.queryObservations({ sessionId: 's1' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(obs1Result.value.id);
    });

    it('should show [redacted] in evidence snippets', () => {
      const obs1Result = validateObservation({
        kind: 'message',
        content: 'public information',
        scopeIds: { sessionId: 's1' },
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'secret password',
        scopeIds: { sessionId: 's1' },
      });

      expect(obs1Result.ok && obs2Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      // Redact second observation
      store.redactObservation(obs2Result.value.id);

      // Get evidence snippets for both
      const snippets = store.getEvidenceSnippets([obs1Result.value.id, obs2Result.value.id]);

      expect(snippets).toHaveLength(2);
      expect(snippets.find(s => s.observationId === obs1Result.value.id)?.snippet).toBe('public information');
      expect(snippets.find(s => s.observationId === obs2Result.value.id)?.snippet).toBe('[redacted]');
    });
  });

  describe('redaction with multiple observations', () => {
    it('should redact only specified observations', () => {
      const obs1 = validateObservation({
        kind: 'message',
        content: 'keep this content',
        scopeIds: { sessionId: 's1' },
      });

      const obs2 = validateObservation({
        kind: 'message',
        content: 'redact this content',
        scopeIds: { sessionId: 's1' },
      });

      const obs3 = validateObservation({
        kind: 'message',
        content: 'keep this too',
        scopeIds: { sessionId: 's1' },
      });

      expect(obs1.ok && obs2.ok && obs3.ok).toBe(true);
      if (!obs1.ok || !obs2.ok || !obs3.ok) return;

      store.insertObservation(obs1.value);
      store.insertObservation(obs2.value);
      store.insertObservation(obs3.value);

      // Redact only middle observation
      store.redactObservation(obs2.value.id);

      const retrieved1 = store.getObservationById(obs1.value.id);
      const retrieved2 = store.getObservationById(obs2.value.id);
      const retrieved3 = store.getObservationById(obs3.value.id);

      expect(retrieved1?.content).toBe('keep this content');
      expect(retrieved2?.content).toBe('[redacted]');
      expect(retrieved3?.content).toBe('keep this too');
    });
  });

  describe('redaction consistency', () => {
    it('should maintain database integrity after redaction', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test',
        scopeIds: { sessionId: 's1' },
      });

      const obsResult = validateObservation({
        kind: 'message',
        content: 'sensitive',
        scopeIds: { sessionId: 's1' },
      });

      expect(capsuleResult.ok && obsResult.ok).toBe(true);
      if (!capsuleResult.ok || !obsResult.ok) return;

      store.createCapsule(capsuleResult.value);
      store.insertObservation(obsResult.value);
      store.attachObservationToCapsule(capsuleResult.value.id, obsResult.value.id);

      store.redactObservation(obsResult.value.id);

      // Should be able to query without errors
      const observations = store.queryObservations({ sessionId: 's1' });
      const capsule = store.getOpenCapsuleForSession('s1');

      expect(observations).toBeDefined();
      expect(capsule).toBeDefined();
    });
  });
});
