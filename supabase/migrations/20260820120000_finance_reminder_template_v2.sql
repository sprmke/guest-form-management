-- Align Finance default Telegram reminder template with Maintenance layout.

UPDATE public.telegram_finance_settings
SET default_reminder_template = E'💰 Finance Reminder\n\n{{label}}\nDue: {{due_date}} ({{days_until_due}} day(s) left)\nAmount: {{amount}} · {{category}}\n\n{{notes}}'
WHERE id = 1
  AND default_reminder_template IN (
    E'Your {{label}} is due on {{due_date}} ({{days_until_due}} day(s) left).\n\nAmount: {{amount}} · {{category}}\n\nPlease pay at your earliest convenience.',
    E'💰 Finance reminder\n\n{{label}}\nDue: {{due_date}} ({{days_until_due}} day(s) left)\nAmount: {{amount}}\nCategory: {{category}}\n\n{{notes}}',
    E'Reminder: {{label}} due {{due_date}} — {{amount}}'
  );
