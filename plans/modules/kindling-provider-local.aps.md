# Local Retrieval Provider

| Scope     | Owner  | Priority | Status |
|-----------|--------|----------|--------|
| RETRIEVAL | @aneki | high     | Draft  |

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

**Depends on:**
* kindling-store-sqlite — provides FTS-backed candidate queries + evidence snippets

**Exposes:**
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

**Scopes:** [RETRIEVAL]

**Tags:** [contract, determinism]

**Dependencies:** (none)

---

### RETRIEVAL-002: Implement SQLite FTS candidate search

**Intent:** Provide fast, filtered candidate sets from SQLite for ranking.

**Expected Outcome:** Queries return relevant candidates for typical developer prompts within acceptable latency.

**Confidence:** medium

**Scopes:** [RETRIEVAL]

**Tags:** [fts, sqlite, query]

**Dependencies:** [STORAGE-001]

---

### RETRIEVAL-003: Implement ranking + explainability

**Intent:** Turn raw FTS matches into predictable, explainable ranked hits.

**Expected Outcome:** Ranking matches expectations across common use cases (resume work, find a decision, find a failure).

**Confidence:** medium

**Scopes:** [RETRIEVAL]

**Tags:** [ranking, explainability]

**Dependencies:** [RETRIEVAL-001, RETRIEVAL-002]

---

### RETRIEVAL-004: Evidence snippet retrieval and safe truncation

**Intent:** Return small, safe evidence snippets for explainability without leaking sensitive content or blowing budgets.

**Expected Outcome:** Provider returns bounded snippets with consistent truncation and redaction compliance.

**Confidence:** medium

**Scopes:** [RETRIEVAL]

**Tags:** [evidence, safety]

**Dependencies:** [STORAGE-004]

---

### RETRIEVAL-005: Provider performance & regression harness

**Intent:** Ensure retrieval stays fast and stable as DB grows during dogfooding.

**Expected Outcome:** Simple benchmark harness + regression fixtures in repo.

**Confidence:** low

**Scopes:** [RETRIEVAL]

**Tags:** [benchmark, regression]

**Dependencies:** [RETRIEVAL-002, RETRIEVAL-003]

---

## Decisions

* **D-001:** Provider outputs are ranked *candidates*; Kindling Core enforces tiers and budgets
* **D-002:** Ordering must be stable and explainable; no stochastic ranking
* **D-003:** Start with FTS + recency; add embeddings only when proven necessary

## Notes

* Keep the first version boring and predictable. Retrieval systems become un-debuggable when they're "clever".
