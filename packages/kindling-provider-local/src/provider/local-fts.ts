/**
 * Local FTS-based retrieval provider
 *
 * Uses SQLite FTS5 + recency scoring for ranking results.
 *
 * Scoring formula:
 *   score = (fts_relevance * 0.7) + (recency_score * 0.3)
 *
 * where:
 *   fts_relevance = BM25 score from FTS5 (normalized to 0.0-1.0)
 *   recency_score = 1.0 - (age_days / max_age_days)
 */

import type Database from 'better-sqlite3';
import type {
  RetrievalProvider,
  ProviderSearchOptions,
  ProviderSearchResult,
  Observation,
  Summary,
  ScopeIds,
} from '@kindling/core';

interface FtsMatch {
  rowid: number;
  table_name: 'observations' | 'summaries';
  rank: number; // BM25 score (negative number, closer to 0 = better)
}


export class LocalFtsProvider implements RetrievalProvider {
  name = 'local-fts';
  private db: Database.Database;

  // Weight for FTS relevance vs recency
  private readonly FTS_WEIGHT = 0.7;
  private readonly RECENCY_WEIGHT = 0.3;

  // Max age in days for recency scoring (30 days)
  private readonly MAX_AGE_DAYS = 30;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult[]> {
    const {
      query,
      scopeIds,
      maxResults = 50,
      excludeIds = [],
      includeRedacted = false,
    } = options;

    // 1. Find FTS matches from both observations and summaries
    const ftsMatches = this.findFtsMatches(query);

    if (ftsMatches.length === 0) {
      return [];
    }

    // 2. Fetch entities and apply filters
    const entities = this.fetchEntities(
      ftsMatches,
      scopeIds,
      excludeIds,
      includeRedacted
    );

    if (entities.length === 0) {
      return [];
    }

    // 3. Calculate scores (FTS + recency)
    const scoredResults = this.calculateScores(entities, ftsMatches);

    // 4. Sort by score (descending) and limit
    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, maxResults);
  }

  /**
   * Find FTS matches using SQLite FTS5
   */
  private findFtsMatches(query: string): FtsMatch[] {
    // Query both observations_fts and summaries_fts
    // FTS5 rank is negative (closer to 0 = better match)
    const matches: FtsMatch[] = [];

    // Query observations FTS
    const obsStmt = this.db.prepare<[string]>(`
      SELECT rowid, rank
      FROM observations_fts
      WHERE content MATCH ?
      ORDER BY rank
    `);

    const obsMatches = obsStmt.all(query) as Array<{ rowid: number; rank: number }>;
    matches.push(
      ...obsMatches.map(m => ({
        rowid: m.rowid,
        table_name: 'observations' as const,
        rank: m.rank,
      }))
    );

    // Query summaries FTS
    const sumStmt = this.db.prepare<[string]>(`
      SELECT rowid, rank
      FROM summaries_fts
      WHERE content MATCH ?
      ORDER BY rank
    `);

    const sumMatches = sumStmt.all(query) as Array<{ rowid: number; rank: number }>;
    matches.push(
      ...sumMatches.map(m => ({
        rowid: m.rowid,
        table_name: 'summaries' as const,
        rank: m.rank,
      }))
    );

    return matches;
  }

  /**
   * Fetch entities and apply scope/redaction/exclusion filters
   */
  private fetchEntities(
    matches: FtsMatch[],
    scopeIds: ScopeIds,
    excludeIds: string[],
    includeRedacted: boolean
  ): Array<{ entity: Observation | Summary; ftsMatch: FtsMatch }> {
    const results: Array<{ entity: Observation | Summary; ftsMatch: FtsMatch }> = [];

    // Build scope filter SQL
    const scopeFilters = this.buildScopeFilters(scopeIds);

    // Fetch observations
    const obsMatches = matches.filter(m => m.table_name === 'observations');
    if (obsMatches.length > 0) {
      const obsRowids = obsMatches.map(m => m.rowid);
      const placeholders = obsRowids.map(() => '?').join(',');

      let obsQuery = `
        SELECT o.rowid, o.id, o.kind, o.content, o.provenance, o.ts, o.scope_ids, o.redacted
        FROM observations o
        WHERE o.rowid IN (${placeholders})
      `;

      // Apply redaction filter
      if (!includeRedacted) {
        obsQuery += ` AND o.redacted = 0`;
      }

      // Apply scope filters
      if (scopeFilters.length > 0) {
        obsQuery += ` AND (${scopeFilters.join(' AND ')})`;
      }

      const obsStmt = this.db.prepare(obsQuery);
      const observations = obsStmt.all(...obsRowids) as Array<{
        rowid: number;
        id: string;
        kind: string;
        content: string;
        provenance: string;
        ts: number;
        scope_ids: string;
        redacted: number;
      }>;

      for (const row of observations) {
        if (excludeIds.includes(row.id)) continue;

        const observation: Observation = {
          id: row.id,
          kind: row.kind as Observation['kind'],
          content: row.content,
          provenance: JSON.parse(row.provenance),
          ts: row.ts,
          scopeIds: JSON.parse(row.scope_ids),
          redacted: row.redacted === 1,
        };

        const ftsMatch = obsMatches.find(m => m.rowid === row.rowid);
        if (ftsMatch) {
          results.push({ entity: observation, ftsMatch });
        }
      }
    }

    // Fetch summaries
    const sumMatches = matches.filter(m => m.table_name === 'summaries');
    if (sumMatches.length > 0) {
      const sumRowids = sumMatches.map(m => m.rowid);
      const placeholders = sumRowids.map(() => '?').join(',');

      // Join with capsules to get scope_ids for filtering
      let sumQuery = `
        SELECT s.rowid, s.id, s.capsule_id, s.content, s.confidence, s.evidence_refs, s.created_at
        FROM summaries s
        INNER JOIN capsules c ON s.capsule_id = c.id
        WHERE s.rowid IN (${placeholders})
      `;

      // Apply scope filters (on capsules.scope_ids)
      if (scopeFilters.length > 0) {
        // Replace 'scope_ids' with 'c.scope_ids' in filters
        const capsuleScopeFilters = scopeFilters.map(f => f.replace('scope_ids', 'c.scope_ids'));
        sumQuery += ` AND (${capsuleScopeFilters.join(' AND ')})`;
      }

      const sumStmt = this.db.prepare(sumQuery);
      const summaries = sumStmt.all(...sumRowids) as Array<{
        rowid: number;
        id: string;
        capsule_id: string;
        content: string;
        confidence: number;
        evidence_refs: string;
        created_at: number;
      }>;

      for (const row of summaries) {
        if (excludeIds.includes(row.id)) continue;

        const summary: Summary = {
          id: row.id,
          capsuleId: row.capsule_id,
          content: row.content,
          confidence: row.confidence,
          evidenceRefs: JSON.parse(row.evidence_refs),
          createdAt: row.created_at,
        };

        const ftsMatch = sumMatches.find(m => m.rowid === row.rowid);
        if (ftsMatch) {
          results.push({ entity: summary, ftsMatch });
        }
      }
    }

    return results;
  }

  /**
   * Build scope filter SQL clauses
   */
  private buildScopeFilters(scopeIds: ScopeIds): string[] {
    const filters: string[] = [];

    if (scopeIds.sessionId !== undefined) {
      filters.push(`json_extract(scope_ids, '$.sessionId') = '${this.escapeSql(scopeIds.sessionId)}'`);
    }

    if (scopeIds.repoId !== undefined) {
      filters.push(`json_extract(scope_ids, '$.repoId') = '${this.escapeSql(scopeIds.repoId)}'`);
    }

    if (scopeIds.agentId !== undefined) {
      filters.push(`json_extract(scope_ids, '$.agentId') = '${this.escapeSql(scopeIds.agentId)}'`);
    }

    if (scopeIds.userId !== undefined) {
      filters.push(`json_extract(scope_ids, '$.userId') = '${this.escapeSql(scopeIds.userId)}'`);
    }

    return filters;
  }

  /**
   * Escape SQL string literals (basic escaping)
   */
  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Calculate combined score: FTS relevance + recency
   */
  private calculateScores(
    entities: Array<{ entity: Observation | Summary; ftsMatch: FtsMatch }>,
    allMatches: FtsMatch[]
  ): ProviderSearchResult[] {
    // Find max/min FTS ranks for normalization
    const ftsRanks = allMatches.map(m => m.rank);
    const minRank = Math.min(...ftsRanks); // Most negative (best)
    const maxRank = Math.max(...ftsRanks); // Closest to 0 (worst)
    const rankRange = maxRank - minRank;

    // Current timestamp for recency scoring
    const now = Date.now();

    return entities.map(({ entity, ftsMatch }) => {
      // Normalize FTS rank to 0.0-1.0 (higher = better)
      // FTS rank is negative, so we invert it
      const ftsRelevance = rankRange > 0
        ? (maxRank - ftsMatch.rank) / rankRange
        : 1.0;

      // Calculate recency score
      const entityTs = this.getTimestamp(entity);
      const ageDays = (now - entityTs) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1.0 - (ageDays / this.MAX_AGE_DAYS));

      // Combined score
      const score = (ftsRelevance * this.FTS_WEIGHT) + (recencyScore * this.RECENCY_WEIGHT);

      // Extract match context (snippet around match)
      const matchContext = this.extractMatchContext(entity);

      // Clamp to [0, 1] and round to avoid floating point precision issues
      const clampedScore = Math.min(1.0, Math.max(0.0, score));
      const roundedScore = Math.round(clampedScore * 1e10) / 1e10; // Round to 10 decimal places

      return {
        entity,
        score: roundedScore,
        matchContext,
      };
    });
  }

  /**
   * Get timestamp from entity (observations have ts, summaries have createdAt)
   */
  private getTimestamp(entity: Observation | Summary): number {
    if ('ts' in entity) {
      return entity.ts;
    } else {
      return entity.createdAt;
    }
  }

  /**
   * Extract snippet showing match context
   */
  private extractMatchContext(
    entity: Observation | Summary
  ): string | undefined {
    const content = entity.content;
    const maxLength = 100;

    if (content.length <= maxLength) {
      return content;
    }

    // Simple heuristic: take first maxLength chars and add ellipsis
    // (FTS5 doesn't provide match offsets by default)
    return content.substring(0, maxLength) + '...';
  }
}
