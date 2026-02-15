/**
 * Local FTS-based retrieval provider
 *
 * Uses SQLite FTS5 + recency scoring for ranking results.
 * Scoring is computed entirely in SQL using window functions
 * for BM25 normalization and inline recency calculation.
 *
 * Scoring formula:
 *   score = (fts_relevance * 0.7) + (recency_score * 0.3)
 *
 * where:
 *   fts_relevance = BM25 score from FTS5 (normalized to 0.0-1.0 via window functions)
 *   recency_score = MAX(0, 1.0 - age_days / max_age_days)
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

/** Row shape returned by the scored observations query */
interface ScoredObsRow {
  id: string;
  kind: string;
  content: string;
  provenance: string;
  ts: number;
  scope_ids: string;
  redacted: number;
  score: number;
}

/** Row shape returned by the scored summaries query */
interface ScoredSumRow {
  id: string;
  capsule_id: string;
  content: string;
  confidence: number;
  evidence_refs: string;
  created_at: number;
  score: number;
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
    const results: ProviderSearchResult[] = [];

    // Search observations — single SQL query does FTS + join + scope filter + scoring
    const obsResults = this.searchObservations(
      query,
      scopeIds,
      excludeIds,
      includeRedacted,
      now,
      maxResults,
    );
    results.push(...obsResults);

    // Search summaries — single SQL query does FTS + join + scope filter + scoring
    const sumResults = this.searchSummaries(query, scopeIds, excludeIds, now, maxResults);
    results.push(...sumResults);

    // Final sort across both result sets and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Search observations with scoring computed in SQL.
   *
   * Uses a CTE + window functions to:
   * 1. FTS MATCH for candidate rowids
   * 2. JOIN with observations for entity data + scope filtering
   * 3. Normalize BM25 ranks to [0,1] using MIN/MAX window functions
   * 4. Compute recency score inline
   * 5. Combine into final score, ORDER BY, LIMIT
   */
  private searchObservations(
    query: string,
    scopeIds: ScopeIds,
    excludeIds: string[],
    includeRedacted: boolean,
    now: number,
    limit: number,
  ): ProviderSearchResult[] {
    const scopeFilter = this.buildScopeFilters(scopeIds, 'o');
    const excludeFilter =
      excludeIds.length > 0 ? `AND o.id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';
    const redactedFilter = includeRedacted ? '' : 'AND o.redacted = 0';

    const sql = `
      WITH fts_hits AS (
        SELECT rowid, rank FROM observations_fts WHERE content MATCH ?
      ),
      matched AS (
        SELECT
          o.id, o.kind, o.content, o.provenance, o.ts, o.scope_ids, o.redacted,
          f.rank AS fts_rank,
          MIN(f.rank) OVER() AS min_rank,
          MAX(f.rank) OVER() AS max_rank
        FROM fts_hits f
        JOIN observations o ON f.rowid = o.rowid
        WHERE 1=1
          ${redactedFilter}
          ${scopeFilter.clauses.length > 0 ? 'AND ' + scopeFilter.clauses.join(' AND ') : ''}
          ${excludeFilter}
      )
      SELECT
        id, kind, content, provenance, ts, scope_ids, redacted,
        ROUND(MIN(1.0, MAX(0.0,
          CASE WHEN max_rank = min_rank THEN 1.0
               ELSE (max_rank - fts_rank) / (max_rank - min_rank)
          END * 0.7
          + MAX(0.0, 1.0 - CAST(? - ts AS REAL) / ?) * 0.3
        )), 10) AS score
      FROM matched
      ORDER BY score DESC
      LIMIT ?
    `;

    const params: unknown[] = [query, ...scopeFilter.params, ...excludeIds, now, MAX_AGE_MS, limit];

    let rows: ScoredObsRow[];
    try {
      rows = this.db.prepare(sql).all(...params) as ScoredObsRow[];
    } catch (err: unknown) {
      if (this.isFtsSyntaxError(err)) return [];
      throw err;
    }

    return rows.map((row) => ({
      entity: {
        id: row.id,
        kind: row.kind as Observation['kind'],
        content: row.content,
        provenance: JSON.parse(row.provenance),
        ts: row.ts,
        scopeIds: JSON.parse(row.scope_ids),
        redacted: row.redacted === 1,
      } satisfies Observation,
      score: row.score,
      matchContext: row.content.length <= 100 ? row.content : row.content.substring(0, 100) + '...',
    }));
  }

  /**
   * Search summaries with scoring computed in SQL.
   * Joins through capsules for scope filtering.
   */
  private searchSummaries(
    query: string,
    scopeIds: ScopeIds,
    excludeIds: string[],
    now: number,
    limit: number,
  ): ProviderSearchResult[] {
    const scopeFilter = this.buildScopeFilters(scopeIds, 'c');
    const excludeFilter =
      excludeIds.length > 0 ? `AND s.id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';

    const sql = `
      WITH fts_hits AS (
        SELECT rowid, rank FROM summaries_fts WHERE content MATCH ?
      ),
      matched AS (
        SELECT
          s.id, s.capsule_id, s.content, s.confidence, s.evidence_refs, s.created_at,
          f.rank AS fts_rank,
          MIN(f.rank) OVER() AS min_rank,
          MAX(f.rank) OVER() AS max_rank
        FROM fts_hits f
        JOIN summaries s ON f.rowid = s.rowid
        JOIN capsules c ON s.capsule_id = c.id
        WHERE 1=1
          ${scopeFilter.clauses.length > 0 ? 'AND ' + scopeFilter.clauses.join(' AND ') : ''}
          ${excludeFilter}
      )
      SELECT
        id, capsule_id, content, confidence, evidence_refs, created_at,
        ROUND(MIN(1.0, MAX(0.0,
          CASE WHEN max_rank = min_rank THEN 1.0
               ELSE (max_rank - fts_rank) / (max_rank - min_rank)
          END * 0.7
          + MAX(0.0, 1.0 - CAST(? - created_at AS REAL) / ?) * 0.3
        )), 10) AS score
      FROM matched
      ORDER BY score DESC
      LIMIT ?
    `;

    const params: unknown[] = [query, ...scopeFilter.params, ...excludeIds, now, MAX_AGE_MS, limit];

    let rows: ScoredSumRow[];
    try {
      rows = this.db.prepare(sql).all(...params) as ScoredSumRow[];
    } catch (err: unknown) {
      if (this.isFtsSyntaxError(err)) return [];
      throw err;
    }

    return rows.map((row) => ({
      entity: {
        id: row.id,
        capsuleId: row.capsule_id,
        content: row.content,
        confidence: row.confidence,
        evidenceRefs: JSON.parse(row.evidence_refs),
        createdAt: row.created_at,
      } satisfies Summary,
      score: row.score,
      matchContext: row.content.length <= 100 ? row.content : row.content.substring(0, 100) + '...',
    }));
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
