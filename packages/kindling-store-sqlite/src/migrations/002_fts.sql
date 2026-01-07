-- Full-text search tables for observations and summaries
-- Uses SQLite FTS5 for fast content search

-- FTS table for observations
CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
  id UNINDEXED,
  kind,
  content,
  provenance,
  content='observations',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

-- Triggers to keep FTS in sync with observations table
CREATE TRIGGER IF NOT EXISTS observations_fts_insert AFTER INSERT ON observations
WHEN NEW.redacted = 0
BEGIN
  INSERT INTO observations_fts(rowid, id, kind, content, provenance)
  VALUES (NEW.rowid, NEW.id, NEW.kind, NEW.content, NEW.provenance);
END;

CREATE TRIGGER IF NOT EXISTS observations_fts_update AFTER UPDATE ON observations
BEGIN
  DELETE FROM observations_fts WHERE rowid = OLD.rowid;
  INSERT INTO observations_fts(rowid, id, kind, content, provenance)
  SELECT NEW.rowid, NEW.id, NEW.kind, NEW.content, NEW.provenance
  WHERE NEW.redacted = 0;
END;

CREATE TRIGGER IF NOT EXISTS observations_fts_delete AFTER DELETE ON observations
BEGIN
  DELETE FROM observations_fts WHERE rowid = OLD.rowid;
END;

-- FTS table for summaries (optional but recommended for phase 1)
CREATE VIRTUAL TABLE IF NOT EXISTS summaries_fts USING fts5(
  id UNINDEXED,
  content,
  content='summaries',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

-- Triggers to keep summaries FTS in sync
CREATE TRIGGER IF NOT EXISTS summaries_fts_insert AFTER INSERT ON summaries
BEGIN
  INSERT INTO summaries_fts(rowid, id, content)
  VALUES (NEW.rowid, NEW.id, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS summaries_fts_update AFTER UPDATE ON summaries
BEGIN
  DELETE FROM summaries_fts WHERE rowid = OLD.rowid;
  INSERT INTO summaries_fts(rowid, id, content)
  VALUES (NEW.rowid, NEW.id, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS summaries_fts_delete AFTER DELETE ON summaries
BEGIN
  DELETE FROM summaries_fts WHERE rowid = OLD.rowid;
END;
