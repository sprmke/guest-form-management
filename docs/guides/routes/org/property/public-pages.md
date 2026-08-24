---
title: 'Public Pages'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-21
---

# Public Pages

Route: `/org/:orgSlug/property/:propertySlug/public-pages`

> **Status:** Documented — gallery of guest-facing public pages

**Manual testing:** [`custom-pages-module-manual.md`](../../testing/custom-pages-module-manual.md)

Legacy URL `/custom-pages` redirects here.

## Progress overview

| Section            | E2E save | Validation | Docs       | Notes                                                               |
| ------------------ | -------- | ---------- | ---------- | ------------------------------------------------------------------- |
| Design your pages  | —        | —          | Documented | Property + Stay Guide; Edit + last-edited from page configs         |
| Other guest pages  | —        | —          | Documented | Six operational URLs; Copy / Open only                              |
| Stay Guide editor  | —        | —          | Documented | Layout + Content (WYSIWYG/images) in Page Editor; live preview      |
| Page Editor chrome | —        | —          | Documented | Fixed 480px sidebar; desktop/mobile preview; autosave Unsaved/Saved |
| Permissions        | —        | —          | Documented | `templates:view` (same as Templates)                                |

## Purpose

Directory of this property's **guest-facing public pages**, grouped into **Design your pages** (editable) and **Other guest pages** (open/copy only). **Stay Guide** and **Property** cards include **Edit** → Page Editor. Stay Guide visual templates still live in `custom_pages` (v1: one template); section **content** stays on **[[templates|Property templates]]**.

Requires the **Starter** plan or higher (`customPages` feature). Free-tier hosts see an upgrade prompt instead of the gallery.

**Stay Guide** and **Property** (listing) cards use **Edit** → Page Editor (`/public-pages/:pageId/edit`). The listing editor covers gallery, brand color, description, amenities, house rules, cancellation, socials, and optional section visibility (amenities / location / rules / reviews — fixed order; gallery + overview always on) — the same content fields as **Property Settings** (single storage; Settings has no live preview). Stay Guide body copy and section images edit in the Stay Guide Page Editor (**Content**); Templates still has standard body copy without section images.

## Host-facing knowledge

Public Pages lists every guest URL for this property. At the top, **Design your pages** shows your listing and stay guide — use **Edit** to change how they look. Below that, **Other guest pages** covers calendar, booking form, messages, SD refund, guest review, and pay parking — use **Copy link** or **Open page**. Stay guide, SD refund, guest review, and pay parking links are **per booking** — guests get them by email or from the booking workflow; copy on those cards is the URL pattern or host preview.

**Common host questions**

- Q: What's the difference between View Property on the dashboard and Public Pages?
  A: **View Property** on the dashboard jumps straight to your listing. **Public Pages** lists every guest page.
- Q: Why doesn't the SD refund or pay parking copy link work for guests?
  A: Those URLs need a **booking ID**. Guests receive the full link by email; hosts copy the link from a booking in the workflow panel.
- Q: Can I change how the stay guide or listing looks?
  A: Open **Public Pages → Design your pages → Stay Guide or Property → Edit**. Toggle sections, reorder chapters, edit Stay Guide text and section photos, or manage listing photos, brand color, and listing content. You can also edit listing fields in **Property Settings** (same saved data).
- Q: What does “Last edited” / “Not customized yet” mean?
  A: It reflects layout changes you’ve saved in the Page Editor. If you haven’t changed the layout yet, you’ll see **Not customized yet**.
- Q: How do I get a shareable link for the stay guide?
  A: There isn't one link you can reuse. Each guest gets their own personal link automatically once their booking reaches ready-for-check-in. The Stay Guide card here is a preview for you.
- Q: Where do I edit the actual text (house rules, check-in steps)?
  A: **Public Pages → Stay Guide → Edit → Content**, or **Templates** for the same body copy. Section photos upload only in the Stay Guide Page Editor.
- Q: Is there a Save button in the page editor?
  A: On **Starter and above**, no — changes save automatically. You'll see **Unsaved**, then **Saved**, in the top-right of the editor. On **Free**, autosave isn't included, so a **Save** button appears once you have unsaved changes — clicking it (or **Save & leave** in the leave dialog) opens the upgrade prompt for the Starter plan instead of saving. You can still **Discard changes** and leave, or stay and keep editing locally until you upgrade.
- Q: Can I preview how the page looks on a phone?
  A: Yes. In the editor preview bar, switch between desktop and mobile.
- Q: Where do I change Stay Guide text and section photos?
  A: **Public Pages → Stay Guide → Edit → Content**. Expand a section to edit text or upload its image. Changes show in the live preview and save automatically.

## UI

Two sections:

1. **Design your pages** — Property + Stay Guide. Larger cards; primary **Edit**; Copy / Open as icon buttons. Meta line: **Last edited {relative}** from `public_page_configs.updated_at`, or **Not customized yet** when config is still defaults. Grid: 1 column on phone, 2 from `sm`.
2. **Other guest pages** — Calendar, Form, Messages, SD Refund, Guest Review, Pay Parking. Compact cards with **Copy link** / **Open page**. Grid: 1 / 2 (`sm`) / 3 (`xl`).

Each card lazy-loads a **scaled live iframe** at **1280px desktop width** (`?embed=1`). Booking-scoped pages render host embed previews when `embed=1` without a booking id. Page subtitle: "Every guest URL for this listing." Registry field `editable` on `propertyGuestPublicPages` drives grouping (no hardcoded IDs in the page).

