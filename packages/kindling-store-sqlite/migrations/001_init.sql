-- Migration 001: Initial schema
-- Creates core tables for observations, capsules, summaries, and pins

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT NOT NULL
);

-- Observations table
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN (
    'tool_call', 'command', 'file_diff', 'error', 'message',
    'node_start', 'node_end', 'node_output', 'node_error'
  )),
  content TEXT NOT NULL,
  provenance TEXT NOT NULL, -- JSON blob
  ts INTEGER NOT NULL,
  session_id TEXT,
  repo_id TEXT,
  agent_id TEXT,
  user_id TEXT,
  redacted INTEGER NOT NULL DEFAULT 0 CHECK(redacted IN (0, 1))
);

-- Indexes for observation queries
CREATE INDEX IF NOT EXISTS idx_observations_session_ts ON observations(session_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_observations_repo_ts ON observations(repo_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_observations_agent_ts ON observations(agent_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_observations_user_ts ON observations(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_observations_ts ON observations(ts DESC);
CREATE INDEX IF NOT EXISTS idx_observations_kind ON observations(kind);

-- Capsules table
CREATE TABLE IF NOT EXISTS capsules (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('session', 'pocketflow_node')),
  intent TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  session_id TEXT,
  repo_id TEXT,
  agent_id TEXT,
  user_id TEXT,
  summary_id TEXT
);

-- Indexes for capsule queries
CREATE INDEX IF NOT EXISTS idx_capsules_session_status ON capsules(session_id, status);
CREATE INDEX IF NOT EXISTS idx_capsules_repo_status ON capsules(repo_id, status);
CREATE INDEX IF NOT EXISTS idx_capsules_status ON capsules(status);
CREATE INDEX IF NOT EXISTS idx_capsules_opened_at ON capsules(opened_at DESC);

-- Junction table for capsule-observation relationships
CREATE TABLE IF NOT EXISTS capsule_observations (
  capsule_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  position INTEGER NOT NULL, -- Deterministic ordering
  PRIMARY KEY (capsule_id, observation_id),
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE,
  FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
);

-- Index for efficient capsule observation retrieval
CREATE INDEX IF NOT EXISTS idx_capsule_observations_capsule ON capsule_observations(capsule_id, position);
CREATE INDEX IF NOT EXISTS idx_capsule_observations_observation ON capsule_observations(observation_id);

-- Summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE
);

-- Index for summary queries
CREATE INDEX IF NOT EXISTS idx_summaries_capsule ON summaries(capsule_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);

-- Summary evidence references (many-to-many)
CREATE TABLE IF NOT EXISTS summary_evidence (
  summary_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  PRIMARY KEY (summary_id, observation_id),
  FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE,
  FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_summary_evidence_summary ON summary_evidence(summary_id);
CREATE INDEX IF NOT EXISTS idx_summary_evidence_observation ON summary_evidence(observation_id);

-- Pins table
CREATE TABLE IF NOT EXISTS pins (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK(target_type IN ('observation', 'summary')),
  target_id TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER, -- NULL = no expiration
  session_id TEXT,
  repo_id TEXT,
  agent_id TEXT,
  user_id TEXT
);

-- Indexes for pin queries
CREATE INDEX IF NOT EXISTS idx_pins_session ON pins(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pins_repo ON pins(repo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pins_expires_at ON pins(expires_at);
CREATE INDEX IF NOT EXISTS idx_pins_target ON pins(target_type, target_id);

-- Record this migration
INSERT INTO schema_migrations (version, applied_at, description)
VALUES (1, strftime('%s', 'now') * 1000, 'Initial schema');
