/**
 * Summary validation.
 */

import type { Summary, Result } from '../types/index.js';
import { createValidationError, ValidationError } from './errors.js';
import {
  isNonEmptyString,
  isObject,
  isValidTimestamp,
  isNonNegativeNumber,
} from './common.js';

export function validateSummary(
  input: unknown
): Result<Summary, ValidationError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: createValidationError('Summary must be an object'),
    };
  }

  const { id, capsuleId, content, confidence, createdAt, evidenceRefs } = input;

  // Validate id
  if (!isNonEmptyString(id)) {
    return {
      ok: false,
      error: createValidationError('id must be a non-empty string', 'id'),
    };
  }

  // Validate capsuleId
  if (!isNonEmptyString(capsuleId)) {
    return {
      ok: false,
      error: createValidationError(
        'capsuleId must be a non-empty string',
        'capsuleId'
      ),
    };
  }

  // Validate content
  if (typeof content !== 'string') {
    return {
      ok: false,
      error: createValidationError('content must be a string', 'content'),
    };
  }

  // Validate confidence (0-1)
  if (
    !isNonNegativeNumber(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return {
      ok: false,
      error: createValidationError(
        'confidence must be a number between 0 and 1',
        'confidence'
      ),
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

  // Validate evidenceRefs
  if (!Array.isArray(evidenceRefs)) {
    return {
      ok: false,
      error: createValidationError(
        'evidenceRefs must be an array',
        'evidenceRefs'
      ),
    };
  }

  for (let i = 0; i < evidenceRefs.length; i++) {
    if (!isNonEmptyString(evidenceRefs[i])) {
      return {
        ok: false,
        error: createValidationError(
          `evidenceRefs[${i}] must be a non-empty string`,
          'evidenceRefs'
        ),
      };
    }
  }

  return {
    ok: true,
    value: {
      id,
      capsuleId,
      content,
      confidence,
      createdAt,
      evidenceRefs,
    },
  };
}
