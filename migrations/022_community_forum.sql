-- =====================================================
-- 022_community_forum.sql
-- Community forum: threads, posts, file attachments
-- =====================================================

CREATE TABLE IF NOT EXISTS community_threads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT    NOT NULL,
  author_name   TEXT    NOT NULL DEFAULT '',
  author_plan   TEXT    NOT NULL DEFAULT 'free',
  category      TEXT    NOT NULL DEFAULT 'general',  -- builds|help|tips|bugs|general
  title         TEXT    NOT NULL,
  body          TEXT    NOT NULL,
  is_pinned     INTEGER NOT NULL DEFAULT 0,
  is_locked     INTEGER NOT NULL DEFAULT 0,
  reply_count   INTEGER NOT NULL DEFAULT 0,
  view_count    INTEGER NOT NULL DEFAULT 0,
  file_count    INTEGER NOT NULL DEFAULT 0,
  last_reply_at TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS community_posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id   INTEGER NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
  user_id     TEXT    NOT NULL,
  author_name TEXT    NOT NULL DEFAULT '',
  author_plan TEXT    NOT NULL DEFAULT 'free',
  body        TEXT    NOT NULL,
  file_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS community_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id   INTEGER REFERENCES community_threads(id) ON DELETE CASCADE,
  post_id     INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     TEXT    NOT NULL,
  filename    TEXT    NOT NULL,
  r2_key      TEXT    NOT NULL UNIQUE,
  file_size   INTEGER,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comm_threads_category  ON community_threads(category);
CREATE INDEX IF NOT EXISTS idx_comm_threads_created   ON community_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_threads_user      ON community_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_posts_thread      ON community_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_comm_files_thread      ON community_files(thread_id);
CREATE INDEX IF NOT EXISTS idx_comm_files_post        ON community_files(post_id);
