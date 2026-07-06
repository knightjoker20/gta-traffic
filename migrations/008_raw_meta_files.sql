-- Migration 008: Raw Meta File Storage
-- Stores raw GTA meta files (vehicles.meta, handling.meta, etc.) in R2,
-- with D1 used as the index/lookup layer. Any tool on the site can
-- retrieve a pack's full file by model name or pack name.

CREATE TABLE IF NOT EXISTS raw_meta_files (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  file_type        TEXT NOT NULL,   -- 'vehicles-meta' | 'handling-meta' | 'carcols-meta' | etc.
  pack_name        TEXT NOT NULL,   -- user-facing pack label, e.g. 'greenaid' or 'charger69'
  r2_key           TEXT NOT NULL,   -- full R2 object key, e.g. 'meta-files/vehicles-meta/greenaid'
  original_filename TEXT,           -- 'vehicles.meta'
  entry_count      INTEGER DEFAULT 0,
  entry_names_json TEXT,            -- JSON array of model/handling names in the file
  uploaded_at      TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now')),
  UNIQUE(file_type, pack_name)
);

-- Maps every individual model/handling name → its pack file record.
-- Allows lookup by model name without knowing the pack name.
CREATE TABLE IF NOT EXISTS meta_file_model_refs (
  model_name  TEXT NOT NULL,
  file_type   TEXT NOT NULL,  -- matches raw_meta_files.file_type
  pack_name   TEXT NOT NULL,  -- matches raw_meta_files.pack_name
  PRIMARY KEY (model_name, file_type)
);

CREATE INDEX IF NOT EXISTS idx_meta_file_model_refs_pack
  ON meta_file_model_refs(file_type, pack_name);
