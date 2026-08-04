---
title: 'Guest Form Management — Project Documentation'
status: active
tags: [docs]
updated: 2026-08-03
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
| Integrations — Resend email, Google Calendar, Google Sheets, PDF                   | [`docs/architecture/integrations.md`](architecture/integrations.md)             |
| Guest form validation + environment variables                                      | [`docs/architecture/validation-and-env.md`](architecture/validation-and-env.md) |
| Deployment                                                                         | [`docs/architecture/deployment.md`](architecture/deployment.md)                 |
| Roadmap / gaps                                                                     | [`docs/architecture/roadmap.md`](architecture/roadmap.md)                       |

For booking status/transition/side-effect specifics, start at `.cursor/rules/booking-workflow.mdc` instead — it supersedes this doc for anything already implemented per that spec. See [`docs/README.md`](README.md) for the full documentation index.

---

## Smart AI Data Importer (bookings CSV)

Property-scoped CSV import wizard — upload host spreadsheet history into `guest_submissions` without triggering live booking side effects.

| Concern | Detail |
| ------- | ------ |
| **Tables** | `import_batches` (batch lifecycle + column mapping), `import_batch_rows` (staged raw/mapped rows). `guest_submissions.imported_from_batch_id` → `import_batches.id`. |
| **Storage** | Private bucket **`import-uploads`** — CSV only, 15 MB cap; path `{orgId}/{batchId}/{filename}`. |
| **Booking status** | Committed rows get **`status = 'IMPORTED'`** (direct insert from `import-commit`, not `workflowOrchestrator`). Manual overrides only: `IMPORTED → PENDING_REVIEW` \| `CANCELLED`. Excluded from action-required stage cards, SD-refund cron, and guest calendar availability. |
| **Permissions** | **`org:import:manage`** (org owner + admin by default) and property **`import:manage`** (explicit per-member grant only — not in built-in role defaults). All `import-*` endpoints use `resolveImportAccess` → `verifyPropertyAccess(..., 'import:manage')`. |
| **Edge functions** | `import-parse-file`, `import-ai-map-columns`, `import-save-mapping`, `import-preview`, `import-update-row`, `import-commit`, `import-revert`, `import-cancel`, `import-list-batches` — see [`docs/architecture/edge-functions.md`](architecture/edge-functions.md). |
| **UI** | **Import** button on property bookings list → `ImportWizardModal`; history at `/org/:orgSlug/property/:propertySlug/import-history`. |
| **Route guides** | [`docs/guides/routes/org/property/bookings.md`](guides/routes/org/property/bookings.md), [`docs/guides/routes/org/property/import-history.md`](guides/routes/org/property/import-history.md). |

---

_Last updated from repository analysis (internal documentation)._
