---
title: 'Parkings (guest marketing) — operator guide'
status: active
tags: [guides, routes, parking]
updated: 2026-08-23
---

# Parkings (guest marketing) — operator guide

Routes:

- `/parkings` — list (location-grouped carousels)
- `/parkings/in/:location` — flat grid for one place (city slug, e.g. `san-fernando-city`, `tagaytay`)
- `/parkings/:parkingSlug` — slot detail (live API)
- `/parkings/:parkingSlug/form` — guest parking request submit
- `/parkings/requests/:bookingId` — guest parking request status

> **Status:** Documented — list + filters live via `list-public-parkings` (URL facets/sort, chips, mobile sheet sort). Location browse uses `locationSlug`.

## Progress overview

| Section         | E2E save | Validation | Docs       | Notes                                                                               |
| --------------- | -------- | ---------- | ---------- | ----------------------------------------------------------------------------------- |
| List + filters  | —        | —          | Documented | Live `list-public-parkings`; URL-driven filters + facets                            |
| Location browse | —        | —          | Documented | `/parkings/in/:location`                                                            |
| Detail page     | —        | —          | Documented | `get-public-parking` + pricing; **Contact Host** web chat; **ACTIVE** only          |
| Reserve slot    | —        | —          | Documented | **`useParkingReserve`** → in-place **`ParkingBookingFormModal`** (guest-auth gated) |
| Parking form    | Done     | Done       | Documented | Real submit via `submit-parking-booking-request`; zero-candidate 422                |
| Request status  | —        | —          | Documented | Polling status page (`get-parking-booking-status`, 4s interval)                     |

---

## Overview

Browse parking slots across developments. **`ParkingsListPage`** uses **`list-public-parkings`** (live DB). Location browse (`/parkings/in/:location`) uses the same API with **`locationSlug`**.

**Unknown location slug:** redirects to **`/parkings`**.

Main nav: **Parkings** → `/parkings` (replaces legacy **About** link).

---

## Host-facing knowledge

Guests browse standalone parking slots by city or building, open a slot detail page, and can reserve through the same date-picker pattern as home listings. Host cards link to the public host profile when the slot is live.

**Common host questions**

- Q: Is parking booking fully self-serve for guests today?
  A: Guests can browse and start a reserve flow from a slot page, but end-to-end parking payment is still evolving. Many flows still tie back to a property stay.
- Q: Where does my parking slot show up besides the public Parkings browse pages?
  A: On your development's parking list, your public host page, and cross-links from related property listings when configured.
- Q: What happens when a guest taps Reserve on a parking slot?
  A: The parking request form opens in a modal right on the slot page (dates carried over from the picker when present) instead of navigating to a separate page — same pattern as the property Reserve flow. Guests without a session are prompted to sign in first and land back in the open modal afterward. Submitting it creates a real parking request, not a mock lead form, and eligible parking hosts in the same organization are notified right away.
- Q: How does the guest know if a host accepted the request?
  A: After submit, the guest is sent to a request-status page that shows whether the request is still waiting, already accepted, cancelled, or ended with no host available. If a host accepts, the guest also sees the slot label and any access note the host added.

---

## List (`/parkings`)

**`ParkingsListPage`** — hero search, collapsible **`ParkingFilters`** sidebar (location type, tower, price), **`ParkingToolbar`** sort, location-grouped carousels via **`ParkingsByLocation`**. Filters/sort from URL; tower options from API facets. When Tower is shown but has no options, the section shows **None**.

- **Scale behavior:** `list-public-parkings` reads lean candidates in deterministic 1,000-row ranges, computes availability/Nearby/totals/facets before page slicing, and fails closed above 20,000 rows instead of silently truncating totals. Default unfiltered `/parkings` additionally uses `list-public-place-groups?family=parkings` for six city rows with eight previews each; **Show more places** appends later groups. Filtered browse stays on `list-public-parkings`. When map bbox params are present (e.g. `/search` parkings map tab), facets are computed from the **visible map pool** before location/tower/price filters.
- Each row title: **Parking in {city}** → **View all** → `/parkings/in/:location`
- Cards: **`ParkingSlotCard`** carousel variant — **Parking in {city}** title + **development name** subtext (matches property carousel pattern); **Reserve** via card link to development form
- On scroll, **`ListingHeroSearch`** morphs into the fixed header center (same as `/properties`).

