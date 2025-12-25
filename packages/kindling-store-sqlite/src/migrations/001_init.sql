-- Initial schema for Kindling SQLite store
-- Creates core tables for observations, capsules, summaries, and pins

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Observations: raw captured events and data
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,  -- tool_call, command, file_diff, error, message, etc.
  content TEXT,        -- the observation payload
  provenance TEXT,     -- JSON metadata: tool name, command, paths, stack trace, etc.
  ts_ms INTEGER NOT NULL,  -- millisecond timestamp
  session_id TEXT,     -- session scope (if applicable)
  repo_id TEXT,        -- repository scope (if applicable)
  agent_id TEXT,       -- agent scope (if applicable)
  user_id TEXT,        -- user scope (if applicable)
  redacted INTEGER NOT NULL DEFAULT 0,  -- 0=visible, 1=redacted
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Capsules: bounded units of meaning (sessions, workflow nodes)
CREATE TABLE IF NOT EXISTS capsules (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,       -- session, pocketflow_node, etc.
  intent TEXT,              -- general, debug, implement, etc.
  status TEXT NOT NULL DEFAULT 'open',  -- open, closed
  session_id TEXT,
  repo_id TEXT,
  agent_id TEXT,
  user_id TEXT,
  opened_at_ms INTEGER NOT NULL,
  closed_at_ms INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Join table: observations attached to capsules
CREATE TABLE IF NOT EXISTS capsule_observations (
  capsule_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  seq INTEGER NOT NULL,  -- deterministic ordering within capsule
  PRIMARY KEY (capsule_id, observation_id),
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE CASCADE,
  FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
);

-- Summaries: generated context about capsules or observation groups
CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  capsule_id TEXT,  -- which capsule this summarizes (nullable for non-capsule summaries)
  content TEXT NOT NULL,
  confidence REAL,  -- optional confidence score (0.0-1.0)
  evidence_refs TEXT,  -- JSON array of observation IDs
  ts_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (capsule_id) REFERENCES capsules(id) ON DELETE SET NULL
);

-- Pins: user-pinned content for high-priority retrieval
CREATE TABLE IF NOT EXISTS pins (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,  -- observation, summary, capsule
  target_id TEXT NOT NULL,
  note TEXT,  -- optional user note
  ttl_ms INTEGER,  -- optional TTL in milliseconds (NULL = no expiry)
  pinned_at_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for efficient scope + time queries
CREATE INDEX IF NOT EXISTS idx_observations_session_ts ON observations(session_id, ts_ms DESC);
CREATE INDEX IF NOT EXISTS idx_observations_repo_ts ON observations(repo_id, ts_ms DESC);
CREATE INDEX IF NOT EXISTS idx_observations_agent_ts ON observations(agent_id, ts_ms DESC);
CREATE INDEX IF NOT EXISTS idx_observations_user_ts ON observations(user_id, ts_ms DESC);
CREATE INDEX IF NOT EXISTS idx_observations_ts ON observations(ts_ms DESC);
CREATE INDEX IF NOT EXISTS idx_observations_kind ON observations(kind);

CREATE INDEX IF NOT EXISTS idx_capsules_session_ts ON capsules(session_id, opened_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_capsules_repo_ts ON capsules(repo_id, opened_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_capsules_status ON capsules(status);

CREATE INDEX IF NOT EXISTS idx_capsule_observations_capsule ON capsule_observations(capsule_id, seq);
CREATE INDEX IF NOT EXISTS idx_capsule_observations_observation ON capsule_observations(observation_id);

CREATE INDEX IF NOT EXISTS idx_summaries_capsule ON summaries(capsule_id);
CREATE INDEX IF NOT EXISTS idx_summaries_ts ON summaries(ts_ms DESC);

CREATE INDEX IF NOT EXISTS idx_pins_target ON pins(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_pins_ttl ON pins(ttl_ms) WHERE ttl_ms IS NOT NULL;
