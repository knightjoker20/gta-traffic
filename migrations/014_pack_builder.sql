-- =====================================================
-- 014_pack_builder.sql
-- Custom vehicle pack builder for premium users.
--
-- Tables:
--   packs              — a named OIV pack project owned by a user
--   pack_vehicles      — vehicles included in a pack, with model-file readiness flags
--   vehicle_meta_files — per-user parsed meta XML blocks for each vehicle
--                        (vehicles.meta, handling.meta, carcols.meta, carvariations.meta)
--                        stored once per vehicle, reusable across multiple packs
-- =====================================================

-- -------------------------------------------------
-- packs
-- One row per pack project. Premium users only.
-- dlc_name becomes the in-game folder:
--   update/x64/dlcpacks/[dlc_name]/dlc.rpf
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS packs (
  id            TEXT    NOT NULL PRIMARY KEY,
  owner_user_id TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name          TEXT    NOT NULL,            -- display name e.g. "My SP Traffic Pack"
  dlc_name      TEXT    NOT NULL,            -- path-safe slug e.g. "mytrafficpack"
                                             -- enforced: lowercase, a-z0-9 and _ only

  description   TEXT,
  version       TEXT    NOT NULL DEFAULT '1.0',
  author_name   TEXT,

  -- draft     = in progress, not all vehicles have full meta + model files
  -- ready     = all vehicles validated, ready to export
  -- exported  = OIV has been generated at least once
  status        TEXT    NOT NULL DEFAULT 'draft'
                CHECK(status IN ('draft', 'ready', 'exported')),

  created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_packs_owner
  ON packs(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_packs_status
  ON packs(status);

-- Each user's dlc_name must be unique so they can't create two packs
-- that would collide on the same game folder path.
CREATE UNIQUE INDEX IF NOT EXISTS idx_packs_owner_dlc_name
  ON packs(owner_user_id, dlc_name);


-- -------------------------------------------------
-- pack_vehicles
-- Ordered list of vehicles in a pack.
-- has_yft / has_yft_hi / has_ytd are user-confirmed
-- flags set when they drop the model files in the
-- browser during export assembly.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS pack_vehicles (
  id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  pack_id       TEXT    NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  vehicle_id    TEXT    NOT NULL,            -- model_name (lowercase), FK-spirit to vehicles

  sort_order    INTEGER NOT NULL DEFAULT 0,

  -- Set to 1 as user drops model files into the export drop zone
  has_yft       INTEGER NOT NULL DEFAULT 0,
  has_yft_hi    INTEGER NOT NULL DEFAULT 0,
  has_ytd       INTEGER NOT NULL DEFAULT 0,

  added_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(pack_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_vehicles_pack
  ON pack_vehicles(pack_id);

CREATE INDEX IF NOT EXISTS idx_pack_vehicles_vehicle
  ON pack_vehicles(vehicle_id);


-- -------------------------------------------------
-- vehicle_meta_files
-- Stores the parsed <Item> XML block per vehicle per
-- meta file type, scoped to the uploading user.
-- A vehicle's meta only needs to be uploaded once;
-- the same record is used across any pack that contains
-- that vehicle.
--
-- meta_type values:
--   'vehicles'      → vehicles.meta    <Item> block
--   'handling'      → handling.meta    <Item> block
--   'carcols'       → carcols.meta     <Item> block (Kits section)
--   'carvariations' → carvariations.meta <Item> block
--
-- kit_name stores the ORIGINAL kit name found in the
-- uploaded carcols/carvariations XML (often "0_default_modkit").
-- The merge engine renames it to avoid collisions across vehicles.
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_meta_files (
  id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  vehicle_id    TEXT    NOT NULL,            -- model_name (lowercase)
  owner_user_id TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  meta_type     TEXT    NOT NULL
                CHECK(meta_type IN ('vehicles', 'handling', 'carcols', 'carvariations')),

  -- Full extracted XML block(s) for this vehicle from the meta file.
  -- For vehicles.meta this is the <Item> inside <InitDatas>.
  -- For handling.meta this is the <Item type="CHandlingData"> (or subtype).
  -- For carcols.meta this is the <Item> inside <Kits>.
  -- For carvariations.meta this is the <Item> inside <variationData>.
  raw_xml       TEXT    NOT NULL,

  -- Key fields extracted from raw_xml as JSON for fast display/validation
  -- without re-parsing the XML on every request.
  -- vehicles:      { modelName, txdName, handlingId, vehicleClass }
  -- handling:      { handlingName, fMass, fInitialDragCoeff, type }
  -- carcols:       { kitName }
  -- carvariations: { modelName, kitName }
  parsed_json   TEXT,

  -- Original kit name as found in the uploaded XML.
  -- Stored here so the merge engine knows what to rename.
  -- Null for meta_type 'vehicles' and 'handling'.
  kit_name      TEXT,

  -- ok      = parsed cleanly, no issues
  -- warning = parsed but has non-fatal issues (see warnings)
  -- error   = failed validation, cannot be used in a pack
  status        TEXT    NOT NULL DEFAULT 'ok'
                CHECK(status IN ('ok', 'warning', 'error')),

  -- JSON array of human-readable warning/error strings shown in the UI.
  -- e.g. ["Missing handlingId field", "Kit name is generic: 0_default_modkit"]
  warnings      TEXT,

  uploaded_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- One meta block per vehicle per user per type.
  -- Re-uploading replaces the existing record.
  UNIQUE(vehicle_id, owner_user_id, meta_type)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_meta_files_vehicle
  ON vehicle_meta_files(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_meta_files_owner
  ON vehicle_meta_files(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_meta_files_type
  ON vehicle_meta_files(meta_type);
