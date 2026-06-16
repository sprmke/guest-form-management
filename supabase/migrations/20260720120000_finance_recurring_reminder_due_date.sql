-- Recurring finance reminders: each materialized occurrence is due on its own transaction date.
-- Fixes duplicate Telegram bursts when every row in a series shared one telegram_due_date.

UPDATE public.finance_line_items
SET telegram_due_date = occurred_on
WHERE recurrence_series_id IS NOT NULL
  AND telegram_reminder_enabled = TRUE
  AND COALESCE(telegram_due_date::text, '') IS DISTINCT FROM occurred_on::text;

COMMENT ON COLUMN public.finance_line_items.telegram_due_date IS
  'Reminder due date; NULL uses occurred_on. For recurring rows, each occurrence should match occurred_on unless scope=this override.';
