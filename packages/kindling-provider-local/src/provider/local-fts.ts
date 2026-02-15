/**
 * Local FTS-based retrieval provider
 *
 * Uses SQLite FTS5 + recency scoring for ranking results.
 * FTS matching, scope filtering, and recency are computed in SQL.
 * BM25 normalization is done in JS across both entity types so
 * scores are comparable between observations and summaries.
 *
 * Scoring formula:
 *   score = (fts_relevance * 0.7) + (recency_score * 0.3)
 *
 * where:
 *   fts_relevance = BM25 rank normalized to [0,1] across all results
 *   recency_score = MAX(0, 1.0 - age_ms / max_age_ms)
 */

import type Database from 'better-sqlite3';
import type {
  RetrievalProvider,
  ProviderSearchOptions,
  ProviderSearchResult,
  Observation,
  Summary,
  ScopeIds,
} from '@eddacraft/kindling-core';

/** Row shape returned by the raw observations query (pre-normalization) */
interface RawObsRow {
  id: string;
  kind: string;
  content: string;
  provenance: string;
  ts: number;
  scope_ids: string;
  redacted: number;
  fts_rank: number;
  recency: number;
}

/** Row shape returned by the raw summaries query (pre-normalization) */
interface RawSumRow {
  id: string;
  capsule_id: string;
  content: string;
  confidence: number;
  evidence_refs: string;
  created_at: number;
  fts_rank: number;
  recency: number;
}

