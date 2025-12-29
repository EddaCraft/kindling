/**
 * Tests for domain type validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateObservation,
  validateCapsule,
  validateSummary,
  validatePin,
  type Observation,
  type Capsule,
  type Summary,
  type Pin,
} from '../src/index.js';

describe('Observation validation', () => {
  it('should accept valid observation', () => {
    const valid: Observation = {
      id: 'obs-123',
      kind: 'tool_call',
      content: 'Called grep with pattern "test"',
      provenance: { toolName: 'grep', args: ['test'] },
      ts: Date.now(),
      scopeIds: { sessionId: 'sess-1' },
      redacted: false,
    };

    const result = validateObservation(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(valid);
    }
  });

  it('should reject observation with missing required fields', () => {
    const invalid = {
      kind: 'tool_call',
      content: 'test',
      // missing id, provenance, ts, scopeIds, redacted
    };

    const result = validateObservation(invalid);
    expect(result.ok).toBe(false);
  });

  it('should reject observation with invalid kind', () => {
    const invalid = {
      id: 'obs-123',
      kind: 'invalid_kind',
      content: 'test',
      provenance: {},
      ts: Date.now(),
      scopeIds: {},
      redacted: false,
    };

    const result = validateObservation(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('kind');
    }
  });

  it('should reject observation with empty id', () => {
    const invalid = {
      id: '',
      kind: 'tool_call',
      content: 'test',
      provenance: {},
      ts: Date.now(),
      scopeIds: {},
      redacted: false,
    };

    const result = validateObservation(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('id');
    }
  });

  it('should reject observation with negative timestamp', () => {
    const invalid = {
      id: 'obs-123',
      kind: 'tool_call',
      content: 'test',
      provenance: {},
      ts: -1,
      scopeIds: {},
      redacted: false,
    };

    const result = validateObservation(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('ts');
    }
  });

  it('should accept empty content string', () => {
    const valid: Observation = {
      id: 'obs-123',
      kind: 'message',
      content: '',
      provenance: {},
      ts: Date.now(),
      scopeIds: {},
      redacted: false,
    };

    const result = validateObservation(valid);
    expect(result.ok).toBe(true);
  });
});

describe('Capsule validation', () => {
  it('should accept valid capsule', () => {
    const valid: Capsule = {
      id: 'cap-123',
      type: 'session',
      intent: 'Fix bug in auth module',
      status: 'open',
      openedAt: Date.now(),
      scopeIds: { sessionId: 'sess-1' },
      observationIds: ['obs-1', 'obs-2'],
    };

    const result = validateCapsule(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(valid);
    }
  });

  it('should accept capsule with closedAt', () => {
    const now = Date.now();
    const valid: Capsule = {
      id: 'cap-123',
      type: 'session',
      intent: 'Fix bug',
      status: 'closed',
      openedAt: now,
      closedAt: now + 1000,
      scopeIds: {},
      observationIds: [],
    };

    const result = validateCapsule(valid);
    expect(result.ok).toBe(true);
  });

  it('should reject capsule with invalid type', () => {
    const invalid = {
      id: 'cap-123',
      type: 'invalid_type',
      intent: 'test',
      status: 'open',
      openedAt: Date.now(),
      scopeIds: {},
      observationIds: [],
    };

    const result = validateCapsule(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('type');
    }
  });

  it('should reject capsule with invalid status', () => {
    const invalid = {
      id: 'cap-123',
      type: 'session',
      intent: 'test',
      status: 'pending',
      openedAt: Date.now(),
      scopeIds: {},
      observationIds: [],
    };

    const result = validateCapsule(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('status');
    }
  });

  it('should reject capsule with non-array observationIds', () => {
    const invalid = {
      id: 'cap-123',
      type: 'session',
      intent: 'test',
      status: 'open',
      openedAt: Date.now(),
      scopeIds: {},
      observationIds: 'not-an-array',
    };

    const result = validateCapsule(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('observationIds');
    }
  });
});

describe('Summary validation', () => {
  it('should accept valid summary', () => {
    const valid: Summary = {
      id: 'sum-123',
      capsuleId: 'cap-123',
      content: 'Fixed authentication bug by updating token validation',
      confidence: 0.95,
      createdAt: Date.now(),
      evidenceRefs: ['obs-1', 'obs-2'],
    };

    const result = validateSummary(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(valid);
    }
  });

  it('should reject summary with confidence > 1', () => {
    const invalid = {
      id: 'sum-123',
      capsuleId: 'cap-123',
      content: 'test',
      confidence: 1.5,
      createdAt: Date.now(),
      evidenceRefs: [],
    };

    const result = validateSummary(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('confidence');
    }
  });

  it('should reject summary with confidence < 0', () => {
    const invalid = {
      id: 'sum-123',
      capsuleId: 'cap-123',
      content: 'test',
      confidence: -0.5,
      createdAt: Date.now(),
      evidenceRefs: [],
    };

    const result = validateSummary(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('confidence');
    }
  });

  it('should accept summary with empty evidenceRefs', () => {
    const valid: Summary = {
      id: 'sum-123',
      capsuleId: 'cap-123',
      content: 'test',
      confidence: 0.5,
      createdAt: Date.now(),
      evidenceRefs: [],
    };

    const result = validateSummary(valid);
    expect(result.ok).toBe(true);
  });
});

describe('Pin validation', () => {
  it('should accept valid pin', () => {
    const valid: Pin = {
      id: 'pin-123',
      targetType: 'observation',
      targetId: 'obs-123',
      reason: 'Important context for auth',
      createdAt: Date.now(),
      scopeIds: { sessionId: 'sess-1' },
    };

    const result = validatePin(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(valid);
    }
  });

  it('should accept pin with expiresAt', () => {
    const now = Date.now();
    const valid: Pin = {
      id: 'pin-123',
      targetType: 'summary',
      targetId: 'sum-123',
      createdAt: now,
      expiresAt: now + 86400000, // 1 day
      scopeIds: {},
    };

    const result = validatePin(valid);
    expect(result.ok).toBe(true);
  });

  it('should reject pin with invalid targetType', () => {
    const invalid = {
      id: 'pin-123',
      targetType: 'invalid',
      targetId: 'obs-123',
      createdAt: Date.now(),
      scopeIds: {},
    };

    const result = validatePin(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('targetType');
    }
  });

  it('should accept pin without reason', () => {
    const valid: Pin = {
      id: 'pin-123',
      targetType: 'observation',
      targetId: 'obs-123',
      createdAt: Date.now(),
      scopeIds: {},
    };

    const result = validatePin(valid);
    expect(result.ok).toBe(true);
  });
});
