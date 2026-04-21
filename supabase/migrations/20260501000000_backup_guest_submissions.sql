-- Phase 0 — Snapshot `guest_submissions` before the new booking-flow migrations.
-- Safe + additive: creates an independent copy with no FKs, triggers, or RLS tied to the live table.
-- See docs/MIGRATION_RUNBOOK.md and docs/NEW_FLOW_PLAN.md §5 (Phase 0).

-- Idempotent: only create if missing. If you need a fresh snapshot, drop the old one manually.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'guest_submissions_backup_20260501'
  ) THEN
    EXECUTE 'CREATE TABLE guest_submissions_backup_20260501 AS TABLE guest_submissions';
    EXECUTE 'COMMENT ON TABLE guest_submissions_backup_20260501 IS
      ''Pre-new-flow snapshot of guest_submissions (Phase 0, 2026-05-01). Data-only copy; no constraints or triggers. See docs/MIGRATION_RUNBOOK.md.''';
  END IF;
END $$;
