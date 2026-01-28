/**
 * Claude Code session lifecycle management
 *
 * Manages the lifecycle of session capsules via hooks:
 * - onSessionStart: Opens a new capsule
 * - onEvent: Maps events and attaches observations
 * - onStop: Closes the capsule
 */

import { randomUUID } from 'crypto';
import type {
  Capsule,
  CapsuleStore,
  Observation,
  ID,
} from '@kindling/core';
import type { ClaudeCodeEvent } from './events.js';
import { mapEvent } from './mapping.js';

/**
 * Session context tracking active session state
 */
export interface SessionContext {
  sessionId: string;
  cwd: string;
  activeCapsuleId: ID;
  eventCount: number;
  startedAt: number;
}

/**
 * Options for starting a session
 */
export interface SessionStartOptions {
  sessionId: string;
  cwd: string;
  intent?: string;
}

/**
 * Signals for ending a session
 */
export interface SessionEndSignals {
  reason?: string;
  summaryContent?: string;
  summaryConfidence?: number;
  evidenceRefs?: ID[];
}

/**
 * Result of processing an event
 */
export interface EventProcessingResult {
  observation?: Observation;
  skipped?: boolean;
  error?: string;
}

/**
 * SessionManager manages Claude Code session lifecycles
 *
 * Provides hooks for session start, event processing, and session end.
 * Each session gets its own capsule that collects observations.
 */
export class SessionManager {
  private activeSessions: Map<string, SessionContext> = new Map();

  constructor(
    private store: CapsuleStore & {
      insertObservation(observation: Observation): void;
      attachObservationToCapsule(capsuleId: ID, observationId: ID): void;
    }
  ) {}

  /**
   * Start a new session
   *
   * Opens a capsule for the session. If a session already has an open capsule,
   * returns the existing context.
   */
  onSessionStart(options: SessionStartOptions): SessionContext {
    const { sessionId, cwd, intent = 'Claude Code session' } = options;

    // Check if session already has an open capsule
    const existing = this.activeSessions.get(sessionId);
    if (existing) {
      return existing;
    }

    // Check store for existing open capsule
    const existingCapsule = this.store.getOpenCapsuleForSession(sessionId);
    if (existingCapsule) {
      const context: SessionContext = {
        sessionId,
        cwd,
        activeCapsuleId: existingCapsule.id,
        eventCount: existingCapsule.observationIds.length,
        startedAt: existingCapsule.openedAt,
      };
      this.activeSessions.set(sessionId, context);
      return context;
    }

    // Create new capsule
    const capsuleId = randomUUID();
    const now = Date.now();
    const capsule: Capsule = {
      id: capsuleId,
      type: 'session',
      intent,
      status: 'open',
      openedAt: now,
      scopeIds: {
        sessionId,
        repoId: cwd,
      },
      observationIds: [],
    };

    this.store.createCapsule(capsule);

    const context: SessionContext = {
      sessionId,
      cwd,
      activeCapsuleId: capsuleId,
      eventCount: 0,
      startedAt: now,
    };

    this.activeSessions.set(sessionId, context);
    return context;
  }

  /**
   * Process an event from the session
   *
   * Maps the event to an observation and attaches it to the active capsule.
   */
  onEvent(event: ClaudeCodeEvent): EventProcessingResult {
    // Get active session context
    const context = this.activeSessions.get(event.sessionId);
    if (!context) {
      return {
        error: `No active session found for sessionId: ${event.sessionId}`,
      };
    }

    // Map event to observation
    const mapResult = mapEvent(event);

    // Handle skip (e.g., session_start/stop events)
    if (mapResult.skip) {
      return { skipped: true };
    }

    // Handle mapping errors
    if (mapResult.error) {
      return { error: mapResult.error };
    }

    if (!mapResult.observation) {
      return { error: 'Mapping produced no observation' };
    }

    // Generate observation ID and timestamp
    const observation: Observation = {
      id: randomUUID(),
      ts: event.timestamp,
      redacted: false,
      provenance: {},
      ...mapResult.observation,
    };

    // Store observation
    this.store.insertObservation(observation);

    // Attach to capsule
    this.store.attachObservationToCapsule(context.activeCapsuleId, observation.id);

    // Update context
    context.eventCount += 1;

    return { observation };
  }

  /**
   * End a session (called on Stop hook)
   *
   * Closes the active capsule for the session.
   */
  onStop(sessionId: string, signals?: SessionEndSignals): Capsule {
    const context = this.activeSessions.get(sessionId);
    if (!context) {
      throw new Error(`No active session found for sessionId: ${sessionId}`);
    }

    const closedAt = Date.now();

    // Close capsule in store
    this.store.closeCapsule(context.activeCapsuleId, closedAt);

    // If summary provided, insert it
    if (signals?.summaryContent) {
      const summary = {
        id: randomUUID(),
        capsuleId: context.activeCapsuleId,
        content: signals.summaryContent,
        confidence: signals.summaryConfidence ?? 0.8,
        createdAt: closedAt,
        evidenceRefs: signals.evidenceRefs ?? [],
      };
      this.store.insertSummary(summary);
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Return closed capsule
    const capsule: Capsule = {
      id: context.activeCapsuleId,
      type: 'session',
      intent: 'Claude Code session',
      status: 'closed',
      openedAt: context.startedAt,
      closedAt,
      scopeIds: {
        sessionId,
        repoId: context.cwd,
      },
      observationIds: [],
    };

    return capsule;
  }

  /**
   * Get active session context
   */
  getSession(sessionId: string): SessionContext | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Check if session is active
   */
  isSessionActive(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): { eventCount: number; duration: number } | undefined {
    const context = this.activeSessions.get(sessionId);
    if (!context) return undefined;

    return {
      eventCount: context.eventCount,
      duration: Date.now() - context.startedAt,
    };
  }
}
