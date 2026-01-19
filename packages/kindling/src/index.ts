/**
 * Kindling - Local memory and continuity engine for AI-assisted development
 *
 * @packageDocumentation
 */

// Re-export all types
export * from './types/index.js';

// Re-export all validation functions
export * from './validation/index.js';

// Re-export capsule lifecycle
export * from './capsule/index.js';

// Re-export retrieval orchestration
export * from './retrieval/index.js';

// Re-export export/import coordination
export * from './export/index.js';

// Re-export service orchestration
export * from './service/index.js';

// Re-export store (database, SQLite store)
export * from './store/index.js';

// Re-export provider (local FTS)
export * from './provider/index.js';

// Re-export server (HTTP API)
export * from './server/index.js';
