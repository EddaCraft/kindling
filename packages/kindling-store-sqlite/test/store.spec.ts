import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase } from '../src/db/open.js';
import { SqliteKindlingStore } from '../src/store/sqlite-store.js';
import { ObservationKind, CapsuleType, CapsuleStatus, PinTargetType } from '@kindling/core';
import type Database from 'better-sqlite3';

describe('SqliteKindlingStore', () => {
  let db: Database.Database;
  let store: SqliteKindlingStore;

  beforeEach(() => {
    db = openDatabase();
    store = new SqliteKindlingStore(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Observation Operations', () => {
    it('should insert and retrieve an observation', () => {
      const input = {
        kind: ObservationKind.Command,
        content: 'npm test',
        provenance: { command: 'npm test', exitCode: 0 },
        scope: { sessionId: 'session1' },
      };

      const observation = store.insertObservation(input);

      expect(observation.id).toMatch(/^obs_/);
      expect(observation.kind).toBe(ObservationKind.Command);
      expect(observation.content).toBe('npm test');
      expect(observation.provenance).toEqual({ command: 'npm test', exitCode: 0 });
      expect(observation.scope.sessionId).toBe('session1');
      expect(observation.redacted).toBe(false);

      const retrieved = store.getObservation(observation.id);
      expect(retrieved).toEqual(observation);
    });

    it('should list observations with filters', () => {
      store.insertObservation({
        kind: ObservationKind.Command,
        scope: { sessionId: 'session1' },
      });
      store.insertObservation({
        kind: ObservationKind.Error,
        scope: { sessionId: 'session1' },
      });
      store.insertObservation({
        kind: ObservationKind.Command,
        scope: { sessionId: 'session2' },
      });

      const session1Obs = store.listObservations({ sessionId: 'session1' });
      expect(session1Obs).toHaveLength(2);

      const commandObs = store.listObservations({ kind: ObservationKind.Command });
      expect(commandObs).toHaveLength(2);
    });

    it('should redact an observation', () => {
      const observation = store.insertObservation({
        kind: ObservationKind.Message,
        content: 'Sensitive data',
      });

      store.redactObservation(observation.id);

      const redacted = store.getObservation(observation.id);
      expect(redacted?.redacted).toBe(true);
      expect(redacted?.content).toBe('[REDACTED]');
    });
  });

  describe('Capsule Operations', () => {
    it('should create and retrieve a capsule', () => {
      const input = {
        type: CapsuleType.Session,
        intent: 'debug',
        scope: { sessionId: 'session1', repoId: 'repo1' },
      };

      const capsule = store.createCapsule(input);

      expect(capsule.id).toMatch(/^cap_/);
      expect(capsule.type).toBe(CapsuleType.Session);
      expect(capsule.intent).toBe('debug');
      expect(capsule.status).toBe(CapsuleStatus.Open);
      expect(capsule.scope.sessionId).toBe('session1');

      const retrieved = store.getCapsule(capsule.id);
      expect(retrieved).toEqual(capsule);
    });

    it('should close a capsule', () => {
      const capsule = store.createCapsule({
        type: CapsuleType.Session,
      });

      expect(capsule.status).toBe(CapsuleStatus.Open);
      expect(capsule.closedAtMs).toBeNull();

      const closed = store.closeCapsule(capsule.id, {});

      expect(closed.status).toBe(CapsuleStatus.Closed);
      expect(closed.closedAtMs).toBeGreaterThan(0);
    });

    it('should get open capsule for session', () => {
      store.createCapsule({
        type: CapsuleType.Session,
        scope: { sessionId: 'session1' },
      });

      const openCapsule = store.getOpenCapsuleForSession('session1');
      expect(openCapsule).not.toBeNull();
      expect(openCapsule?.status).toBe(CapsuleStatus.Open);

      // Close it
      store.closeCapsule(openCapsule!.id, {});

      // Should return null now
      const noOpenCapsule = store.getOpenCapsuleForSession('session1');
      expect(noOpenCapsule).toBeNull();
    });
  });

  describe('Capsule-Observation Linking', () => {
    it('should attach observations to capsule with deterministic ordering', () => {
      const capsule = store.createCapsule({ type: CapsuleType.Session });

      const obs1 = store.insertObservation({ kind: ObservationKind.Command });
      const obs2 = store.insertObservation({ kind: ObservationKind.Message });
      const obs3 = store.insertObservation({ kind: ObservationKind.Error });

      store.attachObservationToCapsule(capsule.id, obs1.id);
      store.attachObservationToCapsule(capsule.id, obs2.id);
      store.attachObservationToCapsule(capsule.id, obs3.id);

      const observations = store.listCapsuleObservations(capsule.id);

      expect(observations).toHaveLength(3);
      expect(observations[0].id).toBe(obs1.id);
      expect(observations[1].id).toBe(obs2.id);
      expect(observations[2].id).toBe(obs3.id);
    });
  });

  describe('Summary Operations', () => {
    it('should insert and retrieve a summary', () => {
      const capsule = store.createCapsule({ type: CapsuleType.Session });

      const summary = store.insertSummary({
        capsuleId: capsule.id,
        content: 'Fixed authentication bug',
        confidence: 0.9,
        evidenceRefs: ['obs1', 'obs2'],
      });

      expect(summary.id).toMatch(/^sum_/);
      expect(summary.capsuleId).toBe(capsule.id);
      expect(summary.content).toBe('Fixed authentication bug');
      expect(summary.confidence).toBe(0.9);
      expect(summary.evidenceRefs).toEqual(['obs1', 'obs2']);

      const retrieved = store.getSummary(summary.id);
      expect(retrieved).toEqual(summary);
    });

    it('should get latest summary for capsule', () => {
      const capsule = store.createCapsule({ type: CapsuleType.Session });

      store.insertSummary({
        capsuleId: capsule.id,
        content: 'First summary',
        tsMs: 1000,
      });

      const latest = store.insertSummary({
        capsuleId: capsule.id,
        content: 'Latest summary',
        tsMs: 2000,
      });

      const retrieved = store.getLatestSummaryForCapsule(capsule.id);
      expect(retrieved?.id).toBe(latest.id);
      expect(retrieved?.content).toBe('Latest summary');
    });
  });

  describe('Pin Operations', () => {
    it('should insert and delete a pin', () => {
      const observation = store.insertObservation({ kind: ObservationKind.Message });

      const pin = store.insertPin({
        targetType: PinTargetType.Observation,
        targetId: observation.id,
        note: 'Important finding',
      });

      expect(pin.id).toMatch(/^pin_/);
      expect(pin.targetType).toBe(PinTargetType.Observation);
      expect(pin.targetId).toBe(observation.id);
      expect(pin.note).toBe('Important finding');

      const pins = store.listPins();
      expect(pins).toHaveLength(1);

      store.deletePin(pin.id);

      const noPins = store.listPins();
      expect(noPins).toHaveLength(0);
    });

    it('should filter expired pins', () => {
      const observation = store.insertObservation({ kind: ObservationKind.Message });

      const nowMs = Date.now();

      // Pin with no TTL
      store.insertPin({
        targetType: PinTargetType.Observation,
        targetId: observation.id,
        ttlMs: null,
      });

      // Expired pin
      store.insertPin({
        targetType: PinTargetType.Observation,
        targetId: observation.id,
        ttlMs: 1000,
        pinnedAtMs: nowMs - 2000,
      });

      // Valid pin
      store.insertPin({
        targetType: PinTargetType.Observation,
        targetId: observation.id,
        ttlMs: 5000,
        pinnedAtMs: nowMs,
      });

      const allPins = store.listPins({ includeExpired: true });
      expect(allPins).toHaveLength(3);

      const validPins = store.listPins({ includeExpired: false, nowMs });
      expect(validPins).toHaveLength(2);
    });
  });

  describe('Evidence Helpers', () => {
    it('should get evidence snippets', () => {
      const obs1 = store.insertObservation({
        kind: ObservationKind.Command,
        content: 'Short content',
      });

      const obs2 = store.insertObservation({
        kind: ObservationKind.Message,
        content: 'This is a very long piece of content that should be truncated',
      });

      const snippets = store.getEvidenceSnippets([obs1.id, obs2.id], 20);

      expect(snippets).toHaveLength(2);
      expect(snippets[0].observationId).toBe(obs1.id);
      expect(snippets[0].snippet).toBe('Short content');
      expect(snippets[0].truncated).toBe(false);

      expect(snippets[1].observationId).toBe(obs2.id);
      expect(snippets[1].snippet).toHaveLength(23); // 20 + '...'
      expect(snippets[1].truncated).toBe(true);
    });

    it('should return redacted placeholder for redacted observations', () => {
      const observation = store.insertObservation({
        kind: ObservationKind.Message,
        content: 'Sensitive data',
      });

      store.redactObservation(observation.id);

      const snippets = store.getEvidenceSnippets([observation.id], 100);

      expect(snippets).toHaveLength(1);
      expect(snippets[0].snippet).toBe('[REDACTED]');
    });
  });
});
