
PRAGMA foreign_keys = ON;

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL COLLATE NOCASE UNIQUE,

  game_name TEXT,
  display_name TEXT,
  make_name TEXT,
  vehicle_class TEXT,
  vehicle_type TEXT,

  handling_id TEXT,
  audio_name TEXT,
  layout_name TEXT,

  frequency INTEGER,
  max_num INTEGER,
  max_num_of_same_color INTEGER,
  identical_model_spawn_distance INTEGER,
  swankness TEXT,

  installed INTEGER NOT NULL DEFAULT 0,
  favorite INTEGER NOT NULL DEFAULT 0,

  installation_type TEXT,
  replacement_slot TEXT,
  game_version TEXT,
  installed_dlc_folder TEXT,
  install_date TEXT,

  rockstar_dlc TEXT,
  source_pack TEXT,
  download_url TEXT,

  yft_path TEXT,
  hi_yft_path TEXT,
  ytd_path TEXT,
  vehicles_meta_path TEXT,
  handling_meta_path TEXT,

  tags_json TEXT,
  notes TEXT,
  raw_record_json TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicles_handling_id
  ON vehicles(handling_id);

CREATE INDEX idx_vehicles_installed
  ON vehicles(installed);

CREATE INDEX idx_vehicles_favorite
  ON vehicles(favorite);

CREATE INDEX idx_vehicles_class
  ON vehicles(vehicle_class);


CREATE TABLE handling_profiles (
  id TEXT PRIMARY KEY,
  handling_name TEXT NOT NULL COLLATE NOCASE UNIQUE,

  ai_handling TEXT,
  source_file TEXT,

  handling_data_json TEXT,
  raw_xml TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_handling_profiles_name
  ON handling_profiles(handling_name);


CREATE TABLE vehicle_popgroups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  vehicle_id TEXT NOT NULL,
  popgroup_name TEXT NOT NULL,
  source_file TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(vehicle_id)
    REFERENCES vehicles(id)
    ON DELETE CASCADE,

  UNIQUE(vehicle_id, popgroup_name)
);

CREATE INDEX idx_vehicle_popgroups_vehicle
  ON vehicle_popgroups(vehicle_id);

CREATE INDEX idx_vehicle_popgroups_name
  ON vehicle_popgroups(popgroup_name);


CREATE TABLE vehicle_images (
  id TEXT PRIMARY KEY,

  vehicle_id TEXT NOT NULL,
  model_name TEXT NOT NULL COLLATE NOCASE,

  r2_key TEXT NOT NULL UNIQUE,
  thumbnail_r2_key TEXT,

  original_filename TEXT,
  mime_type TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,

  is_primary INTEGER NOT NULL DEFAULT 0,
  caption TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(vehicle_id)
    REFERENCES vehicles(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_vehicle_images_vehicle
  ON vehicle_images(vehicle_id);

CREATE INDEX idx_vehicle_images_model
  ON vehicle_images(model_name);

CREATE INDEX idx_vehicle_images_primary
  ON vehicle_images(vehicle_id, is_primary);