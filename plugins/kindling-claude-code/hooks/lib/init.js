/**
 * Shared initialization for Kindling plugin hooks.
 *
 * Opens the project-scoped SQLite database, creates the store and hook handlers.
 * Each hook invocation is a separate process, so we open/close the DB each time.
 *
 * When installed as a Claude Code plugin, better-sqlite3 (native addon) may not
 * be available. This module auto-installs it on first run.
 */

const { createHash } = require('crypto');
const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { homedir } = require('os');
const { join, resolve } = require('path');

const pluginRoot = resolve(__dirname, '..', '..');

/**
 * Ensure better-sqlite3 is available. When installed as a Claude Code plugin,
 * node_modules may not exist yet. Install it on-demand.
 */
function ensureDependencies() {
  try {
    require.resolve('better-sqlite3');
  } catch {
    const pkgJsonPath = join(pluginRoot, 'package.json');
    if (!existsSync(pkgJsonPath)) return;

    console.error('[kindling] Installing better-sqlite3 (first run)...');
    try {
      execSync('npm install --production --no-package-lock --ignore-scripts=false', {
        cwd: pluginRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60000,
      });
      console.error('[kindling] better-sqlite3 installed successfully.');
    } catch (installErr) {
      throw new Error(
        `Failed to install better-sqlite3: ${installErr.message}\n` +
        `Try running manually: cd ${pluginRoot} && npm install`
      );
    }
  }
}

ensureDependencies();

const kindling = require(join(pluginRoot, 'dist', 'kindling-bundle.cjs'));

/**
 * Resolve the project root directory.
 * Uses git toplevel when available for stability (same hash regardless of
 * which subdirectory Claude Code was launched from), falls back to resolved cwd.
 */
function getProjectRoot(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return resolve(cwd);
  }
}

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

  const root = getProjectRoot(cwd);
  const projectId = createHash('sha256').update(root).digest('hex').slice(0, 12);
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

module.exports = { init, cleanup, readStdin, getDbPath, getProjectRoot, kindling };
