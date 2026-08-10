---
title: 'Guest Form Management — Project Documentation'
status: active
tags: [docs]
updated: 2026-08-09
---

# Guest Form Management — Project Documentation

This document is the entry point for the **guest-form-management** architecture docs. Full detail now lives under [`docs/architecture/`](architecture/overview.md), split by topic so each file stays focused and easy to update.

> **Looking for a non-technical walkthrough?** See [`docs/archive/reference/booking-flow-guide-for-admin.md`](archive/reference/booking-flow-guide-for-admin.md) (also available as [PDF](archive/reference/booking-flow-guide-for-admin.pdf)) — a plain-English guide to every booking status, what the admin does at each step, what the cron jobs / Gmail listener do automatically, and the calendar color cheat sheet. Forward this to ops / Airbnb admin.

## Architecture docs

| Topic                                                                              | File                                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Purpose, stack, high-level architecture, repository layout, known notes, key files | [`docs/architecture/overview.md`](architecture/overview.md)                     |
| Routes, pages, admin dashboard behavior, user flows                                | [`docs/architecture/routing.md`](architecture/routing.md)                       |
| Postgres schema (`guest_submissions`, multi-tenancy, finance/maintenance)          | [`docs/architecture/data-model.md`](architecture/data-model.md)                 |
| Storage buckets                                                                    | [`docs/architecture/storage.md`](architecture/storage.md)                       |
| Edge function inventory (API surface)                                              | [`docs/architecture/edge-functions.md`](architecture/edge-functions.md)         |
| Integrations — Resend email, Gmail listener, PDF                                   | [`docs/architecture/integrations.md`](architecture/integrations.md)             |
| Guest form validation + environment variables                                      | [`docs/architecture/validation-and-env.md`](architecture/validation-and-env.md) |
| Deployment                                                                         | [`docs/architecture/deployment.md`](architecture/deployment.md)                 |
| Roadmap / gaps                                                                     | [`docs/architecture/roadmap.md`](architecture/roadmap.md)                       |

For booking status/transition/side-effect specifics, start at `.cursor/rules/booking-workflow.mdc` instead — it supersedes this doc for anything already implemented per that spec. See [`docs/README.md`](README.md) for the full documentation index.

**Admin status colors:** booking status badges, attention chips, resource/import/finance labels, and org dashboard chart fills share one palette in `ui/src/lib/status-tone-colors.ts` (`STATUS_TONE_HEX` — Tailwind 500 hex matching badge dots; `CHART_INCOME_COLOR` / `CHART_EXPENSE_COLOR` in `chartStyles.ts` derive from green/red tones). Primary pill component: `ui/src/features/dashboard/bookings/components/StatusBadge.tsx`.

---

## Smart AI Data Importer (bookings)

Property-scoped spreadsheet import wizard — upload host booking history into `guest_submissions` without triggering live booking side effects.

