---
title: 'Property Dashboard — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-09
---

# Property Dashboard — operator guide

Route: `/org/:orgSlug/property/:propertySlug`

> **Status:** Documented

## Progress overview

| Section               | E2E save | Validation | Docs       | Notes                                                    |
| --------------------- | -------- | ---------- | ---------- | -------------------------------------------------------- |
| Date range filter     | —        | —          | Documented | Week / Month / Year / Custom, `?from`/`?to`              |
| Stat cards            | —        | —          | Documented | Always first                                             |
| Board (2×3)           | —        | —          | Documented | Equal half-width cells; attention/calendar/cash/maint/tx |
| Loading skeleton      | —        | —          | Documented | Mirrors KPI + 2×3 board (compact mini calendar cells)    |
| Needs attention card  | —        | —          | Documented | Board cell; swaps to Recent bookings when clear          |
| Maintenance reminders | —        | —          | Documented | Board cell; pending/done + next reminders                |
| Guest pages           | —        | —          | Documented | Public guest URLs (sheet on mobile; menu on desktop)     |
| Mobile shell          | —        | —          | Documented | Sticky collapsing brand hero + overlap (`max-lg`)        |

---

## Overview

Single-property home page: date-range filter, **Guest pages** menu, KPI stat cards, then a **six-card board** (equal half-width columns on `lg+`) — all scoped to one property and the selected period.

Layout order:

1. **KPI row** — revenue, bookings, occupancy, ADR
2. **Equal 2×3 board** (same card width each cell):
   - Calendar | Needs attention (or Recent bookings when clear)
   - Cash flow | Breakdown
   - Maintenance | Transactions

### Mobile layout (`max-lg`)

- **Brand hero** — teal band with tenant/property switcher (light-on-primary) and page title. Subtitle is `lg+` only. On scroll the hero **sticks**; title compresses/fades and the arc flattens while switcher + guest-pages action stay visible (`useMobileHeroCollapseProgress`).
- **Overlap toolbar** — first floating white card pulled up over the hero lower edge: date range + **Guest pages**.
- **Canvas** — denser KPI cards first (no icon tiles / “vs last period” text), then the six board cards stack full-width in the same reading order. Chart/calendar headers use a compact icon + centered title (`AdminSurfaceCardHeader`; descriptions `lg+` only). Section/card gaps stay comfortable (`gap-2.5`–`3.5`, `p-3`+), not cramped.
- **Desktop (`lg+`)** — standard `AdminPageHeader` with inline date filter and Guest pages actions; board is `lg:grid-cols-2`.

---

## Date range

Uses **`BookingDateRangeFilter`** in the page header, backed by `useDateNavigation` + `useSyncDateRangeWithQuery`:

| Preset | Behavior                                                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Week   | Sun–Sat, navigable with arrows                                                                                                                        |
| Month  | Current calendar month (default when the URL has no range)                                                                                            |
| Year   | Current calendar year                                                                                                                                 |
| Custom | Calendar popover — primary range selection, centered month grid; Apply in the footer (no overlapping date readout); **Back to presets** in the header |

URL params: **`?from=YYYY-MM-DD&to=YYYY-MM-DD`** — written back on any range change (`replace: true`, no history spam). If the URL has neither param on load, the page seeds the default period (`defaultDashboardPeriod()`, current month) into the URL.

---

## Guest pages

Header / hero action — opens property-scoped public guest URLs in a new tab. On **`max-lg`**, the list is a bottom sheet (`MobileChoiceSheet`); on **`lg+`**, a compact dropdown menu.

| Item       | Path                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Property   | `/properties/:propertySlug`                                                                                  |
| Calendar   | `…/calendar`                                                                                                 |
| Form       | `…/form`                                                                                                     |
| Messages   | `…/messages?checkInDate=<today>&checkOutDate=<tomorrow>` (Manila; preview dates so the full chat page loads) |
| Stay Guide | `…/stay-guide?preview=1&property_id=` (admin preview)                                                        |

Mobile hero: icon-only trigger beside the tenant switcher. Desktop: labelled **Guest pages** with chevron.

**Date range:** presets (“View by”) and custom calendar also use a bottom sheet on `max-lg`; desktop keeps anchored popovers.

---

## Needs attention

`DashboardAttentionCard` is a peer **surface card** on the ops rail (not a top strip). Sources (unchanged):

