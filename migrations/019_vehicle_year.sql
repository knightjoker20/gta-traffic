-- Add model year to vehicles so users can record and search by vehicle year
--
-- The vehicle_year column already exists in production (it was added
-- out-of-band before this migration file was tracked by wrangler, the same
-- situation found with migrations 006/011-017 earlier). SQLite has no
-- "ADD COLUMN IF NOT EXISTS", so the ALTER statement is left out here --
-- re-running this migration just needs to be a safe no-op / idempotent
-- index creation.
CREATE INDEX IF NOT EXISTS idx_vehicles_year
ON vehicles(vehicle_year);
