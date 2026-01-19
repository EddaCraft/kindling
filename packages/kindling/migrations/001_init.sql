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
  provenance TEXT NOT NULL DEFAULT '{}', -- JSON blob
  ts INTEGER NOT NULL,
  scope_ids TEXT NOT NULL DEFAULT '{}', -- JSON blob
  redacted INTEGER NOT NULL DEFAULT 0 CHECK(redacted IN (0, 1))
);

-- Capsules table
CREATE TABLE IF NOT EXISTS capsules (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('session', 'pocketflow_node')),
  intent TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open', 'closed')) DEFAULT 'open',
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  scope_ids TEXT NOT NULL DEFAULT '{}' -- JSON blob
);

-- Capsule-observation relationship table (many-to-many with ordering)
CREATE TABLE IF NOT EXISTS capsule_observations (
  capsule_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  seq INTEGER NOT NULL, -- Ordering within capsule
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
  evidence_refs TEXT NOT NULL DEFAULT '[]', -- JSON array of observation IDs
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
  scope_ids TEXT NOT NULL DEFAULT '{}' -- JSON blob
);

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (1, '001_init', strftime('%s', 'now') * 1000);
