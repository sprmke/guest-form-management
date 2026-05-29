-- Refresh admin SD refund Telegram templates with payout/bank detail placeholders.

UPDATE public.telegram_admin_settings
SET
  sd_form_submitted_template = E'📝 SD Refund Form Submitted\n\nGuest: {{primary_guest_name}}\nMethod: {{sd_refund_method}}\nCheck-out: {{check_out_date}}\n\nRefund details:\n{{sd_refund_details}}\n\nProcess the refund now:\n{{booking_link}}',
  sd_refund_pending_template = E'💰 SD Refund Pending Processing\n\nGuest: {{primary_guest_name}}\nMethod: {{sd_refund_method}}\n\nRefund details:\n{{sd_refund_details}}\n\nProcess the refund now:\n{{booking_link}}',
  updated_at = NOW()
WHERE id = 1;
