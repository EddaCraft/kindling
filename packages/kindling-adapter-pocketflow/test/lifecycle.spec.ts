/**
 * Tests for PocketFlow lifecycle integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Observation, Capsule } from '@kindling/core';
import {
  KindlingNode,
  KindlingFlow,
  type KindlingNodeContext,
  type PocketFlowStore,
} from '../src/pocketflow/lifecycle.js';

/**
 * Mock store that captures all operations for testing
 */
class MockPocketFlowStore implements PocketFlowStore {
  observations: Observation[] = [];
  capsules: Capsule[] = [];
  capsuleObservations: Map<string, string[]> = new Map();
  closedCapsules: Map<string, number> = new Map();

  insertObservation(observation: Observation): void {
    this.observations.push(observation);
  }

  createCapsule(capsule: Capsule): void {
    this.capsules.push(capsule);
    this.capsuleObservations.set(capsule.id, []);
  }

  closeCapsule(capsuleId: string, closedAt?: number): void {
    this.closedCapsules.set(capsuleId, closedAt ?? Date.now());
  }

  attachObservationToCapsule(capsuleId: string, observationId: string): void {
    const ids = this.capsuleObservations.get(capsuleId);
    if (ids) {
      ids.push(observationId);
    }
  }

  getObservationsByKind(kind: string): Observation[] {
    return this.observations.filter(o => o.kind === kind);
  }

  reset(): void {
    this.observations = [];
    this.capsules = [];
    this.capsuleObservations.clear();
    this.closedCapsules.clear();
  }
}

describe('KindlingNode', () => {
  let store: MockPocketFlowStore;
  let context: KindlingNodeContext;

  beforeEach(() => {
    store = new MockPocketFlowStore();
    context = {
      store,
      scopeIds: { sessionId: 'test-session', repoId: 'test-repo' },
    };
  });

  describe('successful run', () => {
    it('should create a capsule on prep', async () => {
      const node = new KindlingNode({ name: 'test-node' });
      await node.prep(context);

      expect(store.capsules.length).toBe(1);
      expect(store.capsules[0].type).toBe('pocketflow_node');
      expect(store.capsules[0].status).toBe('open');
    });

    it('should emit node_start observation on prep', async () => {
      const node = new KindlingNode({ name: 'test-node', intent: 'test' });
      await node.prep(context);

      const startObs = store.getObservationsByKind('node_start');
      expect(startObs.length).toBe(1);
      expect(startObs[0].content).toContain('test-node');
      expect(startObs[0].provenance).toMatchObject({
        nodeName: 'test-node',
        intent: 'test',
      });
    });

    it('should emit node_output and node_end on post', async () => {
      const node = new KindlingNode({ name: 'test-node' });
      await node.prep(context);
      await node.post(context, undefined, { result: 'success' });

      const outputObs = store.getObservationsByKind('node_output');
      expect(outputObs.length).toBe(1);
      expect(outputObs[0].content).toContain('result');

      const endObs = store.getObservationsByKind('node_end');
      expect(endObs.length).toBe(1);
      expect(endObs[0].provenance).toMatchObject({
        nodeName: 'test-node',
        status: 'success',
      });
    });

    it('should close capsule on post', async () => {
      const node = new KindlingNode({ name: 'test-node' });
      await node.prep(context);
      await node.post(context, undefined, { result: 'success' });

      expect(store.closedCapsules.size).toBe(1);
    });

    it('should attach all observations to capsule', async () => {
      const node = new KindlingNode({ name: 'test-node' });
      await node.prep(context);
      await node.post(context, undefined, { result: 'success' });

      const capsuleId = store.capsules[0].id;
      const attachedIds = store.capsuleObservations.get(capsuleId);

      // Should have node_start, node_output, node_end
      expect(attachedIds?.length).toBe(3);
    });

    it('should track duration', async () => {
      const node = new KindlingNode({ name: 'test-node' });
      await node.prep(context);

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));

      await node.post(context, undefined, { result: 'success' });

      const endObs = store.getObservationsByKind('node_end');
      expect((endObs[0].provenance as Record<string, unknown>).duration).toBeGreaterThanOrEqual(10);
    });
  });

  describe('failed run', () => {
    it('should emit node_error on failure', async () => {
      const node = new KindlingNode({ name: 'failing-node' });
      await node.prep(context);

      await expect(
        node.execFallback(undefined, new Error('Test error'))
      ).rejects.toThrow('Test error');

      const errorObs = store.getObservationsByKind('node_error');
      expect(errorObs.length).toBe(1);
      expect(errorObs[0].content).toContain('Test error');
      expect(errorObs[0].provenance).toMatchObject({
        nodeName: 'failing-node',
        errorMessage: 'Test error',
      });
    });

    it('should emit node_end with error status on failure', async () => {
      const node = new KindlingNode({ name: 'failing-node' });
      await node.prep(context);

      try {
        await node.execFallback(undefined, new Error('Test error'));
      } catch {
        // Expected
      }

      const endObs = store.getObservationsByKind('node_end');
      expect(endObs.length).toBe(1);
      expect(endObs[0].provenance).toMatchObject({
        nodeName: 'failing-node',
        status: 'error',
      });
    });

    it('should close capsule on failure', async () => {
      const node = new KindlingNode({ name: 'failing-node' });
      await node.prep(context);

      try {
        await node.execFallback(undefined, new Error('Test error'));
      } catch {
        // Expected
      }

      expect(store.closedCapsules.size).toBe(1);
    });
  });

  describe('output truncation', () => {
    it('should truncate large outputs', async () => {
      const node = new KindlingNode({ name: 'large-output-node' });
      await node.prep(context);

      const largeOutput = 'x'.repeat(3000);
      await node.post(context, undefined, largeOutput);

      const outputObs = store.getObservationsByKind('node_output');
      expect(outputObs[0].content.length).toBeLessThan(3000);
      expect(outputObs[0].content).toContain('[truncated]');
    });

    it('should handle undefined output', async () => {
      const node = new KindlingNode({ name: 'undefined-output-node' });
      await node.prep(context);
      await node.post(context, undefined, undefined);

      const outputObs = store.getObservationsByKind('node_output');
      expect(outputObs[0].content).toBe('undefined');
    });

    it('should handle object output', async () => {
      const node = new KindlingNode({ name: 'object-output-node' });
      await node.prep(context);
      await node.post(context, undefined, { foo: 'bar', count: 42 });

      const outputObs = store.getObservationsByKind('node_output');
      expect(outputObs[0].content).toContain('foo');
      expect(outputObs[0].content).toContain('bar');
    });
  });

  describe('scope propagation', () => {
    it('should propagate scopeIds to observations', async () => {
      const node = new KindlingNode({ name: 'scoped-node' });
      context.scopeIds = {
        sessionId: 'session-123',
        repoId: 'repo-456',
        userId: 'user-789',
      };
      await node.prep(context);

      const startObs = store.getObservationsByKind('node_start');
      expect(startObs[0].scopeIds).toEqual({
        sessionId: 'session-123',
        repoId: 'repo-456',
        userId: 'user-789',
      });
    });

    it('should propagate scopeIds to capsule', async () => {
      const node = new KindlingNode({ name: 'scoped-node' });
      context.scopeIds = { sessionId: 'session-123' };
      await node.prep(context);

      expect(store.capsules[0].scopeIds).toEqual({ sessionId: 'session-123' });
    });
  });

  describe('custom node with logic', () => {
    it('should run full lifecycle', async () => {
      class TestNode extends KindlingNode {
        async exec(_prepRes: unknown): Promise<string> {
          return 'run result';
        }
      }

      const node = new TestNode({ name: 'custom-node' });
      await node.run(context);

      // Should have all observations
      expect(store.getObservationsByKind('node_start').length).toBe(1);
      expect(store.getObservationsByKind('node_output').length).toBe(1);
      expect(store.getObservationsByKind('node_end').length).toBe(1);

      // Output should contain run result
      const outputObs = store.getObservationsByKind('node_output');
      expect(outputObs[0].content).toContain('run result');
    });
  });
});

