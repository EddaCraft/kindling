/**
 * @kindling/adapter-opencode
 *
 * OpenCode adapter for Kindling memory ingestion.
 */

export { SessionAdapter } from './adapter/session-adapter.js';
export type { SessionAdapterConfig } from './adapter/session-adapter.js';
export { mapEventToObservation, OpenCodeEventType } from './adapter/event-mapping.js';
export type { OpenCodeEvent } from './adapter/event-mapping.js';
