-- =====================================================
-- 017_drop_source_files_fk.sql
-- Remove the dangling FOREIGN KEY reference to source_files
-- from saved_projects. source_files was dropped in migration 009
-- but the FK constraint was left in place, causing every INSERT
-- into saved_projects (with a non-null source_file_id) to fail with:
--   D1_ERROR: no such table: main.source_files
--
-- saved_project_versions.project_id has its own foreign key pointing
-- at saved_projects, so it has to be rebuilt in step with it — you
-- can't drop a table that another table's live foreign key still
-- points at. Order below: build both replacement tables and copy all
-- data into them *before* dropping anything old, so nothing is ever
-- destroyed until it's already safely copied forward. The new child
-- table points at saved_projects_new (not saved_projects) so the old
-- saved_projects table has zero live references by the time it's
-- dropped; the final rename lets SQLite rewrite that foreign key to
-- point at the real "saved_projects" name automatically.
-- =====================================================

PRAGMA foreign_keys = OFF;

CREATE TABLE saved_projects_new (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,

  project_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'active',
  pinned INTEGER NOT NULL DEFAULT 0,

  source_file_id TEXT,          -- kept for data compat, FK removed
  current_version_id TEXT,

  last_opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
  -- source_file_id FK intentionally omitted (source_files table dropped in 009)
);

INSERT INTO saved_projects_new SELECT * FROM saved_projects;

CREATE TABLE saved_project_versions_new (
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

  FOREIGN KEY (project_id) REFERENCES saved_projects_new(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),

  UNIQUE(project_id, version_number)
);

INSERT INTO saved_project_versions_new SELECT * FROM saved_project_versions;

-- Nothing references the old tables by name anymore at this point, so
-- these drops are safe regardless of whether FK enforcement is honored.
DROP TABLE saved_project_versions;
DROP TABLE saved_projects;

ALTER TABLE saved_projects_new RENAME TO saved_projects;
ALTER TABLE saved_project_versions_new RENAME TO saved_project_versions;

CREATE INDEX IF NOT EXISTS idx_saved_projects_workspace  ON saved_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_projects_owner      ON saved_projects(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_projects_type       ON saved_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_saved_projects_status     ON saved_projects(status);
CREATE INDEX IF NOT EXISTS idx_saved_projects_updated    ON saved_projects(updated_at);

CREATE INDEX IF NOT EXISTS idx_saved_project_versions_project   ON saved_project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_saved_project_versions_workspace ON saved_project_versions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_project_versions_created   ON saved_project_versions(created_at);

PRAGMA foreign_keys = ON;
