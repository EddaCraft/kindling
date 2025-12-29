# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kindling is a TypeScript library for adding durable memory and contextual continuity to AI-assisted workflows. It captures observations (tool calls, diffs, commands, errors), organizes them into capsules (bounded units of meaning), and retrieves context with provenance.

**Status:** Work in progress — scaffolding and planning complete, implementation not yet started.

**Key constraints:**
- Local-first, embedded SQLite, no external services
- Retrieval must be deterministic and explainable
- Kindling captures context but does not assert truth
- Governance/promotion is out of scope (belongs to downstream system Edda)

## Commands

```bash
pnpm install    # Install dependencies
pnpm test       # Run tests
pnpm build      # Build all packages
```

## Architecture

Monorepo with 6 packages. Dependency graph:

```
kindling-store-sqlite     (no deps - foundation)
        ↑
kindling-provider-local   (depends on store)
        ↑
kindling-core             (depends on store + provider)
        ↑
├── kindling-adapter-opencode
├── kindling-adapter-pocketflow
└── kindling-cli
```

### Package Responsibilities

- **kindling-core**: Domain model (Observation, Capsule, Summary, Pin), capsule lifecycle, retrieval orchestration
- **kindling-store-sqlite**: SQLite schema, migrations, persistence, FTS tables, redaction support
- **kindling-provider-local**: Deterministic FTS + recency ranking, explainability (each hit includes "why")
- **kindling-adapter-opencode**: Maps OpenCode events to observations, session→capsule lifecycle
- **kindling-adapter-pocketflow**: Maps PocketFlow workflow nodes to capsules
- **kindling-cli**: Inspection, search, pin management, export/import

### Key Design Patterns

- **Providers are accelerators, not sources of truth** — preserves provenance chains
- **Adapters are thin** — mapping tables only, no business logic
- **Capsules auto-close** on natural end signals (session end, workflow node end)
- **Redaction-first** — tombstone support built in from the start
- **Conservative summarization** — summaries only on capsule close, raw observations retained

## Planning Documentation

Detailed module specifications and task breakdowns are in `plans/`:
- `plans/index.aps.md` — Main roadmap, milestones, decisions
- `plans/modules/*.aps.md` — Per-module specifications
- `plans/execution/*.steps.md` — Task breakdowns

## Scope Guardrails

**In scope:** Observation capture, capsule lifecycle, retrieval (FTS, recency), export/import, adapters, CLI

**Out of scope:** Governance workflows, MemoryObject lifecycle, multi-user access control, cloud deployment, semantic/embedding retrieval (Phase 2+), UI components
