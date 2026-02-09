/**
 * @eddacraft/kindling/client
 *
 * HTTP client for the Kindling API server.
 *
 * @example
 * ```typescript
 * import { KindlingApiClient } from '@eddacraft/kindling/client';
 *
 * const client = new KindlingApiClient('http://localhost:8080');
 * const results = await client.retrieve({ query: 'authentication' });
 * ```
 */

export * from '@eddacraft/kindling-server/client';
