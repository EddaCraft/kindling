/**
 * SQLite-based storage for Kindling plugin
 *
 * Writes directly to ~/.kindling/kindling.db — the same database
 * that the Kindling CLI and API server read from.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Database directory and path
const KINDLING_DIR = join(homedir(), '.kindling');
const DB_PATH = join(KINDLING_DIR, 'kindling.db');

/** @type {Database.Database | null} */
let _db = null;

/**
 * Ensure the kindling directory exists
 */
function ensureDir() {
  if (!existsSync(KINDLING_DIR)) {
    mkdirSync(KINDLING_DIR, { recursive: true });
  }
}

/**
 * Run migrations if tables don't exist yet.
 * Inlined from @kindling/store-sqlite migrations so the plugin is self-contained.
 */
function runMigrations(db) {
  // Check if migrations table exists
  const hasMigrationsTable = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`
  ).get();

  if (!hasMigrationsTable) {
    // 001_init.sql
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK(kind IN (
          'tool_call', 'command', 'file_diff', 'error', 'message',
          'node_start', 'node_end', 'node_output', 'node_error'
        )),
        content TEXT NOT NULL,
        provenance TEXT NOT NULL DEFAULT '{}',
        ts INTEGER NOT NULL,
        scope_ids TEXT NOT NULL DEFAULT '{}',
        redacted INTEGER NOT NULL DEFAULT 0 CHECK(redacted IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS capsules (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('session', 'pocketflow_node')),
        intent TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('open', 'closed')) DEFAULT 'open',
        opened_at INTEGER NOT NULL,
        closed_at INTEGER,
        scope_ids TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS capsule_observations (
        capsule_id TEXT NOT NULL,
        observation_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        PRIMARY KEY (capsule_id, observation_id),
        FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE,
        FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS summaries (
        id TEXT PRIMARY KEY,
        capsule_id TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        confidence REAL NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),
        created_at INTEGER NOT NULL,
        evidence_refs TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pins (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL CHECK(target_type IN ('observation', 'summary')),
        target_id TEXT NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        scope_ids TEXT NOT NULL DEFAULT '{}'
      );

      INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
      VALUES (1, '001_init', strftime('%s', 'now') * 1000);
    `);
  }

  // Check if FTS migration has been applied
  const hasFts = db.prepare(
    `SELECT version FROM schema_migrations WHERE version = 2`
  ).get();

  if (!hasFts) {
    // 002_fts.sql
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
        content,
        content='observations',
        content_rowid='rowid',
        tokenize='porter unicode61'
      );

      INSERT OR IGNORE INTO observations_fts(rowid, content)
      SELECT rowid, content FROM observations WHERE redacted = 0;

      CREATE TRIGGER IF NOT EXISTS observations_fts_insert
      AFTER INSERT ON observations
      WHEN NEW.redacted = 0
      BEGIN
        INSERT INTO observations_fts(rowid, content)
        VALUES (NEW.rowid, NEW.content);
      END;

      CREATE TRIGGER IF NOT EXISTS observations_fts_update
      AFTER UPDATE ON observations
      BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
        INSERT INTO observations_fts(rowid, content)
        SELECT NEW.rowid, NEW.content WHERE NEW.redacted = 0;
      END;

      CREATE TRIGGER IF NOT EXISTS observations_fts_delete
      AFTER DELETE ON observations
      BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
      END;

      CREATE VIRTUAL TABLE IF NOT EXISTS summaries_fts USING fts5(
        content,
        content='summaries',
        content_rowid='rowid',
        tokenize='porter unicode61'
      );

      INSERT OR IGNORE INTO summaries_fts(rowid, content)
      SELECT rowid, content FROM summaries;

      CREATE TRIGGER IF NOT EXISTS summaries_fts_insert
      AFTER INSERT ON summaries
      BEGIN
        INSERT INTO summaries_fts(rowid, content)
        VALUES (NEW.rowid, NEW.content);
      END;

      CREATE TRIGGER IF NOT EXISTS summaries_fts_update
      AFTER UPDATE ON summaries
      BEGIN
        INSERT INTO summaries_fts(summaries_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
        INSERT INTO summaries_fts(rowid, content)
        VALUES (NEW.rowid, NEW.content);
      END;

      CREATE TRIGGER IF NOT EXISTS summaries_fts_delete
      AFTER DELETE ON summaries
      BEGIN
        INSERT INTO summaries_fts(summaries_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
      END;

      INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
      VALUES (2, '002_fts', strftime('%s', 'now') * 1000);
    `);
  }

  // Check if indexes migration has been applied
  const hasIndexes = db.prepare(
    `SELECT version FROM schema_migrations WHERE version = 3`
  ).get();

  if (!hasIndexes) {
    // 003_indexes.sql
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_observations_ts ON observations(ts DESC);
      CREATE INDEX IF NOT EXISTS idx_observations_session_ts ON observations(
        json_extract(scope_ids, '$.sessionId'), ts DESC
      ) WHERE json_extract(scope_ids, '$.sessionId') IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_observations_repo_ts ON observations(
        json_extract(scope_ids, '$.repoId'), ts DESC
      ) WHERE json_extract(scope_ids, '$.repoId') IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_observations_kind ON observations(kind);

      CREATE INDEX IF NOT EXISTS idx_capsules_status_session ON capsules(
        status, json_extract(scope_ids, '$.sessionId')
      ) WHERE json_extract(scope_ids, '$.sessionId') IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_capsules_opened_at ON capsules(opened_at DESC);
      CREATE INDEX IF NOT EXISTS idx_capsules_repo ON capsules(
        json_extract(scope_ids, '$.repoId')
      ) WHERE json_extract(scope_ids, '$.repoId') IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_capsule_observations_capsule ON capsule_observations(capsule_id, seq);
      CREATE INDEX IF NOT EXISTS idx_capsule_observations_observation ON capsule_observations(observation_id);

      CREATE INDEX IF NOT EXISTS idx_summaries_capsule ON summaries(capsule_id);
      CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_pins_expires_at ON pins(expires_at) WHERE expires_at IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_pins_target ON pins(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_pins_session ON pins(
        json_extract(scope_ids, '$.sessionId')
      ) WHERE json_extract(scope_ids, '$.sessionId') IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_pins_repo ON pins(
        json_extract(scope_ids, '$.repoId')
      ) WHERE json_extract(scope_ids, '$.repoId') IS NOT NULL;

      INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
      VALUES (3, '003_indexes', strftime('%s', 'now') * 1000);
    `);
  }
}

