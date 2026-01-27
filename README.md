# Kindling

**Local memory and continuity engine for AI-assisted development**

Kindling captures observations (tool calls, diffs, commands, errors) from AI-assisted workflows, organizes them into capsules (bounded units of meaning), and makes context retrievable with deterministic, explainable results—all running locally with no external services.

[![npm version](https://img.shields.io/npm/v/@kindling/core.svg)](https://www.npmjs.com/package/@kindling/core)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)

## Why Kindling?

AI-assisted development produces large volumes of transient activity (tool calls, diffs, agent runs) but loses context between sessions. Developers and local agents repeatedly re-discover the same information, leading to wasted time, architectural drift, and brittle workflows.

Kindling provides **continuity without judgement**. It captures what happened, preserves provenance, and makes context retrievable in a deterministic, explainable way—without asserting organizational truth or governance.

## Features

- **Observation Capture** - Records tool calls, commands, file diffs, errors, and messages with full provenance
- **Capsule Organization** - Groups observations into bounded units (sessions, workflow nodes)
- **Deterministic Retrieval** - FTS-based search with explainable, stable ranking
- **Pin Management** - User-controlled high-priority content with optional TTL
- **Local-First** - Embedded SQLite with WAL mode, no external dependencies
- **Privacy-Aware** - Automatic redaction of secrets, bounded output capture
- **Adapter Architecture** - OpenCode and PocketFlow integrations included

## Installation

```bash
# Install the core package
npm install @kindling/core

# Install the SQLite store
npm install @kindling/store-sqlite

# Install the local retrieval provider
npm install @kindling/provider-local
```

### Optional packages

```bash
# OpenCode session adapter
npm install @kindling/adapter-opencode

# PocketFlow workflow adapter
npm install @kindling/adapter-pocketflow

# CLI tools
npm install -g @kindling/cli
```

## Quick Start

```typescript
import { KindlingService } from '@kindling/core';
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalFtsProvider } from '@kindling/provider-local';

// Initialize Kindling
const db = openDatabase({ dbPath: './my-memory.db' });
const store = new SqliteKindlingStore(db);
const provider = new LocalFtsProvider(store);
const service = new KindlingService({ store, provider });

// Open a session capsule
const capsule = service.openCapsule({
  type: 'session',
  intent: 'debug authentication issue',
  scopeIds: { sessionId: 'session-1', repoId: 'my-project' },
});

// Capture observations
service.appendObservation({
  kind: 'command',
  content: 'npm test failed with auth error',
  provenance: { command: 'npm test', exitCode: 1 },
  scopeIds: { sessionId: 'session-1' },
}, { capsuleId: capsule.id });

service.appendObservation({
  kind: 'error',
  content: 'JWT validation failed: token expired',
  provenance: { stack: 'Error: Token expired\n  at validateToken.ts:42' },
  scopeIds: { sessionId: 'session-1' },
}, { capsuleId: capsule.id });

// Retrieve relevant context
const results = service.retrieve({
  query: 'authentication token',
  scopeIds: { sessionId: 'session-1' },
});

console.log('Found:', results.providerHits.length, 'relevant observations');

// Close session with summary
service.closeCapsule(capsule.id, {
  generateSummary: true,
  summaryContent: 'Fixed JWT expiration check in token validation middleware',
});

db.close();
```

## Packages

| Package | Description |
|---------|-------------|
| [`@kindling/core`](./packages/kindling-core) | Domain types, capsule lifecycle, retrieval orchestration |
| [`@kindling/store-sqlite`](./packages/kindling-store-sqlite) | SQLite persistence with FTS5 indexing |
| [`@kindling/provider-local`](./packages/kindling-provider-local) | FTS-based retrieval with deterministic ranking |
| [`@kindling/adapter-opencode`](./packages/kindling-adapter-opencode) | OpenCode session integration |
| [`@kindling/adapter-pocketflow`](./packages/kindling-adapter-pocketflow) | PocketFlow workflow integration |
| [`@kindling/cli`](./packages/kindling-cli) | Command-line tools for inspection and management |

## Architecture

```
                     Adapters
  ┌──────────────┐        ┌──────────────────────┐
  │  OpenCode    │        │  PocketFlow Nodes    │
  │  Sessions    │        │  (Workflows)         │
  └──────┬───────┘        └──────────┬───────────┘
         │                           │
         └─────────┬─────────────────┘
                   ▼
        ┌──────────────────────┐
        │  KindlingService     │  ← Orchestration
        │  (@kindling/core)    │
        └──────────┬───────────┘
                   │
      ┌────────────┴──────────────┐
      ▼                           ▼
┌──────────────┐          ┌─────────────────────┐
│ SqliteStore  │          │ LocalRetrieval      │
│ (persistence)│          │ Provider (search)   │
└──────┬───────┘          └──────────┬──────────┘
       │                             │
       └──────────┬──────────────────┘
                  ▼
       ┌─────────────────────┐
       │  SQLite Database    │
       │  (WAL + FTS5)       │
       └─────────────────────┘
```

## CLI Usage

```bash
# Show database status
kindling status

# Search for context
kindling search "authentication error"
kindling search --session session-123

# List entities
kindling list capsules
kindling list pins
kindling list observations

# Pin important findings
kindling pin observation obs_abc123 --note "Root cause identified"

# Remove a pin
kindling unpin pin_xyz789
```

## Core Concepts

### Observations

Atomic units of captured context:

| Kind | Description |
|------|-------------|
| `tool_call` | AI tool invocations (Read, Edit, Bash, etc.) |
| `command` | Shell commands with exit codes and output |
| `file_diff` | File changes with paths |
| `error` | Errors with stack traces |
| `message` | User/assistant messages |
| `node_start` / `node_end` | Workflow node lifecycle |
| `node_output` / `node_error` | Workflow node results |

### Capsules

Bounded units of meaning that group observations:

- **Session** - Interactive development session
- **PocketFlowNode** - Single workflow node execution

Each capsule has:
- Type and intent (debug, implement, test, etc.)
- Open/close lifecycle with automatic summary generation
- Scope (sessionId, repoId, agentId, userId)

### Retrieval Tiers

Deterministic, explainable retrieval with 3 tiers:

1. **Pins** - Non-evictable, user-controlled priority content
2. **Current Summary** - Active session/capsule context
3. **Provider Hits** - Ranked FTS results with explainability

## Use Cases

### Session Continuity

Resume work without re-explaining context:

```typescript
import { SessionManager } from '@kindling/adapter-opencode';

const manager = new SessionManager(store);

// Start session
manager.onSessionStart({
  sessionId: 'session-1',
  intent: 'Fix authentication bug',
  repoId: '/home/user/my-project',
});

// Events flow in automatically...

// Later: retrieve session context
const context = service.retrieve({
  scope: { sessionId: 'session-1' },
});
```

### Workflow Memory

Capture high-signal workflow executions:

```typescript
import { NodeAdapter, NodeStatus } from '@kindling/adapter-pocketflow';

const adapter = new NodeAdapter({ service, repoId: 'my-app' });

adapter.onNodeStart({
  node: { id: 'test-1', name: 'run-integration-tests' },
  status: NodeStatus.Running,
});

adapter.onNodeEnd({
  node: { id: 'test-1', name: 'run-integration-tests' },
  status: NodeStatus.Success,
  output: { passed: 42, failed: 0 },
});
```

### Pin Critical Findings

Mark important discoveries for non-evictable retrieval:

```typescript
service.pin({
  targetType: 'observation',
  targetId: errorObs.id,
  note: 'Root cause of production outage',
  ttlMs: 7 * 24 * 60 * 60 * 1000, // 1 week
});

// Pins always appear first in retrieval
const results = service.retrieve({ query: 'outage' });
console.log(results.pins); // Includes the pinned error
```

## Design Principles

1. **Capture, Don't Judge** - Kindling preserves what happened without asserting truth
2. **Deterministic & Explainable** - All retrieval results include "why" explanations
3. **Local-First** - No external services, embedded SQLite
4. **Privacy-Aware** - Redaction, bounded output, configurable capture
5. **Provenance Always** - Every piece of context points to concrete evidence

## Non-Goals

Kindling explicitly does **not**:
- Decide what memory is authoritative (that's Edda's job)
- Manage organizational lifecycle or approval workflows
- Provide multi-user collaboration (yet)
- Replace existing knowledge management systems

## Requirements

- Node.js >= 20.0.0
- pnpm >= 8.0.0 (for development)

## Development

```bash
# Clone the repository
git clone https://github.com/EddaCraft/kindling.git
cd kindling

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Type-check
pnpm run type-check
```

## Documentation

- [Data Model](./docs/data-model.md) - Core entities and relationships
- [Retrieval Contract](./docs/retrieval-contract.md) - How retrieval works
- [Contributing](./CONTRIBUTING.md) - Development guidelines
- [Security](./SECURITY.md) - Security policy

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/EddaCraft/kindling/issues)
- **Security**: See [SECURITY.md](SECURITY.md)

---

**Built by the [EddaCraft](https://eddacraft.ai) team**
