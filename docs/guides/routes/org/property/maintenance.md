---
title: 'Maintenance — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-02
---

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

**Header (top right):** date range filter, **Export report**, **Add reminder**. On **phone/tablet**, Add + export options live in one hero ··· menu; the overlap toolbar is date range only.

**Summary cards:** Total, Telegram enabled, Completed, Pending — `AdminMetricCard` styling (matches Finance/Bookings).

**By category:** Optional list card when the period summary includes category breakdown.

**Reminders toolbar** (`MaintenanceRemindersToolbar`):

- **Mobile (`max-lg`):** search + refine icon (sheet: status / category / telegram / sort / per-page) + view toggle.
- **Desktop (`lg+`):** Row 1: search | Status | Category | Telegram | Clear; Row 2: Sort + per-page | view toggle

Status, category, and Telegram filters apply **client-side** on items already loaded for the date range; search still uses the API `q` param. List/card views paginate filtered results; calendar shows all matching rows for the period.

**Reminders list:** table / card / calendar (`?view=table|card|calendar`). CRUD via modal; recurring series and mark-as-done supported.

Maintenance Telegram defaults: **Notifications → Maintenance**.

Legacy **`?tab=settings`** redirects to **`/notifications?module=maintenance`**.

---

## Host-facing knowledge

This page helps you track upkeep for your property — cleaning schedules, appliance checks, and other recurring reminders. You can add tasks, mark them complete, filter and search the list, switch between table, card, or calendar views, and export a report for a date range.

**Common host questions**

- Q: How do I get Telegram reminders for maintenance tasks?
  A: Go to **Notifications** and open the Maintenance section to connect your Telegram bot and turn on reminders. This page tracks the tasks; Notifications controls when alerts are sent.
- Q: Can I filter to see only what's still pending?
  A: Yes — use the status filter for pending or completed reminders, and sort by date to prioritize what's due soonest.
- Q: What does the calendar view show?
  A: It lays out your maintenance reminders on a monthly calendar so you can spot busy weeks at a glance.

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
