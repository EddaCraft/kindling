/**
 * Tests for observation ingestion
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import {
  ObservationService,
  appendObservation,
  extractProvenance,
  validateProvenance,
} from '../src/index.js';
import { unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Observation ingestion', () => {
  const testDbPath = join(tmpdir(), `kindling-test-obs-${Date.now()}.db`);
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

  describe('appendObservation', () => {
    it('should create observation with correct fields', async () => {
      const result = await service.append({
        kind: 'message',
        content: 'Test message',
        provenance: {},
        scopeIds: { sessionId: 'sess-1' },
      });

      expect(result.observationId).toBeTruthy();

      const obs = await service.get(result.observationId);
      expect(obs).toBeTruthy();
      expect(obs?.kind).toBe('message');
      expect(obs?.content).toBe('Test message');
      expect(obs?.scopeIds.sessionId).toBe('sess-1');
      expect(obs?.ts).toBeTruthy();
      expect(obs?.redacted).toBe(false);
    });

    it('should reject invalid input', async () => {
      await expect(
        service.append({
          kind: 'tool_call',
          content: 'Test',
          provenance: {}, // Missing toolName
          scopeIds: {},
        })
      ).rejects.toThrow(/toolName/);
    });

    it('should set timestamp automatically', async () => {
      const before = Date.now();
      const result = await service.append({
        kind: 'message',
        content: 'Test',
        provenance: {},
        scopeIds: {},
      });
      const after = Date.now();

      const obs = await service.get(result.observationId);
      expect(obs?.ts).toBeGreaterThanOrEqual(before);
      expect(obs?.ts).toBeLessThanOrEqual(after);
    });

    it('should handle all scope IDs', async () => {
      const result = await service.append({
        kind: 'message',
        content: 'Test',
        provenance: {},
        scopeIds: {
          sessionId: 'sess-1',
          repoId: 'repo-1',
          agentId: 'agent-1',
          userId: 'user-1',
        },
      });

      const obs = await service.get(result.observationId);
      expect(obs?.scopeIds).toEqual({
        sessionId: 'sess-1',
        repoId: 'repo-1',
        agentId: 'agent-1',
        userId: 'user-1',
      });
    });
  });

  describe('provenance extraction', () => {
    it('should extract tool_call provenance', () => {
      const provenance = extractProvenance('tool_call', {
        toolName: 'grep',
        args: ['test', '-r'],
        result: { matches: 5 },
      });

      expect(provenance).toEqual({
        toolName: 'grep',
        args: ['test', '-r'],
        result: { matches: 5 },
      });
    });

    it('should reject tool_call without toolName', () => {
      expect(() => {
        extractProvenance('tool_call', { args: [] });
      }).toThrow(/toolName/);
    });

    it('should extract command provenance', () => {
      const provenance = extractProvenance('command', {
        cmd: 'npm test',
        exitCode: 0,
        workingDir: '/home/user/project',
      });

      expect(provenance).toEqual({
        cmd: 'npm test',
        exitCode: 0,
        workingDir: '/home/user/project',
      });
    });

    it('should reject command without cmd', () => {
      expect(() => {
        extractProvenance('command', { exitCode: 0 });
      }).toThrow(/cmd/);
    });

    it('should extract file_diff provenance', () => {
      const provenance = extractProvenance('file_diff', {
        paths: ['src/index.ts', 'src/utils.ts'],
        operation: 'update',
      });

      expect(provenance).toEqual({
        paths: ['src/index.ts', 'src/utils.ts'],
        operation: 'update',
      });
    });

    it('should reject file_diff without paths', () => {
      expect(() => {
        extractProvenance('file_diff', { operation: 'create' });
      }).toThrow(/paths/);
    });

    it('should extract error provenance', () => {
      const provenance = extractProvenance('error', {
        stack: 'Error: test\n  at foo.js:10',
        code: 'ERR_TEST',
        source: 'api',
      });

      expect(provenance).toEqual({
        stack: 'Error: test\n  at foo.js:10',
        code: 'ERR_TEST',
        source: 'api',
      });
    });

    it('should extract node provenance', () => {
      const provenance = extractProvenance('node_start', {
        nodeId: 'node-123',
        nodeName: 'ProcessData',
        intent: 'Transform input data',
      });

      expect(provenance).toEqual({
        nodeId: 'node-123',
        nodeName: 'ProcessData',
        intent: 'Transform input data',
      });
    });

    it('should allow message with any provenance', () => {
      const provenance = extractProvenance('message', {
        custom: 'data',
        foo: 'bar',
      });

      expect(provenance).toEqual({
        custom: 'data',
        foo: 'bar',
      });
    });
  });

  describe('provenance validation', () => {
    it('should validate correct tool_call provenance', () => {
      expect(
        validateProvenance('tool_call', {
          toolName: 'grep',
          args: ['test'],
        })
      ).toBe(true);
    });

    it('should reject invalid tool_call provenance', () => {
      expect(
        validateProvenance('tool_call', {
          args: ['test'],
        })
      ).toBe(false);
    });

    it('should validate correct command provenance', () => {
      expect(
        validateProvenance('command', {
          cmd: 'npm test',
          exitCode: 0,
        })
      ).toBe(true);
    });

    it('should reject invalid command provenance', () => {
      expect(
        validateProvenance('command', {
          exitCode: 0,
        })
      ).toBe(false);
    });
  });

  describe('ObservationService', () => {
    it('should get observation by ID', async () => {
      const result = await service.append({
        kind: 'message',
        content: 'Test',
        provenance: {},
        scopeIds: {},
      });

      const obs = await service.get(result.observationId);
      expect(obs?.id).toBe(result.observationId);
    });

    it('should return null for non-existent observation', async () => {
      const obs = await service.get('non-existent');
      expect(obs).toBeNull();
    });

    it('should list observations by capsule', async () => {
      // Create capsule
      store.createCapsule({
        id: 'cap-1',
        type: 'session',
        intent: 'Test',
        openedAt: Date.now(),
      });

      // Create observations
      const obs1 = await service.append({
        kind: 'message',
        content: 'First',
        provenance: {},
        scopeIds: {},
        capsuleId: 'cap-1',
      });

      const obs2 = await service.append({
        kind: 'message',
        content: 'Second',
        provenance: {},
        scopeIds: {},
        capsuleId: 'cap-1',
      });

      const observations = await service.listByCapsule('cap-1');
      expect(observations).toHaveLength(2);
      expect(observations.map((o) => o.id)).toEqual([
        obs1.observationId,
        obs2.observationId,
      ]);
    });
  });
});
