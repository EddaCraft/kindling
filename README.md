# Kindling

**Local memory and continuity engine for AI-assisted development**

Kindling captures observations (tool calls, diffs, commands, errors, messages) from AI-assisted workflows, organizes them into capsules, and makes context retrievable with deterministic, explainable results. Everything runs locally with embedded SQLite and no external services.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## What is Kindling?

AI-assisted development generates a lot of transient activity that gets lost between sessions. Kindling preserves that activity with provenance and lets you retrieve it later in a way that is stable, explainable, and scoped to what you are doing now.

Use it to keep continuity across sessions, capture workflow history, and surface critical findings when you need them.

## How it works

- **Observation capture**: record tool calls, commands, file diffs, errors, and messages with provenance.
- **Capsules**: group observations into bounded units like sessions or workflow nodes.
- **Deterministic retrieval**: FTS-based search with stable ranking and explainability.
- **Pins and summaries**: prioritise high-signal findings and session summaries.
- **Local-first storage**: SQLite with WAL + FTS5, no external services.

## How to use

### Install from source

```bash
git clone https://github.com/eddacraft/kindling.git
cd kindling
pnpm install
pnpm build
```

### Basic usage (TypeScript)

```typescript
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalRetrievalProvider } from '@kindling/provider-local';
import { KindlingService, ObservationKind, CapsuleType } from '@kindling/core';

const db = openDatabase({ dbPath: './kindling.db' });
const store = new SqliteKindlingStore(db);
const provider = new LocalRetrievalProvider(store);
const service = new KindlingService({ store, provider });

const capsule = service.openCapsule({
  type: CapsuleType.Session,
  intent: 'debug',
  scope: { sessionId: 'session-1', repoId: 'my-project' },
});

service.appendObservation({
  kind: ObservationKind.Command,
  content: 'pnpm test failed',
  provenance: { command: 'pnpm test', exitCode: 1 },
  scope: { sessionId: 'session-1' },
}, { capsuleId: capsule.id });

const results = service.retrieve({
  query: 'test failure',
  scope: { sessionId: 'session-1' },
});

console.log('Found:', results.providerHits.length, 'observations');

service.closeCapsule(capsule.id, {
  generateSummary: true,
  summaryContent: 'Fixed test flake in auth middleware',
});

db.close();
```

### CLI usage

```bash
kindling status
kindling search "authentication error"
kindling list capsules
kindling pin observation obs_abc123 --note "Root cause identified"
```

## Packages

- **[@kindling/core](packages/kindling-core)** - Domain types, capsule lifecycle, retrieval orchestration
- **[@kindling/store-sqlite](packages/kindling-store-sqlite)** - SQLite persistence with FTS indexing
- **[@kindling/provider-local](packages/kindling-provider-local)** - FTS-based retrieval with ranking
- **[@kindling/adapter-opencode](packages/kindling-adapter-opencode)** - OpenCode session integration
- **[@kindling/adapter-pocketflow](packages/kindling-adapter-pocketflow)** - Workflow node integration
- **[@kindling/cli](packages/kindling-cli)** - Command-line tools for inspection and management

## Documentation

- [Plans & Roadmap](plans/index.aps.md)
- [Architecture Overview](docs/architecture.md) (coming soon)
- [Data Model](docs/data-model.md) (coming soon)
- [Retrieval Contract](docs/retrieval-contract.md) (coming soon)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and contribution workflow.

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.
