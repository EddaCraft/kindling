/**
 * KindlingStore interface
 *
 * Defines the persistence contract for Kindling storage backends.
 */

import type {
  Observation,
  CreateObservationInput,
  Capsule,
  OpenCapsuleInput,
  CloseCapsuleInput,
  Summary,
  CreateSummaryInput,
  Pin,
  CreatePinInput,
} from '@kindling/core';

export interface KindlingStore {
  // Observation operations
  insertObservation(input: CreateObservationInput): Observation;
  getObservation(id: string): Observation | null;
  listObservations(filters?: ObservationFilters): Observation[];
  countObservations(filters?: ObservationFilters): number;

  // Capsule operations
  createCapsule(input: OpenCapsuleInput): Capsule;
  getCapsule(id: string): Capsule | null;
  closeCapsule(id: string, input: CloseCapsuleInput): Capsule;
  getOpenCapsuleForSession(sessionId: string): Capsule | null;
  listCapsules(filters?: CapsuleFilters): Capsule[];
  countCapsules(filters?: CapsuleFilters): number;

  // Capsule-observation linking
  attachObservationToCapsule(capsuleId: string, observationId: string): void;
  listCapsuleObservations(capsuleId: string): Observation[];

  // Summary operations
  insertSummary(input: CreateSummaryInput): Summary;
  getSummary(id: string): Summary | null;
  getLatestSummaryForCapsule(capsuleId: string): Summary | null;
  listSummaries(filters?: SummaryFilters): Summary[];
  countSummaries(filters?: SummaryFilters): number;

  // Pin operations
  insertPin(input: CreatePinInput): Pin;
  deletePin(id: string): void;
  listPins(filters?: PinFilters): Pin[];
  countPins(filters?: PinFilters): number;

  // Redaction
  redactObservation(id: string): void;

  // Evidence helpers
  getEvidenceSnippets(observationIds: string[], maxChars: number): EvidenceSnippet[];

  // Database management
  close(): void;
}

export interface ObservationFilters {
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
  kind?: string;
  limit?: number;
  offset?: number;
}

export interface CapsuleFilters {
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface SummaryFilters {
  capsuleId?: string;
  limit?: number;
  offset?: number;
}

export interface PinFilters {
  targetType?: string;
  targetId?: string;
  includeExpired?: boolean;
  nowMs?: number;
}

export interface EvidenceSnippet {
  observationId: string;
  snippet: string;
  truncated: boolean;
}
