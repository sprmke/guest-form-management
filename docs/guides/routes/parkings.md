---
title: 'Parkings (guest marketing) — operator guide'
status: active
tags: [guides, routes, parking]
updated: 2026-08-06
---

# Parkings (guest marketing) — operator guide

Routes:

- `/parkings` — list (location-grouped carousels)
- `/parkings/in/:location` — flat grid for one place (city slug, e.g. `san-fernando-city`, `tagaytay`)
- `/parkings/:parkingSlug` — slot detail (live API)

> **Status:** Documented — list + filters live via `list-public-parkings` (URL facets/sort, chips, mobile sheet sort). Location browse uses `locationSlug`.

## Progress overview

| Section         | E2E save | Validation | Docs       | Notes                                                                   |
| --------------- | -------- | ---------- | ---------- | ----------------------------------------------------------------------- |
| List + filters  | —        | —          | Documented | Live `list-public-parkings`; URL-driven filters + facets                |
| Location browse | —        | —          | Documented | `/parkings/in/:location`                                                |
| Detail page     | —        | —          | Documented | `get-public-parking` + pricing; shared **`BookingCard`** (parking mode) |
| Reserve slot    | —        | —          | Documented | **`useParkingReserve`** → `/parkings/:slug/form` with dates             |
| Parking form    | —        | —          | Documented | Mock `ParkingFormPage` (`dev-parking-form`)                             |

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
  A: Guests can browse and start a reserve flow from a slot page, but end-to-end parking payment is still evolving — many flows still tie back to a property stay.
- Q: Where does my parking slot show up besides the public Parkings browse pages?
  A: On your development's parking list, your public host page, and cross-links from related property listings when configured.
- Q: What happens when a guest taps Reserve on a parking slot?
  A: They open a parking registration form for that slot (dates carried from the picker when present). It is a marketing questionnaire today — not the same as the stay booking form or the paid-parking vehicle form after a guest books a stay.

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
- Overview: **`ParkingOverview`** — parking type badge, title, **`ListingPlaceMeta`** (development · tower · level), dimension stats (length / width / height clearance), **`ListingHostCard`**, **`ListingCheckInOutTimes`**, description (**About this parking**). Brand color tints accents via **`ParkingPublicBrandShell`**. Pricing lives in **`BookingCard`** only.
- Features: **`PropertyAmenities`** when `features[]` is non-empty
- Location: **`PropertyLocation`** when `parkings.settings` has address or map pin (`get-public-parking` returns `address`, `city`, `province`, `country`, `latitude`, `longitude`, `placeId`)
- Mobile: sticky **Reserve** bar opens calendar modal when dates missing

---

## Parking form (`/parkings/:parkingSlug/form`)

**`ParkingFormPage`** — marketing mock form (not the operational stay booking form). Loads live parking detail via **`get-public-parking`**, then renders **`FormPageWrapper`** with the fixed mock form id **`dev-parking-form`**. Back link returns to the parking detail page. Submit is mock-only (Phase 1 UI).

Distinct from:

- Operational stay booking: `/properties/:slug/form` — see [form.md](./form.md)
- Paid parking vehicle details for an existing stay: `/properties/:slug/parking/:bookingId` — see [bookings/parking.md](./bookings/parking.md)
- Development-scoped questionnaires: `/developments/:slug/forms/:formId` — see [developments.md](./developments.md)

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
| Parking form   | `ui/src/features/guest/marketing/pages/ParkingFormPage.tsx`                                                                |
| Edge           | `supabase/functions/get-public-parking/index.ts`                                                                           |
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
| Per-dev list   | `/developments/:slug/parking` — see [developments.md](./developments.md)                                                   |

---

## Related

- [properties.md](./properties.md) — homes list pattern this mirrors
- [developments.md](./developments.md) — development-scoped parking + forms
