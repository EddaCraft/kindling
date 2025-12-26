/**
 * Provider contract types
 *
 * Defines the interface and types for retrieval providers.
 */

/**
 * Target type for a provider hit
 */
export enum ProviderHitTargetType {
  Observation = 'observation',
  Summary = 'summary',
}

/**
 * A single ranked hit from a provider
 */
export interface ProviderHit {
  /** Type of the target */
  targetType: ProviderHitTargetType;

  /** ID of the target entity */
  targetId: string;

  /** Normalized score (0.0-1.0) */
  score: number;

  /** Short explanation of why this was matched */
  why: string;

  /** Evidence observation IDs */
  evidenceRefs: string[];

  /** Timestamp for deterministic tiebreaking */
  tsMs: number;
}

/**
 * Scope filters for retrieval
 */
export interface RetrievalScope {
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
}

/**
 * Request for provider search
 */
export interface ProviderRequest {
  /** Query text (optional - if absent, use recency-based fallback) */
  query?: string;

  /** Scope filters */
  scope?: RetrievalScope;

  /** Intent hint for boosting */
  intent?: string;

  /** Maximum number of candidates to return */
  limit?: number;
}

/**
 * Provider interface
 */
export interface RetrievalProvider {
  /**
   * Searches for relevant candidates based on the request.
   * Returns ranked hits with explainability.
   */
  searchCandidates(request: ProviderRequest): ProviderHit[];
}
