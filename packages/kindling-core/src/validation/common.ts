/**
 * Common validation utilities.
 */

import type { Result, ScopeIds } from '../types/index.js';
import { createValidationError, ValidationError } from './errors.js';

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && !isNaN(value);
}

export function isValidTimestamp(value: unknown): value is number {
  return isPositiveNumber(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateScopeIds(
  scopeIds: unknown
): Result<ScopeIds, ValidationError> {
  if (!isObject(scopeIds)) {
    return {
      ok: false,
      error: createValidationError('scopeIds must be an object', 'scopeIds'),
    };
  }

  const { sessionId, repoId, agentId, userId } = scopeIds;

  if (
    sessionId !== undefined &&
    (typeof sessionId !== 'string' || sessionId.length === 0)
  ) {
    return {
      ok: false,
      error: createValidationError(
        'sessionId must be a non-empty string',
        'scopeIds.sessionId'
      ),
    };
  }

  if (
    repoId !== undefined &&
    (typeof repoId !== 'string' || repoId.length === 0)
  ) {
    return {
      ok: false,
      error: createValidationError(
        'repoId must be a non-empty string',
        'scopeIds.repoId'
      ),
    };
  }

  if (
    agentId !== undefined &&
    (typeof agentId !== 'string' || agentId.length === 0)
  ) {
    return {
      ok: false,
      error: createValidationError(
        'agentId must be a non-empty string',
        'scopeIds.agentId'
      ),
    };
  }

  if (
    userId !== undefined &&
    (typeof userId !== 'string' || userId.length === 0)
  ) {
    return {
      ok: false,
      error: createValidationError(
        'userId must be a non-empty string',
        'scopeIds.userId'
      ),
    };
  }

  return {
    ok: true,
    value: { sessionId, repoId, agentId, userId },
  };
}