/**
 * Get or open the database connection (lazy initialization)
 */
export function ensureDb() {
  if (_db) return _db;

  ensureDir();
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');
  _db.pragma('synchronous = NORMAL');

  runMigrations(_db);
  return _db;
}

/**
 * Close the database connection and reset the singleton.
 * Safe to call multiple times; no-op if the DB is not open.
 */
export function closeDb() {
  if (_db) {
    try {
      _db.close();
    } finally {
      _db = null;
    }
  }
}

/**
 * Append an observation to the database.
 * If capsuleId is provided, also links it to the capsule.
 * Uses a transaction to ensure atomicity of the insert + capsule link.
 */
export function appendObservation(observation) {
  const db = ensureDb();
  const id = observation.id || randomUUID();
  const ts = observation.ts || Date.now();

  const insertObservationAndLink = db.transaction(() => {
    db.prepare(`
      INSERT INTO observations (id, kind, content, provenance, ts, scope_ids, redacted)
      VALUES (@id, @kind, @content, @provenance, @ts, @scopeIds, @redacted)
    `).run({
      id,
      kind: observation.kind,
      content: observation.content,
      provenance: JSON.stringify(observation.provenance || {}),
      ts,
      scopeIds: JSON.stringify(observation.scopeIds || {}),
      redacted: 0,
    });

    // Link to capsule if provided
    if (observation.capsuleId) {
      const seqResult = db.prepare(`
        SELECT COALESCE(MAX(seq), -1) + 1 as next_seq
        FROM capsule_observations WHERE capsule_id = ?
      `).get(observation.capsuleId);

      db.prepare(`
        INSERT INTO capsule_observations (capsule_id, observation_id, seq)
        VALUES (?, ?, ?)
      `).run(observation.capsuleId, id, seqResult.next_seq);
    }
  });

  insertObservationAndLink();

  return { id, ts, kind: observation.kind, content: observation.content };
}

