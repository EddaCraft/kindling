/**
 * Domain types for Observations
 *
 * Observations are the atomic units of captured context: tool calls, commands,
 * file diffs, errors, and messages.
 */

/**
 * Observation kinds
 */
export enum ObservationKind {
  ToolCall = 'tool_call',
  Command = 'command',
  FileDiff = 'file_diff',
  Error = 'error',
  Message = 'message',
  NodeStart = 'node_start',
  NodeOutput = 'node_output',
  NodeError = 'node_error',
  NodeEnd = 'node_end',
}

/**
 * Scope identifiers for observations
 */
export interface ObservationScope {
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
}

/**
 * Observation provenance metadata
 */
export interface ObservationProvenance {
  // Tool call provenance
  toolName?: string;
  args?: unknown;

  // Command provenance
  command?: string;
  exitCode?: number;

  // File diff provenance
  paths?: string[];

  // Error provenance
  stack?: string;
  errorType?: string;

  // Node provenance (PocketFlow)
  nodeName?: string;
  nodeId?: string;

  // Generic metadata
  [key: string]: unknown;
}

/**
 * Observation entity
 */
export interface Observation {
  id: string;
  kind: ObservationKind;
  content: string | null;
  provenance: ObservationProvenance;
  tsMs: number;
  scope: ObservationScope;
  redacted: boolean;
  createdAt: number;
}

/**
 * Input for creating a new observation
 */
export interface CreateObservationInput {
  id?: string;
  kind: ObservationKind;
  content?: string | null;
  provenance?: ObservationProvenance;
  tsMs?: number;
  scope?: ObservationScope;
}

/**
 * Validates an observation kind
 */
export function validateObservationKind(kind: string): kind is ObservationKind {
  return Object.values(ObservationKind).includes(kind as ObservationKind);
}

/**
 * Generates a unique observation ID
 */
export function generateObservationId(): string {
  return `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