| Concern            | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tables**         | `import_batches` (batch lifecycle + column mapping), `import_batch_rows` (staged raw/mapped rows). `guest_submissions.imported_from_batch_id` → `import_batches.id`.                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Storage**        | Private bucket **`import-uploads`** — CSV / Excel (`.csv`, `.xlsx`, `.xls`), 15 MB cap; path `{orgId}/{batchId}/{filename}`. First worksheet only for Excel.                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Booking status** | Committed rows get **`status = 'IMPORTED'`** (direct insert from `import-commit`, not `workflowOrchestrator`). Manual overrides only: `IMPORTED → PENDING_REVIEW` \| `CANCELLED`. Excluded from action-required stage cards, SD-refund cron, and guest calendar availability.                                                                                                                                                                                                                                                                                          |
| **Permissions**    | **`org:import:manage`** (org owner + admin by default) and property **`import:manage`** (explicit per-member grant only — not in built-in role defaults). All `import-*` endpoints use `resolveImportAccess` → `verifyPropertyAccess(..., 'import:manage')`.                                                                                                                                                                                                                                                                                                           |
| **Edge functions** | `import-parse-file`, `import-ai-map-columns`, `import-save-mapping`, `import-preview`, `import-update-row`, `import-commit`, `import-revert`, `import-cancel`, `import-list-batches` — see [`docs/architecture/edge-functions.md`](architecture/edge-functions.md).                                                                                                                                                                                                                                                                                                    |
| **UI**             | **Import** button on property bookings list → four-step `ImportWizardModal` (Upload → Match → Preview → Import). Match keeps automatic and manual review together in clickable **Matched** / **Need input** summary cards, auto-selecting Need input when action is required. Preview has status filters, an error queue, and an in-app fix sheet (`fieldValues` on `import-update-row`); skipped rows reopen the same sheet with **Restore** / **Fix**, walking the skipped queue instead of the error queue. Validation errors include `value` for the failing cell. |
| **Route guides**   | [`docs/guides/routes/org/property/bookings.md`](guides/routes/org/property/bookings.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

---

## Platform AI metering (production cost control)

Centralized Gemini usage for receipts, inbox drafts, marketing AI, import column mapping, and voice transcript polish. Voice Live sessions remain metered separately in `voice_receptionist_sessions`.

| Concern                 | Detail                                                                                                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tables**              | `ai_platform_global_settings` (kill switch + `enforce_quotas`), `ai_platform_org_settings` (per-org enable + daily/monthly **call** limits), `ai_platform_usage_daily` (aggregates), `ai_platform_usage_events` (audit log). Migration **`20261009120000_ai_platform_usage.sql`**. |
| **Shared edge modules** | `_shared/aiModelRouter.ts` (feature → Flash / Flash-Lite), `_shared/aiGeminiKeys.ts` (key loading), `_shared/aiUsageService.ts` (`assertOrgAiQuota`, `recordAiUsage`).                                                                                                             |
| **Model tiering**       | Receipt / inbox / marketing / voice polish → **Gemini 2.5 Flash**; import column map → **Flash-Lite**.                                                                                                                                                                             |
| **Quota behavior**      | Inbox + marketing → HTTP **429** + `upgradeHook: true`; receipt + import → non-blocking degrade (`aiModelError` or unmatched columns). Voice polish skips polish on quota (raw transcript).                                                                                        |
| **Defaults**            | 200 calls/day, 5000 calls/month per org (when `enforce_quotas` is on).                                                                                                                                                                                                             |
| **Edge functions**      | `ai-platform-global-settings` (super-admin), `ai-platform-settings`, `ai-platform-usage` — see [`docs/architecture/edge-functions.md`](architecture/edge-functions.md).                                                                                                            |
| **UI**                  | Org **Settings → AI usage** (`OrgAiPlatformSection`); super-admin kill switch on `/admin`. Upgrade CTA is a stub toast until Stripe billing ships.                                                                                                                                 |
| **Ops**                 | Paid **`GEMINI_API_KEY`** on one billing project for hosted envs; multi-key rotation local-only — [`docs/archive/operations/ai-platform-billing.md`](archive/operations/ai-platform-billing.md), [`docs/architecture/validation-and-env.md`](architecture/validation-and-env.md).  |

---

## Operational guest branding (public property flows)

Property-scoped operational routes (`/properties/:propertySlug/calendar`, `/form`, `/success`, `/sd-form`, `/guest-review`, `/parking/:bookingId`, stay-guide, property chat) share **`MainLayout`** chrome: org **brand-color header band**, **`GuestOperationalHeader`**, dynamic **`GuestFormBrandHeader`**, and residence-aware footer.

| Concern          | Detail                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Payload**      | `GET get-guest-payment-info?property=<slug>` — branding fields via **`_shared/guestFormSettings.ts`**: `propertyName`, `propertyEyebrow`, `propertyCoverImageUrl`, `residenceName`, `organizationName`, `emailLogoUrl`, org `brandColor`, plus guest-form toggles/times/capacity (see [`guest-form-configurable-sections`](workflow/done/guest-form-configurable-sections.md)). |
| **UI helpers**   | `ui/src/features/guest/form/lib/guestFormBranding.ts` — residence-aware instructional copy (parking, pets, GAF, success, pay-parking warnings). Azure/Kame defaults when residence matches seeded dev property.                                                                                                                                                                 |
| **Route guides** | [`calendar.md`](guides/routes/calendar.md), [`form.md`](guides/routes/form.md), [`success.md`](guides/routes/success.md), [`sd-form.md`](guides/routes/sd-form.md), [`bookings/parking.md`](guides/routes/bookings/parking.md). Shipped: [`workflow/done/public-operational-guest-pages-multi-tenant.md`](workflow/done/public-operational-guest-pages-multi-tenant.md).        |

---

_Last updated from repository analysis (internal documentation)._
