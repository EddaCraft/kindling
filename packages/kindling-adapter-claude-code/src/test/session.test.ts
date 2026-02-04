/**
 * Session management tests for Claude Code adapter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../claude-code/session.js';
import type { ClaudeCodeEvent } from '../claude-code/events.js';
import type { Capsule } from '@kindling/core';

// Mock store implementation
function createMockStore() {
  const observations = new Map();
  const capsules = new Map();
  const capsuleObservations = new Map<string, string[]>();
  const summaries = new Map();

  return {
    observations,
    capsules,
    capsuleObservations,
    summaries,

    createCapsule: vi.fn((capsule) => {
      capsules.set(capsule.id, capsule);
      capsuleObservations.set(capsule.id, []);
    }),

    getCapsuleById: vi.fn((id) => capsules.get(id)),

    closeCapsule: vi.fn((id, closedAt) => {
      const capsule = capsules.get(id);
      if (capsule) {
        capsule.status = 'closed';
        capsule.closedAt = closedAt;
      }
    }),

    getOpenCapsuleForSession: vi.fn((_sessionId): Capsule | undefined => undefined),

    insertObservation: vi.fn((observation) => {
      observations.set(observation.id, observation);
    }),

    attachObservationToCapsule: vi.fn((capsuleId, observationId) => {
      const obs = capsuleObservations.get(capsuleId) || [];
      obs.push(observationId);
      capsuleObservations.set(capsuleId, obs);
    }),

    insertSummary: vi.fn((summary) => {
      summaries.set(summary.id, summary);
    }),
  };
}

describe('SessionManager', () => {
  let store: ReturnType<typeof createMockStore>;
  let manager: SessionManager;

  beforeEach(() => {
    store = createMockStore();
    manager = new SessionManager(store);
  });

  describe('onSessionStart', () => {
    it('should create a new capsule for new session', () => {
      const context = manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
      });

      expect(context.sessionId).toBe('session-1');
      expect(context.cwd).toBe('/project');
      expect(context.eventCount).toBe(0);
      expect(store.createCapsule).toHaveBeenCalledTimes(1);
    });

    it('should return existing context for active session', () => {
      const first = manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
      });

      const second = manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
      });

      expect(first.activeCapsuleId).toBe(second.activeCapsuleId);
      expect(store.createCapsule).toHaveBeenCalledTimes(1);
    });

    it('should use custom intent', () => {
      manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
        intent: 'Debug authentication',
      });

      expect(store.createCapsule).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'Debug authentication' })
      );
    });

    it('should check store for existing open capsule', () => {
      const existingCapsule = {
        id: 'existing-capsule',
        type: 'session' as const,
        status: 'open' as const,
        intent: 'Test session',
        scopeIds: { sessionId: 'session-1' },
        observationIds: ['obs-1', 'obs-2'],
        openedAt: Date.now() - 1000,
      };
      store.getOpenCapsuleForSession.mockReturnValueOnce(existingCapsule);

      const context = manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
      });

      expect(context.activeCapsuleId).toBe('existing-capsule');
      expect(context.eventCount).toBe(2);
      expect(store.createCapsule).not.toHaveBeenCalled();
    });
  });

  describe('onEvent', () => {
    beforeEach(() => {
      manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
      });
    });

    it('should create observation for tool use event', () => {
      const event: ClaudeCodeEvent = {
        type: 'post_tool_use',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/project',
        toolName: 'Read',
        toolInput: { file_path: '/src/index.ts' },
      };

      const result = manager.onEvent(event);

      expect(result.observation).toBeDefined();
      expect(store.insertObservation).toHaveBeenCalledTimes(1);
      expect(store.attachObservationToCapsule).toHaveBeenCalledTimes(1);
    });

    it('should increment event count', () => {
      const event: ClaudeCodeEvent = {
        type: 'post_tool_use',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/project',
        toolName: 'Read',
        toolInput: { file_path: '/src/index.ts' },
      };

      manager.onEvent(event);
      manager.onEvent(event);

      const context = manager.getSession('session-1');
      expect(context?.eventCount).toBe(2);
    });

    it('should return error for unknown session', () => {
      const event: ClaudeCodeEvent = {
        type: 'post_tool_use',
        timestamp: Date.now(),
        sessionId: 'unknown-session',
        cwd: '/project',
        toolName: 'Read',
        toolInput: { file_path: '/src/index.ts' },
      };

      const result = manager.onEvent(event);

      expect(result.error).toContain('No active session found');
    });

    it('should skip session_start events', () => {
      const event: ClaudeCodeEvent = {
        type: 'session_start',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/project',
      };

      const result = manager.onEvent(event);

      expect(result.skipped).toBe(true);
      expect(store.insertObservation).not.toHaveBeenCalled();
    });

    it('should capture user prompt events', () => {
      const event: ClaudeCodeEvent = {
        type: 'user_prompt',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/project',
        userContent: 'Hello Claude',
      };

      const result = manager.onEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.observation?.kind).toBe('message');
    });
  });

  describe('onStop', () => {
    beforeEach(() => {
      manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
      });
    });

    it('should close capsule', () => {
      const capsule = manager.onStop('session-1');

      expect(capsule.status).toBe('closed');
      expect(capsule.closedAt).toBeDefined();
      expect(store.closeCapsule).toHaveBeenCalledTimes(1);
    });

    it('should remove session from active sessions', () => {
      manager.onStop('session-1');

      expect(manager.isSessionActive('session-1')).toBe(false);
    });

    it('should create summary when provided', () => {
      manager.onStop('session-1', {
        summaryContent: 'Fixed authentication bug',
        summaryConfidence: 0.9,
      });

      expect(store.insertSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Fixed authentication bug',
          confidence: 0.9,
        })
      );
    });

    it('should throw for unknown session', () => {
      expect(() => manager.onStop('unknown-session')).toThrow('No active session found');
    });
  });

  describe('session queries', () => {
    it('should return session context', () => {
      manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
      });

      const context = manager.getSession('session-1');
      expect(context?.sessionId).toBe('session-1');
    });

    it('should return undefined for unknown session', () => {
      expect(manager.getSession('unknown')).toBeUndefined();
    });

    it('should check if session is active', () => {
      manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
      });

      expect(manager.isSessionActive('session-1')).toBe(true);
      expect(manager.isSessionActive('unknown')).toBe(false);
    });

    it('should list active sessions', () => {
      manager.onSessionStart({ sessionId: 'session-1', cwd: '/project1' });
      manager.onSessionStart({ sessionId: 'session-2', cwd: '/project2' });

      const sessions = manager.getActiveSessions();
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
      expect(sessions).toHaveLength(2);
    });

    it('should return session stats', () => {
      manager.onSessionStart({
        sessionId: 'session-1',
        cwd: '/project',
      });

      // Add some events
      manager.onEvent({
        type: 'post_tool_use',
        timestamp: Date.now(),
        sessionId: 'session-1',
        cwd: '/project',
        toolName: 'Read',
        toolInput: { file_path: '/test' },
      });

      const stats = manager.getSessionStats('session-1');
      expect(stats?.eventCount).toBe(1);
      expect(stats?.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
