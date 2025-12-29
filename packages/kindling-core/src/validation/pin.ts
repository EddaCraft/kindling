/**
 * Pin validation.
 */

import type { Pin, PinTargetType, Result } from '../types/index.js';
import { createValidationError, ValidationError } from './errors.js';
import {
  isNonEmptyString,
  isObject,
  isValidTimestamp,
  validateScopeIds,
} from './common.js';

const VALID_PIN_TARGET_TYPES: PinTargetType[] = ['observation', 'summary'];

export function validatePin(input: unknown): Result<Pin, ValidationError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: createValidationError('Pin must be an object'),
    };
  }

  const { id, targetType, targetId, reason, createdAt, expiresAt, scopeIds } =
    input;

  // Validate id
  if (!isNonEmptyString(id)) {
    return {
      ok: false,
      error: createValidationError('id must be a non-empty string', 'id'),
    };
  }

  // Validate targetType
  if (!VALID_PIN_TARGET_TYPES.includes(targetType as PinTargetType)) {
    return {
      ok: false,
      error: createValidationError(
        `targetType must be one of: ${VALID_PIN_TARGET_TYPES.join(', ')}`,
        'targetType'
      ),
    };
  }

  // Validate targetId
  if (!isNonEmptyString(targetId)) {
    return {
      ok: false,
      error: createValidationError(
        'targetId must be a non-empty string',
        'targetId'
      ),
    };
  }

  // Validate reason (optional)
  if (reason !== undefined && typeof reason !== 'string') {
    return {
      ok: false,
      error: createValidationError('reason must be a string', 'reason'),
    };
  }

  // Validate createdAt
  if (!isValidTimestamp(createdAt)) {
    return {
      ok: false,
      error: createValidationError(
        'createdAt must be a positive number',
        'createdAt'
      ),
    };
  }

  // Validate expiresAt (optional)
  if (expiresAt !== undefined && !isValidTimestamp(expiresAt)) {
    return {
      ok: false,
      error: createValidationError(
        'expiresAt must be a positive number',
        'expiresAt'
      ),
    };
  }

  // Validate scopeIds
  const scopeIdsResult = validateScopeIds(scopeIds);
  if (!scopeIdsResult.ok) {
    return scopeIdsResult;
  }

  return {
    ok: true,
    value: {
      id,
      targetType: targetType as PinTargetType,
      targetId,
      reason,
      createdAt,
      expiresAt,
      scopeIds: scopeIdsResult.value,
    },
  };
}
