---
title: 'Calendar — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-02
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
block dates. The former property `/pricing` route redirects here. Booked nights show the
saved booking rate (not editable); click a stay pill to open guest details and jump to the
booking record.

---

## Host-facing knowledge

Calendar is where a host updates future rates, sees which nights are occupied, and closes
dates that should not be available to guests.

**Common host questions**

- Q: How do I see who is staying on a night?
  A: Booked stays appear as colored pills spanning check-in through the night before
  check-out. Click the day cell or the pill to open guest details.
- Q: Can I change the rate on a booked night?
  A: No. Booked nights show that booking's nightly rate. Change pricing on the booking
  itself if needed.
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

Month grid titled **Nightly rates**, with the legend under the grid. Close the date
modal with the X or Escape (no Cancel button).

### Available nights

- Weekday and weekend list rates apply by default; holiday rules and custom overrides adjust
  the displayed nightly amount.
- Select one or more **future, unbooked** nights to open the date modal: set a custom rate,
  reset to default, or block. **Block** sits on the left of the footer; **Reset** / **Apply**
  on the right. **Apply** only stores an override when the amount differs from that night's
  base rate (weekday/weekend/holiday); applying the default clears any override so the cell
  is not marked custom.

### Booked nights

- Occupied nights `[check-in, check-out)` render a nightly amount in the day cell: the saved
  booking rate ÷ nights when set; otherwise the property default for that night (same source
  as Review Pricing). New **Pending Review** stays therefore show weekday/weekend/holiday rates
  instead of ₱0.
- A status-colored pill spans the stay across the week grid (Airbnb-style), inset to match
  the rate badge width, with the guest avatar (valid ID photo or initial) on the label.
  Multiple stays stack in separate lanes when they overlap in the same week.
- Click the booked day cell (or the pill) to open a **Booking** modal with guest name, stay
  dates, status, flags, and total booking rate (or estimated default total); from there open
  the full booking detail page.

### Blocked nights

- Blocked nights use a muted cell with a ban icon. They cannot be selected for custom
  pricing until unblocked.
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
`blockedDateKeys`, and `calendarBookings` (non-cancelled stays overlapping that month).

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

- **Past nights:** not selectable for pricing or blocking edits.
- **Checkout morning:** not counted as an occupied calendar night.
- **Cancelled bookings:** excluded from pills and booked-night locks.
- **Month navigation:** refetches pricing + bookings for the visible month via
  `?month=YYYY-MM`.
