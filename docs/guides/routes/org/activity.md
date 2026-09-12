---
title: 'Activity — operator guide'
status: active
tags: [guides, routes, org, activity, audit-log]
updated: 2026-09-06
---

# Activity — operator guide

Route: `/org/:orgSlug/activity`

> **Status:** Documented

## Progress overview

| Section | E2E save | Validation | Docs       | Notes                                                         |
| ------- | -------- | ---------- | ---------- | ------------------------------------------------------------- |
| Feed    | n/a      | n/a        | Documented | Read-only. Infinite scroll, keyset pagination, 90-day default |
| Filters | n/a      | n/a        | Documented | Search, category chips, destructive-only, date range          |
| Detail  | n/a      | n/a        | Documented | Row → sheet with actor, changes diff, IP prefix, metadata     |

---

## Overview

Org-wide **activity / audit timeline** — every meaningful action across the organization: team members, the org owner, super-admins acting on the org, the AI dashboard assistant, guests on public pages, cron jobs, inbound webhooks. Answers "who did what, when, from where, and (for edits) exactly what changed". Destructive actions (deletes, cancellations, refunds, member removals) are flagged.

Data is written **fire-and-forget** by `_shared/activityLog.ts` (never blocks a mutation) into the append-only `public.activity_log` table and read through `list-activity-log`. See `docs/workflow/in-progress/org-activity-audit-log.md` and `docs/architecture/data-model.md`.

## Sections

### Feed

- Newest first, keyset-paginated (loads more on scroll). Default window is the **last 90 days** unless a date range is set.
- Each row: a category glyph, the past-tense summary, the actor (name / email + type), a relative timestamp (hover for the Asia/Manila absolute time), the target label, and a short list of changed fields. A severity chip appears for `notice` / `warning` / `destructive`.
- **Scope:** this page shows **all** org, property, and parking activity for the org. The property- and parking-scoped Activity pages show only that listing's rows.

### Filters

- **Search** — matches the summary and target label.
- **Category chips** — Bookings, Parking, Team, Pricing, Finance, Maintenance, Marketing, Inbox, Settings, Property, Organization, Integrations, Verification, Plans & billing, Public pages, Guest, Security, System. Multi-select.
- **Destructive only** — quick filter to `severity = destructive`.
- **Date range** — From / To (inclusive). Setting `From` overrides the 90-day default.
- **Clear** — resets everything except the page scope.

### Detail sheet

Clicking a row opens a sheet with: severity, actor (display name / email + type + role snapshot), absolute timestamp, source (`dashboard` / `public_form` / `ai_assistant` / `cron` / `webhook` / `email_inbound` / `db_trigger`), target, the truncated client IP (`/24` or `/48` — never the full address), device (user agent), a **Changes** table (field / from / to, redacted), and the raw `metadata`.

## Permissions

Gated on **`org.dashboard:view`** — any org-hub member can view it (transparency surface). Property/parking-scoped members do not see org-scope rows and see only their assigned listings' activity on the property/parking Activity pages. There is no dedicated `activity` RBAC leaf in v1; export and a plan gate are follow-ups.
---

## Testing

| Layer | Path / spec                                                      | Manual     |
| ----- | ---------------------------------------------------------------- | ---------- |
| Unit  | `activityLog.ts` catalog helpers                                 | —          |
| E2E   | `ui/e2e/features/org/orgHubSmoke.spec.ts` activity shell (`@ci`) | CSV export |

## Related

- Property: [org/property/activity.md](./property/activity.md) · Parking: [org/parking/activity.md](./parking/activity.md)
- Reusable `<EntityActivityHistory>` panel is embedded on the booking detail page (Overview tab).
- Governance: `audit-logging` skill / `.cursor/rules/audit-logging.mdc`.
