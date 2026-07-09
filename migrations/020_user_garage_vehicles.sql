-- Migration 020: Per-user addon/mod vehicle garage
--
-- Vanilla Rockstar vehicles (see the vanilla_vehicles reference table from
-- migration 013) are always visible to everyone, logged in or not. Addon/mod
-- vehicles are only visible to the account that added them to their garage --
-- this table is what makes that "FLI = vanilla + your own addon garage" tier
-- rule possible without needing to duplicate vehicle rows per user.
--
-- A garage entry is just a pointer: the underlying vehicles row (parsed
-- vehicles.meta data) stays a single shared, deduplicated record; multiple
-- users can each have their own garage entry pointing at the same vehicle.

CREATE TABLE IF NOT EXISTS user_garage_vehicles (
  id         TEXT NOT NULL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  added_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  UNIQUE (user_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_user_garage_vehicles_user
  ON user_garage_vehicles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_garage_vehicles_vehicle
  ON user_garage_vehicles(vehicle_id);
