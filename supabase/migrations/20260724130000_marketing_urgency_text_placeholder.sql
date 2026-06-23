-- Daily urgency template: replace hardcoded "this" with {{urgency_text}} placeholder.

UPDATE public.telegram_marketing_settings
SET daily_urgency_template = replace(
  daily_urgency_template,
  'Available this ',
  'Available {{urgency_text}} '
)
WHERE daily_urgency_template LIKE '%Available this %'
  AND daily_urgency_template NOT LIKE '%{{urgency_text}}%';

COMMENT ON TABLE public.telegram_marketing_settings IS
  'Single-row marketing copy for Telegram. Placeholders: {{available_dates}}, {{month_name}}, {{dates_list}}, {{cancellation_dates}}, {{urgency_text}}.';