1. **Server attention items** — `dashboard-stats` `attention[]` (pending review, awaiting documents, check-ins/outs today, SD refunds, unpaid guest balance; same rules as the org dashboard).
2. **Rejected external review** (client-only) — shown when `app_settings.external_reviews` includes any row with `moderationStatus = rejected` (`usePropertyRejectedExternalReviewsAttentionItem`); label **Review rejected** (or **Reviews rejected** + count); links to **Settings** → Socials → External reviews. Clears when the host deletes the review or edits and resubmits (back to pending).

Unified **divided list** (up to 5 rows): severity dot (rose / amber / sky), label, optional count on the right; setup-style rows without a count show a chevron. Header subtitle **Bookings & reviews** (matches Calendar / Maintenance / Transactions card headers). **View** links to period-scoped bookings; when any item is critical, an **urgent** summary chip appears under the header. **View all (+N more)** when more than five items.

When the list is **empty** (no server alerts and no rejected-review chips), the same board cell switches to **Recent bookings** — period check-ins from `dashboard-stats.recentBookings` (guest, stay dates, amount, status), linking into booking detail. Empty period: dashed **No bookings**. This keeps the Calendar | ops peer heights from looking hollow next to a tall calendar.

Parking dashboard still uses the legacy `DashboardAttentionStrip` chip row.

---

## Maintenance reminders

`DashboardMaintenanceRemindersCard` (right ops card on `lg+`; stacks under attention on mobile) loads period-scoped data:

| Piece          | Source                                                              |
| -------------- | ------------------------------------------------------------------- |
| Pending / done | `GET maintenance-summary` via `useMaintenanceSummary`               |
| Next reminders | Pending items from `GET maintenance-items` (up to 5, soonest first) |
| View           | Links to `/maintenance?from=&to=` (same dashboard period)           |

Empty state when there are no pending reminders in the period. Card still shows **0 pending / N done** when everything is completed.

---

## Stat cards

`DashboardStatCards`, four cards for the selected period (`kpis` from `dashboard-stats`):

| Card                     | Source                | Notes                                                                                                |
| ------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------- |
| **Total Revenue**        | `kpis.netProfit`      | Operating host net for check-ins in range; colored red when negative                                 |
| **Total Bookings**       | `kpis.nightsBooked`   | Shown as **nights booked / period days** (e.g. `18 / 30`), links to `/bookings` scoped to the period |
| **Occupancy Rate**       | `kpis.occupancyRate`  | Percent, with point-change vs the previous equal-length period                                       |
| **Average Nightly Rate** | `kpis.avgNightlyRate` | PHP average rate across occupied nights in range                                                     |

All four show a trend indicator vs. the previous equal-length period, powered by `DashboardTrendStatCard`.

---

## Board section (finance + calendar + ops)

`DashboardFinanceCalendarSection` renders once a period is resolved as an equal **`lg:grid-cols-2`** board (six half-width cards, equal row height via `items-stretch`).

| Cell                  | Component                                                                        |
| --------------------- | -------------------------------------------------------------------------------- |
| Calendar              | `BookingCalendarView` (`variant="mini"`) + Name/Price toggle (single-month only) |
| Needs attention       | `DashboardAttentionCard`                                                         |
| Cash flow / Breakdown | `FinanceTransactionsChart` (`embedded`; Cash flow **View** → `/finance`)         |
| Maintenance           | `DashboardMaintenanceRemindersCard` (**View** → `/maintenance`)                  |
| Transactions          | `DashboardTransactionsDueCard` (**View** → `/finance`)                           |

Empty states use a dashed panel (icon + title + short description). Maintenance empty state includes **Add Reminder** → `/maintenance`; Transactions empty state includes **Add Transaction** → `/finance` (same period query) — both use `outline-primary`.

List cards (Needs attention, Maintenance, Transactions) show at most **5** rows. When more exist, a bottom **View all (+N more)** link opens the matching module with the same period (`/bookings`, `/maintenance`, `/finance`). Header **View** links remain for one-tap navigation when the list is short. Transaction rows are two lines: label + amount, then category / due / status on one meta row.

Mini calendar: short day strip with **day numbers always visible**; status-colored stay bands sit under each week (not over the dates). Alternating week wash + muted tint on occupied days aid scanning. **Year** and custom ranges spanning more than one calendar month switch to the yearly dot grid (no stay pills); the Name/Price header toggle is hidden in those views because labels do not render. On single-month week/month/custom ranges, Name/Price toggle: **Price** shows the full stay total (`booking_rate`), not the per-night split. Each week fragment of a multi-week stay repeats the label (no empty continuation bars). Compact mode omits the per-day count badge.

