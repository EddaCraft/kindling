# Kindling

**Local memory and continuity engine for AI-assisted development**

Kindling captures observations (tool calls, diffs, commands, errors) from AI-assisted workflows, organizes them into capsules (bounded units of meaning), and makes context retrievable with deterministic, explainable results—all running locally with no external services.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## Problem

AI-assisted development produces large volumes of transient activity (tool calls, diffs, agent runs) but loses context between sessions. Developers and local agents repeatedly re-discover the same information, leading to wasted time, architectural drift, and brittle workflows.

## Solution

Kindling provides **continuity without judgement**. It captures what happened, preserves provenance, and makes context retrievable in a deterministic, explainable way—without asserting organizational truth or governance.

### Key Features

- **📦 Observation Capture**: Records tool calls, commands, file diffs, errors, and messages with full provenance
- **🎯 Capsule-Based Organization**: Groups observations into bounded units (sessions, workflow nodes)
- **🔍 Deterministic Retrieval**: FTS-based search with explainable, stable ranking
- **📌 Pin Management**: User-controlled high-priority content with optional TTL
- **💾 Local-First**: Embedded SQLite with WAL mode, no external dependencies
- **🔒 Privacy-Aware**: Redaction support, bounded output capture
- **🎨 Adapter Architecture**: OpenCode and PocketFlow integrations included

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Adapters                         │
│  ┌──────────────┐        ┌──────────────────────┐  │
│  │  OpenCode    │        │  PocketFlow Nodes    │  │
│  │  Sessions    │        │  (Workflows)         │  │
│  └──────┬───────┘        └──────────┬───────────┘  │
└─────────┼──────────────────────────┼───────────────┘
          │                          │
          └─────────┬────────────────┘
                    ▼
         ┌──────────────────────┐
         │  KindlingService     │ ← Orchestration
         │  (kindling-core)     │
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

## Package Structure

Kindling is organized as a TypeScript monorepo with clear boundaries:

- **[@kindling/core](packages/kindling-core)** - Domain types, capsule lifecycle, retrieval orchestration
- **[@kindling/store-sqlite](packages/kindling-store-sqlite)** - SQLite persistence with FTS indexing
- **[@kindling/provider-local](packages/kindling-provider-local)** - FTS-based retrieval with ranking
- **[@kindling/adapter-opencode](packages/kindling-adapter-opencode)** - OpenCode session integration
- **[@kindling/adapter-pocketflow](packages/kindling-adapter-pocketflow)** - Workflow node integration
- **[@kindling/cli](packages/kindling-cli)** - Command-line tools for inspection and management

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/EddaCraft/kindling.git
cd kindling

# Install dependencies
npm install

# Build all packages
npm run build
```

### Basic Usage

```typescript
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalRetrievalProvider } from '@kindling/provider-local';
import { KindlingService, ObservationKind, CapsuleType } from '@kindling/core';

// Initialize Kindling
const db = openDatabase({ dbPath: './my-memory.db' });
const store = new SqliteKindlingStore(db);
const provider = new LocalRetrievalProvider(store);
const service = new KindlingService({ store, provider });

// Open a session capsule
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

service.appendObservation({
  kind: ObservationKind.Error,
  content: 'Authentication failed',
  provenance: { stack: 'Error: Auth failed\n  at login.ts:42' },
  scope: { sessionId: 'session-1' },
}, { capsuleId: capsule.id });

// Retrieve relevant context
const results = service.retrieve({
  query: 'authentication',
  scope: { sessionId: 'session-1' },
});

console.log('Found:', results.providerHits.length, 'relevant observations');

// Close session with summary
service.closeCapsule(capsule.id, {
  generateSummary: true,
  summaryContent: 'Fixed authentication bug in token validation',
});

db.close();
```

### CLI Usage

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

## Use Cases

### 1. Session Continuity

Capture entire development sessions and resume work without re-explaining context:

```typescript
import { SessionAdapter } from '@kindling/adapter-opencode';

const adapter = new SessionAdapter({ service });

// Session starts
adapter.onSessionStart('session-1', { repoId: 'my-app' });

// Events flow in
adapter.onEvent({
  type: 'ToolCall',
  sessionId: 'session-1',
  data: { toolName: 'Read', result: '...' },
});

// Session ends
adapter.onSessionEnd('session-1', {
  summaryContent: 'Implemented user authentication',
});

