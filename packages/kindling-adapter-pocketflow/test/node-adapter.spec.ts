import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import { KindlingService } from '@kindling/core';
import { NodeAdapter, NodeStatus, type NodeExecutionEvent } from '../src/index.js';
import type Database from 'better-sqlite3';

describe('PocketFlow Node Adapter', () => {
  let db: Database.Database;
  let store: SqliteKindlingStore;
  let service: KindlingService;
  let adapter: NodeAdapter;

  beforeEach(() => {
    db = openDatabase();
    store = new SqliteKindlingStore(db);
    service = new KindlingService({ store });
    adapter = new NodeAdapter({
      service,
      repoId: 'test-repo',
      agentId: 'test-agent',
    });
  });

  afterEach(() => {
    db.close();
  });

  it('should create capsule for node execution', () => {
    const startEvent: NodeExecutionEvent = {
      node: {
        id: 'node1',
        name: 'test-authentication',
        type: 'test',
      },
      status: NodeStatus.Running,
      startTimeMs: Date.now(),
    };

    const capsule = adapter.onNodeStart(startEvent);

    expect(capsule.type).toBe('pocketflow_node');
    expect(capsule.intent).toBe('test'); // Derived from 'test-authentication'
    expect(capsule.scope.repoId).toBe('test-repo');
    expect(capsule.status).toBe('open');

    // Verify node start observation was captured
    const observations = store.listCapsuleObservations(capsule.id);
    expect(observations).toHaveLength(1);
    expect(observations[0].kind).toBe('node_start');
    expect(observations[0].provenance).toMatchObject({
      nodeName: 'test-authentication',
      nodeId: 'node1',
    });
  });

  it('should derive intent from node name', () => {
    const testCases = [
      { name: 'run-tests', expectedIntent: 'test' },
      { name: 'build-project', expectedIntent: 'build' },
      { name: 'deploy-to-prod', expectedIntent: 'deploy' },
      { name: 'debug-issue', expectedIntent: 'debug' },
      { name: 'refactor-auth', expectedIntent: 'refactor' },
      { name: 'unknown-task', expectedIntent: 'general' },
    ];

    testCases.forEach(({ name, expectedIntent }) => {
      const capsule = adapter.onNodeStart({
        node: { id: name, name },
        status: NodeStatus.Running,
      });

      expect(capsule.intent).toBe(expectedIntent);
    });
  });

  it('should capture successful node execution', () => {
    const node = { id: 'node1', name: 'build-app' };

    const capsule = adapter.onNodeStart({
      node,
      status: NodeStatus.Running,
      input: { target: 'production' },
    });

    const closed = adapter.onNodeEnd({
      node,
      status: NodeStatus.Success,
      output: { buildTime: '2.5s', size: '1.2MB' },
    });

    expect(closed).not.toBeNull();
    expect(closed?.status).toBe('closed');

    // Verify observations
    const observations = store.listCapsuleObservations(capsule.id);
    expect(observations.length).toBeGreaterThanOrEqual(3); // start, output, end

    const outputObs = observations.find(o => o.kind === 'node_output');
    expect(outputObs).toBeDefined();
    expect(outputObs?.provenance.status).toBe('success');

    // Verify summary
    const summary = store.getLatestSummaryForCapsule(capsule.id);
    expect(summary).not.toBeNull();
    expect(summary?.content).toContain('build-app');
    expect(summary?.content).toContain('completed successfully');
  });

  it('should capture failed node execution', () => {
    const node = { id: 'node1', name: 'deploy-service' };

    const capsule = adapter.onNodeStart({
      node,
      status: NodeStatus.Running,
    });

    const error = new Error('Connection timeout');
    error.stack = 'Error: Connection timeout\n  at deploy.ts:42';

    const closed = adapter.onNodeEnd({
      node,
      status: NodeStatus.Failed,
      error,
    });

    expect(closed).not.toBeNull();

    // Verify error observation
    const observations = store.listCapsuleObservations(capsule.id);
    const errorObs = observations.find(o => o.kind === 'node_error');

    expect(errorObs).toBeDefined();
    expect(errorObs?.content).toBe('Connection timeout');
    expect(errorObs?.provenance.stack).toContain('deploy.ts:42');

    // Verify summary mentions failure
    const summary = store.getLatestSummaryForCapsule(capsule.id);
    expect(summary?.content).toContain('failed');
    expect(summary?.content).toContain('Connection timeout');
  });

  it('should calculate confidence based on execution history', () => {
    const node = { id: 'node1', name: 'test-runner' };

    // First execution: success
    adapter.onNodeStart({ node, status: NodeStatus.Running });
    adapter.onNodeEnd({ node, status: NodeStatus.Success });

    // Second execution: success
    adapter.onNodeStart({ node, status: NodeStatus.Running });
    adapter.onNodeEnd({ node, status: NodeStatus.Success });

    // Third execution: success
    adapter.onNodeStart({ node, status: NodeStatus.Running });
    const capsule3 = adapter.onNodeEnd({ node, status: NodeStatus.Success });

    const summary3 = store.getLatestSummaryForCapsule(capsule3!.id);
    expect(summary3?.content).toContain('100%'); // 3/3 success

    // Fourth execution: failure
    adapter.onNodeStart({ node, status: NodeStatus.Running });
    const capsule4 = adapter.onNodeEnd({
      node,
      status: NodeStatus.Failed,
      error: new Error('Test failed'),
    });

    const summary4 = store.getLatestSummaryForCapsule(capsule4!.id);
    // Confidence should be lower (failure penalty applied)
    expect(summary4?.content).toMatch(/\[confidence: [0-9]+%\]/);
  });

  it('should bound large outputs to prevent storage bloat', () => {
    const node = { id: 'node1', name: 'generate-report' };

    const capsule = adapter.onNodeStart({
      node,
      status: NodeStatus.Running,
    });

    // Large output
    const largeOutput = 'x'.repeat(10000);

    adapter.onNodeEnd({
      node,
      status: NodeStatus.Success,
      output: largeOutput,
    });

    const observations = store.listCapsuleObservations(capsule.id);
    const outputObs = observations.find(o => o.kind === 'node_output');

    // Should be truncated
    expect(outputObs?.content?.length).toBeLessThan(600);
    expect(outputObs?.content).toContain('[truncated]');
  });

  it('should handle multiple concurrent node executions', () => {
    const node1 = { id: 'node1', name: 'task-A' };
    const node2 = { id: 'node2', name: 'task-B' };

    const capsule1 = adapter.onNodeStart({
      node: node1,
      status: NodeStatus.Running,
    });

    const capsule2 = adapter.onNodeStart({
      node: node2,
      status: NodeStatus.Running,
    });

    expect(capsule1.id).not.toBe(capsule2.id);

    adapter.onNodeEnd({ node: node1, status: NodeStatus.Success });
    adapter.onNodeEnd({ node: node2, status: NodeStatus.Success });

    const closed1 = store.getCapsule(capsule1.id);
    const closed2 = store.getCapsule(capsule2.id);

    expect(closed1?.status).toBe('closed');
    expect(closed2?.status).toBe('closed');
  });
});
