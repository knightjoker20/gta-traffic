-- Step 22C: User, admin, media, and import foundation
-- Purpose:
-- Create the database structure needed for future user accounts,
-- profile/workspace saves, admin permissions, image/photo pack metadata,
-- import jobs, and audit logging.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'free_user',
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_plan
ON users(plan);

CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
ON workspace_members(user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
ON workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_role
ON workspace_members(role);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_label TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
ON admin_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_user_id
ON admin_audit_log(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity
ON admin_audit_log(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  model_name TEXT,
  source_pack_id TEXT,
  r2_key TEXT NOT NULL,
  public_url TEXT,
  image_type TEXT NOT NULL DEFAULT 'screenshot',
  title TEXT,
  alt_text TEXT,
  tags_json TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  uploaded_by_user_id TEXT,
  approved_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_assets_workspace_id
ON media_assets(workspace_id);

CREATE INDEX IF NOT EXISTS idx_media_assets_model_name
ON media_assets(model_name);

CREATE INDEX IF NOT EXISTS idx_media_assets_source_pack_id
ON media_assets(source_pack_id);

CREATE INDEX IF NOT EXISTS idx_media_assets_status
ON media_assets(status);

CREATE INDEX IF NOT EXISTS idx_media_assets_primary
ON media_assets(model_name, is_primary);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  source_type TEXT NOT NULL,
  source_label TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  records_found INTEGER NOT NULL DEFAULT 0,
  records_imported INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  warnings_json TEXT,
  result_json TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_workspace_id
ON import_jobs(workspace_id);

CREATE INDEX IF NOT EXISTS idx_import_jobs_status
ON import_jobs(status);

CREATE INDEX IF NOT EXISTS idx_import_jobs_source_type
ON import_jobs(source_type);

CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at
ON import_jobs(created_at);
