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
  -- Remove old entry (FTS5 external content tables require special delete syntax)
  INSERT INTO observations_fts(observations_fts, rowid, content) VALUES('delete', OLD.rowid, OLD.content);
  -- Add new entry only if not redacted
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
