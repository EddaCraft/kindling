/**
 * Kindling Claude Code Adapter
 *
 * Captures observations from Claude Code sessions via hooks.
 *
 * @example
 * ```typescript
 * import { createHookHandlers } from '@eddacraft/kindling-adapter-claude-code';
 * import { SqliteKindlingStore, openDatabase } from '@eddacraft/kindling-store-sqlite';
 *
 * const db = openDatabase({ dbPath: '~/.kindling/kindling.db' });
 * const store = new SqliteKindlingStore(db);
 * const handlers = createHookHandlers(store);
 *
 * // Register handlers with Claude Code hooks
 * // SessionStart -> handlers.onSessionStart
 * // PostToolUse -> handlers.onPostToolUse
 * // Stop -> handlers.onStop
 * ```
 */

export * from './claude-code/index.js';
