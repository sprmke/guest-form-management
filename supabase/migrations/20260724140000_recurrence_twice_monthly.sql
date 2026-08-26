-- Allow twice_monthly recurrence on finance + maintenance line items.

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
      'twice_monthly',
      'every_2_months',
      'quarterly',
      'yearly'
    )
  );

COMMENT ON COLUMN public.finance_line_items.recurrence_interval IS
  'daily | weekly | monthly | twice_monthly | every_2_months | quarterly | yearly; NULL for one-off lines.';

-- Guard: on a fresh `db reset`, this migration runs before the maintenance
-- module (20260818120000) creates public.maintenance_items. The final
-- maintenance constraint is set by the last migration that touches the table,
-- so skipping here when the table is absent is safe and idempotent.
DO $$
BEGIN
  IF to_regclass('public.maintenance_items') IS NOT NULL THEN
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
          'twice_monthly',
          'every_2_months',
          'quarterly',
          'yearly'
        )
      );
  END IF;
END $$;
