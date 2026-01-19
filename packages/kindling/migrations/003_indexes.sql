-- Indexes migration
-- Creates indexes for common query patterns

-- Observations indexes

-- Index for queries by timestamp (global time window)
CREATE INDEX IF NOT EXISTS idx_observations_ts
ON observations(ts DESC);

-- Index for queries by session + timestamp
CREATE INDEX IF NOT EXISTS idx_observations_session_ts
ON observations(
  json_extract(scope_ids, '$.sessionId'),
  ts DESC
) WHERE json_extract(scope_ids, '$.sessionId') IS NOT NULL;

-- Index for queries by repo + timestamp
CREATE INDEX IF NOT EXISTS idx_observations_repo_ts
ON observations(
  json_extract(scope_ids, '$.repoId'),
  ts DESC
) WHERE json_extract(scope_ids, '$.repoId') IS NOT NULL;

-- Index for queries by kind (for filtering)
CREATE INDEX IF NOT EXISTS idx_observations_kind
ON observations(kind);

-- Capsules indexes

-- Index for queries by status + session (find open capsule for session)
CREATE INDEX IF NOT EXISTS idx_capsules_status_session
ON capsules(
  status,
  json_extract(scope_ids, '$.sessionId')
) WHERE json_extract(scope_ids, '$.sessionId') IS NOT NULL;

-- Index for queries by opened_at (chronological listing)
CREATE INDEX IF NOT EXISTS idx_capsules_opened_at
ON capsules(opened_at DESC);

-- Index for queries by repo
CREATE INDEX IF NOT EXISTS idx_capsules_repo
ON capsules(
  json_extract(scope_ids, '$.repoId')
) WHERE json_extract(scope_ids, '$.repoId') IS NOT NULL;

-- Capsule-observations indexes

-- Index for efficient lookups of observations by capsule
CREATE INDEX IF NOT EXISTS idx_capsule_observations_capsule
ON capsule_observations(capsule_id, seq);

-- Index for efficient lookups of capsules by observation
CREATE INDEX IF NOT EXISTS idx_capsule_observations_observation
ON capsule_observations(observation_id);

-- Summaries indexes

-- Index for lookups by capsule_id (already unique, but helps with joins)
CREATE INDEX IF NOT EXISTS idx_summaries_capsule
ON summaries(capsule_id);

-- Index for queries by creation timestamp
CREATE INDEX IF NOT EXISTS idx_summaries_created_at
ON summaries(created_at DESC);

-- Pins indexes

-- Index for TTL-aware queries (active pins)
CREATE INDEX IF NOT EXISTS idx_pins_expires_at
ON pins(expires_at)
WHERE expires_at IS NOT NULL;

-- Index for queries by target
CREATE INDEX IF NOT EXISTS idx_pins_target
ON pins(target_type, target_id);

-- Index for queries by session
CREATE INDEX IF NOT EXISTS idx_pins_session
ON pins(
  json_extract(scope_ids, '$.sessionId')
) WHERE json_extract(scope_ids, '$.sessionId') IS NOT NULL;

-- Index for queries by repo
CREATE INDEX IF NOT EXISTS idx_pins_repo
ON pins(
  json_extract(scope_ids, '$.repoId')
) WHERE json_extract(scope_ids, '$.repoId') IS NOT NULL;

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (3, '003_indexes', strftime('%s', 'now') * 1000);
