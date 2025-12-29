/**
 * Store interface types
 */

export interface ObservationRow {
  id: string;
  kind: string;
  content: string;
  provenance: string; // JSON
  ts: number;
  session_id: string | null;
  repo_id: string | null;
  agent_id: string | null;
  user_id: string | null;
  redacted: number; // SQLite boolean (0 or 1)
}

export interface CapsuleRow {
  id: string;
  type: string;
  intent: string;
  status: string;
  opened_at: number;
  closed_at: number | null;
  session_id: string | null;
  repo_id: string | null;
  agent_id: string | null;
  user_id: string | null;
  summary_id: string | null;
}

export interface SummaryRow {
  id: string;
  capsule_id: string;
  content: string;
  confidence: number;
  created_at: number;
}

export interface PinRow {
  id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: number;
  expires_at: number | null;
  session_id: string | null;
  repo_id: string | null;
  agent_id: string | null;
  user_id: string | null;
}

export interface InsertObservationParams {
  id: string;
  kind: string;
  content: string;
  provenance: Record<string, unknown>;
  ts: number;
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
  redacted?: boolean;
}

export interface CreateCapsuleParams {
  id: string;
  type: string;
  intent: string;
  openedAt: number;
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
}

export interface CloseCapsuleParams {
  id: string;
  closedAt: number;
  summaryId?: string;
}

export interface AttachObservationParams {
  capsuleId: string;
  observationId: string;
}

export interface InsertSummaryParams {
  id: string;
  capsuleId: string;
  content: string;
  confidence: number;
  createdAt: number;
  evidenceRefs: string[];
}

export interface InsertPinParams {
  id: string;
  targetType: 'observation' | 'summary';
  targetId: string;
  reason?: string;
  createdAt: number;
  expiresAt?: number;
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
}
