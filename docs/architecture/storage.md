---
title: 'Storage'
status: active
tags: [architecture, storage]
updated: 2026-08-16
---

# Storage

Part of the [`docs/PROJECT.md`](../PROJECT.md) architecture split.

---

## 7. Storage

Buckets and MIME types are declared in `supabase/config.toml` (e.g. `payment-receipts`, `pet-vaccinations`); additional buckets appear in SQL migrations (`pet-images`, etc.). `UploadService` maps files to buckets and public URLs.

**New-flow buckets (Phase 0):** `parking-endorsements` (public), `approved-gafs` (private), `approved-pet-forms` (private), `sd-refund-receipts` (private). Defined in `20260501000006`–`20260501000008`. See [[NEW_FLOW_PLAN|New Booking Flow — Implementation Plan]] §2 and **[[migration-runbook|Migration Runbook — New Booking Flow]] §1.1**.

**Import uploads (Smart AI Data Importer):** **`import-uploads`** — private bucket, **`text/csv`** only, 15 MB file limit. Created in **`20261007120000_import_batches.sql`**. Objects at `{orgId}/{batchId}/{filename}`; written by **`import-parse-file`**, deleted by **`import-cancel`**. Service-role policy only — no guest or anon access.

**AI dashboard assistant attachments:** **`ai-assistant-attachments`** — private bucket, JPEG/PNG/WebP/PDF, 4 MB. Created in **`20261019120000_ai_assistant_attachments.sql`**. Objects at `{orgId}/{userId}/{conversationId}/{uuid}-{filename}`; written by **`dashboard-assistant-chat`**. Metadata on **`ai_dashboard_assistant_messages.attachments`** (`[{ name, mimeType, size, path }]`). Service-role policy only — bytes are not stored in Postgres and are not logged. **`DELETE dashboard-assistant-conversations?conversation_id=`** removes that conversation's folder (best-effort) before cascading the DB row.
