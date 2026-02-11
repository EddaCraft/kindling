/**
 * Tests for LocalFtsProvider
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, closeDatabase, SqliteKindlingStore } from '@eddacraft/kindling-store-sqlite';
import { LocalFtsProvider } from '../src/index.js';
import { validateObservation, validateCapsule, validateSummary } from '@eddacraft/kindling-core';
import type Database from 'better-sqlite3';
import { unlinkSync } from 'fs';

describe('LocalFtsProvider', () => {
  let db: Database.Database;
  let store: SqliteKindlingStore;
  let provider: LocalFtsProvider;
  const testDbPath = '/tmp/kindling-test-provider.db';

  beforeEach(() => {
    try {
      unlinkSync(testDbPath);
      unlinkSync(`${testDbPath}-shm`);
      unlinkSync(`${testDbPath}-wal`);
    } catch {
      // ignore missing files
    }

    db = openDatabase({ path: testDbPath });
    store = new SqliteKindlingStore(db);
    provider = new LocalFtsProvider(db);
  });

  afterEach(() => {
    closeDatabase(db);
    try {
      unlinkSync(testDbPath);
      unlinkSync(`${testDbPath}-shm`);
      unlinkSync(`${testDbPath}-wal`);
    } catch {
      // ignore missing files
    }
  });

  describe('FTS search', () => {
    it('should find observations matching query', async () => {
      const obs1Result = validateObservation({
        kind: 'message',
        content: 'Fixed authentication bug in login flow',
        scopeIds: { sessionId: 's1', repoId: '/repo' },
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'Updated documentation for API',
        scopeIds: { sessionId: 's1', repoId: '/repo' },
      });

      expect(obs1Result.ok && obs2Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: { repoId: '/repo' },
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.id).toBe(obs1Result.value.id);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });

    it('should find summaries matching query', async () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test',
        scopeIds: { sessionId: 's1' },
      });

      const summaryResult = validateSummary({
        capsuleId: capsuleResult.ok ? capsuleResult.value.id : 'cap1',
        content: 'Refactored authentication module for security',
        confidence: 0.9,
        evidenceRefs: [],
      });

      expect(capsuleResult.ok && summaryResult.ok).toBe(true);
      if (!capsuleResult.ok || !summaryResult.ok) return;

      store.createCapsule(capsuleResult.value);
      store.insertSummary(summaryResult.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.id).toBe(summaryResult.value.id);
    });

    it('should find both observations and summaries', async () => {
      const capsuleResult = validateCapsule({
        type: 'session',
        intent: 'Test',
        scopeIds: { sessionId: 's1' },
      });

      const obsResult = validateObservation({
        kind: 'message',
        content: 'authentication bug fixed',
        scopeIds: { sessionId: 's1' },
      });

      const summaryResult = validateSummary({
        capsuleId: capsuleResult.ok ? capsuleResult.value.id : 'cap1',
        content: 'Updated authentication flow',
        confidence: 0.85,
        evidenceRefs: [],
      });

      expect(capsuleResult.ok && obsResult.ok && summaryResult.ok).toBe(true);
      if (!capsuleResult.ok || !obsResult.ok || !summaryResult.ok) return;

      store.createCapsule(capsuleResult.value);
      store.insertObservation(obsResult.value);
      store.insertSummary(summaryResult.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.entity.id);
      expect(ids).toContain(obsResult.value.id);
      expect(ids).toContain(summaryResult.value.id);
    });

    it('should return empty array for no matches', async () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'test content',
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      const results = await provider.search({
        query: 'nonexistent',
        scopeIds: {},
      });

      expect(results).toEqual([]);
    });
  });

  describe('Scope filtering', () => {
    beforeEach(() => {
      const obs1 = validateObservation({
        kind: 'message',
        content: 'authentication test',
        scopeIds: { sessionId: 's1', repoId: '/repo1' },
      });

      const obs2 = validateObservation({
        kind: 'message',
        content: 'authentication test',
        scopeIds: { sessionId: 's2', repoId: '/repo1' },
      });

      const obs3 = validateObservation({
        kind: 'message',
        content: 'authentication test',
        scopeIds: { sessionId: 's1', repoId: '/repo2' },
      });

      if (obs1.ok) store.insertObservation(obs1.value);
      if (obs2.ok) store.insertObservation(obs2.value);
      if (obs3.ok) store.insertObservation(obs3.value);
    });

    it('should filter by sessionId', async () => {
      const results = await provider.search({
        query: 'authentication',
        scopeIds: { sessionId: 's1' },
      });

      expect(results).toHaveLength(2);
    });

    it('should filter by repoId', async () => {
      const results = await provider.search({
        query: 'authentication',
        scopeIds: { repoId: '/repo1' },
      });

      expect(results).toHaveLength(2);
    });

    it('should filter by multiple scope dimensions (AND semantics)', async () => {
      const results = await provider.search({
        query: 'authentication',
        scopeIds: { sessionId: 's1', repoId: '/repo1' },
      });

      expect(results).toHaveLength(1);
    });

    it('should return all results when no scope specified', async () => {
      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(3);
    });

    it('should safely handle adversarial SQL metacharacters in scope values', async () => {
      // Verify data exists first (legit query returns results)
      const legit = await provider.search({
        query: 'authentication',
        scopeIds: { sessionId: 's1' },
      });
      expect(legit.length).toBeGreaterThan(0);

      // Adversarial scope value must not bypass filtering
      const adversarial = await provider.search({
        query: 'authentication',
        scopeIds: { sessionId: "' OR '1'='1" },
      });
      expect(adversarial).toHaveLength(0);
    });
  });

  describe('Redaction filtering', () => {
    it('should exclude redacted observations by default', async () => {
      const obs1Result = validateObservation({
        kind: 'message',
        content: 'authentication test',
        scopeIds: { sessionId: 's1' },
        redacted: false,
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'authentication secret',
        scopeIds: { sessionId: 's1' },
        redacted: true,
      });

      expect(obs1Result.ok && obs2Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.id).toBe(obs1Result.value.id);
    });

    it('should not find redacted observations via FTS (not indexed)', async () => {
      const obs1Result = validateObservation({
        kind: 'message',
        content: 'authentication test',
        scopeIds: { sessionId: 's1' },
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'authentication secret',
        scopeIds: { sessionId: 's1' },
        redacted: true,
      });

      expect(obs1Result.ok && obs2Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      // Redacted observations are not in FTS index, so won't be found
      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
        includeRedacted: true,
      });

      // Only the non-redacted observation is found
      expect(results).toHaveLength(1);
      expect(results[0].entity.id).toBe(obs1Result.value.id);
    });
  });

  describe('Exclusion (deduplication)', () => {
    it('should exclude specified IDs', async () => {
      const obs1Result = validateObservation({
        kind: 'message',
        content: 'authentication test',
        scopeIds: { sessionId: 's1' },
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'authentication flow',
        scopeIds: { sessionId: 's1' },
      });

      expect(obs1Result.ok && obs2Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
        excludeIds: [obs1Result.value.id],
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.id).toBe(obs2Result.value.id);
    });
  });

  describe('Result limiting', () => {
    it('should respect maxResults parameter', async () => {
      // Insert 10 observations
      for (let i = 0; i < 10; i++) {
        const obsResult = validateObservation({
          kind: 'message',
          content: `authentication test ${i}`,
          scopeIds: { sessionId: 's1' },
        });

        if (obsResult.ok) {
          store.insertObservation(obsResult.value);
        }
      }

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
        maxResults: 5,
      });

      expect(results).toHaveLength(5);
    });

    it('should use default maxResults of 50', async () => {
      // Insert 60 observations
      for (let i = 0; i < 60; i++) {
        const obsResult = validateObservation({
          kind: 'message',
          content: `authentication test ${i}`,
          scopeIds: { sessionId: 's1' },
        });

        if (obsResult.ok) {
          store.insertObservation(obsResult.value);
        }
      }

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(50); // Default limit
    });
  });

  describe('Scoring', () => {
    it('should return scores between 0 and 1', async () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'authentication bug fixed',
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(1);
      expect(results[0].score).toBeGreaterThanOrEqual(0);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });

    it('should rank better matches higher', async () => {
      const obs1Result = validateObservation({
        kind: 'message',
        content: 'authentication authentication authentication', // More matches
        scopeIds: { sessionId: 's1' },
        ts: Date.now(),
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'authentication bug',
        scopeIds: { sessionId: 's1' },
        ts: Date.now(),
      });

      expect(obs1Result.ok && obs2Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(2);
      // obs1 should score higher (more term frequency)
      expect(results[0].entity.id).toBe(obs1Result.value.id);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should weight recent observations higher', async () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      const obs1Result = validateObservation({
        kind: 'message',
        content: 'authentication bug',
        scopeIds: { sessionId: 's1' },
        ts: now, // Recent
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'authentication bug',
        scopeIds: { sessionId: 's1' },
        ts: thirtyDaysAgo, // Old
      });

      expect(obs1Result.ok && obs2Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(2);
      // Recent observation should score higher
      expect(results[0].entity.id).toBe(obs1Result.value.id);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should sort results by score (descending)', async () => {
      const now = Date.now();

      // Create observations with varying relevance and recency
      const obs1Result = validateObservation({
        kind: 'message',
        content: 'authentication',
        scopeIds: { sessionId: 's1' },
        ts: now,
      });

      const obs2Result = validateObservation({
        kind: 'message',
        content: 'authentication authentication',
        scopeIds: { sessionId: 's1' },
        ts: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      });

      const obs3Result = validateObservation({
        kind: 'message',
        content: 'auth',
        scopeIds: { sessionId: 's1' },
        ts: now,
      });

      expect(obs1Result.ok && obs2Result.ok && obs3Result.ok).toBe(true);
      if (!obs1Result.ok || !obs2Result.ok || !obs3Result.ok) return;

      store.insertObservation(obs1Result.value);
      store.insertObservation(obs2Result.value);
      store.insertObservation(obs3Result.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      // Verify descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });
  });

  describe('Match context', () => {
    it('should provide match context for short content', async () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'authentication bug',
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(1);
      expect(results[0].matchContext).toBe('authentication bug');
    });

    it('should truncate match context for long content', async () => {
      const longContent = 'authentication ' + 'x'.repeat(200);

      const obsResult = validateObservation({
        kind: 'message',
        content: longContent,
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      const results = await provider.search({
        query: 'authentication',
        scopeIds: {},
      });

      expect(results).toHaveLength(1);
      expect(results[0].matchContext).toBeDefined();
      expect(results[0].matchContext!.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(results[0].matchContext).toContain('...');
    });
  });

  describe('Determinism', () => {
    it('should return same results for same query', async () => {
      const obsResult = validateObservation({
        kind: 'message',
        content: 'authentication bug fixed',
        scopeIds: { sessionId: 's1' },
      });

      expect(obsResult.ok).toBe(true);
      if (!obsResult.ok) return;

      store.insertObservation(obsResult.value);

      const results1 = await provider.search({
        query: 'authentication',
        scopeIds: { sessionId: 's1' },
      });

      const results2 = await provider.search({
        query: 'authentication',
        scopeIds: { sessionId: 's1' },
      });

      // Results should be the same length with same entities
      expect(results1.length).toBe(results2.length);
      expect(results1[0].entity.id).toBe(results2[0].entity.id);
      expect(results1[0].matchContext).toBe(results2[0].matchContext);
      // Scores should be very close (allow for tiny floating point differences)
      expect(Math.abs(results1[0].score - results2[0].score)).toBeLessThan(0.001);
    });
  });

  describe('Provider metadata', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('local-fts');
    });
  });

  describe('Malformed query handling', () => {
    it('should return empty results for "AND OR"', async () => {
      const results = await provider.search({
        query: 'AND OR',
        scopeIds: {},
      });

      expect(results).toEqual([]);
    });

    it('should return empty results for "*"', async () => {
      const results = await provider.search({
        query: '*',
        scopeIds: {},
      });

      expect(results).toEqual([]);
    });

    it('should return empty results for empty string', async () => {
      const results = await provider.search({
        query: '',
        scopeIds: {},
      });

      expect(results).toEqual([]);
    });

    it('should return empty results for unmatched parenthesis', async () => {
      const results = await provider.search({
        query: 'foo(bar',
        scopeIds: {},
      });

      expect(results).toEqual([]);
    });

    it('should return empty results for unbalanced quotes', async () => {
      const results = await provider.search({
        query: '"unclosed quote',
        scopeIds: {},
      });

      expect(results).toEqual([]);
    });

    it('should handle FTS5 column filter syntax gracefully', async () => {
      const results = await provider.search({
        query: 'content:',
        scopeIds: {},
      });

      expect(results).toEqual([]);
    });

    it('should handle consecutive operators gracefully', async () => {
      const results = await provider.search({
        query: 'NOT NOT NOT',
        scopeIds: {},
      });

      expect(results).toEqual([]);
    });
  });
});
