---
title: 'Custom Pages'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-17
---

# Custom Pages

Route: `/org/:orgSlug/property/:propertySlug/custom-pages`

> **Status:** Documented — v1: infrastructure + one template (stay guide redesign)

**Manual testing:** [`custom-pages-module-manual.md`](../../testing/custom-pages-module-manual.md)

## Purpose

Template/visual selection for guest-facing pages, general enough to support multiple page types over time (stay guides today, showcase/marketing pages later). **v1** ships exactly one page type (`stay_guide`) with exactly one template (`stay-guide-warm-arrival`) — no template picker, no drag-and-drop editor. Section **content** (check-in instructions, house rules, etc.) stays on **[[templates|Property templates]]**; this module is template/visual selection only.

## Host-facing knowledge

Custom Pages shows which visual template is applied to each guest-facing page for this property. In v1 there's one page, the Stay Guide, and it's always rendered with the "Warm Arrival" template. **Preview** opens it exactly as guests will see it.

**Common host questions**

- Q: Can I change how the stay guide looks?
  A: Not yet. v1 ships one design ("Warm Arrival"). A template picker is planned for a future release.
- Q: How do I get a shareable link for the stay guide?
  A: There isn't one link you can reuse. Each guest gets their own personal link automatically once their booking reaches ready-for-check-in.
- Q: Where do I edit the actual text (house rules, check-in steps)?
  A: On **Templates**, not here. Custom Pages only controls the visual template.

## Data model

New dedicated table (matches this repo's pattern of small per-feature tables rather than overloading `properties.settings` or `property_template_contents`):

```sql
custom_pages (
  id, property_id, page_type ('stay_guide' only in v1),
  template_key, created_at, updated_at,
  unique (property_id, page_type)
)
```

Rows are **lazily created on first read** (mirrors `property_template_contents`'s default-fallback pattern) — no backfill migration/script. `page_type`'s `CHECK` constraint is widened by a new migration when a second page type ships (never edit a shipped migration).

## API

| Function                | Method | Auth                   | Query                    |
| ----------------------- | ------ | ---------------------- | ------------------------ |
| `custom-pages-settings` | GET    | JWT + `templates:view` | `?property_id=` required |

Returns `{ pages: [{ pageType, templateKey, updatedAt }] }` — v1: always exactly one `stay_guide` entry, lazily created via `getOrCreateCustomPage()` on first call. No `PATCH` yet — v1 has only one `template_key` value to select, so there's nothing to change; the endpoint exists so a future template picker is additive, not a rebuild.

## UI

One card per page type — v1 renders exactly one ("Stay Guide") with a book icon, one line of explanatory copy, and a **Preview** button (opens `guestStayGuidePreviewPath()` in a new tab, same preview route Templates uses). No "copy link" button (no single static link — see host FAQ above); no empty "coming soon" placeholder cards.

## Implementation map

| Layer         | Path                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Route         | `ui/src/features/dashboard/custom-pages/routes/index.tsx`                                                                           |
| Page          | `ui/src/features/dashboard/custom-pages/pages/CustomPagesPage.tsx`                                                                  |
| Card          | `ui/src/features/dashboard/custom-pages/components/CustomPageCard.tsx`                                                              |
| Hook          | `ui/src/features/dashboard/custom-pages/hooks/useCustomPages.ts`                                                                    |
| Settings API  | `supabase/functions/custom-pages-settings/index.ts`                                                                                 |
| Shared helper | `supabase/functions/_shared/customPages.ts` (`getOrCreateCustomPage`, `resolveStayGuideTemplateKey`)                                |
| Migration     | `supabase/migrations/20261018130000_custom_pages.sql`                                                                               |
| Nav           | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts` (property nav, between Templates and Settings)                          |
| Permissions   | `ui/src/features/dashboard/team/lib/propertyPermissions.ts` — `custom-pages` section, gated by `templates:view` (same as Templates) |

## v1 template: stay guide redesign

See **[[stay-guide|Guest stay guide (token-gated brochure)]]** for the `stay-guide-warm-arrival` template's full UI spec (hero, stay pass card, chapters, quick-nav, gallery film strip). The `template_key` flows from `custom_pages` through `get-guest-stay-guide` / `preview-guest-stay-guide` response payloads (passthrough only in v1 — the frontend has exactly one template to render).

## Edge cases

- No feature flag / toggle — v1 ships as the default (and only) render for the guest stay guide route in one deploy.
- A property with no `custom_pages` row gets one lazily on first `custom-pages-settings` or stay-guide read, defaulting to `stay-guide-warm-arrival`.
