/**
 * Local SQLite FTS-based retrieval provider
 *
 * Implements deterministic retrieval over Kindling's SQLite store.
 */

import type {
  KindlingStore,
  Observation,
  Summary,
  ObservationScope,
  RetrievalProvider,
  ProviderRequest,
  ProviderHit,
  RetrievalScope,
} from '@kindling/core';
import { ProviderHitTargetType } from '@kindling/core';
import {
  compareHits,
  normalizeScore,
  applyRecencyDecay,
  applyScopeBoost,
} from './scoring.js';

export class LocalRetrievalProvider implements RetrievalProvider {
  constructor(private store: KindlingStore) {}

  searchCandidates(request: ProviderRequest): ProviderHit[] {
    const limit = request.limit ?? 20;
    const hits: ProviderHit[] = [];

    if (request.query) {
      // FTS-based search
      hits.push(...this.searchObservationsFts(request, limit));
      hits.push(...this.searchSummariesFts(request, limit));
    } else {
      // Fallback to recency-based search
      hits.push(...this.searchRecent(request, limit));
    }

    // Apply ranking
    const rankedHits = this.rankHits(hits, request);

    // Return top N
    return rankedHits.slice(0, limit);
  }

  private searchObservationsFts(request: ProviderRequest, limit: number): ProviderHit[] {
    if (!request.query) return [];

    // Use the store's database to perform FTS search
    // Note: We need direct DB access for FTS queries
    // For now, this is a simplified implementation that filters by scope
    const observations = this.store.listObservations({
      sessionId: request.scope?.sessionId,
      repoId: request.scope?.repoId,
      agentId: request.scope?.agentId,
      userId: request.scope?.userId,
      limit: limit * 2, // Get more than needed for ranking
    });

    const query = request.query.toLowerCase();
    const nowMs = Date.now();

    return observations
      .filter((obs: Observation) => {
        const content = (obs.content ?? '').toLowerCase();
        return content.includes(query);
      })
      .map((obs: Observation) => {
        const baseScore = this.calculateFtsScore(obs.content ?? '', query);
        const matchLevel = this.determineScopeMatchLevel(obs.scope, request.scope);
        const ageMs = nowMs - obs.tsMs;

        let score = baseScore;
        score = applyScopeBoost(score, matchLevel);
        score = applyRecencyDecay(score, ageMs);

        return {
          targetType: ProviderHitTargetType.Observation,
          targetId: obs.id,
          score: normalizeScore(score, 10), // Normalize to 0-1
          why: this.generateWhy(obs.kind, matchLevel),
          evidenceRefs: [obs.id],
          tsMs: obs.tsMs,
        };
      });
  }

  private searchSummariesFts(request: ProviderRequest, limit: number): ProviderHit[] {
    if (!request.query) return [];

    const summaries = this.store.listSummaries({ limit: limit * 2 });
    const query = request.query.toLowerCase();
    const nowMs = Date.now();

    return summaries
      .filter((sum: Summary) => {
        const content = sum.content.toLowerCase();
        return content.includes(query);
      })
      .map((sum: Summary) => {
        const baseScore = this.calculateFtsScore(sum.content, query);
        const ageMs = nowMs - sum.tsMs;

        let score = baseScore;
        score = applyRecencyDecay(score, ageMs);

        // Apply confidence boost if available
        if (sum.confidence !== null) {
          score = score * (0.5 + sum.confidence * 0.5); // Scale by confidence
        }

        return {
          targetType: ProviderHitTargetType.Summary,
          targetId: sum.id,
          score: normalizeScore(score, 10),
          why: 'matched capsule summary',
          evidenceRefs: sum.evidenceRefs,
          tsMs: sum.tsMs,
        };
      });
  }

  private searchRecent(request: ProviderRequest, limit: number): ProviderHit[] {
    const observations = this.store.listObservations({
      sessionId: request.scope?.sessionId,
      repoId: request.scope?.repoId,
      agentId: request.scope?.agentId,
      userId: request.scope?.userId,
      limit,
    });

    const nowMs = Date.now();

    return observations.map((obs: Observation) => {
      const matchLevel = this.determineScopeMatchLevel(obs.scope, request.scope);
      const ageMs = nowMs - obs.tsMs;

      let score = 5.0; // Base score for recency
      score = applyScopeBoost(score, matchLevel);
      score = applyRecencyDecay(score, ageMs, 1800000); // 30 min half-life for recent

      return {
        targetType: ProviderHitTargetType.Observation,
        targetId: obs.id,
        score: normalizeScore(score, 10),
        why: 'recent activity in scope',
        evidenceRefs: [obs.id],
        tsMs: obs.tsMs,
      };
    });
  }

  private rankHits(hits: ProviderHit[], request: ProviderRequest): ProviderHit[] {
    // Sort using stable comparator
    return hits.sort(compareHits);
  }

  private calculateFtsScore(content: string, query: string): number {
    const lower = content.toLowerCase();
    const queryLower = query.toLowerCase();

    // Simple scoring: count occurrences
    const occurrences = (lower.match(new RegExp(queryLower, 'g')) || []).length;

    // Boost exact matches
    const exactMatch = lower === queryLower ? 5 : 0;

    return exactMatch + occurrences;
  }

  private determineScopeMatchLevel(
    targetScope: ObservationScope | undefined,
    requestScope: RetrievalScope | undefined
  ): 'session' | 'repo' | 'agent' | 'user' | 'none' {
    if (requestScope?.sessionId && targetScope?.sessionId === requestScope.sessionId) {
      return 'session';
    }
    if (requestScope?.repoId && targetScope?.repoId === requestScope.repoId) {
      return 'repo';
    }
    if (requestScope?.agentId && targetScope?.agentId === requestScope.agentId) {
      return 'agent';
    }
    if (requestScope?.userId && targetScope?.userId === requestScope.userId) {
      return 'user';
    }
    return 'none';
  }

  private generateWhy(kind: string, matchLevel: string): string {
    const scope = matchLevel === 'session' ? 'from this session' : matchLevel === 'repo' ? 'from repo' : '';
    return `matched ${kind} ${scope}`.trim();
  }
}
