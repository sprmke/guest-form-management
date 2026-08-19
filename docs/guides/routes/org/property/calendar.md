---
title: 'Calendar — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-19
---

# Calendar — operator guide

Route: `/org/:orgSlug/property/:propertySlug/calendar`

> **Status:** Documented — unified pricing calendar with booked-stay pills and date blocking.

## Progress overview

| Section                  | E2E save | Validation | Docs | Notes                                     |
| ------------------------ | -------- | ---------- | ---- | ----------------------------------------- |
| Pricing rates and fees   | Done     | Done       | Done | Weekday/weekend defaults + fee sidebar    |
| Per-date rates           | Done     | Done       | Done | Future, available nights only             |
| Booked stays on calendar | Done     | Done       | Done | Spanning pills; click for guest modal     |
| Block / unblock dates    | Done     | Done       | Done | Checkout-exclusive ranges                 |
| Guest availability       | Done     | Done       | Done | Blocks are returned as unavailable ranges |
| Permissions              | N/A      | Done       | Done | `pricing:view` / `pricing:edit`           |

---

## Overview

Property **Calendar** is the single place to manage nightly rates, see booked stays, and
block dates. The former property `/pricing` route redirects here. Nightly list prices appear
on unbooked nights (including past). Booked nights show the stay pill, not a cell price;
click a stay to open guest details and jump to the booking record.

---

## Host-facing knowledge

Calendar is where a host updates future rates, sees which nights are occupied, and closes
dates that should not be available to guests.

**Common host questions**

- Q: How do I see who is staying on a night?
  A: Booked stays appear as colored pills spanning check-in through the night before
  check-out. Hover a pill for the guest, dates, and total. Click the pill to open details.
- Q: Can I change the rate on a booked night?
  A: No. Booked nights show the guest stay, not a list price. Open the stay to see the
  booking amount; change pricing on the booking itself if needed.
- Q: Why do some days have no price?
  A: Booked nights hide the list price and show the guest stay instead. Open nights —
  including past ones — still show the nightly amount.
- Q: Can I close dates without creating a booking?
  A: Yes. Select future available nights and choose Block. Guests cannot select or submit
  those nights.
- Q: Can I block a date that already has a booking?
  A: No. Existing booked nights must be handled through the booking itself.
- Q: Can I reopen only part of a blocked range?
  A: Yes. Select the blocked nights you want to reopen and choose Unblock. The other nights
  remain blocked.
- Q: Will changing rates update existing bookings?
  A: No. Bookings with saved pricing keep their amounts. Updated defaults apply to future
  pricing reviews that do not already have saved amounts.

---

## Permissions

| Capability                         | Required permission |
| ---------------------------------- | ------------------- |
| Open Calendar route                | `pricing:view`      |
| Change rates, fees, or date blocks | `pricing:edit`      |

- Without `pricing:edit`, the calendar and fee sidebar are read-only.
- The server enforces `pricing:view` on GET and `pricing:edit` on PATCH.

---

## Calendar grid

Month grid titled **Rates & availability** (_Manage pricing and availability_ on desktop), with the legend under the grid. Close the date
modal with the X or Escape (no Cancel button).

### Available nights

- Unbooked nights show the nightly list price at the bottom of the cell, including past
  dates. Weekday and weekend list rates apply by default; holiday rules and custom
  overrides adjust the amount.
- Select one or more **future, unbooked** nights to open the date modal: set a custom rate,
  reset to default, or block. **Block** sits on the left of the footer; **Reset** / **Apply**
  on the right. **Apply** only stores an override when the amount differs from that night's
  base rate (weekday/weekend/holiday); applying the default clears any override so the cell
  is not marked custom.

### Booked nights

- Occupied nights `[check-in, check-out)` **do not show a list price** in the day cell.
  **Booked** is the spanning stay pill (guest first name + avatar). Future booked cells stay
  a white card; past booked cells use a slightly muted surface and a faded pill.
- Pills anchor to the **bottom** of the cell (same band as the nightly price chip). Extra
  overlapping stays stack upward from there — a single stay does not float in the middle when
  another night in that week has two stays.
- Cancelled stays are included on the grid (muted pill) and render **above** active stays
  when they overlap the same night. They do not lock the night or hide the list price unless
  another non-cancelled stay also occupies it.
- A teal pill spans the stay across the week grid, inset to match the rate-chip width.
  Multiple stays stack in separate lanes when they overlap in the same week.
- The calendar shows up to **three** visible stay lanes per day. If a day has more than three
  overlapping stays, the cell shows a `+N` badge in the top-right. Hovering that badge lists
  the hidden bookings for that day.
- Click a stay pill to open the booking modal. Hover on the pill shows guest name, stay dates,
  and total. Booked day cells themselves do not show a stay tooltip; hover the pill instead.
  When two stays overlap, hover or click each pill — the cell does not pick a stay.

### Past nights

- Past **unbooked** cells are faded and not selectable. They still show the nightly list
  price (Airbnb-style), so you can see what that night was set to.
- Past **booked** cells remain clickable so the host can open the stay, but they hide the
  list price.

### Blocked nights

- Blocked nights use a muted cell with a ban icon. They cannot be selected for custom
  pricing until unblocked.
- Blocked nights still show the list price (with a ban icon), including past blocked
  nights.
- Blocking rejects past dates and any night that is already booked.

---

## Rates and fees sidebar

Same as the legacy pricing page: weekday/weekend base rates, fee defaults (down payment,
security deposit, pet, parking, extra guest), and save flows for base-rate scope and
fee-only updates.

---

## API and data

| Concern                               | Path                              |
| ------------------------------------- | --------------------------------- |
| Load/save pricing + calendar bookings | `property-pricing` edge function  |
| Blocked dates table                   | `property_blocked_dates`          |
| Date overrides                        | `property_pricing_date_overrides` |
| Defaults                              | `app_settings` per property       |

**GET** `property-pricing?month=YYYY-MM` returns defaults, overrides, `bookedDateKeys`,
`blockedDateKeys`, and `calendarBookings` (stays overlapping that month, including cancelled).

**PATCH** accepts rate/fee fields, `dateOverrides`, `blockRange`, and `unblockDateKeys`.

Guest availability (`get-booked-dates`, `submit-form`) treats blocked nights as
unavailable alongside existing bookings.

---

## Implementation map

| UI                                                                             | Server                                               |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `ui/src/features/dashboard/pricing/pages/PropertyPricingPage.tsx`              | `supabase/functions/property-pricing/index.ts`       |
| `ui/src/features/dashboard/pricing/components/PricingCalendarGrid.tsx`         | `supabase/functions/_shared/propertyPricing.ts`      |
| `ui/src/features/dashboard/pricing/components/PricingCalendarBookingModal.tsx` | —                                                    |
| `ui/src/features/dashboard/pricing/routes/index.tsx`                           | `supabase/functions/_shared/propertyBlockedDates.ts` |

Spanning pill layout reuses `calendarDateUtils` and `CalendarOccupancySpanTrack` from the
bookings calendar module.

---

## Edge cases

- **Past nights:** not selectable for pricing or blocking edits. Unbooked past nights still
  show the list price; booked past nights do not.
- **Checkout morning:** not counted as an occupied calendar night.
- **Cancelled bookings:** shown as muted pills (above active stays when they overlap) but
  excluded from booked-night locks.
- **Month navigation:** refetches pricing + bookings for the visible month via
  `?month=YYYY-MM`.
