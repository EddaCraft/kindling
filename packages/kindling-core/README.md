# @kindling/core

Core domain model and orchestration for Kindling - local memory engine for AI-assisted development.

[![npm version](https://img.shields.io/npm/v/@kindling/core.svg)](https://www.npmjs.com/package/@kindling/core)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](../../LICENSE)

## Installation

```bash
npm install @kindling/core
```

## Overview

`@kindling/core` provides the domain types, capsule lifecycle management, and retrieval orchestration for Kindling. It defines the core abstractions that other packages implement:

- **Observations** - Atomic records of captured events
- **Capsules** - Bounded units of meaning that group observations
- **Summaries** - High-level descriptions of capsule content
- **Pins** - User-marked important items
- **Retrieval** - Deterministic, scoped search across all entities

## Usage

```typescript
import {
  // Types
  Observation,
  ObservationKind,
  Capsule,
  CapsuleType,
  CapsuleStatus,
  Summary,
  Pin,
  ScopeIds,
  
  // Capsule lifecycle
  CapsuleManager,
  openCapsule,
  closeCapsule,
  
  // Retrieval
  RetrieveOptions,
  RetrieveResult,
  RetrievalProvider,
  
  // Utilities
  ok,
  err,
} from '@kindling/core';
```

## Core Types

### Observation

An atomic, immutable record of an event:

```typescript
interface Observation {
  id: string;
  kind: ObservationKind;
  content: string;
  provenance: Record<string, unknown>;
  ts: number;
  scopeIds: ScopeIds;
  redacted: boolean;
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
```

### Capsule

A bounded unit that groups related observations:

```typescript
interface Capsule {
  id: string;
  type: CapsuleType;
  intent: string;
  status: CapsuleStatus;
  openedAt: number;
  closedAt?: number;
  scopeIds: ScopeIds;
  observationIds: string[];
  summaryId?: string;
}

type CapsuleType = 'session' | 'pocketflow_node';
type CapsuleStatus = 'open' | 'closed';
```

### ScopeIds

Multi-dimensional isolation for queries:

```typescript
interface ScopeIds {
  sessionId?: string;
  repoId?: string;
  agentId?: string;
  userId?: string;
}
```

## Capsule Lifecycle

```typescript
import { CapsuleManager } from '@kindling/core';
import { SqliteKindlingStore } from '@kindling/store-sqlite';

const manager = new CapsuleManager(store);

// Open a capsule
const capsule = manager.open({
  type: 'session',
  intent: 'Fix authentication bug',
  scopeIds: { sessionId: 's1', repoId: '/repo' },
});

// Attach observations
manager.attach(capsule.id, observation);

// Close with summary
manager.close(capsule.id, {
  content: 'Fixed JWT validation',
  confidence: 0.9,
});
```

## Retrieval

```typescript
import { RetrieveOptions, RetrieveResult } from '@kindling/core';

const options: RetrieveOptions = {
  query: 'authentication',
  scopeIds: { repoId: '/repo' },
  tokenBudget: 8000,
  maxCandidates: 50,
};

// Results are tiered: pins -> summary -> candidates
const result: RetrieveResult = {
  pins: [...],           // Non-evictable, user-pinned
  currentSummary: {...}, // Active capsule summary
  candidates: [...],     // FTS-ranked results
  provenance: {...},     // Explains how results were generated
};
```

## Result Type

Kindling uses a Result type for validation:

```typescript
import { Result, ok, err } from '@kindling/core';

function validate(input: unknown): Result<Observation> {
  if (!isValid(input)) {
    return err({ field: 'content', message: 'Content is required' });
  }
  return ok(input as Observation);
}
```

## Related Packages

- [`@kindling/store-sqlite`](../kindling-store-sqlite) - SQLite persistence
- [`@kindling/provider-local`](../kindling-provider-local) - FTS retrieval
- [`@kindling/adapter-opencode`](../kindling-adapter-opencode) - OpenCode integration
- [`@kindling/adapter-pocketflow`](../kindling-adapter-pocketflow) - PocketFlow integration

## License

Apache-2.0
