CREATE TABLE IF NOT EXISTS user_auth_credentials (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algorithm TEXT NOT NULL DEFAULT 'PBKDF2-SHA256',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_auth_credentials_email
ON user_auth_credentials(email);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_hint TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
ON user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash
ON user_sessions(session_token_hash);

CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
ON user_sessions(expires_at);
