---
title: 'Guest stay guide (token-gated brochure)'
status: active
tags: [guides, routes]
updated: 2026-08-17
---

# Guest stay guide (token-gated brochure)

Route: `/properties/:propertySlug/stay-guide?token=<opaque>`

> **Status:** Documented

**Manual testing:** [`custom-pages-module-manual.md`](../testing/custom-pages-module-manual.md)

## Purpose

Mobile-first **"digital pamphlet"** page for booked guests: a warm-neutral, chaptered brochure with house rules, check-in/out instructions, and parking reminders from **Property Templates** (standard keys), interleaved with property photos. Linked from the **ready-for-checkin** email (`{{stay_guide_cta_section}}`). This is the **v1 template** of the **[[custom-pages|Custom Pages]]** module — see that doc for the `custom_pages` table and `template_key` plumbing.

---

## Host-facing knowledge

After you approve a guest for check-in, they receive a private link to a mobile-friendly stay guide with your rules, check-in steps, parking notes, and contact details, all pulled from your property templates.

**Common host questions**

- Q: When does the guest get the stay guide link?
  A: When the booking reaches ready-for-check-in. It's included in that email, and it's also available from the booking in your dashboard.
- Q: Can anyone open the link if they guess the URL?
  A: No, each link uses a unique token tied to that booking, and it only works during the stay window.
- Q: How do I change what appears in the guide?
  A: Edit the standard templates in your property settings; the guide updates from that content (hosts can preview it before sending).

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

## API

| Function                   | Method | Auth                   | Query                                                            |
| -------------------------- | ------ | ---------------------- | ---------------------------------------------------------------- |
| `get-guest-stay-guide`     | GET    | anon                   | `?token=` required; `?property=<slug>` optional                  |
| `preview-guest-stay-guide` | GET    | JWT + `templates:view` | `?property_id=` required; `?property=<slug>` optional slug guard |

## Admin preview (Templates)

**Preview stay guide** on **Templates → Standard templates** opens **`?preview=1&property_id=`** (no guest token). See **[[templates|Property templates]]**.

## Email

On **`READY_FOR_CHECKIN`** transition, orchestrator calls **`ensureGuestStayGuideToken`** before **`sendReadyForCheckin`**. Email includes **`{{stay_guide_cta_section}}`** when token + property slug resolve.

## Admin (booking detail)

On **`READY_FOR_CHECKIN`** and later, **WorkflowPanel** shows **Stay guide** with **Open stay guide** + copy. The link is **issued automatically** on transition to **`READY_FOR_CHECKIN`**.

## Admin preview (Templates)

**Templates → Standard templates** → **Preview stay guide** opens **`/properties/:slug/stay-guide?preview=1&property_id=`** in a new tab. Requires the same signed-in host session as the dashboard (`templates:view`). Payload from **`preview-guest-stay-guide`** uses **mock booking data** (sample guest name, Manila-relative check-in/out, parking + pets enabled) so operators can review all standard sections without a live booking token. A **Preview** banner appears at the top of the page.

## Standard template section images

On **Templates → Standard templates**, each card has an optional **Section image** uploader (above the WYSIWYG). Stored as **`section_image_url`** on **`property_template_contents`**; shown at the top of that tab’s card on the stay guide **only when set** (no property-gallery fallback). Storage uses a **fixed path** per template key, so replace upserts overwrite the same public URL — both the Templates preview and the stay guide append a cache-bust query (`?v=` from template `updated_at` / local upload bust) so browsers reload the new file. Inline images inserted in the editor are uploaded via **`upload-property-template-asset`** and rendered in the public body HTML.

## Content rendering

- The **first h1–h3** in template body becomes the section card title (duplicate heading stripped from body).
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

**Preview parity** — `preview-guest-stay-guide` renders the identical template; hosts see exactly what guests see.

## Implementation map

| Layer            | Path                                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page             | `ui/src/features/guest/stay-guide/pages/StayGuidePage.tsx`                                                                                                                                          |
| Components       | `ui/src/features/guest/stay-guide/components/*` (`StayPassCard`, `StayGuideChapter`, `StayGuideHero`, `StayGuideTabs` (quick-nav), `StayGuideGalleryCarousel` (film strip), `StayGuideHelpSection`) |
| Chapter grouping | `ui/src/features/guest/stay-guide/lib/stayGuideChapters.ts`                                                                                                                                         |
| Hook             | `ui/src/features/guest/stay-guide/hooks/useGuestStayGuide.ts` (`useGuestStayGuidePreview`)                                                                                                          |
| Preview client   | `ui/src/features/guest/stay-guide/lib/previewApi.ts`                                                                                                                                                |
| Edge             | `supabase/functions/get-guest-stay-guide/index.ts`                                                                                                                                                  |
| Preview edge     | `supabase/functions/preview-guest-stay-guide/index.ts`                                                                                                                                              |
| Issue link API   | `supabase/functions/issue-guest-stay-guide-token/index.ts`                                                                                                                                          |
| Token + payload  | `supabase/functions/_shared/guestStayGuide.ts` (`loadGuestStayGuidePreview`, mock booking; includes `templateKey` via `_shared/customPages.ts`)                                                     |
| Admin UI         | `WorkflowPanel.tsx` (Stay guide row); **`TemplatesPage.tsx`** and **[[custom-pages\|Custom Pages]]** (Preview stay guide)                                                                           |
| Orchestrator     | `workflowOrchestrator.ts` — token on `READY_FOR_CHECKIN`                                                                                                                                            |
| Email CTA        | `propertyTemplateEmailSections.ts#buildStayGuideCtaHtml`, `emailService.ts#sendReadyForCheckin`                                                                                                     |
| Migration        | `supabase/migrations/20260916120000_guest_stay_guide_token.sql`, `supabase/migrations/20261018130000_custom_pages.sql`                                                                              |
