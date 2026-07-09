-- Migration 021: Pro (premium) tier interest signups
-- Collects interest from visitors clicking "Upgrade to Pro" / the pricing
-- page form, since there is no live checkout/subscription flow yet.
-- Internal identifiers stay "premium" (matches users.plan/role and
-- requirePremium()) even though the user-facing brand name is "Pro".

CREATE TABLE IF NOT EXISTS premium_interest_signups (
  id         TEXT NOT NULL PRIMARY KEY,
  email      TEXT NOT NULL,
  note       TEXT,
  user_id    TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_premium_interest_signups_created_at
  ON premium_interest_signups(created_at);
