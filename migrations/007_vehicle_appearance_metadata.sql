CREATE TABLE IF NOT EXISTS vehicle_appearance_variations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  model_name TEXT NOT NULL,
  source_file_name TEXT,
  source_label TEXT,
  dlc_folder TEXT,
  colors_json TEXT,
  kits_json TEXT,
  livery_count INTEGER DEFAULT 0,
  enabled_liveries_json TEXT,
  plate_probabilities_json TEXT,
  light_settings TEXT,
  siren_settings TEXT,
  raw_variation_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, model_name)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_appearance_variations_model
ON vehicle_appearance_variations(model_name);

CREATE INDEX IF NOT EXISTS idx_vehicle_appearance_variations_workspace_model
ON vehicle_appearance_variations(workspace_id, model_name);

CREATE TABLE IF NOT EXISTS vehicle_appearance_mod_kits (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  kit_name TEXT NOT NULL,
  kit_id TEXT,
  kit_type TEXT,
  source_file_name TEXT,
  source_label TEXT,
  stat_mod_count INTEGER DEFAULT 0,
  stat_mod_types_json TEXT,
  visible_mod_count INTEGER DEFAULT 0,
  linked_mod_count INTEGER DEFAULT 0,
  raw_kit_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, kit_name)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_appearance_mod_kits_workspace_kit
ON vehicle_appearance_mod_kits(workspace_id, kit_name);

CREATE TABLE IF NOT EXISTS vehicle_appearance_light_settings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  light_id TEXT NOT NULL,
  name TEXT,
  source_file_name TEXT,
  source_label TEXT,
  head_light_texture TEXT,
  head_light_color TEXT,
  tail_light_color TEXT,
  indicator_color TEXT,
  raw_light_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, light_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_appearance_light_settings_workspace_light
ON vehicle_appearance_light_settings(workspace_id, light_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_appearance_light_settings_name
ON vehicle_appearance_light_settings(name);