// Max age in ms for recency scoring (30 days)
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export class LocalFtsProvider implements RetrievalProvider {
  name = 'local-fts';
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async search(options: ProviderSearchOptions): Promise<ProviderSearchResult[]> {
    const { query, scopeIds, maxResults = 50, excludeIds = [], includeRedacted = false } = options;

    const now = Date.now();

    // Fetch raw rows with fts_rank + recency from both entity types
    const obsRaw = this.searchObservationsRaw(
      query,
      scopeIds,
      excludeIds,
      includeRedacted,
      now,
      maxResults,
    );
    const sumRaw = this.searchSummariesRaw(query, scopeIds, excludeIds, now, maxResults);

    // Normalize BM25 ranks across BOTH result sets so scores are comparable
    const allRanks = [...obsRaw.map((r) => r.fts_rank), ...sumRaw.map((r) => r.fts_rank)];
    const minRank = allRanks.length > 0 ? Math.min(...allRanks) : 0;
    const maxRank = allRanks.length > 0 ? Math.max(...allRanks) : 0;
    const rankRange = maxRank - minRank;

    const normalizeFts = (rank: number): number => {
      if (rankRange === 0) return 0.5; // Unknown relative relevance
      // FTS5 rank is negative; more negative = more relevant.
      // min_rank is most relevant, max_rank is least relevant.
      return (maxRank - rank) / rankRange;
    };

    const results: ProviderSearchResult[] = [];

    for (const row of obsRaw) {
      const score = Math.min(
        1.0,
        Math.max(0.0, normalizeFts(row.fts_rank) * 0.7 + row.recency * 0.3),
      );
      results.push({
        entity: {
          id: row.id,
          kind: row.kind as Observation['kind'],
          content: row.content,
          provenance: JSON.parse(row.provenance),
          ts: row.ts,
          scopeIds: JSON.parse(row.scope_ids),
          redacted: row.redacted === 1,
        } satisfies Observation,
        score: Math.round(score * 1e10) / 1e10,
        matchContext:
          row.content.length <= 100 ? row.content : row.content.substring(0, 100) + '...',
      });
    }

    for (const row of sumRaw) {
      const score = Math.min(
        1.0,
        Math.max(0.0, normalizeFts(row.fts_rank) * 0.7 + row.recency * 0.3),
      );
      results.push({
        entity: {
          id: row.id,
          capsuleId: row.capsule_id,
          content: row.content,
          confidence: row.confidence,
          evidenceRefs: JSON.parse(row.evidence_refs),
          createdAt: row.created_at,
        } satisfies Summary,
        score: Math.round(score * 1e10) / 1e10,
        matchContext:
          row.content.length <= 100 ? row.content : row.content.substring(0, 100) + '...',
      });
    }

    // Final sort across both result sets and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Search observations — returns raw rows with fts_rank and recency.
   * BM25 normalization is done in the caller across all entity types
   * so scores are comparable between observations and summaries.
   */
  private searchObservationsRaw(
    query: string,
    scopeIds: ScopeIds,
    excludeIds: string[],
    includeRedacted: boolean,
    now: number,
    limit: number,
  ): RawObsRow[] {
    const scopeFilter = this.buildScopeFilters(scopeIds, 'o');
    const excludeFilter =
      excludeIds.length > 0 ? `AND o.id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';
    const redactedFilter = includeRedacted ? '' : 'AND o.redacted = 0';

    const sql = `
      WITH fts_hits AS (
        SELECT rowid, rank FROM observations_fts WHERE content MATCH ?
      )
      SELECT
        o.id, o.kind, o.content, o.provenance, o.ts, o.scope_ids, o.redacted,
        f.rank AS fts_rank,
        MAX(0.0, 1.0 - CAST(? - o.ts AS REAL) / ?) AS recency
      FROM fts_hits f
      JOIN observations o ON f.rowid = o.rowid
      WHERE 1=1
        ${redactedFilter}
        ${scopeFilter.clauses.length > 0 ? 'AND ' + scopeFilter.clauses.join(' AND ') : ''}
        ${excludeFilter}
      ORDER BY f.rank ASC
      LIMIT ?
    `;

    const params: unknown[] = [query, now, MAX_AGE_MS, ...scopeFilter.params, ...excludeIds, limit];

    try {
      return this.db.prepare(sql).all(...params) as RawObsRow[];
    } catch (err: unknown) {
      if (this.isFtsSyntaxError(err)) return [];
      throw err;
    }
  }

  /**
   * Search summaries — returns raw rows with fts_rank and recency.
   * BM25 normalization is done in the caller across all entity types.
   */
  private searchSummariesRaw(
    query: string,
    scopeIds: ScopeIds,
    excludeIds: string[],
    now: number,
    limit: number,
  ): RawSumRow[] {
    const scopeFilter = this.buildScopeFilters(scopeIds, 'c');
    const excludeFilter =
      excludeIds.length > 0 ? `AND s.id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';

    const sql = `
      WITH fts_hits AS (
        SELECT rowid, rank FROM summaries_fts WHERE content MATCH ?
      )
      SELECT
        s.id, s.capsule_id, s.content, s.confidence, s.evidence_refs, s.created_at,
        f.rank AS fts_rank,
        MAX(0.0, 1.0 - CAST(? - s.created_at AS REAL) / ?) AS recency
      FROM fts_hits f
      JOIN summaries s ON f.rowid = s.rowid
      JOIN capsules c ON s.capsule_id = c.id
      WHERE 1=1
        ${scopeFilter.clauses.length > 0 ? 'AND ' + scopeFilter.clauses.join(' AND ') : ''}
        ${excludeFilter}
      ORDER BY f.rank ASC
      LIMIT ?
    `;

    const params: unknown[] = [query, now, MAX_AGE_MS, ...scopeFilter.params, ...excludeIds, limit];

    try {
      return this.db.prepare(sql).all(...params) as RawSumRow[];
    } catch (err: unknown) {
      if (this.isFtsSyntaxError(err)) return [];
      throw err;
    }
  }

  /**
   * Build scope filter SQL clauses using denormalized columns
   */
  private buildScopeFilters(
    scopeIds: ScopeIds,
    tablePrefix = '',
  ): { clauses: string[]; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const prefix = tablePrefix ? `${tablePrefix}.` : '';

    if (scopeIds.sessionId !== undefined) {
      clauses.push(`${prefix}session_id = ?`);
      params.push(scopeIds.sessionId);
    }

    if (scopeIds.repoId !== undefined) {
      clauses.push(`${prefix}repo_id = ?`);
      params.push(scopeIds.repoId);
    }

    if (scopeIds.agentId !== undefined) {
      clauses.push(`${prefix}agent_id = ?`);
      params.push(scopeIds.agentId);
    }

    if (scopeIds.userId !== undefined) {
      clauses.push(`${prefix}user_id = ?`);
      params.push(scopeIds.userId);
    }

    return { clauses, params };
  }

  /**
   * Check if an error is an FTS5 query syntax error (safe to swallow).
   */
  private isFtsSyntaxError(err: unknown): boolean {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      return (
        msg.includes('fts5') ||
        msg.includes('fts syntax') ||
        msg.includes('unterminated string') ||
        msg.includes('unknown special query')
      );
    }
    return false;
  }
}
