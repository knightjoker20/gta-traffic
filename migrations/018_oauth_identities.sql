-- Google (and future OAuth provider) sign-in.
--
-- Kept as a separate table rather than columns on `users` so a user can have
-- zero, one, or several linked providers (e.g. password + Google later, or
-- Google + GitHub down the road) without schema changes. Linking is by
-- verified email: if a Google sign-in's email matches an existing user, the
-- identity attaches to that account instead of creating a duplicate.

CREATE TABLE IF NOT EXISTS user_oauth_identities (
  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_identities_user_id
ON user_oauth_identities(user_id);
