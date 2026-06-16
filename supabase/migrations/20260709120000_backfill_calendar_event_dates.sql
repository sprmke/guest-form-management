-- Google Calendar occupied-night window fix (2026-07-09)
--
-- Code change: calendar events now end 23:59 on the last occupied night
-- (check_out_date exclusive), matching admin calendar + availability logic.
-- Previously multi-night stays ended on checkout morning and spanned nights+1
-- calendar columns in Google Calendar month view.
--
-- Existing Google Calendar events are NOT updated by this SQL migration.
-- After deploy, run the admin edge function once (dry-run first):
--
--   POST /functions/v1/backfill-calendar-event-dates
--   Authorization: Bearer <admin JWT>
--   Body: { "dryRun": true, "limit": 200 }
--   Then: { "dryRun": false, "limit": 200 } — repeat until all rows processed
--   Or one booking: { "dryRun": false, "bookingId": "<uuid>" }
--
-- See docs/PROJECT.md §9.2 and docs/MIGRATION_RUNBOOK.md §1.3.

SELECT 1;
