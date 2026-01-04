import { describe, it, expect } from 'vitest';
import {
  ObservationKind,
  validateObservationKind,
  generateObservationId,
  CapsuleType,
  CapsuleIntent,
  validateCapsuleType,
  validateCapsuleStatus,
  generateCapsuleId,
  validateConfidence,
  generateSummaryId,
  PinTargetType,
  validatePinTargetType,
  isPinExpired,
  generatePinId,
} from '../src/index.js';

describe('Observation Types', () => {
  it('should validate observation kinds', () => {
    expect(validateObservationKind('tool_call')).toBe(true);
    expect(validateObservationKind('command')).toBe(true);
    expect(validateObservationKind('invalid')).toBe(false);
  });

  it('should generate unique observation IDs', () => {
    const id1 = generateObservationId();
    const id2 = generateObservationId();

    expect(id1).toMatch(/^obs_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^obs_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('should have all expected observation kinds', () => {
    expect(ObservationKind.ToolCall).toBe('tool_call');
    expect(ObservationKind.Command).toBe('command');
    expect(ObservationKind.FileDiff).toBe('file_diff');
    expect(ObservationKind.Error).toBe('error');
    expect(ObservationKind.Message).toBe('message');
  });
});

describe('Capsule Types', () => {
  it('should validate capsule types', () => {
    expect(validateCapsuleType('session')).toBe(true);
    expect(validateCapsuleType('pocketflow_node')).toBe(true);
    expect(validateCapsuleType('invalid')).toBe(false);
  });

  it('should validate capsule status', () => {
    expect(validateCapsuleStatus('open')).toBe(true);
    expect(validateCapsuleStatus('closed')).toBe(true);
    expect(validateCapsuleStatus('invalid')).toBe(false);
  });

  it('should generate unique capsule IDs', () => {
    const id1 = generateCapsuleId();
    const id2 = generateCapsuleId();

    expect(id1).toMatch(/^cap_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^cap_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('should have all expected capsule types and intents', () => {
    expect(CapsuleType.Session).toBe('session');
    expect(CapsuleType.PocketFlowNode).toBe('pocketflow_node');

    expect(CapsuleIntent.General).toBe('general');
    expect(CapsuleIntent.Debug).toBe('debug');
    expect(CapsuleIntent.Implement).toBe('implement');
  });
});

describe('Summary Types', () => {
  it('should validate confidence scores', () => {
    expect(validateConfidence(null)).toBe(true);
    expect(validateConfidence(0.0)).toBe(true);
    expect(validateConfidence(0.5)).toBe(true);
    expect(validateConfidence(1.0)).toBe(true);
    expect(validateConfidence(-0.1)).toBe(false);
    expect(validateConfidence(1.1)).toBe(false);
  });

  it('should generate unique summary IDs', () => {
    const id1 = generateSummaryId();
    const id2 = generateSummaryId();

    expect(id1).toMatch(/^sum_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^sum_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

describe('Pin Types', () => {
  it('should validate pin target types', () => {
    expect(validatePinTargetType('observation')).toBe(true);
    expect(validatePinTargetType('summary')).toBe(true);
    expect(validatePinTargetType('capsule')).toBe(true);
    expect(validatePinTargetType('invalid')).toBe(false);
  });

  it('should correctly detect expired pins', () => {
    const nowMs = Date.now();

    // Pin with no TTL never expires
    const noTtlPin = {
      id: 'pin_1',
      targetType: PinTargetType.Observation,
      targetId: 'obs_1',
      note: null,
      ttlMs: null,
      pinnedAtMs: nowMs - 10000,
      createdAt: nowMs,
    };
    expect(isPinExpired(noTtlPin, nowMs)).toBe(false);

    // Pin that hasn't expired yet
    const validPin = {
      id: 'pin_2',
      targetType: PinTargetType.Observation,
      targetId: 'obs_2',
      note: null,
      ttlMs: 5000,
      pinnedAtMs: nowMs - 2000,
      createdAt: nowMs,
    };
    expect(isPinExpired(validPin, nowMs)).toBe(false);

    // Pin that has expired
    const expiredPin = {
      id: 'pin_3',
      targetType: PinTargetType.Observation,
      targetId: 'obs_3',
      note: null,
      ttlMs: 5000,
      pinnedAtMs: nowMs - 6000,
      createdAt: nowMs,
    };
    expect(isPinExpired(expiredPin, nowMs)).toBe(true);
  });

  it('should generate unique pin IDs', () => {
    const id1 = generatePinId();
    const id2 = generatePinId();

    expect(id1).toMatch(/^pin_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^pin_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});
