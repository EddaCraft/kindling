export enum ProviderHitTargetType {
  Observation = 'observation',
  Summary = 'summary',
}

export interface ProviderHit {
  targetType: ProviderHitTargetType;
  targetId: string;
  score: number;
  why: string;
  evidenceRefs: string[];
  tsMs: number;
}

export interface RetrievalScope {
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
}

export interface ProviderRequest {
  query?: string;
  scope?: RetrievalScope;
  intent?: string;
  limit?: number;
}

export interface RetrievalProvider {
  searchCandidates(request: ProviderRequest): ProviderHit[];
}