### Page Editor (`/public-pages/:pageId/edit`)

Opened from **Design your pages → Edit**. Keeps the **Public Pages** page title and subtitle (`AdminMobilePage`), then a bordered editor shell (same height pattern as Marketing Studio).

| Chrome             | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor header      | Back → gallery (blocked by a leave-confirmation dialog if there are unsaved changes — see Save row); title **Edit - Property** / **Edit - Stay Guide**; **Unsaved / Saving… / Saved** (upper right) on Starter+, a primary **Save** button on Free; undo/redo                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Sidebar            | Fixed **480px** on `lg+` (not resizable; collapse rail still available). Listing: **Sections** first (open by default) — visibility for amenities / location / house rules / reviews only (no reorder; gallery + overview always on). Preview label padded so it clears the collapse control.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Preview            | Live guest page tree. Opens on **mobile** (≤420px) with the left sidebar expanded. Toggle **desktop** (≤1280px) / **mobile** in the Preview bar. Choosing **desktop** collapses the sidebar so the preview can use full width; choosing **mobile** expands it again. Focusing or editing a section/field **scrolls the preview** to that block (skipped for global settings like brand color). Listing layout uses **container queries**, so both frames adapt to frame width.                                                                                                                                                                                                                             |
| Save               | **Starter+**: debounced autosave (no Save button needed). **Free**: `publicPagesAutosave` isn't entitled, so autosave never fires — a primary **Save** button (and leave-dialog **Save & leave**) opens the upgrade modal instead of calling the API. The **Edit - {page}** header title shows a solid `TierBadge` when not entitled. Layout → `public-page-configs`; Stay Guide body + section images → `property-templates-settings`; listing content/brand/socials → property/`app_settings`. Status merges all pending surfaces. Leaving the editor (Back, tab close/refresh) with unsaved changes on either plan prompts **Save & leave** / **Discard changes** rather than losing the edit silently. |
| Stay Guide Content | Merged **Sections** block: drag + visibility per chapter, nested WYSIWYG/image cards. Live preview updates as you type.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

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

| Function                | Method     | Auth                                                    | Query / body                                                 |
| ----------------------- | ---------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `custom-pages-settings` | GET        | JWT + `templates:view` + `customPages`                  | `?property_id=` required                                     |
| `public-page-configs`   | GET, PATCH | JWT + `templates:view`/`templates:edit` + `customPages` | GET `?property_id=&page_type=`; PATCH `{ pageType, config }` |

`custom-pages-settings` returns `{ pages: [{ pageType, templateKey, updatedAt }] }`. `public-page-configs` owns section visibility/order/style (`stay_guide` / `property_landing`).

## Implementation map

| Layer         | Path                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Route         | `ui/src/features/dashboard/custom-pages/routes/index.tsx` (`public-pages`, `public-pages/:pageId/edit`, redirect from `custom-pages`) |
| Page          | `ui/src/features/dashboard/custom-pages/pages/CustomPagesPage.tsx`                                                                    |
| Editor        | `ui/src/features/dashboard/page-editor/` (Stay Guide + Property Landing editors + shell)                                              |
| Card          | `ui/src/features/dashboard/custom-pages/components/PublicPageCard.tsx` (`variant` editable \| static)                                 |
| Last edited   | `ui/src/features/dashboard/custom-pages/lib/publicPageLastEdited.ts`                                                                  |
| Live preview  | `ui/src/features/dashboard/custom-pages/components/PublicPageLivePreview.tsx`                                                         |
| Static mock   | `ui/src/features/dashboard/custom-pages/components/PublicPagePreview.tsx` (Messages + iframe fallback)                                |
| Guest URLs    | `ui/src/features/dashboard/property/lib/propertyGuestPublicPages.ts` (`editable` metadata)                                            |
| Hook          | `ui/src/features/dashboard/custom-pages/hooks/useCustomPages.ts`; gallery also `usePublicPageConfig` for last-edited                  |
| Settings API  | `supabase/functions/custom-pages-settings/index.ts`                                                                                   |
| Config API    | `supabase/functions/public-page-configs/index.ts`                                                                                     |
| Shared helper | `supabase/functions/_shared/customPages.ts`, `_shared/publicPageConfigs.ts`                                                           |
| Migration     | `supabase/migrations/20261018130000_custom_pages.sql`, `20261102120000_public_page_configs.sql`                                       |
| Nav           | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts` (property nav, between Templates and Settings)                            |
| Permissions   | `ui/src/features/dashboard/team/lib/propertyPermissions.ts` — `public-pages` section, gated by `templates:view` (same as Templates)   |
| Plan gate     | `RequirePropertyFeature` (`customPages`) on gallery + editor                                                                          |

## v1 template: stay guide redesign

See **[[stay-guide|Guest stay guide (token-gated brochure)]]** for the `stay-guide-warm-arrival` template. The `template_key` flows from `custom_pages` through `get-guest-stay-guide` / `preview-guest-stay-guide`.

## Edge cases

- `/custom-pages` redirects to `/public-pages`.
- A property with no `custom_pages` row gets one lazily on first `custom-pages-settings` or stay-guide read, defaulting to `stay-guide-warm-arrival`.
- Gallery does not wait on `custom-pages-settings`; it always lists the eight public URLs.
