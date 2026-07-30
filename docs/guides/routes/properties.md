# Properties (guest marketing) — operator guide

Routes:

- `/properties` — list (location-grouped carousels)
- `/properties/in/:location` — flat list for one place (e.g. `tagaytay`, `makati`)
- `/properties/:propertySlug` — detail
- `/hosts/:orgSlug` — public org/host profile + listings
- `/properties/:propertySlug/calendar` — property-scoped calendar UI
- `/properties/:propertySlug/messages` — guest ↔ host web chat (see [chat.md](./properties/chat.md))
- `/properties/:propertySlug/forms/:formId` — dynamic form builder preview

> **Status:** Documented — **Phase 2a (detail API)** for `/properties/:propertySlug`; list/browse still mock.

## Progress overview

| Section           | E2E save | Validation | Docs       | Notes                               |
| ----------------- | -------- | ---------- | ---------- | ----------------------------------- |
| List + filters    | —        | —          | Documented | Location-grouped carousels (grid)   |
| Location browse   | —        | —          | Documented | `/properties/in/:location`          |
| Detail page       | —        | —          | Documented | Live API + mock fallback; see below |
| Property calendar | —        | —          | Documented | Not wired to `get-booked-dates` yet |
| Public form       | —        | —          | Documented | `PublicFormRenderer`; mock submit   |

---

## Overview

Browse and view rental listings. Ported from PMA `features/marketing/properties/**`. Uses **`MarketingLayoutShell`**.

**Reserve / booking:** `BookingCard` and mobile sticky **Reserve** call **`usePropertyReserve`**. With check-in and check-out selected, **Reserve** runs **`requireGuestAuth`** then navigates to **`/properties/:propertySlug/form?checkInDate=&checkOutDate=`**. Without dates, opens the booking calendar modal on the listing (desktop + mobile).

**Contact host:** **`ListingHostCard`** → auth if needed → **`ContactHostSheet`** centered modal. See **[chat.md](./properties/chat.md)**.

**Save / wishlist:** Heart on **`PropertyCard`** (grid + carousel), **`PropertyListItem`**, and detail **`PropertyGallery`** uses **`usePropertySave`** → **`requireGuestAuth`** when anonymous, then persists to **`guest_saved_properties`** (shared TanStack Query cache). OAuth return resumes via **`save_property`** intent in **`guestAuthResume.ts`**.

**Host profile link:** Org name on the property detail host card links to **`/hosts/:orgSlug`** (e.g. `/hosts/kame-homes`). Public page clears the fixed marketing nav (`pt-20` / `lg:pt-24`), applies org **brand color** (`GuestPublicBrandShell`), circular org logo, name → hosted-by → tagline → description → circular social icons, then compact grids of **ACTIVE** homes and **ACTIVE** parkings (when the org has either). Admin dashboard uses **`/org/:orgSlug`** — public guest URLs use **`/hosts/`** to avoid confusion. API: **`get-public-host?org=`**.

**Unknown slug:** detail redirects to **`/properties`**.

---

## Host-facing knowledge

This is where guests browse homes, open a listing, save favorites, contact the host, and start a booking. Each live listing can also link to a public host profile page that shows everything that host currently offers.

**Common host questions**

- Q: Where do guests see my organization name and other listings?
  A: On each property page, your name links to your public host page — guests see your logo, description, social links, and all active homes and parking you list.
- Q: What's the difference between the booking form and a custom form link on my listing?
  A: The main booking flow uses the standard reservation form after guests pick dates. Separate form links are for custom questionnaires or previews — they don't replace the official booking form yet.
- Q: Why doesn't my inactive property show on my public host page?
  A: Only active listings appear there; archived or draft units stay out of public view until you publish them again.

---

## Public host profile (`/hosts/:orgSlug`)

**`HostPublicPage`** — guest-facing org brochure (distinct from the signed-in dashboard at **`/org/:orgSlug`**).

- Loads org branding, tagline, description, and social links via **`get-public-host`**
- Grids of **ACTIVE** properties and **ACTIVE** parkings when the org has either
- Org name on **`ListingHostCard`** (property + parking detail) links here
- **Verified** badge when enhanced verification is approved (see [onboarding.md](./onboarding.md))

---

## List (`/properties`)

| UI          | Component / data                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Search      | `ListingHeroSearch` (`HeroSearch`), `PropertiesToolbar`                                                          |
| Scroll dock | On scroll, search morphs into header center (Airbnb-style); nav links slide up and fade via `useListingNavMorph` |
| Where field | Empty on `/properties`; `Tagaytay` on `/properties/in/tagaytay` (`listingSearchDefaultLocation.ts`)              |
| Grid        | **`PropertiesByLocation`** — rows by place (`Homes in {place}`), carousel cards, title → View all                |
| List / map  | Flat `PropertyListItem` / `PropertiesMap` from `mockProperties`                                                  |
| Sort / view | Client-only (grid / list / map)                                                                                  |

Query params mirror PMA where implemented (location, dates, guests).

---

## Location browse (`/properties/in/:location`)

**`PropertiesLocationPage`** — properties for one place only (no location grouping).

