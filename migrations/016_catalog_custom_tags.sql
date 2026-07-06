-- 016_catalog_custom_tags.sql
-- Per-user custom tags for the mod catalog page.
-- vehicle_key matches the key used in mod-catalog.js (URL or make|model|year|trim).

CREATE TABLE IF NOT EXISTS catalog_custom_tags (
  id           TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT    NOT NULL,
  vehicle_key  TEXT    NOT NULL,
  tag          TEXT    NOT NULL,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, vehicle_key, tag)
);

CREATE INDEX IF NOT EXISTS idx_catalog_custom_tags_user
  ON catalog_custom_tags(user_id);
