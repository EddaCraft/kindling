#!/usr/bin/env node

/**
 * Kindling CLI
 *
 * Command-line interface for Kindling memory inspection and management.
 */

import { homedir } from 'os';
import { join } from 'path';
import { openDatabase, SqliteKindlingStore } from '@kindling/store-sqlite';
import { LocalRetrievalProvider } from '@kindling/provider-local';
import { KindlingService } from '@kindling/core';
import {
  statusCommand,
  formatStatus,
  searchCommand,
  formatSearchResults,
  listCommand,
  formatList,
  pinCommand,
  unpinCommand,
} from './index.js';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Default DB path
const defaultDbPath = join(homedir(), '.kindling', 'kindling.db');
const dbPath = process.env.KINDLING_DB_PATH || defaultDbPath;

function printHelp() {
  console.log(`
Kindling CLI - Local Memory & Continuity Engine

Usage:
  kindling <command> [options]

Commands:
  status                    Show database status and counts
  search <query>            Search for observations and summaries
  list <target>             List capsules, pins, or observations
  pin <type> <id>           Pin an observation, summary, or capsule
  unpin <pin-id>            Remove a pin
  help                      Show this help message

Options:
  --session <id>            Filter by session ID
  --repo <id>               Filter by repo ID
  --limit <n>               Limit number of results (default: 20)
  --note <text>             Add a note to a pin
  --ttl <seconds>           Set TTL for a pin

Examples:
  kindling status
  kindling search "authentication error"
  kindling search --session session-123
  kindling list capsules
  kindling list pins
  kindling pin observation obs_123 --note "Important finding"
  kindling unpin pin_456

Environment Variables:
  KINDLING_DB_PATH          Path to SQLite database (default: ~/.kindling/kindling.db)
`);
}

function parseOptions(args: string[]): Record<string, any> {
  const options: Record<string, any> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[i + 1];
      options[key] = value;
      i++;
    }
  }
  return options;
}

async function main() {
  if (!command || command === 'help') {
    printHelp();
    process.exit(0);
  }

  try {
    // Open database
    const db = openDatabase({ dbPath });
    const store = new SqliteKindlingStore(db);
    const provider = new LocalRetrievalProvider(store);
    const service = new KindlingService({ store, provider });

    const options = parseOptions(args.slice(1));

    switch (command) {
      case 'status': {
        const result = statusCommand(store, dbPath, db);
        console.log(formatStatus(result));
        break;
      }

      case 'search': {
        const query = args[1];
        const result = searchCommand(service, {
          query,
          sessionId: options.session,
          repoId: options.repo,
          limit: options.limit ? parseInt(options.limit) : undefined,
        });
        console.log(formatSearchResults(result));
        break;
      }

      case 'list': {
        const target = args[1] as any;
        if (!target || !['capsules', 'pins', 'observations'].includes(target)) {
          console.error('Error: list command requires a target (capsules, pins, or observations)');
          process.exit(1);
        }
        const items = listCommand(store, target, {
          sessionId: options.session,
          status: options.status,
          limit: options.limit ? parseInt(options.limit) : undefined,
        });
        console.log(formatList(target, items));
        break;
      }

      case 'pin': {
        const targetType = args[1];
        const targetId = args[2];
        if (!targetType || !targetId) {
          console.error('Error: pin command requires <type> and <id>');
          process.exit(1);
        }
        const message = pinCommand(service, targetType, targetId, {
          note: options.note,
          ttl: options.ttl ? parseInt(options.ttl) : undefined,
        });
        console.log(message);
        break;
      }

      case 'unpin': {
        const pinId = args[1];
        if (!pinId) {
          console.error('Error: unpin command requires <pin-id>');
          process.exit(1);
        }
        const message = unpinCommand(service, pinId);
        console.log(message);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "kindling help" for usage information');
        process.exit(1);
    }

    db.close();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
