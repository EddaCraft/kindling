-- Denormalize scope IDs from JSON blobs to real columns
-- Eliminates json_extract() in WHERE clauses for ~20-30% faster filtered queries

-- === observations ===
ALTER TABLE observations ADD COLUMN session_id TEXT;
ALTER TABLE observations ADD COLUMN repo_id TEXT;
ALTER TABLE observations ADD COLUMN agent_id TEXT;
ALTER TABLE observations ADD COLUMN user_id TEXT;

UPDATE observations SET
  session_id = json_extract(scope_ids, '$.sessionId'),
  repo_id    = json_extract(scope_ids, '$.repoId'),
  agent_id   = json_extract(scope_ids, '$.agentId'),
  user_id    = json_extract(scope_ids, '$.userId');

-- === capsules ===
ALTER TABLE capsules ADD COLUMN session_id TEXT;
ALTER TABLE capsules ADD COLUMN repo_id TEXT;
ALTER TABLE capsules ADD COLUMN agent_id TEXT;
ALTER TABLE capsules ADD COLUMN user_id TEXT;

UPDATE capsules SET
  session_id = json_extract(scope_ids, '$.sessionId'),
  repo_id    = json_extract(scope_ids, '$.repoId'),
  agent_id   = json_extract(scope_ids, '$.agentId'),
  user_id    = json_extract(scope_ids, '$.userId');

-- === pins ===
ALTER TABLE pins ADD COLUMN session_id TEXT;
ALTER TABLE pins ADD COLUMN repo_id TEXT;
ALTER TABLE pins ADD COLUMN agent_id TEXT;
ALTER TABLE pins ADD COLUMN user_id TEXT;

UPDATE pins SET
  session_id = json_extract(scope_ids, '$.sessionId'),
  repo_id    = json_extract(scope_ids, '$.repoId'),
  agent_id   = json_extract(scope_ids, '$.agentId'),
  user_id    = json_extract(scope_ids, '$.userId');

-- === New indexes on real columns ===

-- Observations: session + timestamp (replaces idx_observations_session_ts)
CREATE INDEX IF NOT EXISTS idx_obs_session_ts
ON observations(session_id, ts DESC)
WHERE session_id IS NOT NULL;

-- Observations: repo + timestamp (replaces idx_observations_repo_ts)
CREATE INDEX IF NOT EXISTS idx_obs_repo_ts
ON observations(repo_id, ts DESC)
WHERE repo_id IS NOT NULL;

-- Capsules: status + session (replaces idx_capsules_status_session)
CREATE INDEX IF NOT EXISTS idx_caps_status_session
ON capsules(status, session_id)
WHERE session_id IS NOT NULL;

-- Capsules: repo (replaces idx_capsules_repo)
CREATE INDEX IF NOT EXISTS idx_caps_repo
ON capsules(repo_id)
WHERE repo_id IS NOT NULL;

-- Pins: session (replaces idx_pins_session)
CREATE INDEX IF NOT EXISTS idx_pins_session_id
ON pins(session_id)
WHERE session_id IS NOT NULL;

-- Pins: repo (replaces idx_pins_repo)
CREATE INDEX IF NOT EXISTS idx_pins_repo_id
ON pins(repo_id)
WHERE repo_id IS NOT NULL;

-- Drop old json_extract indexes (they're now redundant and slow)
DROP INDEX IF EXISTS idx_observations_session_ts;
DROP INDEX IF EXISTS idx_observations_repo_ts;
DROP INDEX IF EXISTS idx_capsules_status_session;
DROP INDEX IF EXISTS idx_capsules_repo;
DROP INDEX IF EXISTS idx_pins_session;
DROP INDEX IF EXISTS idx_pins_repo;

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (4, '004_denormalize_scopes', strftime('%s', 'now') * 1000);
