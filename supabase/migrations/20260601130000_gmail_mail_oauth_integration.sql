-- Web Gmail OAuth (in-app "Connect Gmail") — stores encrypted refresh token server-side.
-- gmail-listener reads this row (service role) before falling back to GMAIL_OAUTH_* env secrets.
-- See docs/PROJECT.md §11 and supabase/.env.example (GMAIL_API_WEB_CLIENT_JSON, etc.).

CREATE TABLE IF NOT EXISTS gmail_mail_oauth_state (
  state         TEXT PRIMARY KEY,
  expires_at    TIMESTAMPTZ NOT NULL,
  return_origin TEXT NOT NULL,
  return_path   TEXT NOT NULL DEFAULT '/bookings',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE gmail_mail_oauth_state IS 'Short-lived CSRF state for Google OAuth redirect flow (google-mail-oauth-callback).';

CREATE TABLE IF NOT EXISTS gmail_mail_integration (
  id                      TEXT PRIMARY KEY DEFAULT 'default',
  refresh_token_encrypted TEXT,
  google_account_email    TEXT,
  connected_at            TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gmail_mail_integration_singleton CHECK (id = 'default')
);

COMMENT ON TABLE gmail_mail_integration IS 'Singleton Gmail API user-delegated credentials for gmail-listener (encrypted refresh token).';
COMMENT ON COLUMN gmail_mail_integration.refresh_token_encrypted IS 'AES-256-GCM ciphertext (base64url) of the OAuth refresh_token; requires GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY on Edge.';

ALTER TABLE gmail_mail_oauth_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_mail_integration ENABLE ROW LEVEL SECURITY;

-- No policies: deny PostgREST access for anon/authenticated; Edge Functions use service_role (bypasses RLS).

INSERT INTO gmail_mail_integration (id) VALUES ('default')
  ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_gmail_mail_integration_updated_at ON gmail_mail_integration;
CREATE TRIGGER update_gmail_mail_integration_updated_at
  BEFORE UPDATE ON gmail_mail_integration
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
