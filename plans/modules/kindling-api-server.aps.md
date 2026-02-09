# Kindling API Server

| Scope | Owner  | Priority | Status      |
| ----- | ------ | -------- | ----------- |
| API   | @aneki | medium   | Implemented |

## Purpose

Provides an HTTP REST API server for Kindling, enabling multi-agent concurrency and web-based access. The server wraps `KindlingService` with Fastify endpoints, allowing agents in any language to interact with Kindling over HTTP.

This is essential for:

- Running 5+ concurrent agents without SQLite lock contention
- Web-based agents (Claude Code Web, Cursor Web) that can't access local filesystem
- Cross-language integrations (Python, Ruby, Go, etc.)
- Centralized write coordination in multi-agent workflows

## In Scope

- Fastify HTTP server wrapping KindlingService
- REST endpoints for core operations (retrieve, capsules, observations, pins)
- Export/import endpoints
- TypeScript client (`KindlingApiClient`)
- Health check and basic error handling
- CLI integration (`kindling serve` command)

## Out of Scope

- Authentication/authorization (localhost-only for v0.1)
- TLS/HTTPS (use SSH tunneling for remote access)
- WebSocket/streaming APIs
- Rate limiting or quotas
- Multi-database management
- MCP server implementation (separate adapter)

## Interfaces

**Depends on:**

- `@eddacraft/kindling-core` - KindlingService, types
- `@eddacraft/kindling-store-sqlite` - Database connection (passed to service)

**Exposes:**

- `startServer(options)` - Start HTTP server
- `KindlingApiClient` - TypeScript client for consuming the API
- REST endpoints at `/api/*`

## Boundary Rules

- API scope owns HTTP transport layer only
- Business logic stays in `@eddacraft/kindling-core`
- Database management delegated to store packages
- Security is caller's responsibility (localhost binding, SSH tunneling)

## Acceptance Criteria

- [x] Server starts and binds to 127.0.0.1 by default
- [x] All core KindlingService operations exposed via REST endpoints
- [x] TypeScript client works with server
- [x] Export/import endpoints round-trip correctly
- [x] CLI `serve` command starts server with configurable port/host/db path
- [x] Tests verify endpoint contracts and error handling

## Risks & Mitigations

| Risk                            | Mitigation                                        |
| ------------------------------- | ------------------------------------------------- |
| Exposed to network without auth | Default to localhost-only, document SSH tunneling |
| Concurrent write contention     | Single server owns DB connection (WAL mode)       |
| Error leakage                   | Sanitize error responses                          |

## Tasks

All work for this module is complete. The package includes:

- Fastify server implementation
- REST endpoints for all core operations
- TypeScript client
- Integration with CLI `serve` command
- 5 passing tests
- Comprehensive README with examples

## Decisions

- **D-001:** Bind to 127.0.0.1 by default for security
- **D-002:** Use Fastify for performance and TypeScript support
- **D-003:** Single DB connection per server instance to avoid lock contention
- **D-004:** No authentication in v0.1 (localhost-only use case)
- **D-005:** Client library for TypeScript only; other languages use HTTP directly

## Notes

This package enables the "Quick-Start" use case for web-based agents and multi-agent workflows. It's designed for local development, not production deployment.

For remote access, use SSH port forwarding rather than exposing the server to the network.
