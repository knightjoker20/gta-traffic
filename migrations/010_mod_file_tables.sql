-- Migration 010: Mod file import tables
-- Stores parsed data from vehicles.meta, handling.meta,
-- popgroups.ymt.xml, and popcycle.dat uploads.
-- The cross-reference chain:
--   popcycle_slots.veh_groups JSON -> popgroup_members.group_name
--   popgroup_members.model_name   -> vehicle_meta_entries.model_name
--   vehicle_meta_entries.handling_id -> handling_meta_entries.handling_name

-- ── vehicles.meta entries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_meta_entries (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id                      TEXT    NOT NULL DEFAULT 'default',
  model_name                   TEXT    NOT NULL,
  handling_id                  TEXT,
  game_name                    TEXT,
  make_name                    TEXT,
  audio_name_hash              TEXT,
  layout                       TEXT,
  vehicle_type                 TEXT,
  vehicle_class                TEXT,
  wheel_type                   TEXT,
  frequency                    INTEGER,
  max_num                      INTEGER,
  flags                        TEXT,
  swankness                    TEXT,
  max_num_same_color           INTEGER,
  identical_model_spawn_dist   REAL,
  default_body_health          REAL,
  source_file                  TEXT,
  raw_xml                      TEXT,
  imported_at                  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pack_id, model_name)
);

CREATE INDEX IF NOT EXISTS idx_vme_model     ON vehicle_meta_entries(model_name);
CREATE INDEX IF NOT EXISTS idx_vme_handling  ON vehicle_meta_entries(handling_id);
CREATE INDEX IF NOT EXISTS idx_vme_class     ON vehicle_meta_entries(vehicle_class);
CREATE INDEX IF NOT EXISTS idx_vme_pack      ON vehicle_meta_entries(pack_id);

-- ── handling.meta entries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handling_meta_entries (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id                      TEXT    NOT NULL DEFAULT 'default',
  handling_name                TEXT    NOT NULL,
  mass                         REAL,
  initial_drag_coeff           REAL,
  percent_submerged            REAL,
  drive_bias_front             REAL,
  initial_drive_gears          INTEGER,
  initial_drive_force          REAL,
  drive_inertia                REAL,
  initial_drive_max_flat_vel   REAL,
  brake_force                  REAL,
  brake_bias_front             REAL,
  hand_brake_force             REAL,
  steering_lock                REAL,
  traction_curve_max           REAL,
  traction_curve_min           REAL,
  traction_curve_lateral       REAL,
  traction_bias_front          REAL,
  traction_loss_mult           REAL,
  suspension_force             REAL,
  suspension_comp_damp         REAL,
  suspension_rebound_damp      REAL,
  suspension_upper_limit       REAL,
  suspension_lower_limit       REAL,
  suspension_raise             REAL,
  suspension_bias_front        REAL,
  anti_roll_bar_force          REAL,
  collision_damage_mult        REAL,
  weapon_damage_mult           REAL,
  deformation_damage_mult      REAL,
  engine_damage_mult           REAL,
  petrol_tank_volume           REAL,
  monetary_value               INTEGER,
  model_flags                  TEXT,
  handling_flags               TEXT,
  damage_flags                 TEXT,
  ai_handling                  TEXT,
  source_file                  TEXT,
  raw_xml                      TEXT,
  imported_at                  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pack_id, handling_name)
);

CREATE INDEX IF NOT EXISTS idx_hme_name  ON handling_meta_entries(handling_name);
CREATE INDEX IF NOT EXISTS idx_hme_pack  ON handling_meta_entries(pack_id);

-- ── popgroup members (pedGroups + vehGroups) ───────────────────────
-- One row per (group, model) pair. group_type = 'ped' | 'veh'
CREATE TABLE IF NOT EXISTS popgroup_members (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id      TEXT    NOT NULL DEFAULT 'default',
  group_type   TEXT    NOT NULL CHECK(group_type IN ('ped','veh')),
  group_name   TEXT    NOT NULL,
  model_name   TEXT    NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  flags        TEXT,
  source_file  TEXT,
  imported_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pgm_group      ON popgroup_members(pack_id, group_type, group_name);
CREATE INDEX IF NOT EXISTS idx_pgm_model      ON popgroup_members(pack_id, model_name);
CREATE INDEX IF NOT EXISTS idx_pgm_veh_model  ON popgroup_members(model_name) WHERE group_type = 'veh';

-- ── popcycle slots ──────────────────────────────────────────────────
-- One row per (zone, day_type, hour_slot).
-- hour_slot: 0=midnight, 1=2am, 2=4am … 11=10pm
-- ped_groups / veh_groups: JSON arrays [{group, weight}, ...]
CREATE TABLE IF NOT EXISTS popcycle_slots (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id                    TEXT    NOT NULL DEFAULT 'default',
  zone                       TEXT    NOT NULL,
  day_type                   TEXT    NOT NULL CHECK(day_type IN ('weekday','weekend')),
  hour_slot                  INTEGER NOT NULL CHECK(hour_slot BETWEEN 0 AND 11),
  max_peds                   INTEGER,
  max_scenario_peds          INTEGER,
  max_cars                   INTEGER,
  max_parked_cars            INTEGER,
  max_low_parked_cars        INTEGER,
  pct_cop_cars               INTEGER,
  pct_cop_peds               INTEGER,
  max_scen_ped_models        INTEGER,
  max_scen_veh_models        INTEGER,
  max_pre_assigned_parked    INTEGER,
  ped_groups                 TEXT,  -- JSON: [{group, weight}, ...]
  veh_groups                 TEXT,  -- JSON: [{group, weight}, ...]
  source_file                TEXT,
  imported_at                TEXT   NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pack_id, zone, day_type, hour_slot)
);

CREATE INDEX IF NOT EXISTS idx_pcs_zone   ON popcycle_slots(pack_id, zone);
CREATE INDEX IF NOT EXISTS idx_pcs_slot   ON popcycle_slots(pack_id, zone, day_type, hour_slot);
