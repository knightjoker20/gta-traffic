-- Add model year to vehicles so users can record and search by vehicle year
ALTER TABLE vehicles ADD COLUMN vehicle_year TEXT;

CREATE INDEX IF NOT EXISTS idx_vehicles_year
ON vehicles(vehicle_year);
