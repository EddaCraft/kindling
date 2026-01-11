# @kindling/core

Core domain model and orchestration for Kindling - local memory and contextual continuity for agentic workflows.

## Installation

```bash
npm install @kindling/core
```

## Overview

`@kindling/core` provides the foundational types, interfaces, and orchestration logic for the Kindling system. It defines the core concepts of observations, capsules, and retrieval, and coordinates between storage and retrieval providers.

## Key Concepts

### Observations

Atomic units of captured context with full provenance:

- **ToolCall**: AI tool invocations (Read, Edit, Bash, etc.)
- **Command**: Shell commands with exit codes and output
- **FileDiff**: File changes with paths and diffs
- **Error**: Errors with stack traces
- **Message**: User/assistant messages
- **NodeStart/NodeOutput/NodeError/NodeEnd**: Workflow events

### Capsules

Bounded units of meaning that group observations:

- **Session**: Interactive development session
- **PocketFlowNode**: Single workflow node execution
- **Custom**: User-defined capsule types

Each capsule tracks:
- Type and intent (debug, implement, test, etc.)
- Open/close lifecycle
- Automatic summary generation
- Scope (sessionId, repoId, agentId, userId)

### Retrieval Tiers

Deterministic, explainable retrieval with 3 tiers:

1. **Pins** - User-controlled, non-evictable content
2. **Current Summary** - Active session/capsule context
3. **Provider Hits** - Ranked FTS results with explainability

## Usage

```typescript
import { KindlingService, ObservationKind, CapsuleType } from '@kindling/core';
import { SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalRetrievalProvider } from '@kindling/provider-local';

// Initialize service
const store = new SqliteKindlingStore(db);
const provider = new LocalRetrievalProvider(store);
const service = new KindlingService({ store, provider });

// Open a capsule
const capsule = service.openCapsule({
  type: CapsuleType.Session,
  intent: 'debug',
  scope: { sessionId: 'session-1', repoId: 'my-project' },
});

// Capture observations
service.appendObservation({
  kind: ObservationKind.Command,
  content: 'npm test failed',
  provenance: { command: 'npm test', exitCode: 1 },
  scope: { sessionId: 'session-1' },
}, { capsuleId: capsule.id });

// Retrieve context
const results = service.retrieve({
  query: 'authentication error',
  scope: { sessionId: 'session-1' },
});

// Close capsule with summary
service.closeCapsule(capsule.id, {
  generateSummary: true,
  summaryContent: 'Fixed auth bug in token validation',
});
```

## API

### KindlingService

Main orchestration service that coordinates storage and retrieval.

**Methods:**
- `openCapsule(spec)` - Create and open a new capsule
- `closeCapsule(id, options)` - Close a capsule with optional summary
- `appendObservation(obs, options)` - Add an observation to a capsule
- `retrieve(query)` - Search for relevant context
- `pin(target)` - Pin content for priority retrieval
- `unpin(pinId)` - Remove a pin

### Types

**Core types exported:**
- `Observation` - Base observation interface
- `Capsule` - Bounded unit of observations
- `RetrievalResult` - Tiered retrieval results
- `Pin` - User-controlled priority content
- `ObservationKind` - Enum of observation types
- `CapsuleType` - Enum of capsule types

## Architecture

`@kindling/core` is designed to be storage-agnostic and retrieval-agnostic. It defines contracts (`KindlingStore`, `RetrievalProvider`) that can be implemented by different backends.

**Default implementations:**
- Storage: `@kindling/store-sqlite` (SQLite with FTS5)
- Retrieval: `@kindling/provider-local` (FTS-based ranking)

## Design Principles

1. **Capture, Don't Judge** - Preserve what happened without asserting truth
2. **Deterministic & Explainable** - All results include "why" explanations
3. **Local-First** - No external services required
4. **Privacy-Aware** - Redaction support, bounded output
5. **Provenance Always** - Every piece of context points to concrete evidence

## Related Packages

- **[@kindling/store-sqlite](../kindling-store-sqlite)** - SQLite persistence
- **[@kindling/provider-local](../kindling-provider-local)** - Local FTS retrieval
- **[@kindling/adapter-opencode](../kindling-adapter-opencode)** - OpenCode integration
- **[@kindling/adapter-pocketflow](../kindling-adapter-pocketflow)** - PocketFlow integration
- **[@kindling/cli](../kindling-cli)** - Command-line tools

## License

Apache-2.0
