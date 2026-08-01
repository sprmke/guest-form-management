# Calendar — operator guide

Route: `/org/:orgSlug/property/:propertySlug/calendar`

> **Status:** Documented — Occupancy and Pricing views, including owner-managed date blocks.

## Progress overview

| Section                    | E2E save | Validation | Docs | Notes                                      |
| -------------------------- | -------- | ---------- | ---- | ------------------------------------------ |
| Occupancy calendar         | N/A      | Done       | Done | Name/Price labels; live property bookings  |
| Pricing rates and fees     | Done     | Done       | Done | Existing pricing workflow is embedded here |
| Per-date rates             | Done     | Done       | Done | Future, available nights only              |
| Block / unblock dates      | Done     | Done       | Done | Checkout-exclusive ranges                  |
| Guest availability         | Done     | Done       | Done | Blocks are returned as unavailable ranges  |
| Permissions and view gates | N/A      | Done       | Done | View-specific permissions                  |

---

## Overview

Property **Calendar** combines a read-only occupancy view with pricing and availability
controls. The route uses `?view=occupancy|pricing`; Occupancy is the default when both views
are allowed. The former property `/pricing` route redirects to this page with
`?view=pricing`.

---

## Host-facing knowledge

Calendar is where a host sees which nights are occupied, reviews the nightly value of each
stay, updates future rates, and closes dates that should not be available to guests.

**Common host questions**

- Q: What is the difference between Name and Price?
  A: Name shows the guest's first name on each stay. Price shows that booking's average
  nightly rate.
- Q: Can I close dates without creating a booking?
  A: Yes. Open Pricing, select future available nights, and choose Block. Guests cannot
  select or submit those nights.
- Q: Can I block a date that already has a booking?
  A: No. Existing booked nights must be handled through the booking itself.
- Q: Can I reopen only part of a blocked range?
  A: Yes. Select the blocked nights you want to reopen and choose Unblock. The other nights
  remain blocked.
- Q: Will changing rates update existing bookings?
  A: No. Bookings with saved pricing keep their amounts. Updated defaults apply to future
  pricing reviews that do not already have saved amounts.
- Q: Why can a team member see only one Calendar view?
  A: Calendar access follows their team permissions. Booking access enables Occupancy;
  pricing access enables Pricing; pricing edit access is required to save changes.

---

## Views and permissions

The property route guard and sidebar use a dual gate: the page is available when the user
has either `bookings:view` or `pricing:view`. The page then applies each permission again
to its own view.

| Capability                         | Required permission                   |
| ---------------------------------- | ------------------------------------- |
| Open Calendar route                | `bookings:view` **or** `pricing:view` |
| View Occupancy                     | `bookings:view`                       |
| View Pricing                       | `pricing:view`                        |
| Change rates, fees, or date blocks | `pricing:edit`                        |

- When both views are allowed, both tabs are visible and Occupancy is the default.
- When only one view is allowed, the other tab is hidden and the URL is normalized to the
  allowed `?view=`.
- An unauthorized or unknown `view` value falls back to the first allowed view.
- Pricing remains read-only without `pricing:edit`.
- The server independently enforces `pricing:view` on GET and `pricing:edit` on PATCH.

---

## Occupancy view

Occupancy loads the selected calendar month's property bookings, including completed
stays, with a page size of 100 so a full month normally renders without pagination.
Non-cancelled stays appear as status-colored occupancy spans.

| Control | Behavior                                                       |
| ------- | -------------------------------------------------------------- |
| Name    | Shows the primary guest's first name; falls back to Guest      |
| Price   | Shows `booking_rate ÷ number_of_nights`, compactly formatted   |
| Month   | Changes the booking query to the visible month's start and end |
| Stay    | Opens the booking detail page when selected                    |

The label toggle is local UI state and does not write to the database.

### Load path

1. `PropertyOccupancyCalendarPanel` builds the visible month range.
2. `useBookings` calls **`list-bookings`** with property scope and
   `showCompletedBookings=true`.
3. `BookingCalendarView` renders the results using the selected Name/Price label mode.

---

## Pricing view

Pricing preserves the former Pricing page inside Calendar. It supports base weekday and
Fri–Sun rates, fee defaults, holiday premiums, custom date rates, and owner date blocks.

### Rates and fees

| Field               | Storage column                              | Validation          |
| ------------------- | ------------------------------------------- | ------------------- |
| Weekday rate        | `app_settings.weekday_nightly_rate`         | Non-negative number |
| Fri–Sun rate        | `app_settings.weekend_nightly_rate`         | Non-negative number |
| Down payment        | `app_settings.default_down_payment`         | Non-negative number |
| Security deposit    | `app_settings.default_security_deposit`     | Non-negative number |
| Pet fee             | `app_settings.default_pet_fee`              | Non-negative number |
| Parking rate        | `app_settings.default_parking_rate_guest`   | Non-negative number |
| Extra guest fee     | `app_settings.default_guest_additional_fee` | Non-negative number |
| Holiday rules       | `app_settings.pricing_holiday_rules`        | Valid dated rules   |
| Custom nightly rate | `property_pricing_date_overrides`           | Non-negative number |

Custom date overrides take precedence over holiday premiums. Booked and past nights cannot
be selected for pricing mutations.

### Save path

1. Fee-only changes PATCH **`property-pricing`** immediately.
2. Base-rate changes open **Save pricing**, then PATCH either property-wide defaults or
   visible-month date overrides.
3. Selecting future available nights opens **Set nightly rate**; Apply or Reset PATCHes the
   date override map.
4. The response refreshes rates, booked nights, blocked nights, overrides, and holiday
   rules in the pricing query cache.

---

