# Changelog

All notable changes to @eddacraft/kindling will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-02-16

### Changed

- Updated bundled `@eddacraft/kindling-store-sqlite` with denormalized scope columns and backward-compatible export
- Updated bundled `@eddacraft/kindling-provider-local` with cross-table BM25 normalization

## [0.1.1] - 2025-02-10

### Changed

- Version bump for monorepo release consistency (no functional changes)

## [0.1.0] - 2025-02-09

### Added

- Initial release
- Bundles core domain model, SQLite store, local FTS provider, and API server
- Re-exports all types and services from `@eddacraft/kindling-core`
- SQLite persistence with FTS5 full-text search and WAL mode via `@eddacraft/kindling-store-sqlite`
- Local retrieval provider with deterministic ranking via `@eddacraft/kindling-provider-local`
- Optional Fastify-based API server for multi-agent concurrency via `@eddacraft/kindling-server`
- HTTP client for remote API access
- Cross-platform support: Linux, macOS, and Windows via better-sqlite3 prebuilt binaries
