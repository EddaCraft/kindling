/**
 * Barrel export for all Kindling domain types.
 */

export type { ID, Timestamp, ScopeIds, Result } from './common.js';
export type {
  ObservationKind,
  Observation,
  CreateObservationInput,
} from './observation.js';
export type {
  CapsuleType,
  CapsuleStatus,
  Capsule,
  CreateCapsuleInput,
} from './capsule.js';
export type { Summary, CreateSummaryInput } from './summary.js';
export type { PinTargetType, Pin, CreatePinInput } from './pin.js';