## Blocked dates

Owner blocks are availability records, not bookings. Each stored range represents occupied
nights in `[start_date, end_date)`: the start night is blocked and the end date is available
for a new check-in.

### Storage

| Column        | Type        | Purpose                                      |
| ------------- | ----------- | -------------------------------------------- |
| `id`          | UUID        | Block identifier                             |
| `property_id` | UUID        | Property scope; cascades when property ends  |
| `start_date`  | date        | First blocked night                          |
| `end_date`    | date        | Checkout-exclusive end                       |
| `note`        | text        | Optional operator note                       |
| `created_at`  | timestamptz | Audit timestamp                              |
| `created_by`  | UUID        | Admin user; retained as null if user is gone |

`end_date` must be after `start_date`. Direct client table access is not used; the service
role operates through authenticated edge functions.

### Block save path

1. A user with `pricing:edit` selects one or more contiguous future available nights.
2. **Block** PATCHes `blockRange: { startDate, endDate, note? }` to
   **`property-pricing`**.
3. The server validates strict `YYYY-MM-DD` dates, an end after start, no past nights, and
   no overlap with a non-cancelled booking.
4. A `property_blocked_dates` row is inserted with the property and admin user.
5. The response returns refreshed `blockedDateKeys`.

### Unblock save path

1. The user selects blocked nights and chooses **Unblock**.
2. The UI PATCHes `unblockDateKeys: string[]`.
3. The server validates every date key, then transactionally removes or splits intersecting
   ranges so unselected nights remain blocked.
4. The response returns refreshed `blockedDateKeys`.

Mixed available/blocked selections are not combined. Drag selection stops at booked nights
or at a change between available and blocked state.

### Guest enforcement

- **`get-booked-dates`** merges future booking ranges and owner-blocked ranges into the
  same unavailable-range response used by the public guest calendar and booking editor.
- **`submit-form`** separately checks blocked nights during the database overlap check.
  This prevents a stale or manually crafted client request from saving a booking on a
  blocked night.
- Cancelled bookings do not block occupancy; owner blocks remain unavailable until
  explicitly unblocked.

---

## API reference

| Action              | Endpoint                 | Permission      | Fields / result                                                                                                  |
| ------------------- | ------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| Load occupancy      | `GET list-bookings`      | `bookings:view` | Month range, completed included, property scope                                                                  |
| Load pricing        | `GET property-pricing`   | `pricing:view`  | Optional `month=YYYY-MM`; returns defaults, `dateOverrides`, `bookedDateKeys`, `blockedDateKeys`, `holidayRules` |
| Save pricing        | `PATCH property-pricing` | `pricing:edit`  | Rate/fee fields, `dateOverrides`, optional `holidayRules`                                                        |
| Block nights        | `PATCH property-pricing` | `pricing:edit`  | `blockRange: { startDate, endDate, note? }`                                                                      |
| Unblock nights      | `PATCH property-pricing` | `pricing:edit`  | `unblockDateKeys: string[]`                                                                                      |
| Public availability | `GET get-booked-dates`   | Public          | Booking and blocked ranges in `{ id, checkInDate, checkOutDate }`                                                |

All admin requests are property-scoped and revalidated server-side.

---

## Implementation map

| Concern                 | Path                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Calendar page shell     | `ui/src/features/dashboard/pricing/pages/PropertyCalendarPage.tsx`                                                                          |
| Occupancy adapter       | `ui/src/features/dashboard/pricing/components/PropertyOccupancyCalendarPanel.tsx`                                                           |
| Occupancy calendar      | `ui/src/features/dashboard/bookings/components/BookingCalendarView.tsx`                                                                     |
| View toggle             | `ui/src/features/dashboard/pricing/components/PropertyCalendarViewToggle.tsx`                                                               |
| Pricing content         | `ui/src/features/dashboard/pricing/pages/PropertyPricingPage.tsx`                                                                           |
| Pricing calendar/modal  | `ui/src/features/dashboard/pricing/components/PricingCalendarGrid.tsx`, `ui/src/features/dashboard/pricing/components/PricingDateModal.tsx` |
| Pricing hooks/API       | `ui/src/features/dashboard/pricing/hooks/usePropertyPricing.ts`, `ui/src/features/dashboard/pricing/lib/propertyPricingApi.ts`              |
| Route and redirect      | `ui/src/features/dashboard/pricing/routes/index.tsx`                                                                                        |
| Route permission gate   | `ui/src/features/dashboard/org/components/RequirePropertyPermission.tsx`                                                                    |
| Sidebar permission gate | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts`                                                                                 |
| Edge function           | `supabase/functions/property-pricing/index.ts`                                                                                              |
| Pricing service         | `supabase/functions/_shared/propertyPricing.ts`                                                                                             |
| Block service           | `supabase/functions/_shared/propertyBlockedDates.ts`                                                                                        |
| Guest availability      | `supabase/functions/get-booked-dates/index.ts`                                                                                              |
| Submit enforcement      | `supabase/functions/_shared/databaseService.ts`, `supabase/functions/submit-form/index.ts`                                                  |
| Schema                  | `supabase/migrations/20260801120000_property_blocked_dates.sql`                                                                             |
| Transactional unblock   | `supabase/migrations/20261001150000_unblock_property_dates_function.sql`                                                                    |

---

## Related docs

- [Route index](../../README.md)
- [Legacy Pricing route](./pricing.md)
- [Property team permissions](./team.md)
- [Public guest calendar](../../calendar.md)
- [`docs/PROJECT.md`](../../../../PROJECT.md)

---

## Pending / follow-ups

- [ ] Keep parking Pricing as a separate page until a parking Calendar project is defined.
