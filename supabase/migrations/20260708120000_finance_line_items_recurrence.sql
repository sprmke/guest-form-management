-- Recurring operating transactions (materialized occurrences per date).
-- Remote already recorded 20260601120000 as gmail_mail_oauth_integration; this
-- catch-up migration applies the same recurrence DDL for hosted projects.

ALTER TABLE finance_line_items
  ADD COLUMN IF NOT EXISTS recurrence_series_id UUID,
  ADD COLUMN IF NOT EXISTS recurrence_interval TEXT
    CHECK (
      recurrence_interval IS NULL
      OR recurrence_interval IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
    );

CREATE INDEX IF NOT EXISTS idx_finance_line_items_recurrence_series
  ON finance_line_items (recurrence_series_id)
  WHERE recurrence_series_id IS NOT NULL;

COMMENT ON COLUMN finance_line_items.recurrence_series_id IS
  'Shared id for materialized occurrences of the same recurring transaction.';
COMMENT ON COLUMN finance_line_items.recurrence_interval IS
  'daily | weekly | monthly | quarterly | yearly; NULL for one-off lines.';
