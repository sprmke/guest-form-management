-- Update admin ops new-booking and balance-receipt Telegram templates.

UPDATE public.telegram_admin_settings
SET
  new_booking_template = E'🆕 New Booking Request\n\nGuest: {{primary_guest_name}}\nPhone: {{guest_phone}}\nDates: {{check_in_date}} → {{check_out_date}}\n\n{{booking_link}}',
  balance_receipt_template = E'💳 Balance Receipt Needed\n\nGuest: {{primary_guest_name}}\nBalance due: {{total_guest_balance}}\n\nUpload payment receipt now:\n{{booking_link}}',
  updated_at = NOW()
WHERE id = 1;
