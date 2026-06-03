-- Strip legacy "View Booking Details" footer from staff daily summary templates.

UPDATE public.telegram_staff_settings
SET
  daily_summary_template = trim(
    both E'\n' FROM regexp_replace(
      regexp_replace(
        regexp_replace(
          daily_summary_template,
          E'(\r?\n)*View Booking Details:\s*(\r?\n)*',
          E'\n',
          'gi'
        ),
        E'(\r?\n)*\{\{booking_link\}\}(\r?\n)*',
        E'\n',
        'g'
      ),
      E'(\r?\n)*https?://[^\s]*/bookings/[0-9a-f-]+(\r?\n)*',
      E'\n',
      'gi'
    )
  ),
  updated_at = NOW()
WHERE id = 1;
