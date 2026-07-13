# Property Dashboard — operator guide

Route: `/org/:orgSlug/property/:propertySlug`

> **Status:** Documented

## Progress overview

| Section            | E2E save | Validation | Docs       | Notes                                        |
| ------------------ | -------- | ---------- | ---------- | -------------------------------------------- |
| Needs attention    | —        | —          | Documented | Booking/finance alerts + Connect Google chip |
| Stat cards         | —        | —          | Documented | Period KPIs                                  |
| Finance + calendar | —        | —          | Documented | Period-scoped widgets                        |

---

## Overview

Property dashboard overview with date-range filter, **View Property** (opens public `/properties/:propertySlug` in a new tab), **Needs attention** strip, KPI stat cards, and finance/calendar section.

**Needs attention** merges `dashboard-stats` attention items with a client-side **Connect Google** chip when Gmail, Calendar, and Spreadsheet are not fully connected for the property (links to **Settings**). No separate setup banner.

---

## Implementation map

| Concern             | Path                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| Page                | `ui/src/features/dashboard/property/pages/DashboardPage.tsx`                |
| Needs attention     | `ui/src/features/dashboard/property/components/DashboardAttentionStrip.tsx` |
| Connect Google chip | `ui/src/features/dashboard/org/hooks/usePropertyGoogleAttentionItem.ts`     |
| Stats API           | `dashboard-stats` → `supabase/functions/_shared/dashboardService.ts`        |

---

## Related docs

- [Route index](../../README.md)
- [`docs/PROJECT.md`](../../../PROJECT.md)
