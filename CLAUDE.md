# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kindling is a local memory and continuity engine for AI-assisted development. It captures observations (tool calls, diffs, commands, errors) from AI workflows, organizes them into capsules (bounded units of meaning), and makes context retrievable with deterministic, explainable results. All data is stored locally using embedded SQLite with FTS5.

## Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Build all packages
pnpm run build

# Run all tests
pnpm run test

# Type-check all packages
pnpm run type-check

# Lint all packages
pnpm run lint

# Clean build artifacts
pnpm run clean

# Work with a specific package
cd packages/kindling-core
pnpm run build
pnpm run test
pnpm run test:watch  # Watch mode
pnpm run type-check
```

## Architecture

### Package Structure

The monorepo (pnpm workspaces) has the following packages:

```
@eddacraft/kindling                  → Main package (core + SQLite store + provider + API server)
@eddacraft/kindling-core             → Domain types, capsule lifecycle, retrieval orchestration
@eddacraft/kindling-store-sqljs      → Browser/WASM store (sql.js)
@eddacraft/kindling-adapter-opencode → Session integration for OpenCode
@eddacraft/kindling-adapter-pocketflow → Workflow node integration (PocketFlow)
@eddacraft/kindling-adapter-claude-code → Claude Code hooks integration
@eddacraft/kindling-cli              → CLI tools (uses Commander.js)
```

The main `@eddacraft/kindling` package is what most users install. It re-exports everything from core, bundles the SQLite store (better-sqlite3, FTS5, WAL mode), the local FTS provider, and the API server. Adapter authors and browser users can depend on the lighter `@eddacraft/kindling-core` instead.

### Dependency Flow

```
                     adapters (opencode, pocketflow, claude-code)
                              ↓
                        kindling-core (types + service)
                              ↑
                     @eddacraft/kindling (main package)
                       ↙       |        ↘
            store-sqlite   provider-local  api-server
                       ↘       |        ↙
                         SQLite DB
```

The main package (`@eddacraft/kindling`) bundles core, store, provider, and server. Adapters depend on core only. Browser users use `@eddacraft/kindling-core` + `@eddacraft/kindling-store-sqljs`.

### Domain Model

**Observations** are atomic units of captured context:

- `tool_call`, `command`, `file_diff`, `error`, `message`
- `node_start`, `node_output`, `node_error`, `node_end` (workflow events)

**Capsules** are bounded units that group observations:

- Types: `session`, `pocketflow_node`, `custom`
- Lifecycle: open → close (with optional summary generation)
- Scope: `sessionId`, `repoId`, `agentId`, `userId`

**Retrieval** is three-tiered:

1. Pins (user-controlled, non-evictable)
2. Current Summary (active session context)
3. Provider Hits (ranked FTS results)

### Key Abstractions

**KindlingService** (`@eddacraft/kindling-core`) orchestrates:

- `openCapsule()`, `closeCapsule()` - lifecycle management
- `appendObservation()` - capture events
- `retrieve()` - deterministic search with provenance
- `pin()`, `unpin()` - priority content management

**SqliteKindlingStore** (bundled in `@eddacraft/kindling`):

- Implements persistence with FTS5 indexing
- WAL mode for concurrent access
- Migrations in `packages/kindling-store-sqlite/migrations/`

**PocketFlow Integration** (`@eddacraft/kindling-adapter-pocketflow`):

- `KindlingNode` and `KindlingFlow` extend PocketFlow's Node/Flow
- Auto-creates capsules per node execution
- Records `node_start`, `node_output`, `node_error`, `node_end` observations

### Code Patterns

Types are defined in `packages/kindling-core/src/types/`:

- `common.ts` - ID, Timestamp, ScopeIds, Result<T>
- `observation.ts` - ObservationKind, Observation
- `capsule.ts` - CapsuleType, CapsuleStatus, Capsule
- `retrieval.ts` - RetrieveOptions, RetrieveResult, RetrievalProvider

Validation uses a Result type pattern (`ok()` / `err()`) rather than exceptions.

ESM-only (`"type": "module"`) with `.js` extensions in imports.

## PocketFlow (Vendored)

The project vendors PocketFlow at `packages/kindling-adapter-pocketflow/vendor/pocketflow/`. Key concepts:

- **Node**: prep → exec → post lifecycle
- **Flow**: orchestrates nodes via action-based transitions
- **Shared Store**: global state accessible by all nodes
- **BatchNode/BatchFlow**: process arrays of items
- Design patterns: Agent, Workflow, RAG, MapReduce

The `.cursorrules` file in the vendor directory contains extensive PocketFlow guidance for agentic coding workflows.
