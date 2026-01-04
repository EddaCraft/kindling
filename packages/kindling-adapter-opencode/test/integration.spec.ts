import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalRetrievalProvider } from '@kindling/provider-local';
import { KindlingService, CapsuleType } from '@kindling/core';
import { SessionAdapter, OpenCodeEventType, type OpenCodeEvent } from '../src/index.js';
import type Database from 'better-sqlite3';

describe('M2 End-to-End Integration', () => {
  let db: Database.Database;
  let store: SqliteKindlingStore;
  let provider: LocalRetrievalProvider;
  let service: KindlingService;
  let adapter: SessionAdapter;

  beforeEach(() => {
    // Set up the full stack
    db = openDatabase();
    store = new SqliteKindlingStore(db);
    provider = new LocalRetrievalProvider(store);
    service = new KindlingService({ store, provider });
    adapter = new SessionAdapter({ service });
  });

  afterEach(() => {
    db.close();
  });

  it('should complete a full session lifecycle with retrieval', () => {
    const sessionId = 'test-session-1';
    const repoId = 'test-repo';

    // === Session Start ===
    const capsule = adapter.onSessionStart(sessionId, { repoId, intent: 'debug' });

    expect(capsule.type).toBe(CapsuleType.Session);
    expect(capsule.scope.sessionId).toBe(sessionId);
    expect(capsule.scope.repoId).toBe(repoId);
    expect(capsule.intent).toBe('debug');

    // === Capture Events ===

    // Event 1: Tool call
    const toolCallEvent: OpenCodeEvent = {
      type: OpenCodeEventType.ToolCall,
      sessionId,
      repoId,
      data: {
        toolName: 'Read',
        args: { path: '/src/auth.ts' },
        result: 'File contents...',
      },
    };
    adapter.onEvent(toolCallEvent);

    // Event 2: Command run
    const commandEvent: OpenCodeEvent = {
      type: OpenCodeEventType.CommandRun,
      sessionId,
      repoId,
      data: {
        command: 'npm test',
        exitCode: 1,
        output: 'Test failed: authentication error',
      },
    };
    adapter.onEvent(commandEvent);

    // Event 3: Error
    const errorEvent: OpenCodeEvent = {
      type: OpenCodeEventType.Error,
      sessionId,
      repoId,
      data: {
        message: 'Authentication failed',
        type: 'AuthError',
        stack: 'Error: Authentication failed\n  at login.ts:42',
      },
    };
    adapter.onEvent(errorEvent);

    // Event 4: File diff
    const diffEvent: OpenCodeEvent = {
      type: OpenCodeEventType.FileDiff,
      sessionId,
      repoId,
      data: {
        paths: ['/src/auth.ts'],
        diff: '+ Fixed token validation',
      },
    };
    adapter.onEvent(diffEvent);

    // === Verify Observations Attached to Capsule ===
    const observations = store.listCapsuleObservations(capsule.id);
    expect(observations).toHaveLength(4);
    expect(observations[0].kind).toBe('tool_call');
    expect(observations[1].kind).toBe('command');
    expect(observations[2].kind).toBe('error');
    expect(observations[3].kind).toBe('file_diff');

    // === Pin an Important Finding ===
    const errorObs = observations[2];
    service.pin({
      targetType: 'observation' as any,
      targetId: errorObs.id,
      note: 'Root cause of auth bug',
    });

    // === Retrieve Context ===
    const retrievalResult = service.retrieve({
      query: 'authentication',
      scope: { sessionId },
    });

    // Should have pins
    expect(retrievalResult.pins).toHaveLength(1);
    expect(retrievalResult.pins[0].note).toBe('Root cause of auth bug');

    // Should have provider hits matching "authentication"
    expect(retrievalResult.providerHits.length).toBeGreaterThan(0);
    const errorHit = retrievalResult.providerHits.find(
      hit => hit.targetId === errorObs.id
    );
    expect(errorHit).toBeDefined();
    expect(errorHit?.why).toContain('error');

    // Should have evidence snippets
    expect(retrievalResult.evidenceSnippets.length).toBeGreaterThan(0);

    // === Close Session with Summary ===
    const closedCapsule = adapter.onSessionEnd(sessionId, {
      summaryContent: 'Fixed authentication bug in token validation',
    });

    expect(closedCapsule).not.toBeNull();
    expect(closedCapsule?.status).toBe('closed');

    // Verify summary was created
    const summary = store.getLatestSummaryForCapsule(capsule.id);
    expect(summary).not.toBeNull();
    expect(summary?.content).toBe('Fixed authentication bug in token validation');
    expect(summary?.evidenceRefs).toHaveLength(4);

    // === Retrieve After Session Close ===
    const finalRetrieval = service.retrieve({
      query: 'authentication',
      scope: { sessionId },
    });

    // Should still have pins
    expect(finalRetrieval.pins).toHaveLength(1);

    // Summary should not be in summaries anymore (capsule is closed)
    // But provider hits should still work
    expect(finalRetrieval.providerHits.length).toBeGreaterThan(0);
  });

  it('should handle multiple concurrent sessions', () => {
    const session1 = 'session-1';
    const session2 = 'session-2';

    // Start two sessions
    const capsule1 = adapter.onSessionStart(session1);
    const capsule2 = adapter.onSessionStart(session2);

    expect(capsule1.id).not.toBe(capsule2.id);

    // Add events to session 1
    adapter.onEvent({
      type: OpenCodeEventType.Message,
      sessionId: session1,
      data: { content: 'Session 1 message' },
    });

    // Add events to session 2
    adapter.onEvent({
      type: OpenCodeEventType.Message,
      sessionId: session2,
      data: { content: 'Session 2 message' },
    });

    // Verify observations are in the correct capsules
    const obs1 = store.listCapsuleObservations(capsule1.id);
    const obs2 = store.listCapsuleObservations(capsule2.id);

    expect(obs1).toHaveLength(1);
    expect(obs2).toHaveLength(1);
    expect(obs1[0].content).toContain('Session 1');
    expect(obs2[0].content).toContain('Session 2');

    // Retrieve scoped to session 1
    const result1 = service.retrieve({
      scope: { sessionId: session1 },
    });

    // Should only get hits from session 1
    const session1Hits = result1.providerHits.filter(
      hit => {
        const obs = store.getObservation(hit.targetId);
        return obs?.scope.sessionId === session1;
      }
    );
    expect(session1Hits.length).toBeGreaterThan(0);

    // Close both sessions
    adapter.onSessionEnd(session1);
    adapter.onSessionEnd(session2);

    const closed1 = store.getCapsule(capsule1.id);
    const closed2 = store.getCapsule(capsule2.id);

    expect(closed1?.status).toBe('closed');
    expect(closed2?.status).toBe('closed');
  });
});
