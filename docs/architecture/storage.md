---
title: 'Storage'
status: active
tags: [architecture, storage]
updated: 2026-08-29
---

# Storage

Part of the [`docs/PROJECT.md`](../PROJECT.md) architecture split.

---

## 7. Storage

Buckets and MIME types are declared in `supabase/config.toml` (e.g. `payment-receipts`, `pet-vaccinations`); additional buckets appear in SQL migrations (`pet-images`, etc.). `UploadService` maps files to buckets and public URLs.

### 7.1 Media optimization (images + upload ceilings)

Plan: [`docs/workflow/planned/image-video-upload-optimization.md`](../workflow/planned/image-video-upload-optimization.md).

**Client-side compression.** Every image uploader routes the picked file through `prepareUpload` → `prepareImageForUpload` (`ui/src/lib/media/`) before building its request body: it re-encodes/downscales on a canvas, then re-validates the result against the ceiling. Quality-first presets (`ui/src/lib/media/imageOptimizationPlan.ts`):

| Preset         | Long edge  | Output                                                                      | Used for                                                                          |
| -------------- | ---------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `PHOTO_MASTER` | 3840px     | WebP q0.82                                                                  | property/parking/development gallery, showcase hero, marketing backgrounds        |
| `CONTENT`      | 2048px     | WebP q0.82                                                                  | in-page/template/stay-guide images, guest review + chat images                    |
| `AVATAR`       | 512px      | WebP q0.85 (PNG if alpha)                                                   | guest profile photo, org/app/parking logos                                        |
| `DOCUMENT`     | 3000px cap | keep source format, near-lossless; pass through untouched under the ceiling | valid ID, receipts, vaccination, signatures, QR, verification/authorization proof |
| `NONE`         | —          | pass through                                                                | PDF, SVG, animated, undecodable (e.g. HEIC on Chrome)                             |

The optimizer **never upscales, never returns a larger file, bakes EXIF orientation, and preserves alpha.** It never throws — any failure falls back to the untouched original. Kill switch: build with `VITE_DISABLE_IMAGE_OPTIMIZATION=1` to make it a no-op everywhere.

**Unified server ceilings** — `supabase/functions/_shared/uploadLimits.ts` (`assertWithinUploadLimit`), mirrored by `ui/src/lib/media/uploadLimits.ts` (parity unit test). These replace ~7 per-function hardcoded limits:

| Kind                            | Ceiling |
| ------------------------------- | ------- |
| image (photo/gallery/marketing) | 10 MB   |
| avatar / logo                   | 5 MB    |
| document image / PDF            | 12 MB   |
| video                           | 50 MB   |

Ceilings are a **bypass safety net**, not the mechanism — set generously so a legitimate photo is never rejected. Every `upload-*` / `submit-*` function calls `assertWithinUploadLimit`; every media bucket's `allowed_mime_types` includes `image/webp` (client output) + `image/heic`/`heif` (pass-through), and `file_size_limit` is `>=` the matching ceiling. Bucket updates: migration `20261213120600_media_optimization_bucket_limits.sql` + `supabase/config.toml`.

Backfill of already-stored images is **out of scope** (originals are not retained; the pre-rollout quality gate is the safeguard). Delivery-time variants (Supabase Image Transformation) are deferred — see the plan §16 Phase 4.

**New-flow buckets (Phase 0):** `parking-endorsements` (public), `approved-gafs` (private), `approved-pet-forms` (private), `sd-refund-receipts` (private). Defined in `20260501000006`–`20260501000008`. See [[NEW_FLOW_PLAN|New Booking Flow — Implementation Plan]] §2 and **[[migration-runbook|Migration Runbook — New Booking Flow]] §1.1**.

**Import uploads (Smart AI Data Importer):** **`import-uploads`** — private bucket, **`text/csv`** only, 15 MB file limit. Created in **`20261007120000_import_batches.sql`**. Objects at `{orgId}/{batchId}/{filename}`; written by **`import-parse-file`**, deleted by **`import-cancel`**. Service-role policy only — no guest or anon access.

**AI dashboard assistant attachments:** **`ai-assistant-attachments`** — private bucket, JPEG/PNG/WebP/PDF, 4 MB. Created in **`20261019120000_ai_assistant_attachments.sql`**. Objects at `{orgId}/{userId}/{conversationId}/{uuid}-{filename}`; written by **`dashboard-assistant-chat`**. Metadata on **`ai_dashboard_assistant_messages.attachments`** (`[{ name, mimeType, size, path }]`). Service-role policy only — bytes are not stored in Postgres and are not logged. **`DELETE dashboard-assistant-conversations?conversation_id=`** removes that conversation's folder (best-effort) before cascading the DB row.
