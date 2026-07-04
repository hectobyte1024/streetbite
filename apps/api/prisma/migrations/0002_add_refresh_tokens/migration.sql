CREATE TABLE refresh_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  device_id text NOT NULL,
  expires_at timestamp(3) NOT NULL,
  revoked_at timestamp(3),
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX refresh_tokens_user_id_revoked_at_idx ON refresh_tokens(user_id, revoked_at);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens(expires_at);
