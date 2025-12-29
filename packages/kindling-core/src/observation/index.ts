/**
 * Barrel export for observation module
 */

export type {
  AppendObservationInput,
  AppendObservationResult,
  IObservationService,
} from './types.js';
export type {
  ToolCallProvenance,
  CommandProvenance,
  FileDiffProvenance,
  ErrorProvenance,
  NodeProvenance,
} from './provenance.js';
export { extractProvenance, validateProvenance } from './provenance.js';
export { appendObservation } from './ingest.js';
export { ObservationService } from './service.js';
