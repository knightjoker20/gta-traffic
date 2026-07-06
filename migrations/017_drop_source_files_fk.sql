-- =====================================================
-- 017_drop_source_files_fk.sql
-- Remove the dangling FOREIGN KEY reference to source_files
-- from saved_projects. source_files was dropped in migration 009
-- but the FK constraint was left in place, causing every INSERT
-- into saved_projects to fail with:
--   D1_ERROR: no such table: main.source_files
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

DROP TABLE saved_projects;

ALTER TABLE saved_projects_new RENAME TO saved_projects;

CREATE INDEX IF NOT EXISTS idx_saved_projects_workspace  ON saved_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_projects_owner      ON saved_projects(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_projects_type       ON saved_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_saved_projects_status     ON saved_projects(status);
CREATE INDEX IF NOT EXISTS idx_saved_projects_updated    ON saved_projects(updated_at);

PRAGMA foreign_keys = ON;
