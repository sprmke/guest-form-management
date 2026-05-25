-- Approval sender allow-list now uses email_reply_to (Team Email / EMAIL_REPLY_TO).
ALTER TABLE app_settings
  DROP COLUMN IF EXISTS permit_approver_emails;
