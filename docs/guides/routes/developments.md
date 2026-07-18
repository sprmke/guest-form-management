# Developments (guest marketing) — operator guide

Routes:

- `/developments` — list (location-grouped carousels)
- `/developments/in/:location` — flat list for one place (city slug, e.g. `tagaytay`, `sta-rosa`)
- `/developments/:slug` — detail (hero, amenities, unit + parking previews)
- `/developments/:slug/properties` — all units in development
- `/developments/:slug/parking` — parking slot list
- `/developments/:slug/parking/category` · `…/parking/list` — legacy redirects → `…/parking`
- `/developments/:slug/forms/:formId` — development-scoped public form

> **Status:** Documented — **Phase 1 (UI only)**. PMA UI ported; mock data.

## Progress overview

| Section            | E2E save | Validation | Docs       | Notes                                                                                                                                                                           |
| ------------------ | -------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developments list  | —        | —          | Documented | Location-grouped carousels                                                                                                                                                      |
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

## List (`/developments`)

**`DevelopmentsListPage`** — **`mockDevelopments`** with search/filter UI (client-only).

- **Grid view (default):** Airbnb-style rows grouped by **`city`** (`DevelopmentsByLocation` → `DevelopmentsLocationRow`). Each row has a clickable title + chevron (**View all** → `/developments/in/:location`), horizontal scroll of compact cards, and desktop carousel chevrons.
- **List view:** flat **`DevelopmentsGrid`** (list layout).

On scroll, **`ListingHeroSearch`** morphs into the fixed header center (same behavior as `/properties`).

**Where field:** `Developments` on `/developments`; `{city} Developments` on `/developments/in/:location`; development name on `/developments/:slug` and `/developments/:slug/properties`; **`{development} Parking`** on `/developments/:slug/parking` (`listingSearchDefaultLocation.ts`). Parking routes omit the **Who** segment (`listingSearchFields.ts`).

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
