# Kindling Local Retrieval Provider

| Scope     | Owner  | Priority | Status      |
| --------- | ------ | -------- | ----------- |
| RETRIEVAL | @aneki | high     | Implemented |

## Purpose

Implements Kindling's **built-in mechanical retrieval layer** over the system-of-record (SQLite). This provider is responsible for:

- BM25 full-text search (statistical index property, not interpretation)
- Scope filtering (session, repo, agent, user)
- Recency/temporal filtering
- Bounded result sets with stable ordering

This is the "SQLite FTS5" equivalent — good enough for standalone use. It asserts no meaning and performs no semantic interpretation. Relevance ranking beyond BM25, intent-aware retrieval, token-budgeted context assembly, and confidence scoring are explicitly out of scope for this layer and belong to downstream systems.

## In Scope

- BM25 full-text search over observations (and summaries stored on behalf)
- Scope filtering (session/repo/agent/user) with AND semantics
- Recency/temporal filtering (timestamp queries)
- Stable sorting of results (BM25 score desc, ts desc, id asc)
- Bounded result sets ("give me N matching results")
- Evidence snippets for explainability

## Out of Scope

- Relevance ranking beyond BM25 (downstream system responsibility)
- Token-budgeted context assembly (downstream system responsibility)
- Intent-aware boosts or confidence scoring (downstream system responsibility)
- Summaries or condensation
- Pattern detection
- Semantic retrieval (embeddings) — Phase 2+
- UI commands
- Any write-side storage responsibilities

## Interfaces

**Depends on:**

- kindling-store-sqlite — FTS-backed candidate queries + evidence snippets

**Exposes:**

- `searchCandidates(request): ProviderHit[]`

Where `ProviderHit` includes:

- `targetType` (observation | summary)
- `targetId`
- `score` (normalised)
- `why` (short string)
- `evidenceRefs` (observation IDs)
- `ts_ms` (for deterministic tiebreak)

## Boundary Rules

- RETRIEVAL must not write to storage
- RETRIEVAL must not enforce token budgets (Core responsibility)
- Ordering must be stable and explainable; no stochastic ranking

## Acceptance Criteria

- [x] Provider contract implemented with stable ordering
- [x] FTS search returns relevant candidates within acceptable latency
- [x] Ranking matches expectations for common queries (resume work, find decision, find failure)
- [x] Evidence snippets are bounded and redaction-compliant
- [x] Ordering is deterministic given identical store state

## Risks & Mitigations

| Risk                                 | Mitigation                                 |
| ------------------------------------ | ------------------------------------------ |
| FTS relevance poor for short queries | Fallback to recency when query absent      |
| Ranking too clever / un-debuggable   | Start boring; add signals only when proven |
| Performance degrades at scale        | Benchmark harness + guardrails             |

## Tasks

### RETRIEVAL-001: Define provider contract + stable scoring model

- **Intent:** Lock in the provider output shape and deterministic ordering rules
- **Expected Outcome:** Provider contract implemented and tested; ordering stable given identical store state
- **Scope:** `src/provider/`
- **Non-scope:** FTS implementation, ranking tuning
- **Files:** `src/provider/types.ts`, `src/provider/scoring.ts`
- **Dependencies:** (none)
- **Validation:** `pnpm test -- provider.contract`
- **Confidence:** high
- **Risks:** Contract changes require adapter updates

**Deliverables:**

- `src/provider/types.ts` (ProviderRequest, ProviderHit)
- `src/provider/scoring.ts` (scoring inputs + stable sort strategy)
- Tests: stable ordering under ties (score → ts → id), scope filter correctness

### RETRIEVAL-002: Implement SQLite FTS candidate search

- **Intent:** Provide fast, filtered candidate sets from SQLite for ranking
- **Expected Outcome:** Queries return relevant candidates within acceptable latency
- **Scope:** `src/provider/`
- **Non-scope:** Ranking, evidence snippets
- **Files:** `src/provider/sqliteFts.ts`
- **Dependencies:** STORAGE-001
- **Validation:** `pnpm test -- provider.fts`
- **Confidence:** medium
- **Risks:** FTS tuning for relevance

**Deliverables:**

- `searchObservationsFts(query, scopeIds, limit)`
- `searchSummariesFts(query, scopeIds, limit)`
- `fallbackRecent(scopeIds, limit)` when query absent
- Tests: empty on redacted content, respects scope constraints

### RETRIEVAL-003: Implement stable sorting + evidence snippets

- **Intent:** Turn raw FTS matches into predictable, stable-ordered results with evidence
- **Expected Outcome:** Results are deterministically ordered and include evidence snippets
- **Scope:** `src/provider/`
- **Non-scope:** Intent-aware ranking, confidence scoring, token budgeting (all downstream system concerns)
- **Files:** `src/provider/ranking.ts`, `src/provider/explain.ts`
- **Dependencies:** RETRIEVAL-001, RETRIEVAL-002
- **Validation:** `pnpm test -- provider.ranking`
- **Confidence:** medium
- **Risks:** Existing ranking code includes intent/confidence signals that need boundary review

**Deliverables:**

- `rankHits(hits, request)` implementing:
  - BM25 score as primary signal
  - Recency boost (time decay — mechanical, not interpretive)
  - Scope match boost (session > repo — mechanical filter property)
  - Stable sort: score desc → ts desc → id asc
- Evidence snippet attachment
- Tests with fixed fixtures

> **Boundary note:** The current implementation includes intent-aware boosts and confidence-based demotes which cross into downstream system territory. These should be reviewed and either removed or annotated as v0.1 stopgaps.

### RETRIEVAL-004: Evidence snippet retrieval and safe truncation

- **Intent:** Return small, safe evidence snippets for explainability
- **Expected Outcome:** Bounded snippets with consistent truncation and redaction compliance
- **Scope:** `src/provider/`
- **Non-scope:** Store-level snippet queries (STORAGE-004)
- **Files:** `src/provider/evidence.ts`
- **Dependencies:** STORAGE-004
- **Validation:** `pnpm test -- provider.evidence`
- **Confidence:** medium
- **Risks:** Truncation edge cases

**Deliverables:**

- `attachEvidenceSnippets(hits, maxChars)`
- Truncation rules: hard char cap, preserve first/last lines for stack traces
- Tests: redacted observations yield placeholder, truncation is deterministic

### RETRIEVAL-005: Provider performance & regression harness

- **Intent:** Ensure retrieval stays fast and stable as DB grows
- **Expected Outcome:** Simple benchmark harness + regression fixtures in repo
- **Scope:** `bench/`
- **Non-scope:** Hard SLAs
- **Files:** `bench/retrieval.local.ts`, `fixtures/*.ndjson`
- **Dependencies:** RETRIEVAL-002, RETRIEVAL-003
- **Validation:** `pnpm bench`
- **Confidence:** low
- **Risks:** Synthetic data may not reflect real usage

**Deliverables:**

- `bench/retrieval.local.ts` (simple CLI benchmark)
- `fixtures/*.ndjson` (small stable dataset)
- Guardrails: <200ms on typical queries at N=10k observations (local machine)

## Decisions

- **D-001:** Provider returns bounded, mechanically-ordered results. Tiered assembly and token budgeting are downstream concerns.
- **D-002:** Ordering must be stable and explainable; no stochastic ranking
- **D-003:** Start with FTS + recency; add embeddings only when proven necessary
- **D-004:** No intent inference or confidence scoring in this layer. Those signals belong to downstream systems.

## Notes

- Keep the first version boring and predictable. Retrieval systems become un-debuggable when they're "clever".
