/**
 * Bundled migrations for sql.js
 *
 * Since sql.js runs in browser environments without filesystem access,
 * migrations are bundled as strings rather than read from files.
 */

/**
 * Migration definition
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * 001_init - Initial schema
 */
const MIGRATION_001_INIT = `
-- Initial schema migration
-- Creates core tables for observations, capsules, summaries, and pins

-- Schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);

-- Observations table
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN (
    'tool_call',
    'command',
    'file_diff',
    'error',
    'message',
    'node_start',
    'node_end',
    'node_output',
    'node_error'
  )),
  content TEXT NOT NULL,
  provenance TEXT NOT NULL DEFAULT '{}',
  ts INTEGER NOT NULL,
  scope_ids TEXT NOT NULL DEFAULT '{}',
  redacted INTEGER NOT NULL DEFAULT 0 CHECK(redacted IN (0, 1))
);

-- Capsules table
CREATE TABLE IF NOT EXISTS capsules (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('session', 'pocketflow_node', 'custom')),
  intent TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open', 'closed')) DEFAULT 'open',
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  scope_ids TEXT NOT NULL DEFAULT '{}'
);

-- Capsule-observation relationship table (many-to-many with ordering)
CREATE TABLE IF NOT EXISTS capsule_observations (
  capsule_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  PRIMARY KEY (capsule_id, observation_id),
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE,
  FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
);

-- Summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),
  created_at INTEGER NOT NULL,
  evidence_refs TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE
);

-- Pins table
CREATE TABLE IF NOT EXISTS pins (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK(target_type IN ('observation', 'summary')),
  target_id TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  scope_ids TEXT NOT NULL DEFAULT '{}'
);

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (1, '001_init', strftime('%s', 'now') * 1000);
`;

/**
 * 002_fts - Full-text search indexes
 */
const MIGRATION_002_FTS = `
-- Full-text search indexes migration
-- Creates FTS5 virtual tables for observations and summaries

-- FTS table for observations content
CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
  content,
  content='observations',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

-- Populate FTS table with existing observations
INSERT INTO observations_fts(rowid, content)
SELECT rowid, content FROM observations WHERE redacted = 0;

-- Trigger to keep FTS in sync on INSERT
CREATE TRIGGER IF NOT EXISTS observations_fts_insert
AFTER INSERT ON observations
WHEN NEW.redacted = 0
BEGIN
  INSERT INTO observations_fts(rowid, content)
  VALUES (NEW.rowid, NEW.content);
END;

-- Trigger to keep FTS in sync on UPDATE
CREATE TRIGGER IF NOT EXISTS observations_fts_update
AFTER UPDATE ON observations
BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
  INSERT INTO observations_fts(rowid, content)
  SELECT NEW.rowid, NEW.content WHERE NEW.redacted = 0;
END;

-- Trigger to keep FTS in sync on DELETE
CREATE TRIGGER IF NOT EXISTS observations_fts_delete
AFTER DELETE ON observations
BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
END;

-- FTS table for summaries content
CREATE VIRTUAL TABLE IF NOT EXISTS summaries_fts USING fts5(
  content,
  content='summaries',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

-- Populate FTS table with existing summaries
INSERT INTO summaries_fts(rowid, content)
SELECT rowid, content FROM summaries;

-- Trigger to keep FTS in sync on INSERT
CREATE TRIGGER IF NOT EXISTS summaries_fts_insert
AFTER INSERT ON summaries
BEGIN
  INSERT INTO summaries_fts(rowid, content)
  VALUES (NEW.rowid, NEW.content);
END;

-- Trigger to keep FTS in sync on UPDATE
CREATE TRIGGER IF NOT EXISTS summaries_fts_update
AFTER UPDATE ON summaries
BEGIN
  INSERT INTO summaries_fts(summaries_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
  INSERT INTO summaries_fts(rowid, content)
  VALUES (NEW.rowid, NEW.content);
END;

-- Trigger to keep FTS in sync on DELETE
CREATE TRIGGER IF NOT EXISTS summaries_fts_delete
AFTER DELETE ON summaries
BEGIN
  INSERT INTO summaries_fts(summaries_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
END;

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (2, '002_fts', strftime('%s', 'now') * 1000);
`;

/**
 * 003_indexes - Performance indexes
 */
const MIGRATION_003_INDEXES = `
-- Indexes migration
-- Creates indexes for common query patterns

-- Observations indexes
CREATE INDEX IF NOT EXISTS idx_observations_ts
ON observations(ts DESC);

CREATE INDEX IF NOT EXISTS idx_observations_session_ts
ON observations(
  json_extract(scope_ids, '$.sessionId'),
  ts DESC
) WHERE json_extract(scope_ids, '$.sessionId') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_observations_repo_ts
ON observations(
  json_extract(scope_ids, '$.repoId'),
  ts DESC
) WHERE json_extract(scope_ids, '$.repoId') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_observations_kind
ON observations(kind);

-- Capsules indexes
CREATE INDEX IF NOT EXISTS idx_capsules_status_session
ON capsules(
  status,
  json_extract(scope_ids, '$.sessionId')
) WHERE json_extract(scope_ids, '$.sessionId') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_capsules_opened_at
ON capsules(opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_capsules_repo
ON capsules(
  json_extract(scope_ids, '$.repoId')
) WHERE json_extract(scope_ids, '$.repoId') IS NOT NULL;

-- Capsule-observations indexes
CREATE INDEX IF NOT EXISTS idx_capsule_observations_capsule
ON capsule_observations(capsule_id, seq);

CREATE INDEX IF NOT EXISTS idx_capsule_observations_observation
ON capsule_observations(observation_id);

-- Summaries indexes
CREATE INDEX IF NOT EXISTS idx_summaries_capsule
ON summaries(capsule_id);

CREATE INDEX IF NOT EXISTS idx_summaries_created_at
ON summaries(created_at DESC);

-- Pins indexes
CREATE INDEX IF NOT EXISTS idx_pins_expires_at
ON pins(expires_at)
WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pins_target
ON pins(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_pins_session
ON pins(
  json_extract(scope_ids, '$.sessionId')
) WHERE json_extract(scope_ids, '$.sessionId') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pins_repo
ON pins(
  json_extract(scope_ids, '$.repoId')
) WHERE json_extract(scope_ids, '$.repoId') IS NOT NULL;

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (3, '003_indexes', strftime('%s', 'now') * 1000);
`;

/**
 * Get all available migrations
 */
export function getMigrations(): Migration[] {
  return [
    {
      version: 1,
      name: '001_init',
      sql: MIGRATION_001_INIT,
    },
    {
      version: 2,
      name: '002_fts',
      sql: MIGRATION_002_FTS,
    },
    {
      version: 3,
      name: '003_indexes',
      sql: MIGRATION_003_INDEXES,
    },
  ];
}
