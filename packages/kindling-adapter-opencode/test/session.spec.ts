/**
 * Tests for OpenCode session lifecycle
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SessionManager,
  type SessionStartOptions,
  type SessionEndSignals,
} from '../src/opencode/session.js';
import type {
  Capsule,
  Observation,
  Summary,
  ID,
  CapsuleStore,
} from '@kindling/core';
import type {
  ToolCallEvent,
  SessionStartEvent,
  MessageEvent,
} from '../src/opencode/events.js';

/**
 * Mock store for testing
 */
class MockStore implements CapsuleStore {
  capsules: Map<ID, Capsule> = new Map();
  observations: Map<ID, Observation> = new Map();
  summaries: Map<ID, Summary> = new Map();
  capsuleObservations: Map<ID, { observationId: ID; seq: number }[]> = new Map();

  createCapsule(capsule: Capsule): void {
    this.capsules.set(capsule.id, capsule);
  }

  closeCapsule(capsuleId: ID, closedAt: number): void {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule) {
      throw new Error(`Capsule ${capsuleId} not found`);
    }
    if (capsule.status === 'closed') {
      throw new Error(`Capsule ${capsuleId} already closed`);
    }
    capsule.status = 'closed';
    capsule.closedAt = closedAt;
  }

  getCapsuleById(capsuleId: ID): Capsule | undefined {
    return this.capsules.get(capsuleId);
  }

  getOpenCapsuleForSession(sessionId: string): Capsule | undefined {
    return Array.from(this.capsules.values()).find(
      c => c.status === 'open' && c.scopeIds.sessionId === sessionId
    );
  }

  insertObservation(observation: Observation): void {
    this.observations.set(observation.id, observation);
  }

  attachObservationToCapsule(capsuleId: ID, observationId: ID): void {
    const existing = this.capsuleObservations.get(capsuleId) ?? [];
    existing.push({ observationId, seq: existing.length });
    this.capsuleObservations.set(capsuleId, existing);
  }

  insertSummary(summary: Summary): void {
    this.summaries.set(summary.id, summary);
  }

  reset(): void {
    this.capsules.clear();
    this.observations.clear();
    this.summaries.clear();
    this.capsuleObservations.clear();
  }
}

