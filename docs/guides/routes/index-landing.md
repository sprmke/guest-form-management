---
title: 'Guest landing — operator guide'
status: active
tags: [guides, routes]
updated: 2026-08-17
---

# Guest landing — operator guide

Route: `/`

> **Status:** Documented — **Phase 1 (UI only)**. Redesigned guest explore landing; mock data; no public API yet.

## Progress overview

| Section          | E2E save | Validation | Docs       | Notes                                     |
| ---------------- | -------- | ---------- | ---------- | ----------------------------------------- |
| Hero + search    | —        | —          | Documented | Search-first; optional dates              |
| Interactive hero | —        | —          | Documented | Canvas + stacked stay cards (theme-aware) |
| Stay categories  | —        | —          | Documented | Quick-filter chips → `/properties`        |
| Featured stays   | —        | —          | Documented | Horizontal scroll carousel                |
| Destinations     | —        | —          | Documented | 3 editorial destination tiles             |
| Social proof     | —        | —          | Documented | Single review + trust stats               |

---

## Overview

Public **guest explore home**. Wrapped in **`MarketingLayoutShell`** (nav, footer, theme toggle). Operational booking calendar lives at **`/properties/:propertySlug/calendar`**.

**Legacy compat:** `/?property=<slug>` redirects to **`/properties/<slug>/calendar`**.

### Design intent (vs template clutter)

Inspired by Airbnb/Agoda search-first patterns, but avoids common pain points:

- **Search is primary** — no promo banners blocking the hero
- **Progressive disclosure** — fewer sections; no long how-it-works / testimonial carousel on home
- **Visual hierarchy** — photography-led cards, horizontal scroll for stays (scan-friendly)
- **Optional dates** — guests can search by destination only
- **Light + dark** — semantic tokens + theme-aware hero canvas

---

## Host-facing knowledge

This is the main guest homepage: search, featured stays, and destination tiles that send people into the property catalog. Hosts rarely land here unless they switch back to "explore" mode.

**Common host questions**

- Q: Will my listing appear on the home page automatically?
  A: Not yet. Featured cards still use sample data until the public catalog is connected to live published properties.
- Q: How do guests get from here to my property?
  A: They search or tap a destination, browse the homes catalog, open your listing, then reserve or contact you from there.
- Q: Where does "Become a host?" take someone?
  A: It switches to host mode and the host marketing page, then sign-in. It doesn't go straight into your dashboard.

---

## Sections

| Section        | Component             | Behavior                               |
| -------------- | --------------------- | -------------------------------------- |
| Hero           | `GuestHero`           | Split layout: search + category chips  |
| Hero animation | `HeroCanvas`          | Pointer-reactive canvas + card stack   |
| Search bar     | `HeroSearch`          | Where / dates / guests → `/properties` |
| Featured stays | `FeaturedProperties`  | Horizontal snap scroll                 |
| Destinations   | `PopularDestinations` | 3 large editorial tiles                |
| Trust + review | `LandingSocialProof`  | Compact stats + one guest quote        |

Removed from home (still in codebase for reuse): `HowItWorks`, `Testimonials`, `TrustIndicators`, `FeaturedDevelopments`.

---

## Implementation map

| Concern | Path                                                                         |
| ------- | ---------------------------------------------------------------------------- |
| Page    | `ui/src/features/guest/marketing/pages/GuestLandingPage.tsx`                 |
| Content | `ui/src/features/guest/marketing/guest-landing/data/landingContent.ts`       |
| Hero    | `ui/src/features/guest/marketing/guest-landing/components/GuestHero.tsx`     |
| Canvas  | `ui/src/features/guest/marketing/guest-landing/components/HeroCanvas.tsx`    |
| Layout  | `ui/src/features/guest/marketing/shared/components/MarketingLayoutShell.tsx` |
| Routes  | `ui/src/features/guest/marketing/routes/index.tsx`                           |

---

## Pending / follow-ups

- [ ] Wire hero search to real property list filters / API
- [ ] Replace mock featured cards with live published properties
- [ ] Re-introduce developments block when catalog API exists (secondary section)
