---
title: 'Property Showcase — operator guide'
status: active
tags: [guides, routes, showcase, public-pages]
updated: 2026-08-28
---

# Property Showcase — operator guide

Route: `/properties/:propertySlug/showcase`

> **Status:** Documented (v1)

**Manual testing:** [`property-showcase-manual.md`](../testing/property-showcase-manual.md)

## Progress overview

| Section           | E2E save | Validation                | Docs | Notes                         |
| ----------------- | -------- | ------------------------- | ---- | ----------------------------- |
| Guest showcase    | —        | published gate            | Done | Aurora / Monolith / Editorial |
| Page Editor       | autosave | plan + permission         | Done | Growth+ `propertyShowcase`    |
| Public Pages card | —        | Published/Draft + Upgrade | Done | Locked on Free/Starter        |

---

## Overview

Standalone shareable landing page for a property. Hosts pick one of three animated templates (Aurora, Monolith, Editorial), configure sections/copy/images/style/motion, and publish a link guests can open outside the marketing and operational shells.

---

## Host-facing knowledge

Showcase is a one-page link you can send to guests with your property’s photos, amenities, and booking CTAs. It is separate from the marketing listing page.

**Common host questions**

- Q: Where do I edit Showcase?
  A: Property → Public Pages → Showcase → Edit (or Upgrade if your plan doesn’t include it).
- Q: Why is the guest link “Not available”?
  A: Publish it in the Showcase editor. Draft showcases stay private.
- Q: Which plan includes Showcase?
  A: Growth (Pro) and above.
- Q: Can I use my own uploaded photos beyond the gallery?
  A: Not yet — image slots pick from existing property media.
- Q: What’s the difference between Showcase and the Property listing?
  A: The listing lives in the marketing site with booking widgets. Showcase is a single scrollable landing page with its own look and motion, meant to share as a link.

---

## Guest behavior

- URL: `/properties/:propertySlug/showcase`
- Templates (distinct worlds):
  - **Aurora** — Outfit display, parallax hero, mesh canvas, sticky progress rail, magnetic CTAs, lift amenities
  - **Monolith** — Instrument Serif, ink canvas, grain + cursor spotlight, amenity marquee, animated stats, grid sections; **seamless transparent header** over hero (solid bar after scroll)
  - **Editorial** — Cormorant display, warm cream paper, asymmetric collage hero, Embla testimonials, embedded map
- Header: property logo + name (**logo/name click scrolls to top**); **light/dark toggle** on live guest pages (hidden in Page Editor — use **Style → Palette mode**); desktop section links (`@lg` / hamburger below); mobile hamburger sheet
- **Color mode:** each template has its own light + dark palette (Aurora: shadcn light / slate dark; Monolith: stone light / ink dark; Editorial: cream light / espresso dark). Default from editor **Palette → mode** (`light` / `dark` / `warm`; `warm` adds a warm tint). Guest choice persists in `localStorage` per property + template (not in editor preview).
- **Style controls** (Page Editor → Style): palette mode, accent, hero overlay, display font, type scale, motion intensity / parallax / canvas — applied inside `.showcase-scope` only (accent sets scoped `--primary`; does not affect dashboard chrome).
- Gallery: tap/click opens shared **GalleryLightbox**
- Deep links: `#amenities`, `#gallery`, `#host`, `#location`, etc. (native `scrollIntoView`; smooth when motion allowed)
- **Location:** all templates use the same embedded map (`ShowcaseMapEmbed` → Google Maps Embed API when `VITE_GOOGLE_MAPS_API_KEY` is set, legacy Google embed, or OSM fallback from lat/lng). Shows formatted address + **Directions** button. Location body defaults to property address (not the marketing location label alone).
- **Host:** replaces legacy house-rules section. Shows host avatar/logo, org name, verified badge, contact phone/email, social links (from app settings + guest contact), **View host** + **Contact** links.
- **Footer:** property logo/name (scroll to top), host block, contact block (address link, phone, email, message link, socials).
- Layout uses **container queries** (`@container`) so Page Editor mobile preview (~420px) reflows correctly — viewport media queries alone mis-size content inside the preview frame
- Body copy ≥16px; section titles sit close to content (`mt-5`)
- `?embed=1` / `?preview=1`: host preview when unpublished; canvas + heavy motion off. With `?embed=1`, global `guest-embed-preview` CSS clips document scroll (iframe thumbnails); showcase wraps content in a **`100dvh` overflow-y-auto** root so the page still scrolls when opened in a full browser tab from Public Pages.
- Unpublished + no preview: “Not available”

## Editor

- Route: `/org/:orgSlug/property/:propertySlug/public-pages/showcase/edit`
- Permission: `publicPages.showcase:edit`
- Plan: `propertyShowcase` (Growth+) for editor entry / publish / template; `publicPagesAutosave` for autosave persistence
- Controls: template picker, publish toggle, section reorder + visibility, copy/image overrides, columns, palette / typography / motion, undo/redo, click-section-in-preview → focus control
- Preview chrome: header uses **sticky** (not viewport-fixed) inside the preview scrollport; Aurora **section progress rail** is live-site only (hidden in editor/embed so it never overlaps dashboard UI)

## API

| Function                | Notes                                                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get-public-showcase`   | Public GET `?property=<slug>` (+ optional embed/preview). Returns `property`, `config`, `templateKey`, `published`, and **`guestContact`** (name, phone, email, social URLs) for host/footer sections. Legacy `houseRules` section id in saved configs is normalized to **`host`** on read. |
| `public-page-configs`   | GET/PATCH `page_type=property_showcase` → `PropertyShowcaseConfig`                                                                                                                                                                                                                          |
| `custom-pages-settings` | Showcase `template_key`                                                                                                                                                                                                                                                                     |

## Implementation map

| Layer      | Path                                                                         |
| ---------- | ---------------------------------------------------------------------------- |
| Guest page | `ui/src/features/guest/marketing/showcase/`                                  |
| Editor     | `ui/src/features/dashboard/page-editor/components/property-showcase/`        |
| Shared UI  | `ui/src/features/dashboard/page-editor/components/shared/`                   |
| Edge       | `supabase/functions/get-public-showcase/`                                    |
| Config     | `_shared/publicPageConfigs.ts`, `_shared/customPages.ts`                     |
| Migrations | `20261209120000_property_showcase_page_type.sql`, `…120100_…entitlement.sql` |