/**
 * Sanitize a user query for FTS5 MATCH by wrapping each token in double
 * quotes so that special characters (AND, OR, NOT, *, ^, etc.) are treated
 * as literals rather than FTS5 operators.
 */
function sanitizeFtsQuery(raw) {
  // Split on whitespace, quote each token (escaping internal quotes), rejoin
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '""';
  return tokens.map(t => '"' + t.replace(/"/g, '""') + '"').join(' ');
}

/**
 * Search observations using FTS5
 */
export function searchObservations(query, limit = 20) {
  const db = ensureDb();
  const safeQuery = sanitizeFtsQuery(query);

  const rows = db.prepare(`
    SELECT o.id, o.kind, o.content, o.provenance, o.ts, o.scope_ids
    FROM observations_fts fts
    JOIN observations o ON o.rowid = fts.rowid
    WHERE observations_fts MATCH ?
    ORDER BY fts.rank
    LIMIT ?
  `).all(safeQuery, limit);

  return rows.map(row => ({
    id: row.id,
    kind: row.kind,
    content: row.content,
    provenance: JSON.parse(row.provenance),
    ts: row.ts,
    scopeIds: JSON.parse(row.scope_ids),
  }));
}

/**
 * Get observations by session
 */
export function getObservationsBySession(sessionId, limit = 50) {
  const db = ensureDb();

  const rows = db.prepare(`
    SELECT id, kind, content, provenance, ts, scope_ids
    FROM observations
    WHERE json_extract(scope_ids, '$.sessionId') = ?
    ORDER BY ts DESC
    LIMIT ?
  `).all(sessionId, limit);

  return rows.map(row => ({
    id: row.id,
    kind: row.kind,
    content: row.content,
    provenance: JSON.parse(row.provenance),
    ts: row.ts,
    scopeIds: JSON.parse(row.scope_ids),
  }));
}

/**
 * Open a new capsule
 */
export function openCapsule(options) {
  const db = ensureDb();
  const id = options.id || randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO capsules (id, type, intent, status, opened_at, scope_ids)
    VALUES (@id, @type, @intent, 'open', @openedAt, @scopeIds)
  `).run({
    id,
    type: options.type || 'session',
    intent: options.intent || 'Claude Code session',
    openedAt: now,
    scopeIds: JSON.stringify(options.scopeIds || {}),
  });

  return {
    id,
    type: options.type || 'session',
    intent: options.intent || 'Claude Code session',
    status: 'open',
    openedAt: now,
    scopeIds: options.scopeIds || {},
  };
}

/**
 * Close a capsule
 */
export function closeCapsule(capsuleId) {
  const db = ensureDb();

  db.prepare(`
    UPDATE capsules SET status = 'closed', closed_at = ? WHERE id = ? AND status = 'open'
  `).run(Date.now(), capsuleId);
}

/**
 * Safely parse scope_ids JSON, falling back to empty object on malformed data.
 */
function parseScopeIds(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Normalize a raw capsule row from SQLite to camelCase with parsed scopeIds.
 */
function normalizeCapsule(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    intent: row.intent,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    scopeIds: parseScopeIds(row.scope_ids),
  };
}

/**
 * Get open capsule for session
 */
export function getOpenCapsuleForSession(sessionId) {
  const db = ensureDb();

  const row = db.prepare(`
    SELECT id, type, intent, status, opened_at, closed_at, scope_ids
    FROM capsules
    WHERE status = 'open' AND json_extract(scope_ids, '$.sessionId') = ?
    ORDER BY opened_at DESC
    LIMIT 1
  `).get(sessionId);

  return normalizeCapsule(row);
}

/**
 * Get capsule by ID
 */
export function getCapsule(capsuleId) {
  const db = ensureDb();

  const row = db.prepare(`
    SELECT id, type, intent, status, opened_at, closed_at, scope_ids
    FROM capsules WHERE id = ?
  `).get(capsuleId);

  return normalizeCapsule(row);
}

/**
 * Get all capsules
 */
export function getAllCapsules() {
  const db = ensureDb();

  const rows = db.prepare(`
    SELECT id, type, intent, status, opened_at, closed_at, scope_ids
    FROM capsules ORDER BY opened_at DESC
  `).all();

  return rows.map(normalizeCapsule);
}

/**
 * Add a pin
 */
export function addPin(pin) {
  const db = ensureDb();
  const id = pin.id || randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO pins (id, target_type, target_id, reason, created_at, scope_ids)
    VALUES (@id, @targetType, @targetId, @reason, @createdAt, @scopeIds)
  `).run({
    id,
    targetType: pin.targetType || 'observation',
    targetId: pin.targetId,
    reason: pin.note || pin.reason || null,
    createdAt: now,
    scopeIds: JSON.stringify(pin.scopeIds || {}),
  });

  return { id, targetType: pin.targetType || 'observation', targetId: pin.targetId, note: pin.note, createdAt: now };
}

/**
 * Get all pins
 */
export function getPins() {
  const db = ensureDb();

  const rows = db.prepare(`
    SELECT id, target_type, target_id, reason, created_at, expires_at, scope_ids
    FROM pins
    WHERE expires_at IS NULL OR expires_at > ?
    ORDER BY created_at DESC
  `).all(Date.now());

  return rows.map(row => ({
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    note: row.reason,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * Remove a pin
 */
export function removePin(pinId) {
  const db = ensureDb();
  const result = db.prepare(`DELETE FROM pins WHERE id = ?`).run(pinId);
  return result.changes > 0;
}

/**
 * Get the most recent observation
 */
export function getLastObservation() {
  const db = ensureDb();

  const row = db.prepare(`
    SELECT id, kind, content, provenance, ts, scope_ids
    FROM observations
    ORDER BY ts DESC
    LIMIT 1
  `).get();

  if (!row) return null;

  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    provenance: JSON.parse(row.provenance),
    ts: row.ts,
    scopeIds: JSON.parse(row.scope_ids),
  };
}

/**
 * Get observation by ID
 */
export function getObservationById(observationId) {
  const db = ensureDb();

  const row = db.prepare(`
    SELECT id, kind, content, provenance, ts, scope_ids
    FROM observations WHERE id = ?
  `).get(observationId);

  if (!row) return null;

  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    provenance: JSON.parse(row.provenance),
    ts: row.ts,
    scopeIds: JSON.parse(row.scope_ids),
  };
}

/**
 * Get database stats
 */
export function getStats() {
  const db = ensureDb();

  const obsCount = db.prepare(`SELECT COUNT(*) as count FROM observations`).get().count;
  const capsuleCount = db.prepare(`SELECT COUNT(*) as count FROM capsules`).get().count;
  const openCapsules = db.prepare(`SELECT COUNT(*) as count FROM capsules WHERE status = 'open'`).get().count;
  const pinCount = db.prepare(`SELECT COUNT(*) as count FROM pins WHERE expires_at IS NULL OR expires_at > ?`).get(Date.now()).count;

  return {
    observationCount: obsCount,
    capsuleCount,
    openCapsules,
    pinCount,
    dbPath: DB_PATH,
  };
}
