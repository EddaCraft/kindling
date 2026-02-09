/**
 * Tests for memory commands
 */

import { describe, it, expect } from 'vitest';
import { memoryStatus, formatStatus, type StatusStore } from '../src/opencode/commands/status.js';
import {
  memorySearch,
  formatSearchResults,
  type RetrievalService,
} from '../src/opencode/commands/search.js';
import { memoryPin, formatPinResult, type PinStore } from '../src/opencode/commands/pin.js';
import {
  memoryForget,
  formatForgetResult,
  type ForgetStore,
} from '../src/opencode/commands/forget.js';
import {
  memoryExport,
  formatExportResult,
  type ExportService,
} from '../src/opencode/commands/export.js';
import type { RetrieveResult, ExportBundle } from '@eddacraft/kindling-core';

describe('Memory Commands', () => {
  describe('/memory status', () => {
    it('should return status with counts', () => {
      const store: StatusStore = {
        queryObservations: () => [{ id: '1' }, { id: '2' }],
        getCapsules: () => [
          { id: '1', status: 'open' },
          { id: '2', status: 'closed' },
        ],
        getSummaries: () => [{ id: '1', createdAt: 1000 }],
        getPins: () => [{ id: '1' }],
      };

      const result = memoryStatus(store);

      expect(result.observations).toBe(2);
      expect(result.capsules.total).toBe(2);
      expect(result.capsules.open).toBe(1);
      expect(result.capsules.closed).toBe(1);
      expect(result.summaries).toBe(1);
      expect(result.pins).toBe(1);
      expect(result.lastSummaryAt).toBe(1000);
    });

    it('should filter by scope', () => {
      const store: StatusStore = {
        queryObservations: (scope) => {
          if (scope?.sessionId === 's1') {
            return [{ id: '1' }];
          }
          return [];
        },
        getCapsules: () => [],
        getSummaries: () => [],
        getPins: () => [],
      };

      const result = memoryStatus(store, {
        scopeIds: { sessionId: 's1' },
      });

      expect(result.observations).toBe(1);
    });

    it('should format status as readable text', () => {
      const result = {
        observations: 10,
        capsules: { total: 5, open: 2, closed: 3 },
        summaries: 3,
        pins: 1,
        lastSummaryAt: 1704067200000,
        dbPath: '/path/to/db.sqlite',
      };

      const formatted = formatStatus(result);

      expect(formatted).toContain('Memory Status');
      expect(formatted).toContain('Observations: 10');
      expect(formatted).toContain('Capsules: 5 (2 open, 3 closed)');
      expect(formatted).toContain('Summaries: 3');
      expect(formatted).toContain('Pins: 1');
      expect(formatted).toContain('Database: /path/to/db.sqlite');
    });
  });

  describe('/memory search', () => {
    it('should execute search and return results', async () => {
      const mockResult: RetrieveResult = {
        pins: [],
        currentSummary: undefined,
        candidates: [
          {
            entity: {
              id: 'obs-1',
              kind: 'message',
              content: 'Test message',
              provenance: {},
              ts: 1000,
              scopeIds: { sessionId: 's1' },
              redacted: false,
            },
            score: 0.9,
          },
        ],
        provenance: {
          query: 'test',
          scopeIds: { sessionId: 's1' },
          totalCandidates: 1,
          returnedCandidates: 1,
          truncatedDueToTokenBudget: false,
          providerUsed: 'local-fts',
        },
      };

      const service: RetrievalService = {
        retrieve: async () => mockResult,
      };

      const result = await memorySearch(service, {
        query: 'test',
        scopeIds: { sessionId: 's1' },
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.provenance.query).toBe('test');
    });

    it('should format search results as readable text', () => {
      const result: RetrieveResult = {
        pins: [
          {
            pin: {
              id: 'pin-1',
              targetType: 'observation',
              targetId: 'obs-1',
              reason: 'Important',
              createdAt: 1000,
              scopeIds: { sessionId: 's1' },
            },
            target: {
              id: 'obs-1',
              kind: 'message',
              content: 'Pinned message',
              provenance: {},
              ts: 1000,
              scopeIds: { sessionId: 's1' },
              redacted: false,
            },
          },
        ],
        currentSummary: {
          id: 'sum-1',
          capsuleId: 'cap-1',
          content: 'Session summary',
          confidence: 0.95,
          createdAt: 2000,
          evidenceRefs: [],
        },
        candidates: [
          {
            entity: {
              id: 'obs-2',
              kind: 'message',
              content: 'Search result',
              provenance: {},
              ts: 3000,
              scopeIds: { sessionId: 's1' },
              redacted: false,
            },
            score: 0.8,
            matchContext: 'exact match',
          },
        ],
        provenance: {
          query: 'test',
          scopeIds: { sessionId: 's1' },
          totalCandidates: 1,
          returnedCandidates: 1,
          truncatedDueToTokenBudget: false,
          providerUsed: 'local-fts',
        },
      };

      const formatted = formatSearchResults(result);

      expect(formatted).toContain('Search Results');
      expect(formatted).toContain('Query: "test"');
      expect(formatted).toContain('📌 Pinned:');
      expect(formatted).toContain('Pinned message');
      expect(formatted).toContain('Reason: Important');
      expect(formatted).toContain('📝 Current Session Summary:');
      expect(formatted).toContain('Session summary');
      expect(formatted).toContain('95%');
      expect(formatted).toContain('🔍 Search Results:');
      expect(formatted).toContain('Search result');
      expect(formatted).toContain('80%');
    });

    it('should show no results message when empty', () => {
      const result: RetrieveResult = {
        pins: [],
        currentSummary: undefined,
        candidates: [],
        provenance: {
          query: 'test',
          scopeIds: { sessionId: 's1' },
          totalCandidates: 0,
          returnedCandidates: 0,
          truncatedDueToTokenBudget: false,
          providerUsed: 'local-fts',
        },
      };

      const formatted = formatSearchResults(result);

      expect(formatted).toContain('No results found');
    });
  });

  describe('/memory pin', () => {
    it('should pin observation successfully', () => {
      const store: PinStore = {
        insertPin: () => {},
        getObservationById: (id) => ({ id }),
        getSummaryById: () => undefined,
      };

      const result = memoryPin(store, {
        targetType: 'observation',
        targetId: 'obs-1',
        reason: 'Important finding',
        scopeIds: { sessionId: 's1' },
      });

      expect(result.created).toBe(true);
      expect(result.targetId).toBe('obs-1');
      expect(result.pinId).toBeTruthy();
    });

    it('should fail when target not found', () => {
      const store: PinStore = {
        insertPin: () => {},
        getObservationById: () => undefined,
        getSummaryById: () => undefined,
      };

      const result = memoryPin(store, {
        targetType: 'observation',
        targetId: 'obs-nonexistent',
        scopeIds: { sessionId: 's1' },
      });

      expect(result.created).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should format pin result', () => {
      const success = formatPinResult({
        pinId: 'pin-1',
        targetId: 'obs-1',
        targetType: 'observation',
        created: true,
      });

      expect(success).toContain('📌');
      expect(success).toContain('Pinned observation obs-1');

      const failure = formatPinResult({
        pinId: '',
        targetId: 'obs-1',
        targetType: 'observation',
        created: false,
        error: 'Not found',
      });

      expect(failure).toContain('❌');
      expect(failure).toContain('Failed to pin');
    });
  });

  describe('/memory forget', () => {
    it('should redact observation successfully', () => {
      const store: ForgetStore = {
        redactObservation: () => {},
        getObservationById: (id) => ({ id, redacted: false }),
      };

      const result = memoryForget(store, {
        observationId: 'obs-1',
      });

      expect(result.redacted).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail when observation not found', () => {
      const store: ForgetStore = {
        redactObservation: () => {},
        getObservationById: () => undefined,
      };

      const result = memoryForget(store, {
        observationId: 'obs-nonexistent',
      });

      expect(result.redacted).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle already redacted observation', () => {
      const store: ForgetStore = {
        redactObservation: () => {},
        getObservationById: (id) => ({ id, redacted: true }),
      };

      const result = memoryForget(store, {
        observationId: 'obs-1',
      });

      expect(result.error).toContain('already redacted');
    });

    it('should format forget result', () => {
      const success = formatForgetResult({
        observationId: 'obs-1',
        redacted: true,
      });

      expect(success).toContain('🗑️');
      expect(success).toContain('Redacted observation obs-1');

      const failure = formatForgetResult({
        observationId: 'obs-1',
        redacted: false,
        error: 'Not found',
      });

      expect(failure).toContain('❌');
      expect(failure).toContain('Failed to redact');
    });
  });

  describe('/memory export', () => {
    it('should export bundle successfully', () => {
      const mockBundle: ExportBundle = {
        bundleVersion: '1.0',
        exportedAt: Date.now(),
        dataset: {
          version: '1.0',
          exportedAt: Date.now(),
          observations: [{ id: '1' }],
          capsules: [{ id: '1' }],
          summaries: [],
          pins: [],
        },
      };

      const service: ExportService = {
        createExportBundle: () => mockBundle,
        serializeBundle: () => JSON.stringify(mockBundle),
      };

      const result = memoryExport(service, {
        outputPath: '/tmp/test-export.json',
      });

      expect(result.filePath).toBe('/tmp/test-export.json');
      expect(result.stats.observations).toBe(1);
      expect(result.stats.capsules).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should format export result', () => {
      const success = formatExportResult({
        filePath: '/tmp/export.json',
        stats: {
          observations: 10,
          capsules: 5,
          summaries: 3,
          pins: 1,
        },
      });

      expect(success).toContain('📦');
      expect(success).toContain('Export complete');
      expect(success).toContain('/tmp/export.json');
      expect(success).toContain('10 observations');

      const failure = formatExportResult({
        filePath: '',
        stats: {
          observations: 0,
          capsules: 0,
          summaries: 0,
          pins: 0,
        },
        error: 'Permission denied',
      });

      expect(failure).toContain('❌');
      expect(failure).toContain('Export failed');
    });
  });
});
