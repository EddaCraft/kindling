# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-18

### Added

#### Core (@kindling/core)
- Domain types for observations, capsules, pins, and retrieval
- `KindlingService` orchestration with capsule lifecycle management
- Observation kinds: `tool_call`, `command`, `file_diff`, `error`, `message`, `node_start`, `node_output`, `node_error`, `node_end`
- Capsule types: `session`, `pocketflow_node`, `custom`
- Three-tier retrieval: pins, current summary, provider hits
- Pin management with optional TTL
- Result type pattern (`ok()` / `err()`) for validation
- Export/import functionality for data portability

#### Store (@kindling/store-sqlite)
- SQLite persistence with better-sqlite3
- FTS5 full-text search indexing
- WAL mode for concurrent access
- Database migrations system
- Configurable database path

#### Provider (@kindling/provider-local)
- FTS-based retrieval with deterministic ranking
- BM25-inspired scoring algorithm
- Recency weighting for relevance
- Match context extraction with highlighting
- Explainable provenance for all results

#### Adapters
- **@kindling/adapter-opencode**: Session integration for OpenCode
  - Tool call capture with safety redaction
  - Command output with bounded capture
  - File diff recording
  - Error capture with stack traces
  - Automatic secret filtering

- **@kindling/adapter-pocketflow**: Workflow integration for PocketFlow
  - Node lifecycle events (`node_start`, `node_end`)
  - Output and error capture
  - Intent inference from node context
  - Automatic capsule creation per node

#### API Server (@kindling/api-server)
- HTTP API server using Fastify
- Multi-agent concurrency support
- RESTful endpoints for all core operations
- TypeScript client library included
- CORS support for browser access

#### CLI (@kindling/cli)
- `kindling status` - Database status and statistics
- `kindling search` - Full-text search with filters
- `kindling list` - List capsules, observations, pins
- `kindling pin` / `unpin` - Pin management
- `kindling inspect` - Detailed entity inspection
- `kindling export` / `import` - Data portability

### Technical Details
- ESM-only packages with modern Node.js 20+ support
- TypeScript 5.3+ with strict mode
- Monorepo structure using pnpm workspaces
- Comprehensive test coverage with Vitest
- Apache 2.0 license

[0.1.0]: https://github.com/EddaCraft/kindling/releases/tag/v0.1.0
