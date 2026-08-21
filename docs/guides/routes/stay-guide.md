---
title: 'Guest stay guide (token-gated brochure)'
status: active
tags: [guides, routes]
updated: 2026-08-20
---

# Guest stay guide (token-gated brochure)

Route: `/properties/:propertySlug/stay-guide?token=<opaque>`

> **Status:** Documented

**Manual testing:** [`custom-pages-module-manual.md`](../testing/custom-pages-module-manual.md)

## Purpose

Mobile-first **"digital pamphlet"** page for booked guests: a warm-neutral, chaptered brochure with house rules, check-in/out instructions, and parking reminders from **Property Templates** (standard keys), interleaved with property photos. Linked from the **ready-for-checkin** email (`{{stay_guide_cta_section}}`). This is the **v1 template** of the **[[public-pages|Public Pages]]** module — see that doc for the `custom_pages` table and `template_key` plumbing.

Hosts configure **which sections show, chapter order, and chapter accent colors** via **Public Pages → Stay Guide → Edit** (`public_page_configs` / `sectionConfig`). Body copy still edits under **[[templates|Property templates]]**.

---

## Host-facing knowledge

After you approve a guest for check-in, they receive a private link to a mobile-friendly stay guide with your rules, check-in steps, parking notes, and contact details, all pulled from your property templates.

**Common host questions**

- Q: When does the guest get the stay guide link?
  A: When the booking reaches ready-for-check-in. It's included in that email, and it's also available from the booking in your dashboard.
- Q: Can anyone open the link if they guess the URL?
  A: No, each link uses a unique token tied to that booking, and it only works during the stay window.
- Q: How do I change the wording in the guide?
  A: Edit the standard templates under **Templates**; the guide updates from that content (hosts can preview it before sending).
- Q: How do I hide a section or change chapter order / accent colors?
  A: **Public Pages → Stay Guide → Edit**. Toggle sections, drag to reorder chapters, and set accents. Guests see the same layout as your preview.

---

## Access

| Rule       | Detail                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| **Token**  | Opaque `stay_guide_token` on `guest_submissions`; issued when booking reaches **`READY_FOR_CHECKIN`**         |
| **Window** | **Asia/Manila** check-in day `00:00` through end of day **after** check-out (`23:59:59+08:00`)                |
| **Status** | `READY_FOR_CHECKIN`, `READY_FOR_CHECKOUT`, `PENDING_SD_REFUND`, or `COMPLETED` (not `CANCELLED` or pre-ready) |
| **Slug**   | API accepts optional `?property=`; must match booking property when provided                                  |

Expired or invalid token → generic unavailable message (no leak of booking existence).

## Content sections

Rendered from **`property_template_contents`** (fallback: `propertyTemplates.ts` defaults):

| Key                      | Shown when     |
| ------------------------ | -------------- |
| `check-in-instructions`  | always         |
| `house-rules`            | always         |
| `parking-reminders`      | `need_parking` |
| `check-out-instructions` | always         |

Template HTML is filled with the same booking placeholders as workflow emails (`buildBookingPlaceholderVars`).

### Layout config (`sectionConfig`)

From **`public_page_configs`** (`page_type = stay_guide`), included on guest/preview DTOs. Missing row → in-memory all-visible defaults (same as pre-editor layout).

| Control                                                                      | Effect                                                                 |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `hero` / `stayPassCard` / `galleryCarousel` / `quickNavTabs` / `helpSection` | `visible` toggles each chrome block                                    |
| `chapters[]`                                                                 | `id`, `visible`, `order`, `accentColor` (`null` = inherit brand color) |

`applyStayGuideSectionConfig` filters/reorders built chapters; `StayGuideChapter` accepts optional `accentColor`.

## API

