-- Friendlier default Finance Telegram reminder copy.

UPDATE public.telegram_finance_settings
SET default_reminder_template = E'Your {{label}} is due on {{due_date}} ({{days_until_due}} day(s) left).\n\nAmount: {{amount}} · {{category}}\n\nPlease pay at your earliest convenience.'
WHERE id = 1
  AND default_reminder_template IN (
    E'💰 Finance reminder\n\n{{label}}\nDue: {{due_date}} ({{days_until_due}} day(s) left)\nAmount: {{amount}}\nCategory: {{category}}\n\n{{notes}}',
    E'Reminder: {{label}} due {{due_date}} — {{amount}}'
  );
