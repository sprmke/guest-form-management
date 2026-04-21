-- Phase 0 — processed_emails: Gmail listener idempotency ledger.
-- One row per Gmail message the listener has seen. Survives across deploys, supersedes the
-- in-memory ring buffer used by pay-credit-cards (src/gmail-poll-new-soa.ts).
-- See docs/NEW_FLOW_PLAN.md §3.4 and .cursor/skills/gmail-listener/SKILL.md.

CREATE TABLE IF NOT EXISTS processed_emails (
  message_id   TEXT PRIMARY KEY,
  thread_id    TEXT,
  kind         TEXT NOT NULL CHECK (kind IN ('gaf', 'pet')),
  status       TEXT NOT NULL CHECK (status IN ('applied', 'skipped', 'failed')),
  reason       TEXT,
  booking_id   UUID REFERENCES guest_submissions(id) ON DELETE SET NULL,
  subject      TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  processed_emails             IS 'Durable idempotency ledger for the Gmail listener. One row per Gmail message.id.';
COMMENT ON COLUMN processed_emails.message_id  IS 'Gmail message id (primary key — prevents double-apply on history replay).';
COMMENT ON COLUMN processed_emails.thread_id   IS 'Gmail thread id (for grouping + debugging).';
COMMENT ON COLUMN processed_emails.kind        IS 'Azure approval category: gaf or pet.';
COMMENT ON COLUMN processed_emails.status      IS 'applied = we ran the transition; skipped = intentional no-op (e.g. no match); failed = error (see reason).';
COMMENT ON COLUMN processed_emails.reason      IS 'Human-readable reason for skipped/failed (e.g. ambiguous_multiple_bookings).';
COMMENT ON COLUMN processed_emails.booking_id  IS 'Matched booking id when we successfully applied. NULL for skipped/failed or when match was ambiguous.';
COMMENT ON COLUMN processed_emails.subject     IS 'Message subject for debugging (redact PII if ever exposed in logs).';

CREATE INDEX IF NOT EXISTS idx_processed_emails_booking_id   ON processed_emails(booking_id);
CREATE INDEX IF NOT EXISTS idx_processed_emails_status       ON processed_emails(status);
CREATE INDEX IF NOT EXISTS idx_processed_emails_processed_at ON processed_emails(processed_at DESC);
