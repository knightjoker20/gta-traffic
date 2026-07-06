-- 015_link_preview_cache.sql
-- Cache for gta5-mods.com OG meta tags fetched by the /api/link-preview Worker endpoint.
-- Keyed by URL, TTL enforced in application logic (7 days).

CREATE TABLE IF NOT EXISTS link_preview_cache (
  url           TEXT    PRIMARY KEY,
  og_title      TEXT,
  og_image      TEXT,
  og_description TEXT,
  cached_at     INTEGER NOT NULL DEFAULT (unixepoch())
);
