# Local Retrieval Provider

Scope: RETRIEVAL
Owner: @josh
Priority: high

## Purpose

Implements **deterministic local retrieval** over Kindling's system-of-record (SQLite). This provider is responsible for:

* searching indexed content (FTS)
* applying ranking signals (scope, intent, recency, confidence)
* producing *explainable candidates* for Kindling Core's retrieval orchestrator
* ensuring stable ordering and predictable truncation behaviour

Kindling Core decides tiering (pins + current summary are non-evictable). This provider ranks only *candidate hits* returned from the store.

## In Scope / Out of Scope

**In Scope:**

* Candidate search over SQLite FTS (observations + optionally summaries)
* Ranking + stable sorting of candidates
* Scope filtering (session/repo/agent/user)
* Intent-aware boosts (when intent provided)
* Explainability: each hit includes a concise reason and evidence references

**Out of Scope:**

* Token budgeting and tier enforcement (Kindling Core)
* Semantic retrieval (mem0) and embeddings
* UI commands
* Any write-side storage responsibilities

## Interfaces

Depends on:

* kindling-store-sqlite — provides FTS-backed candidate queries + evidence snippets

Exposes:

* `searchCandidates(request): ProviderHit[]`

Where a ProviderHit includes:

* `targetType` (observation|summary)
* `targetId`
* `score` (normalised)
* `why` (short string)
* `evidenceRefs` (observation IDs)
* `ts_ms` (for deterministic tiebreak)

## Tasks

### RETRIEVAL-001: Define provider contract + stable scoring model

**Intent:** Lock in the provider output shape and deterministic ordering rules used across all retrieval providers.
**Expected Outcome:** Provider contract is implemented and tested; ordering is stable given identical store state.
**Confidence:** high
**Status:** Draft
**Dependencies:** (none)

**Inputs:**
* `docs/retrieval-contract.md`
* Kindling Core retrieval tier rules

**Deliverables:**
* `src/provider/types.ts` (ProviderRequest, ProviderHit)
* `src/provider/scoring.ts` (scoring inputs + stable sort strategy)
* Tests:
  * stable ordering under ties (score → ts → id)
  * scope filter correctness

### RETRIEVAL-002: Implement SQLite FTS candidate search

**Intent:** Provide fast, filtered candidate sets from SQLite for ranking.
**Expected Outcome:** Queries return relevant candidates for typical developer prompts within acceptable latency.
**Confidence:** medium
**Status:** Draft
**Dependencies:** [STORAGE-001]

**Inputs:**
* FTS tables created by store migrations
* Query parameters: query text, scopeIds, intent

**Deliverables:**
* `src/provider/sqliteFts.ts`:
  * `searchObservationsFts(query, scopeIds, limit)`
  * `searchSummariesFts(query, scopeIds, limit)` (optional)
  * `fallbackRecent(scopeIds, limit)` when query absent
* Tests:
  * returns empty on fully redacted content
  * respects scope constraints

### RETRIEVAL-003: Implement ranking + explainability

**Intent:** Turn raw FTS matches into predictable, explainable ranked hits.
**Expected Outcome:** Ranking matches expectations across common use cases (resume work, find a decision, find a failure).
**Confidence:** medium
**Status:** Draft
**Dependencies:** [RETRIEVAL-001, RETRIEVAL-002]

**Inputs:**
* Signals available in store: ts, scope match, kind/type, confidence (if summary)
* Intent (if provided)

**Deliverables:**
* `rankHits(hits, request)` implementing:
  * boosts: exact scope match (session > repo > agent/user)
  * boosts: intent match (if summary/capsule intent known)
  * boosts: recency (time decay)
  * demotes: low-confidence summaries if confidence tracked
  * stable sort: score desc → ts desc → id asc
* `why` generation rules:
  * e.g. "matched command output from this session", "matched capsule summary for repo", "recent error trace"
* Tests with fixed fixtures:
  * "resume work" query returns latest capsule summary candidates first
  * "why did tests fail" surfaces error observations

### RETRIEVAL-004: Evidence snippet retrieval and safe truncation

**Intent:** Return small, safe evidence snippets for explainability without leaking sensitive content or blowing budgets.
**Expected Outcome:** Provider returns bounded snippets with consistent truncation and redaction compliance.
**Confidence:** medium
**Status:** Draft
**Dependencies:** [STORAGE-004]

**Inputs:**
* Store helper for evidence snippets

**Deliverables:**
* `attachEvidenceSnippets(hits, maxChars)`
* Truncation rules:
  * hard char cap
  * preserve first/last lines for stack traces (where applicable)
* Tests:
  * redacted observations yield placeholder snippet
  * truncation is deterministic

### RETRIEVAL-005: Provider performance & regression harness

**Intent:** Ensure retrieval stays fast and stable as DB grows during dogfooding.
**Expected Outcome:** Simple benchmark harness + regression fixtures in repo.
**Confidence:** low
**Status:** Draft
**Dependencies:** [RETRIEVAL-002, RETRIEVAL-003]

**Inputs:**
* Seed dataset generator (synthetic) or recorded dogfood export

**Deliverables:**
* `bench/retrieval.local.ts` (simple CLI benchmark)
* `fixtures/*.ndjson` (small stable dataset)
* Guardrails (not hard SLAs yet): e.g. <200ms on typical queries at N=10k observations (local machine)

## Decisions

* **D-001:** Provider outputs are ranked *candidates*; Kindling Core enforces tiers and budgets
* **D-002:** Ordering must be stable and explainable; no stochastic ranking
* **D-003:** Start with FTS + recency; add embeddings only when proven necessary

## Notes

* Keep the first version boring and predictable. Retrieval systems become un-debuggable when they're "clever".
