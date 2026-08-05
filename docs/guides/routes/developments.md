---
title: 'Developments (guest marketing) — operator guide'
status: active
tags: [guides, routes, developments]
updated: 2026-08-02
---

# Developments (guest marketing) — operator guide

Routes:

- `/developments` — list (location-grouped carousels)
- `/developments/in/:location` — flat list for one place (city slug, e.g. `tagaytay`, `sta-rosa`)
- `/developments/:slug` — detail (hero, amenities, unit + parking previews)
- `/developments/:slug/properties` — all units in development
- `/developments/:slug/parking` — parking slot list
- `/developments/:slug/parking/category` · `…/parking/list` — legacy redirects → `…/parking`
- `/developments/:slug/forms/:formId` — development-scoped public form

> **Status:** Documented — list + filters live via `list-public-developments` (URL facets/sort, chips, mobile sheet sort). Detail/location sub-pages may still use mocks.

## Progress overview

| Section            | E2E save | Validation | Docs       | Notes                                                                                                                                                                           |
| ------------------ | -------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developments list  | —        | —          | Documented | Live `list-public-developments`; URL-driven filters + facets                                                                                                                    |
| Location browse    | —        | —          | Documented | Properties grouped by development                                                                                                                                               |
| Development detail | —        | —          | Documented | Hero, amenities, unit + parking previews                                                                                                                                        |
| Properties in dev  | —        | —          | Documented | Links to `/properties/:slug`                                                                                                                                                    |
| Parking flow       | —        | —          | Documented | Slot list at `…/parking`; compact carousel cards (same as `/parkings`) — square photo, Inside/Outside badge, **Parking in {city}**, tower · level subtitle on development pages |
| Development form   | —        | —          | Documented | Mock submit                                                                                                                                                                     |

---

## Overview

Condominium / building marketing pages (PMA `features/marketing/developments/**`). Used for multi-unit developments and shared parking forms.

**Unknown slug:** redirects to **`/developments`**.

---

## Host-facing knowledge

Development pages market a whole building or condominium — guests can browse units, parking slots, and building amenities before opening an individual home listing.

**Common host questions**

- Q: When should I use a development page instead of a single property listing?
  A: Use it when you manage multiple units or shared parking in one building — guests see the building first, then pick a unit or slot.
- Q: What are the custom form links on a development?
  A: They're optional public questionnaires (for example parking interest surveys) — separate from the main guest booking form and not wired to live submissions yet.
- Q: Why can guests see parking on my development but not book it there?
  A: The parking list is informational today; operational parking payment still goes through the booking workflow after a guest reserves a stay.

---

## List (`/developments`)

**`DevelopmentsListPage`** — **`list-public-developments`** edge function; URL params drive filters/sort; facets from API (types, cities, price, developers). Empty facet sections in the sidebar show **None**. Lean candidates load in deterministic 1,000-row ranges (20,000-row fail-closed ceiling); `propertyCount` on cards is loaded for the **current page only** (not used for facets/sort).

- **Grid view (default):** Airbnb-style rows grouped by **`city`** (`DevelopmentsByLocation` → `DevelopmentsLocationRow`). Each row has a clickable title + chevron (**View all** → `/developments/in/:location`), horizontal scroll of compact cards, and desktop carousel chevrons.
- **List view:** flat **`DevelopmentsGrid`** (list layout).
- **Map view:** Google Map with price pins for geocoded developments on the current page; pan/zoom **automatically** updates `swLat`/`swLng`/`neLat`/`neLng` in the URL after the map settles (same bbox contract as `/properties`), including after the initial fit. Pin preview links to **`/developments/:slug`**. Requires `VITE_GOOGLE_MAPS_API_KEY`. View mode persists via `?view=map|list` (grid omits `view`). In map view, sidebar facets (types, cities, developers, price) are computed from the **visible map pool** before categorical filters, so options track what’s on screen.

On scroll, **`ListingHeroSearch`** morphs into the fixed header center (same behavior as `/properties`).

**Where field:** empty on `/developments` (category index — do not prefill the nav label); city name on `/developments/in/:location`; development name on `/developments/:slug`, `/developments/:slug/properties`, and `/developments/:slug/parking` (`listingSearchDefaultLocation.ts`). Placeholder: **Search developments** (`listingSearchFields.ts`). Parking routes omit the **Who** segment.

