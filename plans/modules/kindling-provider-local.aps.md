# Kindling Local Retrieval Provider

| Scope | Owner | Priority | Status |
|-------|-------|----------|--------|
| RETRIEVAL | @aneki | high | Draft |

## Purpose

Implements **deterministic local retrieval** over Kindling's system-of-record (SQLite). This provider is responsible for:

- Searching indexed content (FTS)
- Applying ranking signals (scope, intent, recency, confidence)
- Producing *explainable candidates* for Kindling Core's retrieval orchestrator
- Ensuring stable ordering and predictable truncation behaviour

Kindling Core decides tiering (pins + current summary are non-evictable). This provider ranks only *candidate hits* returned from the store.

## In Scope

- Candidate search over SQLite FTS (observations + summaries)
- Ranking + stable sorting of candidates
- Scope filtering (session/repo/agent/user)
- Intent-aware boosts (when intent provided)
- Explainability: each hit includes a concise reason and evidence references

## Out of Scope

- Token budgeting and tier enforcement (Kindling Core)
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

- [ ] Provider contract implemented with stable ordering
- [ ] FTS search returns relevant candidates within acceptable latency
- [ ] Ranking matches expectations for common queries (resume work, find decision, find failure)
- [ ] Evidence snippets are bounded and redaction-compliant
- [ ] Ordering is deterministic given identical store state

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| FTS relevance poor for short queries | Fallback to recency when query absent |
| Ranking too clever / un-debuggable | Start boring; add signals only when proven |
| Performance degrades at scale | Benchmark harness + guardrails |

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

### RETRIEVAL-003: Implement ranking + explainability

- **Intent:** Turn raw FTS matches into predictable, explainable ranked hits
- **Expected Outcome:** Ranking matches expectations across common use cases
- **Scope:** `src/provider/`
- **Non-scope:** Token budgeting
- **Files:** `src/provider/ranking.ts`, `src/provider/explain.ts`
- **Dependencies:** RETRIEVAL-001, RETRIEVAL-002
- **Validation:** `pnpm test -- provider.ranking`
- **Confidence:** medium
- **Risks:** Ranking rules need iteration based on dogfooding

**Deliverables:**

- `rankHits(hits, request)` implementing:
  - Boosts: exact scope match (session > repo > agent/user)
  - Boosts: intent match (if summary/capsule intent known)
  - Boosts: recency (time decay)
  - Demotes: low-confidence summaries
  - Stable sort: score desc → ts desc → id asc
- `why` generation rules (e.g. "matched command output from this session")
- Tests with fixed fixtures for "resume work" and "why did tests fail" queries

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

- **D-001:** Provider outputs are ranked *candidates*; Kindling Core enforces tiers and budgets
- **D-002:** Ordering must be stable and explainable; no stochastic ranking
- **D-003:** Start with FTS + recency; add embeddings only when proven necessary

## Notes

- Keep the first version boring and predictable. Retrieval systems become un-debuggable when they're "clever".
