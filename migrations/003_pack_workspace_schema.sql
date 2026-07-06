-- =====================================================
-- GTA Traffic 20J
-- Workspace-ready pack database schema
--
-- This prepares the app for future login/account support:
-- user -> workspace -> uploaded files -> packs -> vehicles.
--
-- Current app behavior uses workspace_id = 'default'.
-- =====================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  name TEXT NOT NULL DEFAULT 'Default Workspace',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO workspaces (
  id,
  owner_user_id,
  name,
  created_at,
  updated_at
)
VALUES (
  'default',
  NULL,
  'Default Workspace',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default',

  file_type TEXT NOT NULL,
  original_file_name TEXT,
  source_label TEXT,
  source_container TEXT,
  source_directory TEXT,
  source_path TEXT,

  storage_provider TEXT,
  storage_key TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  sha256 TEXT,

  record_count INTEGER NOT NULL DEFAULT 0,
  import_status TEXT NOT NULL DEFAULT 'current',
  raw_metadata_json TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_source_files_workspace
ON source_files(workspace_id);

CREATE INDEX IF NOT EXISTS idx_source_files_type
ON source_files(file_type);

CREATE INDEX IF NOT EXISTS idx_source_files_path
ON source_files(source_path);

CREATE TABLE IF NOT EXISTS pack_records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default',

  pack_key TEXT NOT NULL,
  name TEXT NOT NULL,
  creator TEXT,
  dlc_folder TEXT,
  version TEXT,
  website TEXT,
  notes TEXT,

  source_file_id TEXT,
  source_type TEXT,
  source_label TEXT,
  raw_pack_json TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY(source_file_id)
    REFERENCES source_files(id)
    ON DELETE SET NULL,

  UNIQUE(workspace_id, pack_key)
);

CREATE INDEX IF NOT EXISTS idx_pack_records_workspace
ON pack_records(workspace_id);

CREATE INDEX IF NOT EXISTS idx_pack_records_name
ON pack_records(name COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_pack_records_dlc_folder
ON pack_records(dlc_folder COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS vehicle_pack_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default',

  pack_id TEXT NOT NULL,
  model_name TEXT NOT NULL COLLATE NOCASE,
  relationship_type TEXT NOT NULL DEFAULT 'included',

  source_file_id TEXT,
  raw_membership_json TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY(pack_id)
    REFERENCES pack_records(id)
    ON DELETE CASCADE,

  FOREIGN KEY(source_file_id)
    REFERENCES source_files(id)
    ON DELETE SET NULL,

  UNIQUE(workspace_id, pack_id, model_name, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_pack_memberships_workspace
ON vehicle_pack_memberships(workspace_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_pack_memberships_model
ON vehicle_pack_memberships(model_name COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_vehicle_pack_memberships_pack
ON vehicle_pack_memberships(pack_id);
