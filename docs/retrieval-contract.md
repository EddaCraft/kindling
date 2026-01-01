# Retrieval Contract

## Overview

Kindling's retrieval system is designed to be **deterministic**, **scoped**, and **explainable**. This document defines the contract between Kindling Core, retrieval providers, and consumers.

## Core Guarantees

### Determinism

Given identical store state and request parameters, retrieval must return identical results.

- No randomness in ranking
- Stable sort order with explicit tiebreakers
- Reproducible scoring

### Scope Filtering

All retrieval respects scope constraints:

- `sessionId`: Filter to specific IDE/workflow session
- `repoId`: Filter to specific repository
- `agentId`: Filter to specific AI agent
- `userId`: Filter to specific user

Multiple scope IDs can be combined (AND logic).

### Explainability

Every retrieval hit includes:

- **Score**: Normalized relevance (0-1)
- **Why**: Human-readable explanation (e.g., "matched error from this session")
- **Evidence**: References to supporting observations

## Retrieval Tiers

Results are organized into tiers with different eviction policies:

### Tier 1: Non-Evictable

Always included in results, regardless of token budget:

- **Pins**: User-marked important items
- **Current Summary**: Summary of the active capsule (if any)

### Tier 2: Candidates

Provider-ranked hits with token budget constraints:

- FTS-matched observations
- Historical capsule summaries
- Ranked by relevance and recency

## Scoring Model

Providers must implement deterministic scoring with these components:

### FTS Match Score

- Exact text match in `content` field
- Uses SQLite FTS5 BM25 ranking
- Normalized to 0-1 range

### Scope Boost

Closer scope matches get higher scores:

- Session match: +0.3
- Repo match: +0.2
- Agent match: +0.1
- User match: +0.1

### Intent Boost

When request includes intent and capsule/summary has matching intent:

- Intent keyword match: +0.2

### Recency Decay

Newer items score higher:

- Linear decay over 30 days
- Formula: `max(0, 1 - (age_days / 30)) * 0.2`

### Confidence Weight (Summaries Only)

Summary confidence affects final score:

- Low confidence (<0.5): -0.1
- High confidence (>0.8): +0.1

### Final Score

```
score = min(1.0, fts_score + scope_boost + intent_boost + recency_decay + confidence_weight)
```

## Stable Sort Order

When multiple hits have the same score, use tiebreakers:

1. **Primary**: Score descending (highest first)
2. **Secondary**: Timestamp descending (newest first)
3. **Tertiary**: ID ascending (lexicographic)

No random tiebreaking allowed.

## Token Budgeting

Retrieval respects token budgets to fit context windows:

1. **Tier 1** (pins + current summary): No budget constraint
2. **Tier 2** (candidates): Allocated budget after Tier 1

Truncation strategy:

- Include highest-scored hits first
- Truncate individual hit content if needed
- Mark response with `truncated: true` if budget exceeded

## Evidence Snippets

Each hit may include evidence snippets:

- Max 500 characters per snippet
- Truncated at word boundaries when possible
- Redacted content replaced with `[REDACTED]`
- Stack traces: preserve first and last lines

## Query Behavior

### Empty Query

When `query` is not provided:

- Fall back to recency-based ranking
- Return most recent items within scope
- Still apply scope filters

### Intent-Only Query

When only `intent` is provided (no text query):

- Match against capsule/summary intent fields
- Use intent boost in scoring
- Fall back to recency within matches

### Scope-Only Query

When only `scopeIds` provided:

- Return all items within scope
- Rank by recency
- Respect token budget

## Redaction Compliance

Retrieval must respect redaction:

- Redacted observations excluded from FTS results
- References to redacted observations allowed (for provenance)
- Evidence snippets show `[REDACTED]` for redacted content

## Error Handling

### Invalid Request

Return error for:

- Empty `scopeIds` (at least one required)
- Negative `maxTokens`
- Invalid `limit` values

### Store Failures

On database errors:

- Log error with context
- Return empty result set
- Include error flag in response

### Partial Results

If some queries fail but others succeed:

- Return successful results
- Include warning flag
- Log failures for debugging

## Performance Expectations

For typical workloads (N ≤ 10,000 observations):

- **Retrieval latency**: <200ms (p95)
- **FTS query**: <50ms (p95)
- **Scope filtering**: <10ms (p95)

Performance degrades gracefully beyond typical scale.

## Provider Interface

Providers must implement:

```typescript
interface RetrievalProvider {
  searchCandidates(request: ProviderRequest): Promise<ProviderHit[]>;
}

interface ProviderRequest {
  query?: string;
  scopeIds: ScopeIds;
  intent?: string;
  limit: number;
}

interface ProviderHit {
  targetType: 'observation' | 'summary';
  targetId: string;
  score: number;          // 0-1, normalized
  why: string;            // Human-readable explanation
  evidenceRefs: string[]; // Supporting observation IDs
  ts_ms: number;          // For tiebreaking
}
```

## Testing Requirements

Provider implementations must include tests for:

- **Determinism**: Same input → same output
- **Stable sort**: Correct tiebreaker application
- **Scope filtering**: Only in-scope results returned
- **Redaction**: Redacted content excluded
- **Empty query**: Falls back to recency
- **Token budget**: Respects limits
- **Edge cases**: Empty DB, single result, ties

## Future Extensions

Out of scope for v0.1, planned for later:

- Semantic search with embeddings
- Vector similarity scoring
- Cross-capsule relationship traversal
- Custom ranking models
