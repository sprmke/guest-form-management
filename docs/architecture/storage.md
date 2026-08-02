---
title: 'Storage'
status: active
tags: [architecture, storage]
updated: 2026-08-02
---

# Storage

Part of the [`docs/PROJECT.md`](../PROJECT.md) architecture split.

---

## 7. Storage

Buckets and MIME types are declared in `supabase/config.toml` (e.g. `payment-receipts`, `pet-vaccinations`); additional buckets appear in SQL migrations (`pet-images`, etc.). `UploadService` maps files to buckets and public URLs.

**New-flow buckets (Phase 0):** `parking-endorsements` (public), `approved-gafs` (private), `approved-pet-forms` (private), `sd-refund-receipts` (private). Defined in `20260501000006`–`20260501000008`. See [[NEW_FLOW_PLAN|New Booking Flow — Implementation Plan]] §2 and **[[migration-runbook|Migration Runbook — New Booking Flow]] §1.1**.
