import type {
  Observation,
  CreateObservationInput,
} from './observation.js';
import type {
  Capsule,
  OpenCapsuleInput,
  CloseCapsuleInput,
} from './capsule.js';
import type {
  Summary,
  CreateSummaryInput,
} from './summary.js';
import type {
  Pin,
  CreatePinInput,
} from './pin.js';

export interface KindlingStore {
  insertObservation(input: CreateObservationInput): Observation;
  getObservation(id: string): Observation | null;
  listObservations(filters?: ObservationFilters): Observation[];
  countObservations(filters?: ObservationFilters): number;

  createCapsule(input: OpenCapsuleInput): Capsule;
  getCapsule(id: string): Capsule | null;
  closeCapsule(id: string, input: CloseCapsuleInput): Capsule;
  getOpenCapsuleForSession(sessionId: string): Capsule | null;
  listCapsules(filters?: CapsuleFilters): Capsule[];
  countCapsules(filters?: CapsuleFilters): number;

  attachObservationToCapsule(capsuleId: string, observationId: string): void;
  listCapsuleObservations(capsuleId: string): Observation[];

  insertSummary(input: CreateSummaryInput): Summary;
  getSummary(id: string): Summary | null;
  getLatestSummaryForCapsule(capsuleId: string): Summary | null;
  listSummaries(filters?: SummaryFilters): Summary[];
  countSummaries(filters?: SummaryFilters): number;

  insertPin(input: CreatePinInput): Pin;
  deletePin(id: string): void;
  listPins(filters?: PinFilters): Pin[];
  countPins(filters?: PinFilters): number;

  redactObservation(id: string): void;

  getEvidenceSnippets(observationIds: string[], maxChars: number): EvidenceSnippet[];

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
