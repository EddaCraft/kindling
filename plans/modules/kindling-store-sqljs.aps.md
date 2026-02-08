# Kindling SQL.js Store

| Scope   | Owner  | Priority | Status      |
| ------- | ------ | -------- | ----------- |
| STORAGE | @aneki | low      | Implemented |

## Purpose

Provides a WASM-based SQLite persistence layer using [sql.js](https://sql.js.org/), enabling Kindling to run in browser environments and platforms without native compilation support.

This is a drop-in replacement for `@kindling/store-sqlite` with identical API, but trades performance for portability:

- Runs in browsers (with IndexedDB persistence)
- Works in serverless platforms without native modules
- Enables client-side Kindling instances

## In Scope

- WASM-based SQLite store using sql.js
- Same `KindlingStore` interface as store-sqlite
- Database initialization and migrations
- Export/import to `Uint8Array`
- IndexedDB persistence adapter for browsers
- Memory persistence adapter for testing
- FTS5 auto-detection (not all sql.js builds include FTS5)

## Out of Scope

- WAL mode (not supported by sql.js)
- Performance optimization (native will always be faster)
- Memory-mapped files (entire DB loads into memory)
- File-based persistence (export/save required)
- Custom sql.js builds with FTS5

## Interfaces

**Depends on:**

- (none - self-contained with sql.js)

**Exposes:**

- `SqljsKindlingStore` implementing `KindlingStore`
- `openDatabase(options?)` - Async initialization
- `exportDatabaseToBytes(db)` - Serialize to Uint8Array
- `IndexedDBPersistence` - Browser storage adapter
- `MemoryPersistence` - In-memory storage adapter

## Boundary Rules

- STORAGE scope must not depend on KINDLING, RETRIEVAL, or ADAPTER scopes
- API must match `@kindling/store-sqlite` exactly (drop-in replacement)
- FTS5 support is optional and auto-detected
- Persistence is manual (caller must export/save)

## Acceptance Criteria

- [x] Implements full `KindlingStore` interface
- [x] All migrations apply correctly
- [x] FTS5 auto-detection works
- [x] IndexedDB persistence round-trips correctly
- [x] Export/import matches store-sqlite format
- [x] Works in browser and Node.js environments
- [x] 15 passing tests

## Risks & Mitigations

| Risk                                 | Mitigation                                                |
| ------------------------------------ | --------------------------------------------------------- |
| Performance 2-10x slower than native | Document trade-offs clearly; recommend native for Node.js |
| Entire DB in memory                  | Document memory concerns; suggest periodic exports        |
| FTS5 often not available             | Auto-detect and skip FTS migrations; document limitations |
| Manual persistence required          | Provide persistence adapters; document save patterns      |

## Tasks

All work for this module is complete. The package includes:

- SQL.js store implementation
- Database initialization and migrations
- FTS5 auto-detection and graceful degradation
- IndexedDB persistence adapter
- Memory persistence adapter
- Export/import functionality
- 15 passing tests
- Comprehensive README with browser examples

## Decisions

- **D-001:** Trade performance for portability (explicit design choice)
- **D-002:** Auto-detect FTS5 rather than requiring custom sql.js builds
- **D-003:** Manual persistence via export/save (sql.js limitation)
- **D-004:** Provide IndexedDB adapter but don't auto-save (caller controls timing)
- **D-005:** Match store-sqlite API exactly for drop-in compatibility

## Notes

This package is primarily for browser-based use cases and platforms where native compilation isn't available. For Node.js environments, `@kindling/store-sqlite` is strongly recommended for better performance.

The FTS5 limitation means that standard sql.js builds won't support full-text search. Retrieval will work but won't use FTS indexes. Users needing FTS5 in browsers must compile sql.js with FTS5 enabled themselves.
