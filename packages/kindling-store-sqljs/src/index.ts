/**
 * Kindling sql.js Store
 *
 * WASM-based SQLite store for browser and cross-platform compatibility.
 * Drop-in replacement for @kindling/store-sqlite in environments where
 * native bindings are not available.
 */

// Re-export database infrastructure
export * from './db/index.js';

// Re-export store implementation
export * from './store/index.js';

// Re-export persistence adapters
export * from './persistence/index.js';