Initial page load uses `DashboardSkeleton` (`AdminSkeletons.tsx`): same gaps as the live board (`gap-2.5` / `lg:grid-cols-2`), compact calendar day placeholders (not square tiles), and header actions that match each card (Name/Price toggle, attention badge, View links, breakdown segment). Per-card refresh skeletons inside Maintenance / Transactions / Attention use the same row heights.

Cash flow / breakdown / transactions / calendar data still come from `finance-line-items`, `finance-bookings`, and `list-bookings` for the selected period. Tapping a calendar day or booking pill navigates to that booking's detail page.

---

## Host-facing knowledge

This is the home page for a single property — period performance first, then the calendar beside what needs attention, cash charts, and maintenance/transactions for the dates you picked.

**Common host questions**

- Q: What is the Maintenance card?
  A: A short list of property reminders due in the selected period, with how many are still pending. Open **View** to manage all reminders.
- Q: What does the "Total Bookings" number mean?
  A: It shows how many nights you had booked out of the days in the selected period (for example, 18 out of 30 nights) — not a simple count of bookings.
- Q: Can guests see this page?
  A: No, this is only visible to you and your team. Use **Guest pages** to open what guests see on your public site.
- Q: Does changing the date range affect my actual bookings?
  A: No, changing the date range here only changes which period the numbers, maintenance list, and calendar reflect — it doesn't modify anything.
- Q: What does the calendar Price toggle show?
  A: The full booking amount for that stay (all nights added together), not the nightly rate.

---

## API

| Action                      | Endpoint                                                              |
| --------------------------- | --------------------------------------------------------------------- |
| Dashboard KPIs + attention  | `GET dashboard-stats?property_id=&from=&to=`                          |
| Maintenance summary         | `GET maintenance-summary?property_id=&from=&to=`                      |
| Maintenance items           | `GET maintenance-items?property_id=&from=&to=`                        |
| Finance line items (period) | `finance-line-items` (via `useFinanceLineItems`)                      |
| Finance bookings (period)   | `finance-bookings` (via `useFinanceBookings`)                         |
| Mini calendar bookings      | `GET list-bookings?property_id=&from=&to=&showCompletedBookings=true` |

---

## Implementation map

| Concern               | Path                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| Page                  | `ui/src/features/dashboard/property/pages/DashboardPage.tsx`                          |
| Guest pages menu      | `ui/src/features/dashboard/property/components/PropertyGuestPagesMenu.tsx`            |
| Guest page paths      | `ui/src/features/dashboard/property/lib/propertyGuestPublicPages.ts`                  |
| Needs attention card  | `ui/src/features/dashboard/property/components/DashboardAttentionCard.tsx`            |
| Maintenance card      | `ui/src/features/dashboard/property/components/DashboardMaintenanceRemindersCard.tsx` |
| Stat cards            | `ui/src/features/dashboard/property/components/DashboardStatCards.tsx`                |
| Trend card primitive  | `ui/src/features/dashboard/property/components/DashboardTrendStatCard.tsx`            |
| Finance + calendar    | `ui/src/features/dashboard/property/components/DashboardFinanceCalendarSection.tsx`   |
| Transactions due card | `ui/src/features/dashboard/property/components/DashboardTransactionsDueCard.tsx`      |
| Stats hook            | `ui/src/features/dashboard/property/hooks/useDashboardStats.ts`                       |
| Period resolution     | `ui/src/features/dashboard/property/lib/dashboardPeriod.ts`                           |
| Stats API             | `dashboard-stats` → `supabase/functions/_shared/dashboardService.ts`                  |
| Finance chart         | `ui/src/features/dashboard/finance/components/FinanceTransactionsChart.tsx`           |
| Mini calendar         | `ui/src/features/dashboard/bookings/components/BookingCalendarView.tsx`               |
| Mobile page shell     | `ui/src/components/mobile/MobileBrandHero.tsx` (`AdminMobilePage`)                    |

---

## Related docs

- [Route index](../../README.md)
- [Organization dashboard](../dashboard.md)
- [`docs/PROJECT.md`](../../../../PROJECT.md)
