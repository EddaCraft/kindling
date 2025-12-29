-- Migration 002: Full-text search tables
-- Creates FTS5 virtual tables for observation and summary content search

-- FTS table for observations
CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
  id UNINDEXED,
  content,
  kind UNINDEXED,
  content='observations',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync with observations table
CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
  INSERT INTO observations_fts(rowid, id, content, kind)
  SELECT rowid, id, content, kind FROM observations WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
  DELETE FROM observations_fts WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
  DELETE FROM observations_fts WHERE rowid = OLD.rowid;
  INSERT INTO observations_fts(rowid, id, content, kind)
  SELECT rowid, id, content, kind FROM observations WHERE id = NEW.id;
END;

-- FTS table for summaries
CREATE VIRTUAL TABLE IF NOT EXISTS summaries_fts USING fts5(
  id UNINDEXED,
  content,
  content='summaries',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync with summaries table
CREATE TRIGGER IF NOT EXISTS summaries_ai AFTER INSERT ON summaries BEGIN
  INSERT INTO summaries_fts(rowid, id, content)
  SELECT rowid, id, content FROM summaries WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS summaries_ad AFTER DELETE ON summaries BEGIN
  DELETE FROM summaries_fts WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER IF NOT EXISTS summaries_au AFTER UPDATE ON summaries BEGIN
  DELETE FROM summaries_fts WHERE rowid = OLD.rowid;
  INSERT INTO summaries_fts(rowid, id, content)
  SELECT rowid, id, content FROM summaries WHERE id = NEW.id;
END;

-- Record this migration
INSERT INTO schema_migrations (version, applied_at, description)
VALUES (2, strftime('%s', 'now') * 1000, 'Full-text search tables');