describe('KindlingFlow', () => {
  let store: MockPocketFlowStore;
  let context: KindlingNodeContext;

  beforeEach(() => {
    store = new MockPocketFlowStore();
    context = {
      store,
      scopeIds: { sessionId: 'test-session' },
    };
  });

  it('should create flow-level capsule', async () => {
    const node = new KindlingNode({ name: 'inner-node' });
    const flow = new KindlingFlow(node, { name: 'test-flow', intent: 'workflow' });

    await flow.prep(context);

    // Flow should create its own capsule
    const flowCapsule = store.capsules.find(c =>
      store.getObservationsByKind('node_start')
        .some(o =>
          store.capsuleObservations.get(c.id)?.includes(o.id) &&
          (o.provenance as Record<string, unknown>).nodeType === 'flow'
        )
    );
    expect(flowCapsule).toBeDefined();
    expect(flowCapsule?.intent).toBe('workflow');
  });

  it('should emit flow start and end observations', async () => {
    const node = new KindlingNode({ name: 'inner-node' });
    const flow = new KindlingFlow(node, { name: 'test-flow' });

    await flow.prep(context);
    await flow.post(context, undefined, undefined);

    const startObs = store.getObservationsByKind('node_start')
      .filter(o => (o.provenance as Record<string, unknown>).nodeType === 'flow');
    expect(startObs.length).toBe(1);
    expect(startObs[0].content).toContain('test-flow');

    const endObs = store.getObservationsByKind('node_end')
      .filter(o => (o.provenance as Record<string, unknown>).nodeType === 'flow');
    expect(endObs.length).toBe(1);
  });

  it('should close flow capsule', async () => {
    const node = new KindlingNode({ name: 'inner-node' });
    const flow = new KindlingFlow(node, { name: 'test-flow' });

    await flow.prep(context);
    await flow.post(context, undefined, undefined);

    // At least one capsule should be closed (the flow's)
    expect(store.closedCapsules.size).toBeGreaterThanOrEqual(1);
  });

  it('should track flow duration', async () => {
    const node = new KindlingNode({ name: 'inner-node' });
    const flow = new KindlingFlow(node, { name: 'test-flow' });

    await flow.prep(context);
    await new Promise(resolve => setTimeout(resolve, 10));
    await flow.post(context, undefined, undefined);

    const endObs = store.getObservationsByKind('node_end')
      .filter(o => (o.provenance as Record<string, unknown>).nodeType === 'flow');

    expect((endObs[0].provenance as Record<string, unknown>).duration).toBeGreaterThanOrEqual(10);
  });
});