| Function                   | Method | Auth                   | Query                                                            |
| -------------------------- | ------ | ---------------------- | ---------------------------------------------------------------- |
| `get-guest-stay-guide`     | GET    | anon                   | `?token=` required; `?property=<slug>` optional                  |
| `preview-guest-stay-guide` | GET    | JWT + `templates:view` | `?property_id=` required; `?property=<slug>` optional slug guard |

Both responses include **`sectionConfig`**. Host layout saves via **`public-page-configs`** (see **[[public-pages|Public Pages]]**).

## Admin preview (Templates)

**Preview stay guide** on **Templates → Standard templates** opens **`?preview=1&property_id=`** (no guest token). See **[[templates|Property templates]]**.

## Email

On **`READY_FOR_CHECKIN`** transition, orchestrator calls **`ensureGuestStayGuideToken`** before **`sendReadyForCheckin`**. Email includes **`{{stay_guide_cta_section}}`** when token + property slug resolve.

## Admin (booking detail)

On **`READY_FOR_CHECKIN`** and later, **WorkflowPanel** shows **Stay guide** with **Open stay guide** + copy. The link is **issued automatically** on transition to **`READY_FOR_CHECKIN`**.

## Admin preview (Templates)

**Templates → Standard templates** → **Preview stay guide** opens **`/properties/:slug/stay-guide?preview=1&property_id=`** in a new tab. Requires the same signed-in host session as the dashboard (`templates:view`). Payload from **`preview-guest-stay-guide`** uses **mock booking data** (sample guest name, Manila-relative check-in/out, parking + pets enabled) so operators can review all standard sections without a live booking token. A **Preview** banner appears at the top of the page.

## Page Editor

**Public Pages → Stay Guide → Edit** — `ui/src/features/dashboard/page-editor/` (`StayGuideEditorPanel`, `StayGuideSectionContentCard`, `stayGuideEditorStore`, live preview via `previewOverrideContext`). Layout autosave PATCHes **`public-page-configs`**. Chapter **content** + **section images** autosave via **`property-templates-settings`** (same rows as Templates). Requires **`customPages`** (Starter+).

**Content chrome:** accordion cards under **Content**, grouped by chapter (Getting In / At home / Before You Go). Each card: section image uploader + WYSIWYG + placeholders + reset. Edits update the live preview immediately (client-side placeholder fill).

## Standard template section images

Section images are managed in the **Stay Guide Page Editor** (not Templates). Stored as **`section_image_url`** on **`property_template_contents`**; shown at the top of that section’s card on the stay guide **only when set** (no property-gallery fallback). Storage uses a **fixed path** per template key, so replace upserts overwrite the same public URL — preview appends a cache-bust query (`?v=`). Inline images inserted in the editor are uploaded via **`upload-property-template-asset`** and rendered in the public body HTML.

**Templates → Standard templates** still edits body copy, but **does not** show the section image uploader (avoids a second upload surface).

## Content rendering

- The **first h1–h3** in template body becomes the section card title (`displayHeading`; duplicate heading stripped from body HTML). That title is **always** shown on the stay guide for every template section (including single-section chapters like Getting In). If the body has no leading heading, the template registry label is used.
- **`ul` / `ol`** render as proper lists with bullets/numbers.

## UI (v1 template: `stay-guide-warm-arrival`)

Warm-neutral "digital pamphlet" redesign — page-scoped palette (Paper/Ink/Sand/Umber, both light + dark variants) and `Fraunces` display type layered on the existing brand teal accent. Content is capped to a centered ~720px column at every breakpoint (mobile-first, no separate desktop layout).

