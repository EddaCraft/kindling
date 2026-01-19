/**
 * Tests for store read path
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, closeDatabase, SqliteKindlingStore, validateObservation, validateCapsule, validateSummary } from '../src/index.js';
import type Database from 'better-sqlite3';
import { unlinkSync } from 'fs';

describe('SqliteKindlingStore - Read Path', () => {
  let db: Database.Database;
  let store: SqliteKindlingStore;
  const testDbPath = '/tmp/kindling-test-read.db';

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

  describe('getOpenCapsuleForSession', () => {
    it('should return open capsule for session', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test session',
        scopeIds: { sessionId: 's1', repoId: '/repo' },
      });

      expect(capsuleResult.ok).toBe(true);
      if (!capsuleResult.ok) return;

      store.createCapsule(capsuleResult.value);

      const found = store.getOpenCapsuleForSession('s1');
      expect(found).toBeDefined();
      expect(found?.id).toBe(capsuleResult.value.id);
      expect(found?.status).toBe('open');
    });

    it('should return undefined if no open capsule', () => {
      const found = store.getOpenCapsuleForSession('nonexistent');
      expect(found).toBeUndefined();
    });

    it('should not return closed capsules', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test session',
        scopeIds: { sessionId: 's1' },
      });

      expect(capsuleResult.ok).toBe(true);
      if (!capsuleResult.ok) return;

      store.createCapsule(capsuleResult.value);
      store.closeCapsule(capsuleResult.value.id);

      const found = store.getOpenCapsuleForSession('s1');
      expect(found).toBeUndefined();
    });
  });

  describe('getLatestSummaryForCapsule', () => {
    it('should return latest summary', () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test',
        scopeIds: { sessionId: 's1' },
      });

      const summaryResult = validateSummary({
        capsuleId: capsuleResult.ok ? capsuleResult.value.id : 'cap1',
        content: 'Summary content',
        confidence: 0.9,
        evidenceRefs: [],
      });

      expect(capsuleResult.ok && summaryResult.ok).toBe(true);
      if (!capsuleResult.ok || !summaryResult.ok) return;

      store.createCapsule(capsuleResult.value);
      store.insertSummary(summaryResult.value);

      const found = store.getLatestSummaryForCapsule(capsuleResult.value.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(summaryResult.value.id);
      expect(found?.content).toBe('Summary content');
    });

    it('should return undefined if no summary', () => {
      const found = store.getLatestSummaryForCapsule('nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('getEvidenceSnippets', () => {
    it('should return evidence snippets', () => {
      const obs1Result = validateObservation({
        kind: 'message',
        content: 'Short content',
        scopeIds: { sessionId: 's1' },
      });

      const obs2Result = validateObservation({
        kind: 'tool_call',
        content: 'Very long content that should be truncated '.repeat(10),
        scopeIds: { sessionId: 's1' },
      });

      expect(obs1Result.ok && obs2Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      const snippets = store.getEvidenceSnippets(
        [obs1Result.value.id, obs2Result.value.id],
        50
      );

      expect(snippets).toHaveLength(2);
      expect(snippets[0].snippet).toBe('Short content');
      expect(snippets[1].snippet.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(snippets[1].snippet).toContain('...');
    });

    it('should return empty array for empty input', () => {
      const snippets = store.getEvidenceSnippets([]);
      expect(snippets).toEqual([]);
    });
  });

  describe('getObservationById', () => {
    it('should return observation by ID', () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'test content',
        provenance: { source: 'test' },
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      const found = store.getObservationById(obsResult.value.id);
      expect(found).toBeDefined();
      expect(found?.content).toBe('test content');
      expect(found?.provenance).toEqual({ source: 'test' });
    });

    it('should return undefined for nonexistent ID', () => {
      const found = store.getObservationById('nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('queryObservations', () => {
    beforeEach(() => {
      // Insert test data
      const obs1 = validateObservation({
        kind: 'message',
        content: 'obs1',
        ts: 1000,
        scopeIds: { sessionId: 's1', repoId: '/repo1' },
      });

      const obs2 = validateObservation({
        kind: 'message',
        content: 'obs2',
        ts: 2000,
        scopeIds: { sessionId: 's2', repoId: '/repo1' },
      });

      const obs3 = validateObservation({
        kind: 'message',
        content: 'obs3',
        ts: 3000,
        scopeIds: { sessionId: 's1', repoId: '/repo2' },
      });

      if (obs1.ok) store.insertObservation(obs1.value);
      if (obs2.ok) store.insertObservation(obs2.value);
      if (obs3.ok) store.insertObservation(obs3.value);
    });

    it('should filter by sessionId', () => {
      const results = store.queryObservations({ sessionId: 's1' });
      expect(results).toHaveLength(2);
      expect(results.map(o => o.content).sort()).toEqual(['obs1', 'obs3']);
    });

    it('should filter by repoId', () => {
      const results = store.queryObservations({ repoId: '/repo1' });
      expect(results).toHaveLength(2);
      expect(results.map(o => o.content).sort()).toEqual(['obs1', 'obs2']);
    });

    it('should filter by time range', () => {
      const results = store.queryObservations(undefined, 1500, 2500);
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('obs2');
    });

    it('should respect limit', () => {
      const results = store.queryObservations(undefined, undefined, undefined, 2);
      expect(results).toHaveLength(2);
    });

    it('should return observations in descending timestamp order', () => {
      const results = store.queryObservations();
      expect(results[0].ts).toBeGreaterThan(results[1].ts);
    });
  });
});
