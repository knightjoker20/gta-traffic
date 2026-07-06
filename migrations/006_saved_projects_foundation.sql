-- =====================================================
-- 006_saved_projects_foundation.sql
-- Cloud saved project foundation for GTA Traffic.
-- =====================================================

CREATE TABLE IF NOT EXISTS saved_projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,

  project_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'active',
  pinned INTEGER NOT NULL DEFAULT 0,

  source_file_id TEXT,
  current_version_id TEXT,

  last_opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (source_file_id) REFERENCES source_files(id)
);

CREATE INDEX IF NOT EXISTS idx_saved_projects_workspace
ON saved_projects(workspace_id);

CREATE INDEX IF NOT EXISTS idx_saved_projects_owner
ON saved_projects(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_saved_projects_type
ON saved_projects(project_type);

CREATE INDEX IF NOT EXISTS idx_saved_projects_status
ON saved_projects(status);

CREATE INDEX IF NOT EXISTS idx_saved_projects_updated
ON saved_projects(updated_at);


CREATE TABLE IF NOT EXISTS saved_project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,

  version_number INTEGER NOT NULL DEFAULT 1,
  label TEXT,

  payload_json TEXT NOT NULL DEFAULT '{}',
  summary_json TEXT,

  file_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES saved_projects(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),

  UNIQUE(project_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_saved_project_versions_project
ON saved_project_versions(project_id);

CREATE INDEX IF NOT EXISTS idx_saved_project_versions_workspace
ON saved_project_versions(workspace_id);

CREATE INDEX IF NOT EXISTS idx_saved_project_versions_created
ON saved_project_versions(created_at);


CREATE TABLE IF NOT EXISTS saved_project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_id TEXT,
  workspace_id TEXT NOT NULL,

  file_role TEXT NOT NULL,
  original_file_name TEXT,
  source_type TEXT,

  content_kind TEXT NOT NULL DEFAULT 'inline_text',
  content_text TEXT,
  r2_key TEXT,

  size_bytes INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES saved_projects(id),
  FOREIGN KEY (version_id) REFERENCES saved_project_versions(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX IF NOT EXISTS idx_saved_project_files_project
ON saved_project_files(project_id);

CREATE INDEX IF NOT EXISTS idx_saved_project_files_version
ON saved_project_files(version_id);

CREATE INDEX IF NOT EXISTS idx_saved_project_files_workspace
ON saved_project_files(workspace_id);

CREATE INDEX IF NOT EXISTS idx_saved_project_files_role
ON saved_project_files(file_role);
