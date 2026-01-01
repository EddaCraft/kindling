# Data Model

## Core Types

### Observation

An atomic event captured during development activity.

```typescript
interface Observation {
  id: string;                           // Unique identifier
  kind: ObservationKind;                // Type of observation
  content: string;                      // Event content/payload
  provenance: Record<string, unknown>;  // Source metadata
  ts: number;                           // Timestamp (epoch ms)
  scopeIds: ScopeIds;                   // Scope identifiers
  redacted: boolean;                    // Redaction flag
}

type ObservationKind =
  | 'tool_call'
  | 'command'
  | 'file_diff'
  | 'error'
  | 'message'
  | 'node_start'
  | 'node_end'
  | 'node_output'
  | 'node_error';

interface ScopeIds {
  sessionId?: string;  // IDE/workflow session
  repoId?: string;     // Repository identifier
  agentId?: string;    // AI agent identifier
  userId?: string;     // User identifier
}
```

### Capsule

A bounded unit of meaning (session or workflow node) containing related observations.

```typescript
interface Capsule {
  id: string;                    // Unique identifier
  type: CapsuleType;             // Type of capsule
  intent: string;                // What the capsule is about
  status: CapsuleStatus;         // Open or closed
  openedAt: number;              // Timestamp (epoch ms)
  closedAt?: number;             // Timestamp (epoch ms)
  scopeIds: ScopeIds;            // Scope identifiers
  observationIds: string[];      // Attached observations
  summaryId?: string;            // Optional summary reference
}

type CapsuleType =
  | 'session'           // IDE session
  | 'pocketflow_node';  // Workflow node

type CapsuleStatus =
  | 'open'
  | 'closed';
```

### Summary

A condensed representation of a capsule.

```typescript
interface Summary {
  id: string;              // Unique identifier
  capsuleId: string;       // Parent capsule
  content: string;         // Summary text
  confidence: number;      // Confidence score (0-1)
  createdAt: number;       // Timestamp (epoch ms)
  evidenceRefs: string[];  // Observation IDs used as evidence
}
```

### Pin

A user-managed persistence marker for important observations or summaries.

```typescript
interface Pin {
  id: string;                           // Unique identifier
  targetType: 'observation' | 'summary'; // What is pinned
  targetId: string;                     // Target identifier
  reason?: string;                      // Why it was pinned
  createdAt: number;                    // Timestamp (epoch ms)
  expiresAt?: number;                   // Optional TTL (epoch ms)
  scopeIds: ScopeIds;                   // Scope identifiers
}
```

## Retrieval Types

### Retrieval Request

```typescript
interface RetrievalRequest {
  query?: string;        // Optional text query
  scopeIds: ScopeIds;    // Scope filters
  intent?: string;       // Optional retrieval intent
  maxTokens?: number;    // Optional token budget
}
```

### Retrieval Response

```typescript
interface RetrievalResponse {
  tiers: RetrievalTier[];  // Tiered results
  totalTokens: number;     // Total token count
  truncated: boolean;      // Whether results were truncated
}

interface RetrievalTier {
  name: string;           // Tier name (e.g., 'pins', 'candidates')
  items: RetrievalHit[];  // Hits in this tier
  tokenBudget?: number;   // Optional budget for this tier
}

interface RetrievalHit {
  targetType: 'observation' | 'summary';
  targetId: string;
  score: number;          // Relevance score (0-1)
  why: string;            // Explanation
  evidenceRefs: string[]; // Supporting observation IDs
  content: string;        // Hit content (may be truncated)
}
```

## Provider Types

### Provider Request

```typescript
interface ProviderRequest {
  query?: string;      // Optional text query
  scopeIds: ScopeIds;  // Scope filters
  intent?: string;     // Optional intent hint
  limit: number;       // Max candidates
}
```

### Provider Hit

```typescript
interface ProviderHit {
  targetType: 'observation' | 'summary';
  targetId: string;
  score: number;          // Normalized score (0-1)
  why: string;            // Short explanation
  evidenceRefs: string[]; // Observation IDs
  ts_ms: number;          // For deterministic tiebreaking
}
```

## Validation Rules

### Observation Validation

- `id`: Required, non-empty string
- `kind`: Must be a valid ObservationKind
- `content`: Required string (may be empty for structural events)
- `ts`: Required, positive number
- `scopeIds`: At least one scope ID must be present
- `redacted`: Required boolean

### Capsule Validation

- `id`: Required, non-empty string
- `type`: Must be a valid CapsuleType
- `intent`: Required, non-empty string
- `status`: Must be 'open' or 'closed'
- `openedAt`: Required, positive number
- `closedAt`: Optional, must be > openedAt if present
- `scopeIds`: At least one scope ID must be present

### Summary Validation

- `id`: Required, non-empty string
- `capsuleId`: Required, non-empty string
- `content`: Required, non-empty string
- `confidence`: Required, 0-1 range
- `createdAt`: Required, positive number
- `evidenceRefs`: Must be array of strings

### Pin Validation

- `id`: Required, non-empty string
- `targetType`: Must be 'observation' or 'summary'
- `targetId`: Required, non-empty string
- `createdAt`: Required, positive number
- `expiresAt`: Optional, must be > createdAt if present
- `scopeIds`: At least one scope ID must be present

## Schema Evolution

Schema changes must be:

- **Additive**: New fields only, never remove or rename
- **Versioned**: Tracked in `schema_migrations` table
- **Tested**: Migration tests required for all schema changes
- **Documented**: Migration rationale in migration file

## Storage Representation

All types are stored in SQLite with:

- Foreign key constraints for referential integrity
- Indexes for common query patterns
- FTS tables for text search
- JSON columns for flexible metadata (`provenance`, `scopeIds`)