---

## Location browse (`/developments/in/:location`)

**`DevelopmentsLocationPage`** — properties in that place, **grouped by development** (Airbnb-style rows).

- **`:location`** — slugified city (`tagaytay`, `sta-rosa`, …) via **`toLocationSlug`** / **`findCityByLocationSlug`**.
- **Grid (default):** **`PropertiesByDevelopment`** — one carousel row per development; title → **`/developments/:slug`**.
- **List:** flat property list for all units in those developments.
- Toolbar count is **properties** (not developments).
- Same scroll search morph as `/developments` (`listingScrollSearchPaths` matches `/developments/in/*`).
- Unknown location slug → redirect to **`/developments`**.

Route is registered **before** `/developments/:slug` so `in` is not treated as a development slug.

---

## Detail (`/developments/:slug`)

**`DevelopmentDetailPage`** — search bar above compact hero carousel (**Where** = development name). Hero CTAs: **View Homes** → **`/developments/:slug/properties`**, **View Parking** → **`/developments/:slug/parking`** (when slots exist). **`DevelopmentAmenities`**, then **`DevelopmentAvailableSection`** — carousel rows for **Available Homes** and **Available Parking** (title + chevron → full list pages).

---

## Properties in development (`/developments/:slug/properties`)

**`DevelopmentPropertiesPage`** — same layout as **`/properties/in/:location`**: search bar, filter toolbar, **Homes in {development}** heading with **View Parking** → `…/parking` on the right when the development has parking slots, then property grid/list/map. Cards link to **`/properties/:propertySlug`**.

---

## Parking

| Route                  | Page                         | Behavior                                                                                                                                                                                         |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.../parking`          | `DevelopmentParkingListPage` | Same layout as `…/properties`: hero search, collapsible **ParkingFilters** sidebar (location, tower, price), toolbar + sort, **Parking in {development}** + **View Homes**, available slots only |
| `.../parking/category` | redirect                     | → `.../parking` (legacy)                                                                                                                                                                         |
| `.../parking/list`     | redirect                     | → `.../parking` (legacy)                                                                                                                                                                         |

**Search bar** — **`ListingHeroSearch`** / **`HeroSearch`**; **Where** = **`{development} Parking`**; **Who** hidden. Search updates `?location` / `?checkIn` / `?checkOut` (dates reserved for future availability checks). **ParkingFilters:** **Location** (Inside / Outside Tower), **Tower** (when Inside Tower selected), price. List shows **available slots only** (`isAvailable`).

Not connected to operational **`/bookings/:id/parking`** (admin/guest pay parking flow).

---

## Development form (`/developments/:slug/forms/:formId`)

**`DevelopmentFormPage`** — same **`PublicFormRenderer`** shell as property forms; definitions from **`mockForms`**.

---

## Implementation map

| Concern    | Path                                                                |
| ---------- | ------------------------------------------------------------------- |
| Pages      | `ui/src/features/guest/marketing/pages/DevelopmentsListPage.tsx`    |
|            | `DevelopmentsLocationPage.tsx`                                      |
|            | `DevelopmentDetailPage.tsx`, `DevelopmentPropertiesPage.tsx`        |
|            | `DevelopmentParkingListPage.tsx`                                    |
|            | `DevelopmentFormPage.tsx`                                           |
| Components | `ui/src/features/guest/marketing/developments/components/**`        |
|            | `DevelopmentsByLocation.tsx`, `DevelopmentsLocationRow.tsx`         |
| Grouping   | `developments/lib/groupDevelopmentsByLocation.ts`                   |
|            | `properties/lib/groupPropertiesByDevelopment.ts`                    |
| Mock data  | `developments/data/mockDevelopments.ts` (+ linked `mockProperties`) |
| Routes     | `ui/src/features/guest/marketing/routes/index.tsx`                  |

---

## Related docs

- [Properties](./properties.md)
- [Route index](./README.md)

---

## Pending / follow-ups

- [ ] Public API for developments + parking inventory
- [ ] Link parking list to real slot booking / payment flow
