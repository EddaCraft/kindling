/**
 * Observation validation.
 */

import type { Observation, ObservationKind, Result } from '../types/index.js';
import { createValidationError, ValidationError } from './errors.js';
import {
  isNonEmptyString,
  isObject,
  isValidTimestamp,
  validateScopeIds,
} from './common.js';

const VALID_OBSERVATION_KINDS: ObservationKind[] = [
  'tool_call',
  'command',
  'file_diff',
  'error',
  'message',
  'node_start',
  'node_end',
  'node_output',
  'node_error',
];

export function validateObservation(
  input: unknown
): Result<Observation, ValidationError> {
  if (!isObject(input)) {
    return {
      ok: false,
      error: createValidationError('Observation must be an object'),
    };
  }

  const { id, kind, content, provenance, ts, scopeIds, redacted } = input;

  // Validate id
  if (!isNonEmptyString(id)) {
    return {
      ok: false,
      error: createValidationError('id must be a non-empty string', 'id'),
    };
  }

  // Validate kind
  if (!VALID_OBSERVATION_KINDS.includes(kind as ObservationKind)) {
    return {
      ok: false,
      error: createValidationError(
        `kind must be one of: ${VALID_OBSERVATION_KINDS.join(', ')}`,
        'kind'
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

  // Validate provenance
  if (!isObject(provenance)) {
    return {
      ok: false,
      error: createValidationError('provenance must be an object', 'provenance'),
    };
  }

  // Validate timestamp
  if (!isValidTimestamp(ts)) {
    return {
      ok: false,
      error: createValidationError(
        'ts must be a positive number',
        'ts'
      ),
    };
  }

  // Validate scopeIds
  const scopeIdsResult = validateScopeIds(scopeIds);
  if (!scopeIdsResult.ok) {
    return scopeIdsResult;
  }

  // Validate redacted
  if (typeof redacted !== 'boolean') {
    return {
      ok: false,
      error: createValidationError('redacted must be a boolean', 'redacted'),
    };
  }

  return {
    ok: true,
    value: {
      id,
      kind: kind as ObservationKind,
      content,
      provenance,
      ts,
      scopeIds: scopeIdsResult.value,
      redacted,
    },
  };
}
