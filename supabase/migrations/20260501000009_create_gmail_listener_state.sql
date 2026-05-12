-- Phase 0 — gmail_listener_state: single-row cursor for incremental Gmail history polling.
-- Mirrors the local JSON "watch state" file used by automated-tasks/pay-credit-cards
-- (src/gmail-history.ts), but persisted in Postgres so Supabase Edge Functions are stateless.
-- See docs/NEW_FLOW_PLAN.md §3.4 and .cursor/skills/gmail-listener/SKILL.md.

CREATE TABLE IF NOT EXISTS gmail_listener_state (
  id               TEXT PRIMARY KEY DEFAULT 'default',
  history_id       TEXT,
  email_address    TEXT,
  last_poll_at     TIMESTAMPTZ,
  last_poll_status TEXT CHECK (last_poll_status IN ('ok', 'retry', 'error')),
  last_poll_error  TEXT,
  messages_seen    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gmail_listener_state_singleton CHECK (id = 'default')
);

COMMENT ON TABLE  gmail_listener_state                  IS 'Single-row cursor for the Gmail listener. Stores last-seen historyId + health metadata.';
COMMENT ON COLUMN gmail_listener_state.history_id       IS 'Last successfully processed Gmail historyId. NULL on first run; listener must seed via users.getProfile().';
COMMENT ON COLUMN gmail_listener_state.email_address    IS 'Mailbox being watched (e.g. kamehome.azurenorth@gmail.com). Defensive: re-seed historyId if this changes.';
COMMENT ON COLUMN gmail_listener_state.last_poll_at     IS 'Wall-clock time of the most recent poll attempt.';
COMMENT ON COLUMN gmail_listener_state.last_poll_status IS 'ok | retry (transient 429/5xx) | error (persistent; admin intervention likely needed).';
COMMENT ON COLUMN gmail_listener_state.last_poll_error  IS 'Short error text when last_poll_status != ok.';
COMMENT ON COLUMN gmail_listener_state.messages_seen    IS 'Running counter for observability.';

-- Reuse the existing updated_at trigger function created in 20250213043908.
DROP TRIGGER IF EXISTS update_gmail_listener_state_updated_at ON gmail_listener_state;
CREATE TRIGGER update_gmail_listener_state_updated_at
  BEFORE UPDATE ON gmail_listener_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed the singleton row so UPSERT flows in the listener never have to INSERT first.
INSERT INTO gmail_listener_state (id) VALUES ('default')
  ON CONFLICT (id) DO NOTHING;
