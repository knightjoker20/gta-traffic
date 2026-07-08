-- Per-user handling.meta field edits.
--
-- handling_profiles is keyed by handling_name and stores the full profile as
-- a JSON blob (handling_data_json), not individual columns — many vehicles
-- share the same handling_name (e.g. several add-ons reuse "SPORTS"), so a
-- personal edit here is scoped to the handling profile itself, not to a
-- single vehicle. That matches how handling.meta actually works in-game:
-- editing a shared handling entry affects every vehicle that references it.
--
-- Vanilla handling_profiles rows are never modified by this table — edits
-- are deltas that merge in at read time, same pattern as vehicle_field_edits.

CREATE TABLE IF NOT EXISTS handling_field_edits (
  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,
  handling_name TEXT NOT NULL COLLATE NOCASE,
  field_name TEXT NOT NULL,

  vanilla_value TEXT,
  edited_value TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  UNIQUE(user_id, handling_name, field_name)
);

CREATE INDEX IF NOT EXISTS idx_handling_field_edits_user
  ON handling_field_edits(user_id);

CREATE INDEX IF NOT EXISTS idx_handling_field_edits_lookup
  ON handling_field_edits(user_id, handling_name);
