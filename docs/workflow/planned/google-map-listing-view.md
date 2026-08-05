---
stage: planned
title: 'Google Map listing view — Implementation Plan'
status: planned
tags: [planning, search, marketing, maps]
updated: 2026-08-05
---

# Google Map listing view — Implementation Plan

> **For agentic workers:** Implement task-by-task. Spec: [`../intake/google-map-listing-view-design.md`](../intake/google-map-listing-view-design.md). Align with [`../intake/listing-search-pagination-design.md`](../intake/listing-search-pagination-design.md).

**Goal:** Replace the mock map with production Google Maps pins on property lists and `/search` category tabs, with page-synced pins plus bbox “Search this area” for scale.

**Architecture:** Shared `ListingMapView` (Google Maps JS + clustering + preview card). List/search APIs expose lat/lng on page rows and accept bbox for marker-lite responses (hard cap). URL `view=map` + optional bbox params.

**Tech stack:** Existing `@googlemaps/js-api-loader`, Maps JS, Vite/React, TanStack Query, Deno edge functions.

## Global constraints

- Reuse `useGoogleMapsLoader` — no Mapbox.
- Minimal UI copy; Lucide only; DESIGN.md teal tokens.
- Local verify only; no prod deploy without `kamewave`.
- Docs in the same change (route guides + PROJECT.md API notes).
- Dynamic-import map chunk so grid mode stays light.

---

## File map

| Path                                                   | Role                                            |
| ------------------------------------------------------ | ----------------------------------------------- |
| `supabase/functions/_shared/publicGeoScope.ts`         | Add bbox parse + `pointInBbox` / filter helpers |
| `supabase/functions/list-public-properties/index.ts`   | lat/lng on rows; bbox map mode                  |
| `supabase/functions/list-public-developments/index.ts` | same                                            |
| `supabase/functions/list-public-parkings/index.ts`     | same                                            |
| `supabase/functions/search-listings/index.ts`          | lat/lng + bbox when type is single family       |
| `ui/.../shared/components/ListingMapView.tsx`          | Shared map                                      |
| `ui/.../properties/components/PropertiesMap.tsx`       | Thin wrapper → ListingMapView                   |
| `ui/.../search/*`                                      | Map for all three categories; URL view/bbox     |
| Query/types hooks                                      | lat/lng + bbox on queries                       |

---

## Task 1: Geo bbox helpers + lat/lng on list responses

- [ ] Add `readMapBbox(sp)` and `filterRowsToBbox` in `publicGeoScope.ts`
- [ ] Include `latitude`/`longitude` on mapped page rows for all three `list-public-*`
- [ ] When bbox present: return marker-lite page (cap 200), `total` = in-bounds count, skip or slim facets
- [ ] Curl local with and without bbox

## Task 2: search-listings parity

- [ ] Add coords to family summaries used by category tabs
- [ ] Honor bbox when `type` is a single family
- [ ] Curl `/search-listings?type=properties&swLat=…`

## Task 3: ListingMapView UI

- [ ] Build shared map: load Maps, pins, cluster, Search this area, preview card, empty/error
- [ ] Replace mock `PropertiesMap`
- [ ] Wire property list pages (already have view=map)

## Task 4: Search page wiring

- [ ] Enable map mode for developments + parkings in toolbar
- [ ] Persist `view` + bbox in search URL; pause pager when bbox set
- [ ] Map skeleton / empty states

## Task 5: Docs + smoke

- [ ] Update `docs/guides/routes/search.md`, properties guide, `docs/PROJECT.md`
- [ ] Manual smoke: page pins, Search this area, missing coords omitted, mobile card

---

## Anti-goals

- Auto-refetch on every pan
- Full card DTOs for thousands of markers
- Map on `/search` All tab
