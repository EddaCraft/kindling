# @kindling/provider-local

Local FTS-based retrieval provider for Kindling with deterministic, explainable ranking.

## Installation

```bash
npm install @kindling/provider-local
```

## Overview

`@kindling/provider-local` provides a local, deterministic retrieval system for Kindling using SQLite FTS5 full-text search. It implements the `RetrievalProvider` contract defined in `@kindling/core` and returns ranked results with explainable scoring.

## Features

- **FTS5 Full-Text Search** - Fast, high-quality text matching
- **Deterministic Ranking** - Stable, reproducible results
- **Explainable Scores** - Each result includes ranking factors
- **Scope-Aware** - Prioritizes session > repo > agent/user matches
- **Recency Decay** - Recent observations ranked higher
- **Confidence Weighting** - Summary confidence affects ranking
- **Intent Matching** - Boost results matching capsule intent

## Usage

### Basic Retrieval

```typescript
import { LocalRetrievalProvider } from '@kindling/provider-local';
import { SqliteKindlingStore } from '@kindling/store-sqlite';

// Initialize provider
const store = new SqliteKindlingStore(db);
const provider = new LocalRetrievalProvider(store);

// Search for observations
const results = await provider.retrieve({
  query: 'authentication error',
  scope: { sessionId: 'session-1' },
  limit: 10,
});

// Results are sorted by relevance
results.forEach(result => {
  console.log(result.observation.content);
  console.log('Score:', result.score);
  console.log('Explanation:', result.explanation);
});
```

### Scoped Retrieval

```typescript
// Session-scoped search (highest priority)
const sessionResults = await provider.retrieve({
  query: 'bug fix',
  scope: { sessionId: 'session-123' },
});

// Repo-scoped search
const repoResults = await provider.retrieve({
  query: 'api endpoint',
  scope: { repoId: '/home/user/my-project' },
});

// User-scoped search (across all sessions/repos)
const userResults = await provider.retrieve({
  query: 'deployment',
  scope: { userId: 'user-456' },
});
```

### Intent Filtering

```typescript
// Boost results with matching intent
const testResults = await provider.retrieve({
  query: 'test failure',
  intent: 'test',  // Prioritizes observations from test capsules
  scope: { repoId: '/home/user/my-project' },
});
```

## Ranking Algorithm

The provider uses a multi-factor ranking algorithm:

### Base Score (FTS5)

SQLite FTS5 provides the initial relevance score using BM25 ranking.

### Scope Boost

Results are boosted based on scope match:

- **Session match**: 2.0x boost
- **Repo match**: 1.5x boost
- **Agent/User match**: 1.2x boost

### Recency Decay

Recent observations receive higher scores:

- **< 1 hour**: No decay
- **< 1 day**: 0.9x
- **< 1 week**: 0.7x
- **< 1 month**: 0.5x
- **Older**: 0.3x

### Confidence Weighting

For summary observations, confidence affects ranking:

- **High confidence (0.8+)**: Full weight
- **Medium confidence (0.5-0.8)**: Partial weight
- **Low confidence (<0.5)**: Reduced weight

### Intent Matching

When a query includes intent, matching capsules get a 1.5x boost.

## Result Explanation

Each result includes an `explanation` field describing why it was ranked:

```typescript
{
  observation: { ... },
  score: 42.5,
  explanation: {
    ftsScore: 25.0,        // Base FTS5 score
    scopeBoost: 2.0,       // Scope multiplier applied
    recencyDecay: 0.85,    // Recency multiplier
    intentBoost: 1.0,      // Intent multiplier (1.0 if no match)
    finalScore: 42.5       // Combined score
  }
}
```

## Configuration

### Retrieval Options

```typescript
interface RetrievalOptions {
  query: string;                    // Search query (FTS5 syntax supported)
  scope?: Scope;                    // Filter by session/repo/agent/user
  intent?: string;                  // Boost results with matching intent
  limit?: number;                   // Max results (default: 50)
  minScore?: number;                // Minimum score threshold (default: 0)
  excludeKinds?: ObservationKind[]; // Exclude specific observation types
}
```

### FTS5 Query Syntax

The provider supports full FTS5 query syntax:

```typescript
// Phrase search
provider.retrieve({ query: '"authentication error"' });

// Boolean operators
provider.retrieve({ query: 'auth AND (token OR jwt)' });

// Prefix matching
provider.retrieve({ query: 'authen*' });

// Column-specific search
provider.retrieve({ query: 'content: error' });
```

## Performance

The provider is optimized for speed:

- **FTS5 index** - Fast full-text search without scanning
- **Covering indexes** - Scope queries hit indexes only
- **Bounded results** - Configurable limit prevents large result sets
- **Lazy evaluation** - Results computed on demand

Typical query performance:
- **< 10ms** for session-scoped searches
- **< 50ms** for repo-scoped searches
- **< 100ms** for user-scoped searches

## Determinism

The provider guarantees deterministic results:

- **Same query + same data = same results** - No randomness
- **Stable ordering** - Ties broken by timestamp, then ID
- **Reproducible scores** - All ranking factors are deterministic

This makes debugging and testing reliable.

## Related Packages

- **[@kindling/core](../kindling-core)** - Core domain model
- **[@kindling/store-sqlite](../kindling-store-sqlite)** - SQLite persistence
- **[@kindling/cli](../kindling-cli)** - CLI for inspection

## License

Apache-2.0
