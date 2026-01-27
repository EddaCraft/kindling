# Changelog

All notable changes to @kindling/store-sqlite will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-27

### Added

- Initial release
- SQLite persistence using better-sqlite3
- FTS5 full-text search indexing
- WAL mode for concurrent access
- Atomic write operations for observations, capsules, summaries, and pins
- Observation redaction with FTS sync
- Capsule lifecycle management
- Pin TTL support with automatic expiration filtering
- Transaction support
- Database export/import functionality
- Migration system with versioned schemas
