/**
 * Capsule validation.
 */

import type { Capsule, CapsuleType, CapsuleStatus, Result } from '../types/index.js';
import { createValidationError, ValidationError } from './errors.js';
import {
  isNonEmptyString,
  isObject,
  isValidTimestamp,
  validateScopeIds,
} from './common.js';

const VALID_CAPSULE_TYPES: CapsuleType[] = ['session', 'pocketflow_node'];
const VALID_CAPSULE_STATUSES: CapsuleStatus[] = ['open', 'closed'];

export function validateCapsule(
  input: unknown
): Result<Capsule, ValidationError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: createValidationError('Capsule must be an object'),
    };
  }

  const {
    id,
    type,
    intent,
    status,
    openedAt,
    closedAt,
    scopeIds,
    observationIds,
    summaryId,
  } = input;

  // Validate id
  if (!isNonEmptyString(id)) {
    return {
      ok: false,
      error: createValidationError('id must be a non-empty string', 'id'),
    };
  }

  // Validate type
  if (!VALID_CAPSULE_TYPES.includes(type as CapsuleType)) {
    return {
      ok: false,
      error: createValidationError(
        `type must be one of: ${VALID_CAPSULE_TYPES.join(', ')}`,
        'type'
      ),
    };
  }

  // Validate intent
  if (typeof intent !== 'string') {
    return {
      ok: false,
      error: createValidationError('intent must be a string', 'intent'),
    };
  }

  // Validate status
  if (!VALID_CAPSULE_STATUSES.includes(status as CapsuleStatus)) {
    return {
      ok: false,
      error: createValidationError(
        `status must be one of: ${VALID_CAPSULE_STATUSES.join(', ')}`,
        'status'
      ),
    };
  }

  // Validate openedAt
  if (!isValidTimestamp(openedAt)) {
    return {
      ok: false,
      error: createValidationError(
        'openedAt must be a positive number',
        'openedAt'
      ),
    };
  }

  // Validate closedAt (optional)
  if (closedAt !== undefined && !isValidTimestamp(closedAt)) {
    return {
      ok: false,
      error: createValidationError(
        'closedAt must be a positive number',
        'closedAt'
      ),
    };
  }

  // Validate scopeIds
  const scopeIdsResult = validateScopeIds(scopeIds);
  if (!scopeIdsResult.ok) {
    return scopeIdsResult;
  }

  // Validate observationIds
  if (!Array.isArray(observationIds)) {
    return {
      ok: false,
      error: createValidationError(
        'observationIds must be an array',
        'observationIds'
      ),
    };
  }

  for (let i = 0; i < observationIds.length; i++) {
    if (!isNonEmptyString(observationIds[i])) {
      return {
        ok: false,
        error: createValidationError(
          `observationIds[${i}] must be a non-empty string`,
          'observationIds'
        ),
      };
    }
  }

  // Validate summaryId (optional)
  if (summaryId !== undefined && !isNonEmptyString(summaryId)) {
    return {
      ok: false,
      error: createValidationError(
        'summaryId must be a non-empty string',
        'summaryId'
      ),
    };
  }

  return {
    ok: true,
    value: {
      id,
      type: type as CapsuleType,
      intent,
      status: status as CapsuleStatus,
      openedAt,
      closedAt,
      scopeIds: scopeIdsResult.value,
      observationIds,
      summaryId,
    },
  };
}
