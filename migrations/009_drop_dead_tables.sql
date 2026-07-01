-- Migration 009: Drop unused tables
-- These four tables were created speculatively but have zero queries
-- in the Worker (src/index.js) and zero rows in production.
-- They are superseded by or replaced by newer tables.
--
-- Tables dropped:
--   source_files          → superseded by raw_meta_files + meta_file_model_refs
--   saved_project_files   → versioning feature never completed
--   media_assets          → never wired to any page or Worker route
--   import_jobs           → never wired to any page or Worker route
--
-- Tables kept (all actively queried):
--   workspaces, workspace_members, pack_records, vehicle_pack_memberships,
--   saved_projects, saved_project_versions,
--   vehicle_appearance_variations, vehicle_appearance_mod_kits,
--   vehicle_appearance_light_settings, admin_audit_log

PRAGMA foreign_keys = OFF;

-- Drop indexes first (SQLite requires this before dropping tables)
DROP INDEX IF EXISTS idx_source_files_workspace;
DROP INDEX IF EXISTS idx_source_files_type;
DROP INDEX IF EXISTS idx_source_files_path;
DROP INDEX IF EXISTS idx_saved_project_files_project;
DROP INDEX IF EXISTS idx_saved_project_files_version;
DROP INDEX IF EXISTS idx_saved_project_files_workspace;
DROP INDEX IF EXISTS idx_saved_project_files_role;

-- Drop the tables
DROP TABLE IF EXISTS saved_project_files;
DROP TABLE IF EXISTS source_files;
DROP TABLE IF EXISTS media_assets;
DROP TABLE IF EXISTS import_jobs;

PRAGMA foreign_keys = ON;
