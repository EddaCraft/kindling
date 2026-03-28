-- Set PRAGMA user_version so any SQLite client (including the Rust crate)
-- can discover the schema version with a single read:
--   PRAGMA user_version;
--
-- Convention: user_version tracks the latest migration number.
-- Each future migration MUST include: PRAGMA user_version = <N>;

PRAGMA user_version = 5;

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
VALUES (5, '005_pragma_user_version', strftime('%s', 'now') * 1000);
