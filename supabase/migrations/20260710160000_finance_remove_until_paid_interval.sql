-- Reminders stop when paid_at is set; remove until_paid interval option.

UPDATE finance_line_items
SET telegram_reminder_interval = 'daily_noon'
WHERE telegram_reminder_interval = 'until_paid';

ALTER TABLE finance_line_items
  DROP CONSTRAINT IF EXISTS finance_line_items_telegram_reminder_interval_check;

ALTER TABLE finance_line_items
  ADD CONSTRAINT finance_line_items_telegram_reminder_interval_check
  CHECK (
    telegram_reminder_interval IN (
      'hourly',
      'every_2_hours',
      'every_4_hours',
      'every_12_hours',
      'daily_noon'
    )
  );

COMMENT ON COLUMN finance_line_items.telegram_reminder_interval IS
  'hourly | every_2_hours | every_4_hours | every_12_hours | daily_noon. Reminders stop when paid_at is set.';

COMMENT ON COLUMN finance_line_items.paid_at IS
  'When set, finance Telegram reminders stop for every reminder interval.';
