# Parkings (guest marketing) — operator guide

Routes:

- `/parkings` — list (location-grouped carousels)
- `/parkings/in/:location` — flat grid for one place (city slug, e.g. `san-fernando-city`, `tagaytay`)
- `/parkings/:parkingSlug` — slot detail (live API)

> **Status:** Documented — **Phase 1 (UI only)**. Mock parking slots from developments catalog.

## Progress overview

| Section         | E2E save | Validation | Docs       | Notes                                                                   |
| --------------- | -------- | ---------- | ---------- | ----------------------------------------------------------------------- |
| List + filters  | —        | —          | Documented | Location-grouped carousels (grid)                                       |
| Location browse | —        | —          | Documented | `/parkings/in/:location`                                                |
| Detail page     | —        | —          | Documented | `get-public-parking` + pricing; shared **`BookingCard`** (parking mode) |
| Reserve slot    | —        | —          | Documented | **`useParkingReserve`** → `/parkings/:slug/form` with dates             |

---

## Overview

Browse parking slots across developments. Mirrors **`/properties`** list + location browse patterns. Data comes from **`mockParkingSlots`** joined to **`mockDevelopments`** (city grouping).

**Unknown location slug:** redirects to **`/parkings`**.

Main nav: **Parkings** → `/parkings` (replaces legacy **About** link).

---

## List (`/parkings`)

**`ParkingsListPage`** — hero search, collapsible **`ParkingFilters`** sidebar (location type, tower, price), **`ParkingToolbar`** sort, location-grouped carousels via **`ParkingsByLocation`**.

- Each row title: **Parking in {city}** → **View all** → `/parkings/in/:location`
- Cards: **`ParkingSlotCard`** carousel variant — **Parking in {city}** title + **development name** subtext (matches property carousel pattern); **Reserve** via card link to development form
- On scroll, **`ListingHeroSearch`** morphs into the fixed header center (same as `/properties`).

**Where field:** `Parkings` on `/parkings`; `{city} Parking` on `/parkings/in/:location` (`listingSearchDefaultLocation.ts`).

---

## Location browse (`/parkings/in/:location`)

**`ParkingsLocationPage`** — all parking slots in one city.

- **`:location`** — slugified city via **`toLocationSlug`** / **`findCityByLocationSlug`**
- Page title: **Parking in {city}**
- Flat **`ParkingsEntriesGrid`** (responsive card grid)
- Same filters + sort as list page
- Unknown location slug → redirect to **`/parkings`**

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
| Edge           | `supabase/functions/get-public-parking/index.ts`                                                                           |
| Location page  | `ui/src/features/guest/marketing/pages/ParkingsLocationPage.tsx`                                                           |
| Grouping       | `ui/src/features/guest/marketing/parkings/lib/groupParkingsByLocation.ts`                                                  |
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
