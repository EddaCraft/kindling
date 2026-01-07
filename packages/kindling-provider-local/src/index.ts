export { LocalRetrievalProvider } from './provider/local-provider.js';
export { ProviderHitTargetType } from '@kindling/core';
export type {
  RetrievalProvider,
  ProviderRequest,
  ProviderHit,
  RetrievalScope,
} from '@kindling/core';
export {
  compareHits,
  normalizeScore,
  applyRecencyDecay,
  applyScopeBoost,
  applyIntentBoost,
} from './provider/scoring.js';
