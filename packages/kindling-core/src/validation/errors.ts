/**
 * Validation error types.
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function createValidationError(
  message: string,
  field?: string,
  code?: string
): ValidationError {
  return new ValidationError(message, field, code);
}