**Where field:** empty on `/parkings` (category index — do not prefill the nav label); city name on `/parkings/in/:location` (`listingSearchDefaultLocation.ts`). Placeholder: **Search parkings** (`listingSearchFields.ts`).

---

## Location browse (`/parkings/in/:location`)

**`ParkingsLocationPage`** — live parking slots in one city.

- **`:location`** — slugified city via shared **`normalizeCityPlace`** + **`toLocationSlug`** (matches place-groups).
- Loads **`list-public-parkings?locationSlug=…`** (paged).
- Page title: **Parking in {city}**
- Flat **`ParkingsEntriesGrid`** (responsive card grid)
- Same filters + sort chrome as list page (client filter on the loaded page window)
- Unknown / empty location → redirect to **`/parkings`**. Error: **Try again**.

Route is registered at the marketing shell level (no dynamic slug conflict).

---

## Detail (`/parkings/:parkingSlug`)

**`ParkingDetailPage`** — same shell as **`PropertyDetailPage`**: full-width **`ListingGallery`** (Share; single-photo uses the same tall panoramic layout), then **`lg:grid-cols-3`** with overview + amenities left and **`BookingCard`** sticky right.

- Gallery: **`ListingGallery`** (shared with property via **`PropertyGallery`** wrapper)
- Overview: **`ParkingOverview`** — parking type badge, title, **`ListingPlaceMeta`** (development · tower · level), dimension stats (length / width / height clearance), **`ListingHostCard`** (**Contact Host** opens guest web chat sheet), **`ListingCheckInOutTimes`**, description (**About this parking**). Brand color tints accents via **`ParkingPublicBrandShell`**. Pricing lives in **`BookingCard`** only.
- Features: **`PropertyAmenities`** when `features[]` is non-empty
- Location: **`PropertyLocation`** when `parkings.settings` has address or map pin (`get-public-parking` returns `address`, `city`, `province`, `country`, `latitude`, `longitude`, `placeId`)
- Mobile: sticky **Reserve** bar opens calendar modal when dates missing

### Reserve (in-place modal)

Tapping **Reserve** with dates selected — desktop **`BookingCard`** or the mobile sticky bar — no longer navigates to `/parkings/:parkingSlug/form`. Instead **`useParkingReserve`**'s `onOpenForm` callback (wired from `ParkingDetailPage`) opens **`ParkingBookingFormModal`** right on the detail page, mirroring **`GuestBookingFormModal`** on the property flow:

