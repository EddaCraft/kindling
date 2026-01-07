/**
 * KindlingService
 *
 * Main orchestration layer for Kindling. Provides high-level APIs for:
 * - Observation ingestion
 * - Capsule lifecycle management
 * - Retrieval orchestration
 */

import type { KindlingStore, EvidenceSnippet } from '@kindling/store-sqlite';
import type { RetrievalProvider, ProviderRequest, ProviderHit } from '@kindling/provider-local';
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
} from '../types/index.js';

export interface KindlingServiceConfig {
  store: KindlingStore;
  provider?: RetrievalProvider;
}

export interface RetrievalResult {
  pins: Pin[];
  summaries: Summary[];
  providerHits: ProviderHit[];
  evidenceSnippets: EvidenceSnippet[];
}

export class KindlingService {
  private store: KindlingStore;
  private provider?: RetrievalProvider;

  constructor(config: KindlingServiceConfig) {
    this.store = config.store;
    this.provider = config.provider;
  }

  // === Observation Operations ===

  /**
   * Appends an observation to the store and optionally attaches it to a capsule.
   */
  appendObservation(
    input: CreateObservationInput,
    options?: { capsuleId?: string; autoAttach?: boolean }
  ): Observation {
    const observation = this.store.insertObservation(input);

    // Auto-attach to capsule if specified
    if (options?.capsuleId) {
      this.store.attachObservationToCapsule(options.capsuleId, observation.id);
    } else if (options?.autoAttach && input.scope?.sessionId) {
      // Try to find an open capsule for this session
      const openCapsule = this.store.getOpenCapsuleForSession(input.scope.sessionId);
      if (openCapsule) {
        this.store.attachObservationToCapsule(openCapsule.id, observation.id);
      }
    }

    return observation;
  }

  /**
   * Gets an observation by ID.
   */
  getObservation(id: string): Observation | null {
    return this.store.getObservation(id);
  }

  // === Capsule Operations ===

  /**
   * Opens a new capsule.
   */
  openCapsule(input: OpenCapsuleInput): Capsule {
    return this.store.createCapsule(input);
  }

  /**
   * Closes a capsule and optionally generates a summary.
   */
  closeCapsule(
    capsuleId: string,
    options?: {
      closedAtMs?: number;
      generateSummary?: boolean;
      summaryContent?: string;
    }
  ): Capsule {
    const capsule = this.store.closeCapsule(capsuleId, {
      closedAtMs: options?.closedAtMs,
    });

    // Generate summary if requested
    if (options?.generateSummary && options?.summaryContent) {
      const observations = this.store.listCapsuleObservations(capsuleId);
      const evidenceRefs = observations.map(o => o.id);

      this.store.insertSummary({
        capsuleId,
        content: options.summaryContent,
        evidenceRefs,
        tsMs: capsule.closedAtMs ?? Date.now(),
      });
    }

    return capsule;
  }

  /**
   * Gets a capsule by ID.
   */
  getCapsule(id: string): Capsule | null {
    return this.store.getCapsule(id);
  }

  /**
   * Gets the open capsule for a session, if any.
   */
  getOpenCapsuleForSession(sessionId: string): Capsule | null {
    return this.store.getOpenCapsuleForSession(sessionId);
  }

  /**
   * Gets or creates an open capsule for a session.
   */
  getOrCreateSessionCapsule(input: OpenCapsuleInput): Capsule {
    if (!input.scope?.sessionId) {
      throw new Error('sessionId is required in scope');
    }

    const existing = this.store.getOpenCapsuleForSession(input.scope.sessionId);
    if (existing) {
      return existing;
    }

    return this.store.createCapsule(input);
  }

  // === Summary Operations ===

  /**
   * Inserts a summary.
   */
  insertSummary(input: CreateSummaryInput): Summary {
    return this.store.insertSummary(input);
  }

  /**
   * Gets the latest summary for a capsule.
   */
  getLatestSummaryForCapsule(capsuleId: string): Summary | null {
    return this.store.getLatestSummaryForCapsule(capsuleId);
  }

  // === Pin Operations ===

  /**
   * Pins content for high-priority retrieval.
   */
  pin(input: CreatePinInput): Pin {
    return this.store.insertPin(input);
  }

  /**
   * Unpins content.
   */
  unpin(pinId: string): void {
    this.store.deletePin(pinId);
  }

  /**
   * Lists all active pins.
   */
  listPins(): Pin[] {
    return this.store.listPins({ includeExpired: false });
  }

  // === Redaction ===

  /**
   * Redacts an observation.
   */
  redactObservation(observationId: string): void {
    this.store.redactObservation(observationId);
  }

  // === Retrieval Operations ===

  /**
   * Retrieves relevant context based on a query.
   *
   * Tiering:
   * 1. Pins (non-evictable, always included)
   * 2. Current capsule summary (if available)
   * 3. Provider hits (ranked candidates)
   */
  retrieve(request: ProviderRequest): RetrievalResult {
    // Tier 1: Get all active pins
    const pins = this.store.listPins({ includeExpired: false });

    // Tier 2: Get current capsule summary if in a session
    const summaries: Summary[] = [];
    if (request.scope?.sessionId) {
      const openCapsule = this.store.getOpenCapsuleForSession(request.scope.sessionId);
      if (openCapsule) {
        const summary = this.store.getLatestSummaryForCapsule(openCapsule.id);
        if (summary) {
          summaries.push(summary);
        }
      }
    }

    // Tier 3: Get provider hits
    let providerHits: ProviderHit[] = [];
    if (this.provider) {
      providerHits = this.provider.searchCandidates(request);
    }

    // Collect all evidence IDs
    const evidenceIds = new Set<string>();
    pins.forEach(pin => evidenceIds.add(pin.targetId));
    summaries.forEach(sum => sum.evidenceRefs.forEach(id => evidenceIds.add(id)));
    providerHits.forEach(hit => hit.evidenceRefs.forEach(id => evidenceIds.add(id)));

    // Get evidence snippets
    const evidenceSnippets = this.store.getEvidenceSnippets(
      Array.from(evidenceIds),
      200 // Max 200 chars per snippet
    );

    return {
      pins,
      summaries,
      providerHits,
      evidenceSnippets,
    };
  }

  // === Database Management ===

  /**
   * Closes the underlying store.
   */
  close(): void {
    this.store.close();
  }
}