// Later: retrieve session context
const context = service.retrieve({
  scope: { sessionId: 'session-1' },
});
```

### 2. Workflow Memory

Capture high-signal workflow executions with intent and confidence:

```typescript
import { NodeAdapter, NodeStatus } from '@kindling/adapter-pocketflow';

const adapter = new NodeAdapter({ service, repoId: 'my-app' });

// Workflow node executes
adapter.onNodeStart({
  node: { id: 'test-1', name: 'run-integration-tests' },
  status: NodeStatus.Running,
});

adapter.onNodeEnd({
  node: { id: 'test-1', name: 'run-integration-tests' },
  status: NodeStatus.Success,
  output: { passed: 42, failed: 0 },
});
// Creates capsule with intent='test', confidence based on history
```

### 3. Pin Critical Findings

Mark important discoveries for non-evictable retrieval:

```typescript
// Pin a critical error
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

## Core Concepts

### Observations

Atomic units of captured context:

- **ToolCall**: AI tool invocations (Read, Edit, Bash, etc.)
- **Command**: Shell commands with exit codes and output
- **FileDiff**: File changes with paths
- **Error**: Errors with stack traces
- **Message**: User/assistant messages
- **NodeStart/NodeOutput/NodeError/NodeEnd**: Workflow events

### Capsules

Bounded units of meaning that group observations:

- **Session**: Interactive development session
- **PocketFlowNode**: Single workflow node execution
- **Custom**: User-defined capsule types

Each capsule has:
- Type and intent (debug, implement, test, etc.)
- Open/close lifecycle
- Automatic summary generation on close
- Scope (sessionId, repoId, agentId, userId)

### Retrieval Tiers

Deterministic, explainable retrieval with 3 tiers:

1. **Pins** - Non-evictable, user-controlled
2. **Current Summary** - Active session/capsule context
3. **Provider Hits** - Ranked FTS results with explainability

Ranking factors:
- Scope match (session > repo > agent/user)
- Recency decay
- Confidence weighting (for summaries)
- Intent matching

## Development

### Project Structure

```
kindling/
├── packages/
│   ├── kindling-core/          # Domain model & orchestration
│   ├── kindling-store-sqlite/  # SQLite persistence
│   ├── kindling-provider-local/# FTS retrieval
│   ├── kindling-adapter-opencode/
│   ├── kindling-adapter-pocketflow/
│   └── kindling-cli/           # CLI tools
├── plans/                      # Detailed planning docs
│   ├── index.aps.md           # Roadmap & milestones
│   └── modules/               # Module specifications
└── docs/                       # Additional documentation
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
cd packages/kindling-core
npm test

# Watch mode
npm run test:watch
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
cd packages/kindling-cli
npm run build

# Clean build artifacts
npm run clean
```

## Roadmap

✅ **M1: OSS Scaffolding** - Repository structure, planning documentation
✅ **M2: Local Capture + Continuity (OpenCode)** - Core capture, storage, and retrieval
✅ **M3: High-Signal Workflows (PocketFlow)** - Workflow-driven capsules with intent/confidence
✅ **M4: OSS Hardening** - CLI tools, documentation polish

Future:
- **Semantic retrieval** (embeddings integration)
- **Multi-user support** with conflict resolution
- **Export/import** for portability
- **Edda**: Governance and curation layer

## Design Principles

1. **Capture, Don't Judge**: Kindling preserves what happened without asserting truth
2. **Deterministic & Explainable**: All retrieval results include "why" explanations
3. **Local-First**: No external services, embedded SQLite
4. **Privacy-Aware**: Redaction, bounded output, configurable capture
5. **Provenance Always**: Every piece of context points to concrete evidence

## Non-Goals

Kindling explicitly does **not**:
- Decide what memory is authoritative (that's Edda's job)
- Manage organizational lifecycle or approval workflows
- Provide multi-user collaboration (yet)
- Replace existing knowledge management systems

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## Documentation

- [Plans & Roadmap](plans/index.aps.md)
- [Architecture Overview](docs/architecture.md) (coming soon)
- [Data Model](docs/data-model.md) (coming soon)
- [Retrieval Contract](docs/retrieval-contract.md) (coming soon)

## Planning (APS)

FYI: Kindling uses APS docs for roadmap and module planning. If you want the longer-form planning context, start at [plans/index.aps.md](plans/index.aps.md).

## Support

- **Issues**: [GitHub Issues](https://github.com/EddaCraft/kindling/issues)
- **Security**: See [SECURITY.md](SECURITY.md)

---

**Built with ❤️ by the EddaCraft team**
