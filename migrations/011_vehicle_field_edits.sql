-- Migration 011: Per-user vehicle field edits
-- Lets a logged-in user customize individual vehicles.meta fields on a
-- vehicle without touching the shared vanilla row in `vehicles`. Only the
-- fields that actually differ from vanilla get a row here — this is a
-- sparse delta layer, not a per-user copy of the whole vehicle.
--
-- Read flow: merge `vehicles` (vanilla) with this user's matching rows.
-- Restore flow: delete the override row(s); the vanilla row was never touched.
-- This also doubles as the source data for the future personal pack
-- builder (vanilla + this user's edits, filtered to their installed set).

CREATE TABLE IF NOT EXISTS vehicle_field_edits (
  id             TEXT    PRIMARY KEY,
  user_id        TEXT    NOT NULL,
  model_name     TEXT    NOT NULL COLLATE NOCASE,

  field_name     TEXT    NOT NULL,
  vanilla_value  TEXT,
  edited_value   TEXT    NOT NULL,

  created_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(user_id, model_name, field_name)
);

CREATE INDEX IF NOT EXISTS idx_vfe_user
  ON vehicle_field_edits(user_id);

CREATE INDEX IF NOT EXISTS idx_vfe_user_model
  ON vehicle_field_edits(user_id, model_name);