- **`:location`** — slugified place from property `location` (`tagaytay`, `makati`, `taguig`, …) via **`placeLabelFromPropertyLocation`** + **`toLocationSlug`**.
- Same toolbar / filters / grid|list|map as the main list; default **`PropertyCard`** (not carousel).
- Page title **`Homes in {place}`** above results (matches location carousel row copy on `/properties`).
- Same scroll search morph as `/properties` (`listingScrollSearchPaths` matches `/properties/in/*`).
- Unknown location slug → redirect to **`/properties`**.
- Back link to **`/properties`**.

Route is registered **before** `/properties/:propertySlug` so `in` is not treated as a property slug.

---

## Detail (`/properties/:propertySlug`)

**Phase 2a:** `usePublicPropertyDetail` calls **`get-public-property?property=<slug>`** (anon). **ACTIVE** DB properties return live dashboard data; **404** falls back to mock (`mockPropertyDetail` / `mockProperties`). TanStack Query caches 5 min; mock `placeholderData` paints instantly while loading.

Gap analysis (ratings, nearby POIs, etc.): **`docs/reference/public-property-catalog.md`**.

| Section     | Component                                                                             | Data                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gallery     | `PropertyGallery`                                                                     | API media URLs or mock images                                                                                                                            |
| Overview    | `PropertyOverview`                                                                    | API profile; **`ListingPlaceMeta`** (development link → `/developments/:slug`, tower · floor, geo); host card; cancellation highlight; ratings mock-only |
| Amenities   | `PropertyAmenities`                                                                   | Resolved amenity labels; preview grid + modal for full list                                                                                              |
| Location    | `PropertyLocation` + `PropertyMapEmbed`                                               | Google/OSM iframe when pinned; decorative fallback if no pin                                                                                             |
| Rules       | `PropertyRules`                                                                       | House rules preview (6) + modal; cancellation live; safety mock-only                                                                                     |
| Reviews     | `PropertyReviews`                                                                     | Mock only (hidden for live API)                                                                                                                          |
| Booking     | `BookingCard`                                                                         | API pricing; cancellation trust badge when highlight; Reserve → guest auth → `/form`                                                                     |
| Similar     | `SimilarProperties`                                                                   | other mock listings (unchanged)                                                                                                                          |
| Parking CTA | Link when `getParkingFormForProperty` returns a form → development parking form route |

---

## Property calendar (`/properties/:propertySlug/calendar`)

Standalone calendar page (PMA pattern). **`PropertyCalendarPage`** — mock availability; does **not** call **`get-booked-dates`** yet.

---

## Property form (`/properties/:propertySlug/forms/:formId`)

**`PropertyFormPage`** loads form definition from **`mockForms`**. **`PublicFormRenderer`** renders multi-step builder fields; submit is **mock** (no `submit-form`).

Operational guest booking form remains **`/form`** (see [form.md](./form.md)).

---

## API reference

| Action          | Endpoint / edge function                      |
| --------------- | --------------------------------------------- |
| Property detail | **`get-public-property?property=`** (shipped) |
| List properties | Public catalog (planned)                      |
| Booked dates    | Existing `get-booked-dates?property=`         |
| Form submit     | Property-scoped form submission API           |

Full field map + dashboard gaps: **`docs/reference/public-property-catalog.md`**.

---

## Implementation map

| Concern       | Path                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| Pages         | `ui/src/features/guest/marketing/pages/PropertiesListPage.tsx`                |
|               | `PropertiesLocationPage.tsx`                                                  |
|               | `PropertyDetailPage.tsx`, `PropertyCalendarPage.tsx`, `PropertyFormPage.tsx`  |
| Components    | `ui/src/features/guest/marketing/properties/components/**`                    |
|               | `PropertiesByLocation.tsx`, `PropertiesLocationRow.tsx`                       |
| Grouping      | `properties/lib/groupPropertiesByLocation.ts`                                 |
| Shared slug   | `marketing/shared/lib/locationSlug.ts`                                        |
| Forms UI      | `ui/src/features/guest/marketing/forms/components/**`                         |
| Mock data     | `properties/data/mockProperties.ts`, `mockPropertyDetail.ts`                  |
| Live detail   | `properties/hooks/usePublicPropertyDetail.ts`, `types/publicProperty.ts`      |
|               | `properties/lib/mapPublicPropertyDetail.ts`                                   |
|               | `forms/data/mockForms.ts`                                                     |
| Image helper  | `marketing/shared/components/MarketingImage.tsx` (Vite `img` wrapper)         |
| Scroll search | `marketing/shared/context/ListingScrollSearchContext.tsx`, `MarketingNav.tsx` |
| Routes        | `ui/src/features/guest/marketing/routes/index.tsx`                            |

---

## Related docs

- [Route index](./README.md)
- [Calendar (operational)](./calendar.md)
- [Form (operational booking)](./form.md)
- [Developments](./developments.md)

---

## Pending / follow-ups

- [ ] Connect list/browse to published properties in DB
- [x] Wire property detail → `get-public-property` with mock fallback + query cache
- [x] Wire `BookingCard` Reserve → `/form?property=<slug>&checkInDate=&checkOutDate=` (via `usePropertyReserve` + `requireGuestAuth`)
- [ ] Property calendar → `get-booked-dates`
- [ ] Replace `MarketingImage` placeholders with Supabase Storage URLs
