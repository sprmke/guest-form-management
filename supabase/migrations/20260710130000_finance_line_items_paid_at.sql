-- Mark operating transactions paid (stops "until paid" Telegram reminders).

ALTER TABLE public.finance_line_items
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.finance_line_items.paid_at IS
  'When set, finance Telegram reminders stop (especially until_paid interval).';

ALTER TABLE public.finance_line_items
  DROP CONSTRAINT IF EXISTS finance_line_items_telegram_reminder_interval_check;

ALTER TABLE public.finance_line_items
  ADD CONSTRAINT finance_line_items_telegram_reminder_interval_check
  CHECK (
    telegram_reminder_interval IN ('once', 'daily', 'weekly', 'until_paid')
  );

COMMENT ON COLUMN public.finance_line_items.telegram_reminder_interval IS
  'once | daily | weekly | until_paid (daily until marked paid, including after due date).';
