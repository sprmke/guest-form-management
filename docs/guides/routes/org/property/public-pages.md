---
title: 'Public Pages'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-18
---

# Public Pages

Route: `/org/:orgSlug/property/:propertySlug/public-pages`

> **Status:** Documented — gallery of guest-facing public pages

**Manual testing:** [`custom-pages-module-manual.md`](../../testing/custom-pages-module-manual.md)

Legacy URL `/custom-pages` redirects here.

## Progress overview

| Section      | E2E save | Validation | Docs       | Notes                                                   |
| ------------ | -------- | ---------- | ---------- | ------------------------------------------------------- |
| Page gallery | —        | —          | Documented | Eight public pages; booking-scoped links noted on cards |
| Stay Guide   | —        | —          | Documented | Admin preview URL (`preview=1`); template via API       |
| Permissions  | —        | —          | Documented | `templates:view` (same as Templates)                    |

## Purpose

Directory of this property's **guest-facing public pages**. Hosts scan distinctive previews and open the live page in a new tab. Stay Guide visual templates still live in `custom_pages` (v1: one template); section **content** stays on **[[templates|Property templates]]**.

## Host-facing knowledge

Public Pages lists every guest URL for this property: listing, calendar, booking form, messages, stay guide, SD refund, guest review, and pay parking. Use **Copy link** or **Open page** on each card. Stay guide, SD refund, guest review, and pay parking links are **per booking** — guests get them by email or from the booking workflow; copy on those cards is the URL pattern or host preview.

**Common host questions**

- Q: What's the difference between View Property on the dashboard and Public Pages?
  A: **View Property** on the dashboard jumps straight to your listing. **Public Pages** lists every guest page.
- Q: Why doesn't the SD refund or pay parking copy link work for guests?
  A: Those URLs need a **booking ID**. Guests receive the full link by email; hosts copy the link from a booking in the workflow panel.
- Q: Can I change how the stay guide looks?
  A: Not yet. It uses one design ("Warm Arrival"). A template picker is planned.
- Q: How do I get a shareable link for the stay guide?
  A: There isn't one link you can reuse. Each guest gets their own personal link automatically once their booking reaches ready-for-check-in. The Stay Guide card here is a preview for you.
- Q: Where do I edit the actual text (house rules, check-in steps)?
  A: On **Templates**. Public Pages only opens the live guest pages.

## UI

Eight cards (Property, Calendar, Form, Messages, Stay Guide, SD Refund, Guest Review, Pay Parking). Each card lazy-loads a **scaled live iframe** at **1280px desktop width** (`?embed=1` clips overflow and hides scrollbars). Calendar, Form, Messages, SD Refund, Guest Review, and Pay Parking share the **operational shell** (brand band, logo, page title); booking-scoped pages render host embed previews when `embed=1` without a booking id. **Copy link** and **Open page** in the footer; preview image opens with embed when needed. Page subtitle: "Every guest URL for this listing." Grid: 1 column on phone, 2 from `sm`, 3 from `xl`.

| Item         | Path                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| Property     | `/properties/:propertySlug`                                                                                      |
| Calendar     | `…/calendar`                                                                                                     |
| Form         | `…/form`                                                                                                         |
| Messages     | `…/messages?checkInDate=<today>&checkOutDate=<tomorrow>` (preview adds `embed=1` in iframe only)                 |
| Stay Guide   | `…/stay-guide?preview=1&property_id=` (admin preview)                                                            |
| SD Refund    | `…/sd-form` (guest link adds `?bookingId=`; open from dashboard uses `embed=1`)                                  |
| Guest Review | `…/guest-review` (guest link adds `?bookingId=`; open uses `embed=1`)                                            |
| Pay Parking  | `…/parking/preview` + `embed=1` for preview; copy uses `…/parking/` prefix; guest link is `…/parking/:bookingId` |

## Data model

Stay Guide template selection still uses `custom_pages` (not shown as a picker in this UI):

```sql
custom_pages (
  id, property_id, page_type ('stay_guide' only in v1),
  template_key, created_at, updated_at,
  unique (property_id, page_type)
)
```

Rows are **lazily created on first read**. `page_type`'s `CHECK` constraint is widened by a new migration when a second page type ships.

## API

| Function                | Method | Auth                   | Query                    |
| ----------------------- | ------ | ---------------------- | ------------------------ |
| `custom-pages-settings` | GET    | JWT + `templates:view` | `?property_id=` required |

Returns `{ pages: [{ pageType, templateKey, updatedAt }] }` — used by stay-guide rendering, not required to list the gallery. No `PATCH` yet.

## Implementation map

| Layer         | Path                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Route         | `ui/src/features/dashboard/custom-pages/routes/index.tsx` (`public-pages` + redirect from `custom-pages`)                           |
| Page          | `ui/src/features/dashboard/custom-pages/pages/CustomPagesPage.tsx`                                                                  |
| Card          | `ui/src/features/dashboard/custom-pages/components/PublicPageCard.tsx`                                                              |
| Live preview  | `ui/src/features/dashboard/custom-pages/components/PublicPageLivePreview.tsx`                                                       |
| Static mock   | `ui/src/features/dashboard/custom-pages/components/PublicPagePreview.tsx` (Messages + iframe fallback)                              |
| Guest URLs    | `ui/src/features/dashboard/property/lib/propertyGuestPublicPages.ts`                                                                |
| Hook          | `ui/src/features/dashboard/custom-pages/hooks/useCustomPages.ts`                                                                    |
| Settings API  | `supabase/functions/custom-pages-settings/index.ts`                                                                                 |
| Shared helper | `supabase/functions/_shared/customPages.ts` (`getOrCreateCustomPage`, `resolveStayGuideTemplateKey`)                                |
| Migration     | `supabase/migrations/20261018130000_custom_pages.sql`                                                                               |
| Nav           | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts` (property nav, between Templates and Settings)                          |
| Permissions   | `ui/src/features/dashboard/team/lib/propertyPermissions.ts` — `public-pages` section, gated by `templates:view` (same as Templates) |

## v1 template: stay guide redesign

See **[[stay-guide|Guest stay guide (token-gated brochure)]]** for the `stay-guide-warm-arrival` template. The `template_key` flows from `custom_pages` through `get-guest-stay-guide` / `preview-guest-stay-guide`.

## Edge cases

- `/custom-pages` redirects to `/public-pages`.
- A property with no `custom_pages` row gets one lazily on first `custom-pages-settings` or stay-guide read, defaulting to `stay-guide-warm-arrival`.
- Gallery does not wait on `custom-pages-settings`; it always lists the eight public URLs.
