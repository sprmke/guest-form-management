# Guest stay guide (token-gated brochure)

**Route:** `/properties/:propertySlug/stay-guide?token=<opaque>`  
**Status:** Documented — **shipped**

## Purpose

Mobile-first **brochure-style** page for booked guests: house rules, check-in/out instructions, and parking reminders from **Property Templates** (standard keys), interleaved with property photos. Linked from the **ready-for-checkin** email (`{{stay_guide_cta_section}}`).

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

**Preview stay guide** on **Templates → Standard templates** opens **`?preview=1&property_id=`** (no guest token). See **`docs/guides/routes/org/property/templates.md`**.

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

## UI

- **Hero carousel** — full-width swipeable property gallery (up to 12 images, primary first); auto-advances every 5s (pauses on hover/drag; respects `prefers-reduced-motion`); no dot or count UI
- **Meta chips** — stay dates on the hero carousel (welcome + dates pills); address only on check-in map card
- **Section tabs** — equal-width grid on mobile (icon + label); segmented pill bar on larger screens; **section image** only from template `section_image_url` when uploaded
- **Section cards** — optional template section image (only when uploaded): stacked on top on mobile, **left column beside content on `lg+`**; title from first template heading, rich HTML body; **Check-in** adds a **second card below** with full-bleed map, address, and Directions
- Brand color from property/org via CSS variables
- **Need help** footer — host avatar + **team member name** (first active property team member, else org team member — not settings contact name), phone, email, Facebook, Airbnb in a card layout

## Implementation map

| Layer           | Path                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Page            | `ui/src/features/guest/stay-guide/pages/StayGuidePage.tsx`                                      |
| Components      | `ui/src/features/guest/stay-guide/components/*`                                                 |
| Hook            | `ui/src/features/guest/stay-guide/hooks/useGuestStayGuide.ts` (`useGuestStayGuidePreview`)      |
| Preview client  | `ui/src/features/guest/stay-guide/lib/previewApi.ts`                                            |
| Edge            | `supabase/functions/get-guest-stay-guide/index.ts`                                              |
| Preview edge    | `supabase/functions/preview-guest-stay-guide/index.ts`                                          |
| Issue link API  | `supabase/functions/issue-guest-stay-guide-token/index.ts`                                      |
| Token + payload | `supabase/functions/_shared/guestStayGuide.ts` (`loadGuestStayGuidePreview`, mock booking)      |
| Admin UI        | `WorkflowPanel.tsx` (Stay guide row); **`TemplatesPage.tsx`** (Preview stay guide)              |
| Orchestrator    | `workflowOrchestrator.ts` — token on `READY_FOR_CHECKIN`                                        |
| Email CTA       | `propertyTemplateEmailSections.ts#buildStayGuideCtaHtml`, `emailService.ts#sendReadyForCheckin` |
| Migration       | `supabase/migrations/20260916120000_guest_stay_guide_token.sql`                                 |