- **Hero** — full-bleed static hero photo (`property.heroImageUrl`, primary gallery image) with bottom gradient scrim + `Fraunces` title overlay (property/unit name); property logo in the top bar is a **1:1 square** (`size-9` / `sm:size-10`, `object-cover`, `rounded-md`) so portrait logo files do not render as a tall pill; one-time scale-settle + fade-up on load (`framer-motion`, `useReducedMotion`-gated)
- **Stay pass card** (`StayPassCard.tsx`) — boarding-pass-styled summary (guest name, property, check-in/out date + time) that overlaps the hero's bottom edge; the signature "wow" element, surfacing practical booking facts immediately per competitive UX research
- **Gallery film strip** (`StayGuideGalleryCarousel.tsx`) — editorial horizontal scroll-snap strip of gallery images, placed after the hero/pass (not a full-bleed carousel at the top)
- **Quick-nav** (`StayGuideTabs.tsx`) — sticky pill bar under the gallery; jump-scrolls to chapter anchors, scrollspy-highlights the chapter in view (`IntersectionObserver`)
- **Chapters** (`StayGuideChapter.tsx`, grouped by `lib/stayGuideChapters.ts`) — standard sections regrouped into "Getting In" (check-in), "Make Yourself at Home" (house rules + parking when applicable), "Before You Go" (check-out); each chapter: eyebrow + `Fraunces` heading + Sand-surfaced body, quiet scroll-reveal on enter; **Check-in** chapter appends the full-bleed map card below its content
- **Need Anything?** — restyled `StayGuideHelpSection.tsx` (same host/contact data), now a chapter target (`id="need-anything"`) for quick-nav
- Brand color from property/org via CSS variables (interactive accent only — buttons, active nav pill, links)

Chrome blocks honor `sectionConfig` visibility. **Preview parity** — `preview-guest-stay-guide` and the Page Editor preview render the identical template; hosts see exactly what guests see.

## Implementation map

| Layer            | Path                                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page             | `ui/src/features/guest/stay-guide/pages/StayGuidePage.tsx`                                                                                                                                          |
| Components       | `ui/src/features/guest/stay-guide/components/*` (`StayPassCard`, `StayGuideChapter`, `StayGuideHero`, `StayGuideTabs` (quick-nav), `StayGuideGalleryCarousel` (film strip), `StayGuideHelpSection`) |
| Chapter grouping | `ui/src/features/guest/stay-guide/lib/stayGuideChapters.ts` (`applyStayGuideSectionConfig`, defaults)                                                                                               |
| Hook             | `ui/src/features/guest/stay-guide/hooks/useGuestStayGuide.ts` (`useGuestStayGuidePreview`; respects preview override)                                                                               |
| Preview client   | `ui/src/features/guest/stay-guide/lib/previewApi.ts`                                                                                                                                                |
| Page Editor      | `ui/src/features/dashboard/page-editor/` (Stay Guide panel + store + autosave)                                                                                                                      |
| Edge             | `supabase/functions/get-guest-stay-guide/index.ts`                                                                                                                                                  |
| Preview edge     | `supabase/functions/preview-guest-stay-guide/index.ts`                                                                                                                                              |
| Config API       | `supabase/functions/public-page-configs/index.ts` + `_shared/publicPageConfigs.ts`                                                                                                                  |
| Issue link API   | `supabase/functions/issue-guest-stay-guide-token/index.ts`                                                                                                                                          |
| Token + payload  | `supabase/functions/_shared/guestStayGuide.ts` (`loadGuestStayGuidePreview`, mock booking; `templateKey` + `sectionConfig`)                                                                         |
| Admin UI         | `WorkflowPanel.tsx` (Stay guide row); **`TemplatesPage.tsx`**; **[[public-pages\|Public Pages]]** (Edit + preview)                                                                                  |
| Orchestrator     | `workflowOrchestrator.ts` — token on `READY_FOR_CHECKIN`                                                                                                                                            |
| Email CTA        | `propertyTemplateEmailSections.ts#buildStayGuideCtaHtml`, `emailService.ts#sendReadyForCheckin`                                                                                                     |
| Migration        | `supabase/migrations/20260916120000_guest_stay_guide_token.sql`, `20261018130000_custom_pages.sql`, `20261102120000_public_page_configs.sql`                                                        |
