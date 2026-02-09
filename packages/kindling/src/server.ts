/**
 * @eddacraft/kindling/server
 *
 * HTTP API server for multi-agent concurrency.
 * Requires fastify and @fastify/cors as peer dependencies.
 *
 * @example
 * ```typescript
 * import { KindlingService, openDatabase, SqliteKindlingStore, LocalFtsProvider } from '@eddacraft/kindling';
 * import { createServer, startServer } from '@eddacraft/kindling/server';
 *
 * const db = openDatabase({ path: './memory.db' });
 * const store = new SqliteKindlingStore(db);
 * const provider = new LocalFtsProvider(db);
 * const service = new KindlingService({ store, provider });
 *
 * await startServer({ service, db });
 * ```
 */

export * from '@eddacraft/kindling-server';
