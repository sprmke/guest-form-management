-- Legacy migration version kept for databases that already applied the original ALTER.
-- Fresh installs: `guest_submissions` is created later; the real status DDL is in
-- `20250213043909_add_booking_status.sql` (runs after `20250213043908_create_guest_submissions_table.sql`).
SELECT 1;
