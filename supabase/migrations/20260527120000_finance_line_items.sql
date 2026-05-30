-- Property-wide operating expenses and income (not tied to a booking).

CREATE TABLE IF NOT EXISTS finance_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  label         TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  category      TEXT,
  occurred_on   DATE NOT NULL,
  notes         TEXT,
  receipt_path  TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_line_items_occurred_on
  ON finance_line_items (occurred_on DESC);

COMMENT ON TABLE finance_line_items IS
  'Property-wide finance lines (rent, utilities, etc.) — admin-only via edge functions.';
COMMENT ON COLUMN finance_line_items.kind IS 'expense | income';
COMMENT ON COLUMN finance_line_items.occurred_on IS 'Manila calendar date for reporting period filters.';

ALTER TABLE finance_line_items ENABLE ROW LEVEL SECURITY;

-- No policies: anon/authenticated cannot access; service role via edge functions only.
