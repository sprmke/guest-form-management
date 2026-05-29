-- Remove {{booking_link}} from staff daily summary templates (no longer used).

UPDATE public.telegram_staff_settings
SET
  daily_summary_template = trim(
    both E'\n' FROM regexp_replace(
      daily_summary_template,
      E'(\r?\n)*\{\{booking_link\}\}(\r?\n)*',
      E'\n',
      'g'
    )
  ),
  updated_at = NOW()
WHERE id = 1;
