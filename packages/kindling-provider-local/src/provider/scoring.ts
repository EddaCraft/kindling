/**
 * Scoring and ranking logic
 *
 * Implements stable, deterministic ranking for retrieval hits.
 */

import type { ProviderHit } from './types.js';

/**
 * Stable sort comparator for provider hits.
 *
 * Ordering:
 * 1. Score descending
 * 2. Timestamp descending (more recent first)
 * 3. ID ascending (deterministic tiebreak)
 */
export function compareHits(a: ProviderHit, b: ProviderHit): number {
  // Compare scores (higher first)
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  // Compare timestamps (more recent first)
  if (a.tsMs !== b.tsMs) {
    return b.tsMs - a.tsMs;
  }

  // Compare IDs (lexicographic for determinism)
  return a.targetId.localeCompare(b.targetId);
}

/**
 * Normalizes a raw score to 0.0-1.0 range.
 */
export function normalizeScore(rawScore: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.min(1.0, rawScore / maxScore);
}

/**
 * Applies recency decay to a score.
 *
 * @param score - Base score
 * @param ageMs - Age in milliseconds
 * @param halfLifeMs - Half-life for decay (default: 1 hour)
 */
export function applyRecencyDecay(
  score: number,
  ageMs: number,
  halfLifeMs: number = 3600000
): number {
  const decayFactor = Math.pow(0.5, ageMs / halfLifeMs);
  return score * decayFactor;
}

/**
 * Applies scope match boost.
 *
 * Boost hierarchy: session > repo > agent/user
 */
export function applyScopeBoost(
  baseScore: number,
  matchLevel: 'session' | 'repo' | 'agent' | 'user' | 'none'
): number {
  const boosts = {
    session: 1.5,
    repo: 1.3,
    agent: 1.1,
    user: 1.1,
    none: 1.0,
  };

  return baseScore * boosts[matchLevel];
}

/**
 * Applies intent match boost.
 */
export function applyIntentBoost(
  baseScore: number,
  intentMatches: boolean
): number {
  return intentMatches ? baseScore * 1.2 : baseScore;
}
