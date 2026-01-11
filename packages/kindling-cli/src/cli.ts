#!/usr/bin/env node

/**
 * Kindling CLI Entry Point
 */

import { Command } from 'commander';
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import { statusCommand, formatStatus } from './commands/status.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('kindling')
  .description('CLI for Kindling inspection, debugging, and export/import')
  .version(packageJson.version);

// Default database path
const DEFAULT_DB_PATH = process.env.KINDLING_DB || join(process.env.HOME || '~', '.kindling', 'memory.db');

program
  .command('status')
  .description('Show database status and summary')
  .option('--db <path>', 'Path to database file', DEFAULT_DB_PATH)
  .action((options) => {
    try {
      const db = openDatabase({ path: options.db });
      const store = new SqliteKindlingStore(db);
      const result = statusCommand(store, options.db, db);
      console.log(formatStatus(result));
      db.close();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('search <query>')
  .description('Search for observations (not yet implemented)')
  .option('--session <id>', 'Filter by session ID')
  .option('--repo <path>', 'Filter by repository path')
  .option('--limit <n>', 'Limit number of results', '20')
  .action(() => {
    console.log('Search command not yet implemented. Coming soon!');
    process.exit(1);
  });

program
  .command('list <entity>')
  .description('List entities (capsules, observations, pins)')
  .option('--session <id>', 'Filter by session ID')
  .option('--limit <n>', 'Limit results', '50')
  .action(() => {
    console.log('List command not yet implemented. Coming soon!');
    process.exit(1);
  });

program.parse();
