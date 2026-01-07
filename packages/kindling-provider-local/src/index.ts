/**
 * @kindling/provider-local
 *
 * Local FTS-based retrieval provider for Kindling.
 */

export { LocalRetrievalProvider } from './provider/local-provider.js';
export type {
  RetrievalProvider,
  ProviderRequest,
  ProviderHit,
  ProviderHitTargetType,
  RetrievalScope,
} from './provider/types.js';
export {
  compareHits,
  normalizeScore,
  applyRecencyDecay,
  applyScopeBoost,
  applyIntentBoost,
} from './provider/scoring.js';
