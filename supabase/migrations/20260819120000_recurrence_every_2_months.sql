-- Allow every_2_months recurrence on finance + maintenance line items.

ALTER TABLE public.finance_line_items
  DROP CONSTRAINT IF EXISTS finance_line_items_recurrence_interval_check;

ALTER TABLE public.finance_line_items
  ADD CONSTRAINT finance_line_items_recurrence_interval_check
  CHECK (
    recurrence_interval IS NULL
    OR recurrence_interval IN (
      'daily',
      'weekly',
      'monthly',
      'every_2_months',
      'quarterly',
      'yearly'
    )
  );

COMMENT ON COLUMN public.finance_line_items.recurrence_interval IS
  'daily | weekly | monthly | every_2_months | quarterly | yearly; NULL for one-off lines.';

ALTER TABLE public.maintenance_items
  DROP CONSTRAINT IF EXISTS maintenance_items_recurrence_interval_check;

ALTER TABLE public.maintenance_items
  ADD CONSTRAINT maintenance_items_recurrence_interval_check
  CHECK (
    recurrence_interval IS NULL
    OR recurrence_interval IN (
      'daily',
      'weekly',
      'monthly',
      'every_2_months',
      'quarterly',
      'yearly'
    )
  );