- Guest-auth gated via `requireGuestAuth` with a `parking_booking_form_modal` resume entry (`guestAuthResume.ts`) — an unauthenticated guest is sent through sign-in and returned to `/parkings/:parkingSlug?reserveForm=open[&checkInDate=&checkOutDate=]`, which `ParkingDetailPage` reads once authenticated to reopen the modal (same `reserveForm=open` param convention as `guestPropertyReserveFormOpenPath`, via the parking-specific `guestParkingReserveFormOpenPath`)
- Renders the same **`ParkingRegistrationForm`** wizard as the standalone form page, inside **`GuestDialogShell`**
- On successful submit, closes the modal and navigates to `/parkings/requests/:bookingId` (unlike the standalone form page's inline **`FormSuccess`** — the modal forwards straight to tracking since the guest is already mid-session on the slot page)
- The direct URL `/parkings/:parkingSlug/form` still exists as a standalone fallback (e.g. shared links) and is unchanged

---

## Parking form (`/parkings/:parkingSlug/form`)

**`ParkingFormPage`** — guest parking-request form, still reachable directly (shared links, no-JS-modal fallback) even though the Reserve button on the detail page now opens the same form in a modal (see **Reserve (in-place modal)** above). Loads live parking detail via **`get-public-parking`**, then renders a dedicated **`ParkingRegistrationForm`** (not the generic template-driven form-builder engine used by pet/guest-advise forms) inside the page's own header/footer shell.

`ParkingRegistrationForm` (`ui/src/features/guest/marketing/parkings/components/ParkingRegistrationForm.tsx`) is a 3-step wizard modeled on the main guest form (**`GuestForm`**) — same `Form`/`FormField` primitives, the real **`DatePicker`** popover (not a raw `<input type="date">`), and the shared **`GuestFormStepper`** / **`GuestFormStepNavigation`** components. Stepper labels and in-card section titles share one **`title`** per step (`parkingRegistrationSteps.ts`):

1. **Guest** — guest name, email, phone (required)
2. **Booking** — read-only **Tower** (when known), unit number, check-in/check-out dates
3. **Vehicle** — vehicle type (car/motorcycle), plate number, brand/model, color, notes

Validated with a dedicated Zod schema (`parkingRegistrationSchema.ts`), not RHF `register()` with no rules like the generic form-builder fields. Placeholders reuse the shared **`FORM_PLACEHOLDERS`** constants (`ui/src/lib/constants/formPlaceholders.ts`) for parity with the main guest form.

Save flow:

1. Guest arrives from **Reserve** (dates preserved when present) and must already pass the guest-auth gate used by **`useParkingReserve`**
2. Form submits through **`useSubmitParkingBookingRequest`** → **`submit-parking-booking-request`**
3. Server validates org + optional pinned slot, checks candidate availability, and returns **422 `no_parking_available`** with no insert when no eligible parking can take the request
4. Success shows an inline **`FormSuccess`** card with a **Track Request** link to **`/parkings/requests/:bookingId`** (no page redirect)

Validation / behavior highlights:

- `vehicleType` is required (`car` or `motorcycle`)
- `phone` is required — 11-digit Philippine mobile starting with `09` (same rules as the main guest form via `requiredPhilippineMobilePhoneZodSchema`)
- `checkOutDate` must be after `checkInDate` (schema-level `.refine`)
- Reserve dates from the query string (`?checkInDate=&checkOutDate=`) prefill the check-in/check-out date pickers and also appear in a **`ParkingStaySummary`** card above the form when present
- Guest-facing error mapping turns internal edge errors into short copy such as **No parking slots are available for these dates**

Distinct from:

- Operational stay booking: `/properties/:slug/form` — see [form.md](./form.md)
- Paid parking vehicle details for an existing stay: `/properties/:slug/parking/:bookingId` — see [bookings/parking.md](./bookings/parking.md)
- Development-scoped questionnaires: `/developments/:slug/forms/:formId` — see [developments.md](./developments.md)

---

## Request status (`/parkings/requests/:bookingId`)

**`ParkingRequestStatusPage`** — public guest status page for a submitted parking request.

- Focused flow: marketing nav/footer hidden (same as property forms); **`FormPageToolbar`** + back link to **`/parkings`**
- Initial load + refresh path: **`get-parking-booking-status?bookingId=`**
- Returned fields: status, stay dates, expiry time, organization label, slot label after claim, and optional host endorsement note
- Polls every 4 seconds until a terminal or claimed status is reached
- Stay dates render as readable ranges (e.g. **Aug 25 - 27, 2026**) with night count via shared **`ParkingStaySummary`**
- `PENDING_HOST_ACCEPTANCE` shows a 3-step progress indicator, response-window countdown (`MM:SS` under 1h), and polling spinner while refetching
- `PENDING_REVIEW` / `READY_FOR_CHECKIN` / `COMPLETED` show the claimed slot label when available
- `NO_HOST_AVAILABLE` and `CANCELLED` are short terminal states with a **Browse Parking** CTA

Security / access notes:

- The page reads by booking UUID only; there is no list endpoint
- Missing and non-parking rows both return the same not-found behavior, so guests cannot enumerate other bookings

---

## Implementation map

| Concern        | Path                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| List page      | `ui/src/features/guest/marketing/pages/ParkingsListPage.tsx`                                                               |
| Detail page    | `ui/src/features/guest/marketing/pages/ParkingDetailPage.tsx`                                                              |
| Overview       | `ui/src/features/guest/marketing/parkings/components/ParkingOverview.tsx`                                                  |
| Gallery        | `ui/src/features/guest/marketing/shared/components/ListingGallery.tsx`                                                     |
| Host card      | `ui/src/features/guest/marketing/shared/components/ListingHostCard.tsx`                                                    |
| Place meta     | `ui/src/features/guest/marketing/shared/components/ListingPlaceMeta.tsx`                                                   |
| Public host    | `ui/src/features/guest/marketing/properties/hooks/usePublicHost.ts` + `HostPublicPage` (`parkings` from `get-public-host`) |
| Public hook    | `ui/src/features/guest/marketing/parkings/hooks/usePublicParkingDetail.ts`                                                 |
| Reserve modal  | `ui/src/features/guest/marketing/parkings/components/ParkingBookingFormModal.tsx`                                          |
| Reserve hook   | `ui/src/features/guest/marketing/parkings/hooks/useParkingReserve.ts`                                                      |
| Parking form   | `ui/src/features/guest/marketing/pages/ParkingFormPage.tsx`                                                                |
| Form component | `ui/src/features/guest/marketing/parkings/components/ParkingRegistrationForm.tsx`                                          |
| Form schema    | `ui/src/features/guest/marketing/parkings/lib/parkingRegistrationSchema.ts`                                                |
| Form steps     | `ui/src/features/guest/marketing/parkings/lib/parkingRegistrationSteps.ts`                                                 |
| Request status | `ui/src/features/guest/marketing/parkings/pages/ParkingRequestStatusPage.tsx`                                              |
| Submit hook    | `ui/src/features/guest/marketing/parkings/hooks/useSubmitParkingBookingRequest.ts`                                         |
| Status hook    | `ui/src/features/guest/marketing/parkings/hooks/useParkingBookingStatus.ts`                                                |
| Public detail  | `supabase/functions/get-public-parking/index.ts`                                                                           |
| Submit edge    | `supabase/functions/submit-parking-booking-request/index.ts`                                                               |
| Status edge    | `supabase/functions/get-parking-booking-status/index.ts`                                                                   |
| Location page  | `ui/src/features/guest/marketing/pages/ParkingsLocationPage.tsx`                                                           |
| Grouping       | `ui/src/features/guest/marketing/parkings/lib/groupParkingsByLocation.ts`                                                  |
| Place groups   | `ui/src/features/guest/marketing/shared/hooks/usePublicPlaceGroups.ts` + `list-public-place-groups`                        |
| Entry builder  | `ui/src/features/guest/marketing/parkings/lib/parkingListEntries.ts`                                                       |
| UI components  | `ui/src/features/guest/marketing/parkings/components/*`                                                                    |
| Slot cards     | `ui/src/features/guest/marketing/developments/components/ParkingSlotCard.tsx`                                              |
| Filters / sort | `ui/src/features/guest/marketing/developments/lib/parkingSlotFilters.ts`                                                   |
| Routes         | `ui/src/features/guest/marketing/routes/index.tsx`                                                                         |
| Nav link       | `ui/src/features/guest/marketing/shared/components/MarketingNav.tsx`                                                       |
| Scroll search  | `ui/src/features/guest/marketing/shared/lib/listingScrollSearchPaths.ts`                                                   |
| Search default | `ui/src/features/guest/marketing/shared/lib/listingSearchDefaultLocation.ts`                                               |
| Parking spec   | `.cursor/rules/parking-workflow.mdc`                                                                                       |
| Per-dev list   | `/developments/:slug/parking` — see [developments.md](./developments.md)                                                   |

---

## Related

- [properties.md](./properties.md) — homes list pattern this mirrors
- [developments.md](./developments.md) — development-scoped parking + forms
