/**
 * Retrieval types and interfaces
 */

import type { ScopeIds, ID } from './common.js';
import type { Observation } from './observation.js';
import type { Summary } from './summary.js';
import type { Pin } from './pin.js';

/**
 * Options for retrieval request
 */
export interface RetrieveOptions {
  query: string;
  scopeIds: ScopeIds;
  tokenBudget?: number;
  maxCandidates?: number;
  includeRedacted?: boolean;
}

/**
 * Pin with resolved target
 */
export interface PinResult {
  pin: Pin;
  target: Observation | Summary;
}

/**
 * Candidate with score and match context
 */
export interface CandidateResult {
  entity: Observation | Summary;
  score: number;
  matchContext?: string;
}

/**
 * Provenance for retrieval result
 */
export interface RetrieveProvenance {
  query: string;
  scopeIds: ScopeIds;
  totalCandidates: number;
  returnedCandidates: number;
  truncatedDueToTokenBudget: boolean;
  providerUsed: string;
}

/**
 * Complete retrieval result
 */
export interface RetrieveResult {
  pins: PinResult[];
  currentSummary?: Summary;
  candidates: CandidateResult[];
  provenance: RetrieveProvenance;
}

/**
 * Provider search options
 */
export interface ProviderSearchOptions {
  query: string;
  scopeIds: ScopeIds;
  maxResults?: number;
  excludeIds?: ID[];
  includeRedacted?: boolean;
}

/**
 * Provider search result
 */
export interface ProviderSearchResult {
  entity: Observation | Summary;
  score: number;
  matchContext?: string;
}

/**
 * Retrieval provider interface
 */
export interface RetrievalProvider {
  name: string;
  search(options: ProviderSearchOptions): Promise<ProviderSearchResult[]>;
}
