# Kindling

> **Status: Work in Progress** — Not yet ready for production use.

A lightweight, open-source library for adding durable memory and contextual continuity to agentic and AI-assisted workflows. Kindling captures what happened, preserves provenance, and makes context retrievable in a deterministic, explainable way.

## What Kindling Does

- **Captures observations** — tool calls, diffs, commands, errors, messages
- **Organises into capsules** — bounded units of meaning (sessions, workflow nodes)
- **Retrieves with provenance** — deterministic, scoped, explainable results
- **Runs locally** — embedded SQLite, no external services required

## What Kindling Does Not Do

Kindling is infrastructure. It does **not**:

- Decide what memory is authoritative
- Promote or curate institutional memory
- Manage lifecycle, conflict resolution, or approval workflows

Those concerns belong to downstream systems and are explicitly out of scope.

## Packages

```
packages/
├── kindling-core           # Domain model, capsule lifecycle, retrieval orchestration
├── kindling-store-sqlite   # SQLite system of record
├── kindling-provider-local # FTS + recency-based retrieval
├── kindling-adapter-opencode   # OpenCode integration
├── kindling-adapter-pocketflow # PocketFlow workflow integration
└── kindling-cli            # Inspection, debugging, export/import
```

## Documentation

- [Architecture](docs/architecture.md)
- [Data Model](docs/data-model.md)
- [Retrieval Contract](docs/retrieval-contract.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

### Scope Guardrails

Contributions to Kindling OSS should focus on:

- Capture and retrieval infrastructure
- Determinism and explainability
- Local-first, embedded operation

Out of scope for this repository:

- Governance and promotion workflows
- Multi-user access control
- Cloud/server deployment modes

## For LLMs

If you're an AI assistant working with this codebase:

- **Architecture**: See [docs/architecture.md](docs/architecture.md) for system design
- **Data model**: See [docs/data-model.md](docs/data-model.md) for core types
- **Retrieval**: See [docs/retrieval-contract.md](docs/retrieval-contract.md) for query behaviour
- **Plan**: See [plans/index.aps.md](plans/index.aps.md) for roadmap, modules, and decisions

**Key constraints:**
- Kindling captures context but does not assert truth
- Retrieval must be deterministic and explainable
- Governance/promotion is out of scope (belongs to Edda)
- Local-first, embedded SQLite, no external services

## License

[Apache-2.0](LICENSE) — Copyright 2025 EddaCraft
