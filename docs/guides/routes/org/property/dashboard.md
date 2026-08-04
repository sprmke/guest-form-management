---
title: 'Property Dashboard — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-04
---

# Property Dashboard — operator guide

Route: `/org/:orgSlug/property/:propertySlug`

> **Status:** Documented

## Progress overview

| Section            | E2E save | Validation | Docs       | Notes                                                |
| ------------------ | -------- | ---------- | ---------- | ---------------------------------------------------- |
| Date range filter  | —        | —          | Documented | Week / Month / Year / Custom, `?from`/`?to`          |
| Needs attention    | —        | —          | Documented | Booking/finance alerts + Connect Google chip         |
| Stat cards         | —        | —          | Documented | Period KPIs                                          |
| Finance + calendar | —        | —          | Documented | Period-scoped widgets                                |
| Guest pages        | —        | —          | Documented | Public guest URLs (sheet on mobile; menu on desktop) |
| Mobile shell       | —        | —          | Documented | Sticky collapsing brand hero + overlap (`max-lg`)    |

---

## Overview

Single-property home page: date-range filter, **Guest pages** menu, **Needs attention** strip, KPI stat cards, and a combined finance + calendar section — all scoped to one property and the selected period.

### Mobile layout (`max-lg`)

- **Brand hero** — teal band with tenant/property switcher (light-on-primary) and page title. Subtitle is `lg+` only. On scroll the hero **sticks**; title compresses/fades and the arc flattens while switcher + guest-pages action stay visible (`useMobileHeroCollapseProgress`).
- **Overlap toolbar** — first floating white card pulled up over the hero lower edge: date range + **Guest pages**.
- **Canvas** — compact attention chips (no card chrome), denser KPI cards (no icon tiles / “vs last period” text), chart/calendar headers use a compact icon + centered title (`AdminSurfaceCardHeader`; descriptions `lg+` only). Period eyebrow above KPIs is `lg+` only. Section/card gaps stay comfortable (`gap-2.5`–`3.5`, `p-3`+), not cramped.
- **Desktop (`lg+`)** — unchanged: standard `AdminPageHeader` with inline date filter and Guest pages actions.

---

## Date range

Uses **`BookingDateRangeFilter`** in the page header, backed by `useDateNavigation` + `useSyncDateRangeWithQuery`:

| Preset | Behavior                                                   |
| ------ | ---------------------------------------------------------- |
| Week   | Sun–Sat, navigable with arrows                             |
| Month  | Current calendar month (default when the URL has no range) |
| Year   | Current calendar year                                      |
| Custom | Calendar popover                                           |

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

`DashboardAttentionStrip` merges two sources into one horizontally-scrollable (mobile) / wrapping (desktop) chip row:

1. **Server attention items** — `dashboard-stats` `attention[]` (pending review, awaiting documents, check-ins/outs today, SD refunds, unpaid guest balance; same rules as the org dashboard).
2. **Connect Google chip** (client-only, prepended first) — shown when Gmail, Calendar, or Spreadsheet is not fully connected for the property (`usePropertyGoogleAttentionItem`); links to **Settings**.

Each chip shows a severity icon (critical / warning / info), a label, an optional count badge, and links to the relevant list or settings page. The whole section is hidden when there are no items. There is no separate "setup incomplete" banner — Connect Google folds into this same strip.

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

## Finance + calendar section

`DashboardFinanceCalendarSection` renders once a period is resolved, laid out as a 5-column grid on `lg:`+:

- **Cash flow / income / expense chart** (`FinanceTransactionsChart`, embedded) — built from `finance-line-items` + `finance-bookings` for the period.
- **Upcoming transactions** (`DashboardTransactionsDueCard`) — line items due in the period, height-synced to the calendar card on desktop.
- **Mini booking calendar** (`BookingCalendarView`, `variant="mini"`) — built from `list-bookings` for the same period (includes completed bookings), with a pill-label toggle (name vs. status).

Tapping a calendar day or booking pill navigates to that booking's detail page.

---

## Host-facing knowledge

This is the home page for a single property — a quick-glance summary of money coming in, how full your calendar is, and anything that needs your attention right now.

**Common host questions**

- Q: Why do I see a "Connect Google" notice here?
  A: Your bookings sync to Google Calendar and a spreadsheet automatically once you connect your Google account in Settings — until then you'll see a reminder here.
  - Q: What does the "Total Bookings" number mean?
    A: It shows how many nights you had booked out of the days in the selected period (for example, 18 out of 30 nights) — not a simple count of bookings.
- Q: Can guests see this page?
  A: No, this is only visible to you and your team. Use **Guest pages** to open what guests see on your public site.
- Q: Does changing the date range affect my actual bookings?
  A: No, changing the date range here only changes which period the numbers and calendar reflect — it doesn't modify anything.

---

## API

| Action                      | Endpoint                                                              |
| --------------------------- | --------------------------------------------------------------------- |
| Dashboard KPIs + attention  | `GET dashboard-stats?property_id=&from=&to=`                          |
| Finance line items (period) | `finance-line-items` (via `useFinanceLineItems`)                      |
| Finance bookings (period)   | `finance-bookings` (via `useFinanceBookings`)                         |
| Mini calendar bookings      | `GET list-bookings?property_id=&from=&to=&showCompletedBookings=true` |

---

## Implementation map

| Concern               | Path                                                                                |
| --------------------- | ----------------------------------------------------------------------------------- |
| Page                  | `ui/src/features/dashboard/property/pages/DashboardPage.tsx`                        |
| Guest pages menu      | `ui/src/features/dashboard/property/components/PropertyGuestPagesMenu.tsx`          |
| Guest page paths      | `ui/src/features/dashboard/property/lib/propertyGuestPublicPages.ts`                |
| Needs attention       | `ui/src/features/dashboard/property/components/DashboardAttentionStrip.tsx`         |
| Connect Google chip   | `ui/src/features/dashboard/org/hooks/usePropertyGoogleAttentionItem.ts`             |
| Stat cards            | `ui/src/features/dashboard/property/components/DashboardStatCards.tsx`              |
| Trend card primitive  | `ui/src/features/dashboard/property/components/DashboardTrendStatCard.tsx`          |
| Finance + calendar    | `ui/src/features/dashboard/property/components/DashboardFinanceCalendarSection.tsx` |
| Transactions due card | `ui/src/features/dashboard/property/components/DashboardTransactionsDueCard.tsx`    |
| Stats hook            | `ui/src/features/dashboard/property/hooks/useDashboardStats.ts`                     |
| Period resolution     | `ui/src/features/dashboard/property/lib/dashboardPeriod.ts`                         |
| Stats API             | `dashboard-stats` → `supabase/functions/_shared/dashboardService.ts`                |
| Finance chart         | `ui/src/features/dashboard/finance/components/FinanceTransactionsChart.tsx`         |
| Mini calendar         | `ui/src/features/dashboard/bookings/components/BookingCalendarView.tsx`             |
| Mobile page shell     | `ui/src/components/mobile/MobileBrandHero.tsx` (`AdminMobilePage`)                  |

---

## Related docs

- [Route index](../../README.md)
- [Organization dashboard](../dashboard.md)
- [`docs/PROJECT.md`](../../../../PROJECT.md)
