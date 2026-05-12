-- Labeled line items for SD settlement (expenses / profits). Keeps NUMERIC[] columns
-- in sync for sheets and legacy readers; JSONB is the source of truth for labels.

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS sd_additional_expense_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sd_additional_profit_items JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN guest_submissions.sd_additional_expense_items IS
  'JSON array of {label, amount} for additional SD expenses. Amounts mirror sd_additional_expenses.';
COMMENT ON COLUMN guest_submissions.sd_additional_profit_items IS
  'JSON array of {label, amount} for additional SD profits. Amounts mirror sd_additional_profits.';

-- Backfill from legacy arrays (empty labels)
UPDATE guest_submissions gs
SET sd_additional_expense_items = sub.items
FROM (
  SELECT
    id,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('label', '', 'amount', round(x::numeric, 2)))
        FROM unnest(sd_additional_expenses) AS x
      ),
      '[]'::jsonb
    ) AS items
  FROM guest_submissions
  WHERE cardinality(sd_additional_expenses) > 0
) sub
WHERE gs.id = sub.id;

UPDATE guest_submissions gs
SET sd_additional_profit_items = sub.items
FROM (
  SELECT
    id,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('label', '', 'amount', round(x::numeric, 2)))
        FROM unnest(sd_additional_profits) AS x
      ),
      '[]'::jsonb
    ) AS items
  FROM guest_submissions
  WHERE cardinality(sd_additional_profits) > 0
) sub
WHERE gs.id = sub.id;
