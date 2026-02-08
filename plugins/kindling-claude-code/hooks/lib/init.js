/**
 * Shared initialization for Kindling plugin hooks.
 *
 * Opens the project-scoped SQLite database, creates the store and hook handlers.
 * Each hook invocation is a separate process, so we open/close the DB each time.
 */

const { createHash } = require('crypto');
const { existsSync, mkdirSync } = require('fs');
const { homedir } = require('os');
const { join, resolve } = require('path');

const kindling = require(join(__dirname, '..', '..', 'dist', 'kindling-bundle.cjs'));

/**
 * Derive a project-scoped database path from the working directory.
 * Each project gets its own database under ~/.kindling/projects/<hash>/
 */
function getDbPath(cwd) {
  // Allow explicit override
  if (process.env.KINDLING_DB_PATH) {
    const dir = require('path').dirname(process.env.KINDLING_DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return process.env.KINDLING_DB_PATH;
  }

  const projectId = createHash('sha256').update(resolve(cwd)).digest('hex').slice(0, 12);
  const dir = join(homedir(), '.kindling', 'projects', projectId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, 'kindling.db');
}

/**
 * Initialize the store and hook handlers for a given working directory.
 */
function init(cwd) {
  const dbPath = getDbPath(cwd);
  const db = kindling.openDatabase({ path: dbPath });
  const store = new kindling.SqliteKindlingStore(db);
  const provider = new kindling.LocalFtsProvider(db);
  const handlers = kindling.createHookHandlers(store);
  const service = new kindling.KindlingService({ store, provider });

  return { db, store, handlers, service, provider, dbPath, kindling };
}

/**
 * Safely close the database connection.
 */
function cleanup(db) {
  try {
    kindling.closeDatabase(db);
  } catch {
    // Ignore close errors during shutdown
  }
}

/**
 * Read JSON input from stdin (Claude Code passes hook context this way).
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { input += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(input));
      } catch (err) {
        reject(new Error(`Failed to parse stdin: ${err.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

module.exports = { init, cleanup, readStdin, getDbPath, kindling };
