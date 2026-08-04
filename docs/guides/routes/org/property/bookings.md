---
title: 'Bookings List — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-04
---

# Bookings List — operator guide

Route: `/org/:orgSlug/property/:propertySlug/bookings`

> **Status:** Documented

## Progress overview

| Section                       | E2E save  | Validation | Docs | Notes                                                             |
| ----------------------------- | --------- | ---------- | ---- | ----------------------------------------------------------------- |
| Summary stage cards           | —         | —          | Done | Finance-style cards; status hints inline; click toggles `?stage=` |
| Filter bar                    | —         | —          | Done | Mobile: search + refine sheet + view; desktop: inline filters     |
| Table / card / calendar views | —         | —          | Done | Existing behavior                                                 |
| Kanban view                   | via modal | —          | Done | Reuses `WorkflowPanel` from detail page                           |
| Mobile shell                  | —         | —          | Done | Brand hero + overlap filters (`max-lg` only)                      |

---

## Overview

Paginated booking list with PMA-style **stage summary cards** and four view modes: **table**, **card**, **kanban**, **calendar**.

Layout (top → bottom):

1. **Mobile (`max-lg`):** brand hero with tenant switcher + **New booking** icon (property scope); overlapping floating toolbar with date range (property scope) + filters; layout frosted header hidden on this route.
2. **Desktop (`lg+`):** page header — **date range** (top right) + **New booking** → `/properties/:propertySlug/form`
3. **Summary cards** — Action Required, Pending Docs, Confirmed Stays, History (Finance-style `surface-card`; count + inline status hints; click toggles `?stage=` filter)
4. **Toolbar** (`BookingFilters`):
   - **Mobile (`max-lg`):** search + refine icon (opens sheet for status / more filters / sort / per-page) + view toggle. Date range stays above when shown.
   - **Desktop (`lg+`):** Row 1: search + Status + More filters + Clear; Row 2: sort + per-page | view toggle
5. Active view content + pagination (table/card only)

---

## Host-facing knowledge

This page is your main dashboard for all bookings at this property. Summary cards group reservations by workflow stage, and you can switch between table, card, kanban, or calendar views to find and work bookings the way you prefer.

**Common host questions**

- Q: What do the summary cards at the top mean?
  A: They group bookings by where they are in your workflow — things needing your action, waiting on guest documents, confirmed upcoming stays, and past or cancelled bookings. Tap a card to filter the list.
- Q: Can I move a booking forward without opening every detail page?
  A: Yes — in kanban view you can drag bookings between columns or click a card to open a quick workflow panel with the same actions as the full booking page.
- Q: How do I create a new booking?
  A: Use **New booking** in the page header — it opens the guest booking form for this property.

---

## Stage summary cards

Click a card to filter the list (table, card, kanban, calendar). Click again to clear.

| Card            | Label                                      | Statuses included                                                                    |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Action Required | Action Required                            | `PENDING_REVIEW`, `READY_FOR_CHECKOUT`, `PENDING_SD_REFUND`                          |
| Pending Docs    | **Pending Docs** (not “Awaiting Response”) | `PENDING_DOCUMENTS`, `PENDING_GAF`, `PENDING_PARKING_REQUEST`, `PENDING_PET_REQUEST` |
| Confirmed Stays | Confirmed Stays                            | `READY_FOR_CHECKIN`                                                                  |
| History         | History                                    | `COMPLETED`, `CANCELLED`                                                             |

**URL:** `?stage=action_required|pending_docs|confirmed|history` (omit for all).

Counts come from a secondary list fetch (same date range, up to 100 rows, includes completed).

When a stage is active, the list query sends the matching `status[]` values to `list-bookings` (intersected with manual status filters when compatible; otherwise stage wins).

---

## Views

| View     | URL               | Notes                                                                                               |
| -------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| Table    | default (desktop) | `BookingTable`                                                                                      |
| Card     | `?view=card`      | Mobile default                                                                                      |
| Kanban   | `?view=kanban`    | Last view toggle; reuses card styling (`GuestAvatar`, flags, `StatusBadge` columns); workflow modal |
| Calendar | `?view=calendar`  | Month grid; `limit=100`, `showCompletedBookings=true`                                               |

---

## Kanban

- Columns follow workflow order: Pending Review → GAF / Parking / Pet → Ready for Check-in → Ready for Check-out → Pending SD Refund → Completed. There is **no** separate **Pending Documents** column — bookings with `status = PENDING_DOCUMENTS` appear in the first incomplete nested step (GAF, then parking, then pet; all complete → Ready for Check-in). **Cancelled** bookings are omitted from the board.
- **Click** a card or **drop** on a valid column → opens **workflow modal** with stage-specific forms and actions only (no progress stepper — kanban column is the pipeline). Uses `WorkflowPanel` `variant="modal"` + `PendingReviewWorkflowGate` `layout="inline"`. Forms use `WorkflowFormShell` `variant="modal"` (no nested sub-form card). Dropping on **GAF / Parking / Pet** from **Pending Review** is valid when **Proceed to Pending Documents** would place the booking on that sub-step (there is no separate Docs column).
- Invalid drops show “Cannot drop here”; valid drops open the modal so the admin completes transitions with the same forms and dev controls as `/bookings/:bookingId` (automation triggers stay on the detail page).
- **Open booking** outline button in the modal header opens the full detail page in a new tab.
- Drag-drop does **not** auto-transition without going through the workflow panel.

---

## Filters & query params

Existing params unchanged: `q`, `status`, `from`, `to`, `hasPets`, `needParking`, `sort`, `page`, `limit`, `view`.

`showCompletedBookings` remains supported for calendar/kanban (auto-enabled in those views); there is no UI toggle — use the **History** stage card or status filter for completed rows.

New: `stage` (see above).

---

## API

- `list-bookings` edge function — admin JWT; see [[PROJECT|Guest Form Management — Project Documentation]] API table.

---

## Implementation map

| Concern               | Path                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| Page                  | `ui/src/features/dashboard/bookings/pages/BookingsListPage.tsx`                |
| Stage mapping         | `ui/src/features/dashboard/bookings/lib/bookingStages.ts`                      |
| Summary cards         | `ui/src/features/dashboard/bookings/components/BookingsSummaryCards.tsx`       |
| Kanban board          | `ui/src/features/dashboard/bookings/components/BookingKanban.tsx`              |
| Kanban workflow modal | `ui/src/features/dashboard/bookings/components/BookingKanbanWorkflowModal.tsx` |
| Workflow (reused)     | `ui/src/features/dashboard/bookings/components/WorkflowPanel.tsx`              |
| Filters               | `ui/src/features/dashboard/bookings/components/BookingFilters.tsx`             |
| Mobile page shell     | `ui/src/components/mobile/MobileBrandHero.tsx` (`AdminMobilePage`)             |
| Routes                | `ui/src/features/dashboard/routes/index.tsx`                                   |

---

## Related docs

- [Booking detail](./bookings-detail.md)
- [Route index](../../README.md)
- [Booking workflow rule](../../../../.cursor/rules/booking-workflow.mdc)
- [`docs/PROJECT.md`](../../../PROJECT.md)
