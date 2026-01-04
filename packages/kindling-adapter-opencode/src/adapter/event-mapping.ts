/**
 * OpenCode event mapping
 *
 * Maps OpenCode events to Kindling observations.
 */

import {
  ObservationKind,
  CreateObservationInput,
  type ObservationProvenance,
} from '@kindling/core';

/**
 * OpenCode event types (simplified)
 */
export enum OpenCodeEventType {
  ToolCall = 'tool_call',
  CommandRun = 'command_run',
  FileDiff = 'file_diff',
  Error = 'error',
  Message = 'message',
}

/**
 * Generic OpenCode event
 */
export interface OpenCodeEvent {
  type: OpenCodeEventType;
  sessionId: string;
  repoId?: string;
  timestamp?: number;
  data: any;
}

/**
 * Maps an OpenCode event to a Kindling observation input.
 */
export function mapEventToObservation(event: OpenCodeEvent): CreateObservationInput {
  const tsMs = event.timestamp ?? Date.now();

  switch (event.type) {
    case OpenCodeEventType.ToolCall:
      return {
        kind: ObservationKind.ToolCall,
        content: JSON.stringify(event.data.result ?? null),
        provenance: {
          toolName: event.data.toolName,
          args: event.data.args,
        },
        tsMs,
        scope: {
          sessionId: event.sessionId,
          repoId: event.repoId,
        },
      };

    case OpenCodeEventType.CommandRun:
      return {
        kind: ObservationKind.Command,
        content: event.data.output ?? null,
        provenance: {
          command: event.data.command,
          exitCode: event.data.exitCode,
        },
        tsMs,
        scope: {
          sessionId: event.sessionId,
          repoId: event.repoId,
        },
      };

    case OpenCodeEventType.FileDiff:
      return {
        kind: ObservationKind.FileDiff,
        content: event.data.diff ?? null,
        provenance: {
          paths: event.data.paths ?? [],
        },
        tsMs,
        scope: {
          sessionId: event.sessionId,
          repoId: event.repoId,
        },
      };

    case OpenCodeEventType.Error:
      return {
        kind: ObservationKind.Error,
        content: event.data.message ?? null,
        provenance: {
          stack: event.data.stack,
          errorType: event.data.type,
        },
        tsMs,
        scope: {
          sessionId: event.sessionId,
          repoId: event.repoId,
        },
      };

    case OpenCodeEventType.Message:
      return {
        kind: ObservationKind.Message,
        content: event.data.content ?? null,
        provenance: {},
        tsMs,
        scope: {
          sessionId: event.sessionId,
          repoId: event.repoId,
        },
      };

    default:
      throw new Error(`Unknown event type: ${event.type}`);
  }
}
