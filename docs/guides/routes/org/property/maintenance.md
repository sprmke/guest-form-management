# Maintenance — operator guide

Route: `/org/:orgSlug/property/:propertySlug/maintenance`

> **Status:** Documented

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                               |
| -------------- | -------- | ---------- | ---------- | ----------------------------------- |
| Summary cards  | —        | —          | Documented | Total, Telegram, completed, pending |
| By category    | —        | —          | Documented | When summary has categories         |
| Reminders CRUD | ✅       | ✅         | Documented | `maintenance_items`                 |
| Export report  | ✅       | —          | Documented | PDF menu (header)                   |

---

## Overview

Single-page maintenance view (no tabs), structured like Finance.

**Header (top right):** date range filter, **Export report**, **Add reminder**.

**Summary cards:** Total, Telegram enabled, Completed, Pending — `AdminMetricCard` styling (matches Finance/Bookings).

**By category:** Optional list card when the period summary includes category breakdown.

**Reminders toolbar** (`MaintenanceRemindersToolbar`):

- Row 1: search (debounced → `?q=`) | **Status** (pending/completed multi-select, `?status=`) | **Category** (multi-select from loaded items, `?categories=`) | **Telegram** (all / on / off, `?telegram=`) | **Clear filters** when any filter is active
- Row 2: **Sort** (`?sort=date:desc|date:asc|label:asc|label:desc`, default `date:desc`) + per-page (left; hidden in calendar view) | table / card / calendar view toggle (right)

Status, category, and Telegram filters apply **client-side** on items already loaded for the date range; search still uses the API `q` param. List/card views paginate filtered results; calendar shows all matching rows for the period.

**Reminders list:** table / card / calendar (`?view=table|card|calendar`). CRUD via modal; recurring series and mark-as-done supported.

Maintenance Telegram defaults: **Notifications → Maintenance**.

Legacy **`?tab=settings`** redirects to **`/notifications?module=maintenance`**.

---

## Implementation map

| Concern                | Path                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Page                   | `ui/src/features/dashboard/maintenance/pages/MaintenancePage.tsx`                  |
| Summary cards          | `ui/src/features/dashboard/maintenance/components/MaintenanceSummaryCards.tsx`     |
| Toolbar                | `ui/src/features/dashboard/maintenance/components/MaintenanceRemindersToolbar.tsx` |
| Filters / sort helpers | `ui/src/features/dashboard/maintenance/lib/maintenanceReminders.ts`                |
| Reminders list         | `ui/src/features/dashboard/maintenance/components/MaintenanceRemindersTab.tsx`     |
| API                    | `maintenance-summary`, `maintenance-items`                                         |

---

## Related docs

- [Route index](../../README.md)
- [`docs/PROJECT.md`](../../../PROJECT.md)
