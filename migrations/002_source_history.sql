CREATE TABLE IF NOT EXISTS source_history (
  id TEXT PRIMARY KEY,

  source_type TEXT NOT NULL,
  source_label TEXT,
  source_container TEXT,
  source_directory TEXT,
  source_path TEXT NOT NULL,
  original_file_name TEXT,

  record_count INTEGER DEFAULT 0,
  import_mode TEXT,
  imported_at TEXT DEFAULT CURRENT_TIMESTAMP,

  status TEXT DEFAULT 'current',
  notes TEXT,

  raw_import_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_history_type
ON source_history(source_type);

CREATE INDEX IF NOT EXISTS idx_source_history_path
ON source_history(source_path);

CREATE INDEX IF NOT EXISTS idx_source_history_imported_at
ON source_history(imported_at);
