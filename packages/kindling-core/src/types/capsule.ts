/**
 * Domain types for Capsules
 *
 * Capsules are bounded units of meaning: sessions, workflow nodes, or other
 * coherent groupings of observations.
 */

/**
 * Capsule types
 */
export enum CapsuleType {
  Session = 'session',
  PocketFlowNode = 'pocketflow_node',
  Custom = 'custom',
}

/**
 * Capsule status
 */
export enum CapsuleStatus {
  Open = 'open',
  Closed = 'closed',
}

/**
 * Capsule intent hints
 */
export enum CapsuleIntent {
  General = 'general',
  Debug = 'debug',
  Implement = 'implement',
  Refactor = 'refactor',
  Document = 'document',
  Test = 'test',
}

/**
 * Capsule scope identifiers
 */
export interface CapsuleScope {
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
}

/**
 * Capsule entity
 */
export interface Capsule {
  id: string;
  type: CapsuleType;
  intent: CapsuleIntent | string;
  status: CapsuleStatus;
  scope: CapsuleScope;
  openedAtMs: number;
  closedAtMs: number | null;
  createdAt: number;
}

/**
 * Input for creating/opening a new capsule
 */
export interface OpenCapsuleInput {
  id?: string;
  type: CapsuleType;
  intent?: CapsuleIntent | string;
  scope?: CapsuleScope;
  openedAtMs?: number;
}

/**
 * Input for closing a capsule
 */
export interface CloseCapsuleInput {
  closedAtMs?: number;
}

/**
 * Validates a capsule type
 */
export function validateCapsuleType(type: string): type is CapsuleType {
  return Object.values(CapsuleType).includes(type as CapsuleType);
}

/**
 * Validates a capsule status
 */
export function validateCapsuleStatus(status: string): status is CapsuleStatus {
  return Object.values(CapsuleStatus).includes(status as CapsuleStatus);
}

/**
 * Generates a unique capsule ID
 */
export function generateCapsuleId(): string {
  return `cap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