describe('SessionManager', () => {
  let store: MockStore;
  let manager: SessionManager;

  beforeEach(() => {
    store = new MockStore();
    manager = new SessionManager(store);
  });

  describe('onSessionStart', () => {
    it('should create a new capsule on first start', () => {
      const options: SessionStartOptions = {
        sessionId: 's1',
        intent: 'Fix bug in auth',
        repoId: '/home/user/project',
      };

      const context = manager.onSessionStart(options);

      expect(context.sessionId).toBe('s1');
      expect(context.repoId).toBe('/home/user/project');
      expect(context.activeCapsuleId).toBeDefined();
      expect(context.eventCount).toBe(0);

      const capsule = store.getCapsuleById(context.activeCapsuleId);
      expect(capsule).toBeDefined();
      expect(capsule!.type).toBe('session');
      expect(capsule!.intent).toBe('Fix bug in auth');
      expect(capsule!.status).toBe('open');
      expect(capsule!.scopeIds.sessionId).toBe('s1');
      expect(capsule!.scopeIds.repoId).toBe('/home/user/project');
    });

    it('should use default intent if not provided', () => {
      const options: SessionStartOptions = {
        sessionId: 's1',
      };

      const context = manager.onSessionStart(options);

      const capsule = store.getCapsuleById(context.activeCapsuleId);
      expect(capsule!.intent).toBe('OpenCode session');
    });

    it('should handle missing repoId gracefully', () => {
      const options: SessionStartOptions = {
        sessionId: 's1',
        intent: 'General work',
      };

      const context = manager.onSessionStart(options);

      expect(context.repoId).toBeUndefined();

      const capsule = store.getCapsuleById(context.activeCapsuleId);
      expect(capsule!.scopeIds.sessionId).toBe('s1');
      expect(capsule!.scopeIds.repoId).toBeUndefined();
    });

    it('should return existing context if session already active', () => {
      const options: SessionStartOptions = {
        sessionId: 's1',
        intent: 'First start',
      };

      const context1 = manager.onSessionStart(options);
      const context2 = manager.onSessionStart({
        sessionId: 's1',
        intent: 'Second start',
      });

      expect(context1.activeCapsuleId).toBe(context2.activeCapsuleId);
      expect(store.capsules.size).toBe(1);
    });

    it('should detect existing open capsule from store', () => {
      // Manually create a capsule in store
      const existingCapsule: Capsule = {
        id: 'capsule-1',
        type: 'session',
        intent: 'Pre-existing',
        status: 'open',
        openedAt: Date.now(),
        scopeIds: { sessionId: 's1', repoId: '/repo' },
        observationIds: ['obs-1', 'obs-2'],
      };
      store.createCapsule(existingCapsule);

      const context = manager.onSessionStart({
        sessionId: 's1',
        repoId: '/repo',
      });

      expect(context.activeCapsuleId).toBe('capsule-1');
      expect(context.eventCount).toBe(2);
    });
  });

  describe('onEvent', () => {
    it('should process tool_call event and attach observation', () => {
      // Start session
      const context = manager.onSessionStart({
        sessionId: 's1',
        repoId: '/repo',
      });

      // Process event
      const event: ToolCallEvent = {
        type: 'tool_call',
        timestamp: Date.now(),
        sessionId: 's1',
        repoId: '/repo',
        toolName: 'read_file',
        args: { path: 'test.ts' },
        result: 'file contents',
        duration_ms: 100,
      };

      const result = manager.onEvent(event);

      expect(result.observation).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.skipped).toBeUndefined();

      // Check observation was stored
      expect(store.observations.size).toBe(1);
      const obs = store.observations.get(result.observation!.id);
      expect(obs).toBeDefined();
      expect(obs!.kind).toBe('tool_call');

      // Check observation was attached to capsule
      const attachments = store.capsuleObservations.get(context.activeCapsuleId);
      expect(attachments).toBeDefined();
      expect(attachments!.length).toBe(1);
      expect(attachments![0].observationId).toBe(result.observation!.id);

      // Check event count incremented
      expect(context.eventCount).toBe(1);
    });

    it('should skip session lifecycle events', () => {
      manager.onSessionStart({ sessionId: 's1' });

      const event: SessionStartEvent = {
        type: 'session_start',
        timestamp: Date.now(),
        sessionId: 's1',
        intent: 'Test',
      };

      const result = manager.onEvent(event);

      expect(result.skipped).toBe(true);
      expect(result.observation).toBeUndefined();
      expect(store.observations.size).toBe(0);
    });

    it('should return error for event with no active session', () => {
      const event: MessageEvent = {
        type: 'message',
        timestamp: Date.now(),
        sessionId: 'unknown-session',
        role: 'user',
        content: 'test',
      };

      const result = manager.onEvent(event);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('No active session found');
    });

    it('should process multiple events sequentially', () => {
      const context = manager.onSessionStart({ sessionId: 's1' });

      const events: ToolCallEvent[] = [
        {
          type: 'tool_call',
          timestamp: Date.now(),
          sessionId: 's1',
          toolName: 'read_file',
          args: { path: 'a.ts' },
        },
        {
          type: 'tool_call',
          timestamp: Date.now() + 1,
          sessionId: 's1',
          toolName: 'read_file',
          args: { path: 'b.ts' },
        },
        {
          type: 'tool_call',
          timestamp: Date.now() + 2,
          sessionId: 's1',
          toolName: 'write_file',
          args: { path: 'c.ts' },
        },
      ];

      events.forEach(event => {
        const result = manager.onEvent(event);
        expect(result.observation).toBeDefined();
      });

      expect(context.eventCount).toBe(3);
      expect(store.observations.size).toBe(3);

      const attachments = store.capsuleObservations.get(context.activeCapsuleId);
      expect(attachments!.length).toBe(3);
      expect(attachments![0].seq).toBe(0);
      expect(attachments![1].seq).toBe(1);
      expect(attachments![2].seq).toBe(2);
    });

    it('should preserve observation timestamps from events', () => {
      manager.onSessionStart({ sessionId: 's1' });

      const eventTimestamp = 1234567890000;
      const event: MessageEvent = {
        type: 'message',
        timestamp: eventTimestamp,
        sessionId: 's1',
        role: 'user',
        content: 'test message',
      };

      const result = manager.onEvent(event);

      expect(result.observation!.ts).toBe(eventTimestamp);
    });
  });

  describe('onSessionEnd', () => {
    it('should close the active capsule', () => {
      const context = manager.onSessionStart({ sessionId: 's1' });

      const result = manager.onSessionEnd('s1');

      expect(result.id).toBe(context.activeCapsuleId);
      expect(result.status).toBe('closed');
      expect(result.closedAt).toBeDefined();
      expect(result.closedAt).toBeGreaterThan(0);

      const capsule = store.getCapsuleById(context.activeCapsuleId);
      expect(capsule!.status).toBe('closed');
      expect(capsule!.closedAt).toBeDefined();
    });

    it('should remove session from active sessions', () => {
      manager.onSessionStart({ sessionId: 's1' });
      expect(manager.isSessionActive('s1')).toBe(true);

      manager.onSessionEnd('s1');

      expect(manager.isSessionActive('s1')).toBe(false);
    });

    it('should create summary if provided', () => {
      const context = manager.onSessionStart({ sessionId: 's1' });

      const signals: SessionEndSignals = {
        reason: 'completed',
        summaryContent: 'Fixed authentication bug in auth.ts',
        summaryConfidence: 0.9,
        evidenceRefs: ['obs-1', 'obs-2'],
      };

      manager.onSessionEnd('s1', signals);

      expect(store.summaries.size).toBe(1);
      const summary = Array.from(store.summaries.values())[0];
      expect(summary.capsuleId).toBe(context.activeCapsuleId);
      expect(summary.content).toBe('Fixed authentication bug in auth.ts');
      expect(summary.confidence).toBe(0.9);
      expect(summary.evidenceRefs).toEqual(['obs-1', 'obs-2']);
    });

    it('should use default confidence if not provided', () => {
      manager.onSessionStart({ sessionId: 's1' });

      manager.onSessionEnd('s1', {
        summaryContent: 'Summary without confidence',
      });

      const summary = Array.from(store.summaries.values())[0];
      expect(summary.confidence).toBe(0.8);
    });

    it('should throw error for unknown session', () => {
      expect(() => {
        manager.onSessionEnd('unknown-session');
      }).toThrow('No active session found');
    });
  });

  describe('Session management', () => {
    it('should track multiple active sessions', () => {
      manager.onSessionStart({ sessionId: 's1' });
      manager.onSessionStart({ sessionId: 's2' });
      manager.onSessionStart({ sessionId: 's3' });

      expect(manager.getActiveSessions()).toEqual(['s1', 's2', 's3']);
    });

    it('should get session context', () => {
      const context = manager.onSessionStart({
        sessionId: 's1',
        repoId: '/repo',
      });

      const retrieved = manager.getSession('s1');

      expect(retrieved).toBeDefined();
      expect(retrieved!.sessionId).toBe('s1');
      expect(retrieved!.repoId).toBe('/repo');
      expect(retrieved!.activeCapsuleId).toBe(context.activeCapsuleId);
    });

    it('should return undefined for unknown session', () => {
      const context = manager.getSession('unknown');
      expect(context).toBeUndefined();
    });

    it('should check if session is active', () => {
      expect(manager.isSessionActive('s1')).toBe(false);

      manager.onSessionStart({ sessionId: 's1' });
      expect(manager.isSessionActive('s1')).toBe(true);

      manager.onSessionEnd('s1');
      expect(manager.isSessionActive('s1')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle session with many events', () => {
      const context = manager.onSessionStart({ sessionId: 's1' });

      // Process 100 events
      for (let i = 0; i < 100; i++) {
        const event: MessageEvent = {
          type: 'message',
          timestamp: Date.now() + i,
          sessionId: 's1',
          role: 'user',
          content: `Message ${i}`,
        };
        manager.onEvent(event);
      }

      expect(context.eventCount).toBe(100);
      expect(store.observations.size).toBe(100);

      const attachments = store.capsuleObservations.get(context.activeCapsuleId);
      expect(attachments!.length).toBe(100);
    });

    it('should handle interleaved events from multiple sessions', () => {
      manager.onSessionStart({ sessionId: 's1' });
      manager.onSessionStart({ sessionId: 's2' });

      const event1: MessageEvent = {
        type: 'message',
        timestamp: Date.now(),
        sessionId: 's1',
        role: 'user',
        content: 'Session 1 message',
      };

      const event2: MessageEvent = {
        type: 'message',
        timestamp: Date.now() + 1,
        sessionId: 's2',
        role: 'user',
        content: 'Session 2 message',
      };

      manager.onEvent(event1);
      manager.onEvent(event2);
      manager.onEvent(event1);

      const ctx1 = manager.getSession('s1')!;
      const ctx2 = manager.getSession('s2')!;

      expect(ctx1.eventCount).toBe(2);
      expect(ctx2.eventCount).toBe(1);

      const attachments1 = store.capsuleObservations.get(ctx1.activeCapsuleId);
      const attachments2 = store.capsuleObservations.get(ctx2.activeCapsuleId);

      expect(attachments1!.length).toBe(2);
      expect(attachments2!.length).toBe(1);
    });

    it('should handle crash recovery via store detection', () => {
      // Simulate a crash: capsule exists in store but not in manager
      const orphanCapsule: Capsule = {
        id: 'orphan-capsule',
        type: 'session',
        intent: 'Interrupted session',
        status: 'open',
        openedAt: Date.now() - 60000,
        scopeIds: { sessionId: 'orphan-session' },
        observationIds: ['obs-1'],
      };
      store.createCapsule(orphanCapsule);

      // Manager should detect and reuse the orphan capsule
      const context = manager.onSessionStart({
        sessionId: 'orphan-session',
      });

      expect(context.activeCapsuleId).toBe('orphan-capsule');
      expect(context.eventCount).toBe(1);

      // Should be able to continue adding events
      const event: MessageEvent = {
        type: 'message',
        timestamp: Date.now(),
        sessionId: 'orphan-session',
        role: 'user',
        content: 'Recovery message',
      };

      const result = manager.onEvent(event);
      expect(result.observation).toBeDefined();
      expect(context.eventCount).toBe(2);
    });
  });
});
