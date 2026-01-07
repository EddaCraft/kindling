/**
 * OpenCode session adapter
 *
 * Manages session capsule lifecycle for OpenCode sessions.
 */

import {
  KindlingService,
  CapsuleType,
  CapsuleIntent,
  type Capsule,
} from '@kindling/core';
import type { OpenCodeEvent } from './event-mapping.js';
import { mapEventToObservation } from './event-mapping.js';

export interface SessionAdapterConfig {
  service: KindlingService;
  defaultIntent?: CapsuleIntent | string;
}

/**
 * Manages session-scoped capsules for OpenCode.
 */
export class SessionAdapter {
  private service: KindlingService;
  private defaultIntent: CapsuleIntent | string;
  private activeSessions = new Map<string, string>(); // sessionId -> capsuleId

  constructor(config: SessionAdapterConfig) {
    this.service = config.service;
    this.defaultIntent = config.defaultIntent ?? CapsuleIntent.General;
  }

  /**
   * Called when an OpenCode session starts.
   */
  onSessionStart(sessionId: string, options?: {
    repoId?: string;
    intent?: CapsuleIntent | string;
  }): Capsule {
    // Check if there's already an open capsule for this session
    let capsule = this.service.getOpenCapsuleForSession(sessionId);

    if (!capsule) {
      // Create a new capsule for this session
      capsule = this.service.openCapsule({
        type: CapsuleType.Session,
        intent: options?.intent ?? this.defaultIntent,
        scope: {
          sessionId,
          repoId: options?.repoId,
        },
      });

      this.activeSessions.set(sessionId, capsule.id);
    }

    return capsule;
  }

  /**
   * Called when an OpenCode event occurs.
   */
  onEvent(event: OpenCodeEvent): void {
    // Ensure there's an open capsule for this session
    const capsule = this.service.getOpenCapsuleForSession(event.sessionId);
    if (!capsule) {
      // Auto-create capsule if needed
      this.onSessionStart(event.sessionId, { repoId: event.repoId });
    }

    // Map event to observation and append
    const observationInput = mapEventToObservation(event);
    this.service.appendObservation(observationInput, {
      autoAttach: true, // Auto-attach to the open session capsule
    });
  }

  /**
   * Called when an OpenCode session ends.
   */
  onSessionEnd(sessionId: string, options?: {
    summaryContent?: string;
  }): Capsule | null {
    const capsule = this.service.getOpenCapsuleForSession(sessionId);

    if (!capsule) {
      return null;
    }

    // Close the capsule
    const closed = this.service.closeCapsule(capsule.id, {
      generateSummary: !!options?.summaryContent,
      summaryContent: options?.summaryContent,
    });

    this.activeSessions.delete(sessionId);

    return closed;
  }

  /**
   * Gets the active capsule for a session.
   */
  getSessionCapsule(sessionId: string): Capsule | null {
    return this.service.getOpenCapsuleForSession(sessionId);
  }
}
