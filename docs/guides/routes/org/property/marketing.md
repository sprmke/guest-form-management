---
title: 'Marketing — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-02
---

# Marketing — operator guide

> **Telegram marketing** settings live on **[Notifications](./notifications.md)** (`…/notifications?module=marketing`). This guide covers **Marketing Content Studio** (design templates + Meta publishing).

Route: `/org/:orgSlug/property/:propertySlug/marketing`

> **Status:** Documented — Content Studio + Telegram (see Notifications)

Legacy redirect: `/marketing` → `…/property/:propertySlug/marketing` (Content Studio)

## Overview

Property-scoped **Marketing Content Studio**: build availability calendars, social graphics, and short promo videos, then download or publish to connected Facebook Pages and Instagram. Telegram marketing alerts live on **Notifications**, not this page.

---

## Host-facing knowledge

Marketing Content Studio is where you create promotional content for this property — availability calendars, social graphics, and short videos — then download or publish to connected Facebook and Instagram accounts. Marketing Telegram alerts are configured separately under Notifications.

**Common host questions**

- Q: Do I need to connect Facebook before I can publish?
  A: Yes — connect your Facebook Page and Instagram through Guest Inbox first. Without that, you can still design and download assets but not publish from here.
- Q: Will my edits save automatically?
  A: Design and video editors autosave as you work. Blank calendars need you to save manually the first time; designer presets remember your changes per template.
- Q: Can AI create a calendar template for me?
  A: Yes — on the Calendar tab, use **Generate with AI**, describe the look you want, then Generate. It adds matching custom templates for Square, Portrait, and Landscape so you can switch formats without regenerating.
- Q: Can AI create a social graphic for me?
  A: Yes — on the Design tab, use **Generate with AI**. Choose a category and write the message first, then pick a look. It creates Instagram Post, Story, and Facebook Post versions you can edit after.
- Q: Can AI create a video clip for me?
  A: Yes — on the Video tab, use **Generate with AI**. Choose a category and write the message first, then pick a look, length, and motion. It creates Instagram Story, Post, and Landscape versions you can edit after.
- Q: Can I rename or move an AI-generated design?
  A: Yes — use ⋮ on the card. Saved and AI-generated designs have Rename, Move, and Remove. Remove deletes that design (and its other formats). Built-in templates can be renamed or moved, not removed.
- Q: Where do I set up marketing Telegram alerts?
  A: Those live on the **Notifications** page under the Marketing module, not on this Content Studio page.

## Marketing Content Studio

Property-scoped **Marketing Content Studio**: build availability calendars, social graphics, and short promo videos, then publish to connected Facebook Pages and Instagram accounts.

### Content Studio tabs

**Calendar / Design / Video** mode tabs sit **inline in each builder top bar** (between the builder title and Download/Publish actions) — not on a separate page row.

| Tab      | Builder chrome                                                                                                                                                                | Canvas / fields                                                                                                                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calendar | **Calendar Builder** top bar — **mode tabs**, autosave status **or Save Template**, Download PNG, Publish; **Templates** sidebar (**Custom** first, then designer categories) | **Live Preview** sub-header — Undo/Redo/Reset + month nav, zoom (**100%** = fit pane, up to **200%**); preview pane uses a **white** (`bg-card`) workspace in light theme so the canvas stands off the gray page shell                                                |
| Design   | **Design Builder** top bar — **mode tabs**, **autosave status**, Download PNG, Publish; **Templates** sidebar (Format / Category / Templates)                                 | OpenPolotno canvas on a **white** workspace in light theme (same `bg-card` treatment as Calendar/Video); 12 distinct campaign presets, toolbar **Undo / Redo / Reset** (reset reloads the current brand-tinted preset default; confirmation modal) + element controls |
| Video    | **Video Builder** top bar — **mode tabs**, **autosave status**, Download MP4, Publish; **Templates** sidebar (Format / Category / Templates)                                  | **Live Preview** sub-header — Undo / Redo / Reset + Remotion player on a **white** workspace in light theme + scene timeline                                                                                                                                          |

**Autosave:** Design and Video editors persist to `marketing_templates` automatically (~2.5s after the last edit). The toolbar shows **Unsaved** → **Saving…** → **Saved**.

**Calendar:** Fourteen designer presets across seven categories (**Sweet Social**, **Cute Type**, **Playful Pattern**, **Botanical**, **Photo Story**, **Twilight**, **Paper & Ink**) **autosave** per preset + format (`designJson.sourcePresetId` + `aspectPreset`). Preset definitions live in `lib/calendarPresets.ts`; the design system is pastel-led (soft lavender, blush, mint, butter, periwinkle, dusty rose) with real geometric variety per template — filled circular day cells (`social-availability`), thin-ring outlined circles (`ring-bloom`), organic-blob circular accents (`boho-soft`), chunky rounded blocks (`desk-type`, `garden-glow`, `cabin-retreat`), crisp pastel-hairline editorial (`magazine-grid`), sticker-shadow color blocks (`bauhaus-geo`, `memphis-print`), and a fully borderless/fill-less card that differentiates day states purely by ink color and weight (`petal-note`) — plus centered vs. left-aligned headers, varied day-number positions, and grid gaps ranging 0–20px so templates read as genuinely distinct, not just recolors. Base font sizes (day number, day names, month/year, legend, badges) are tuned larger across every preset for on-screen readability. Each template showcases a distinct slice of the calendar style engine (legend, watermark, price badges, guest-name spans, nav arrows, dashed/double borders, grid/dots/lines patterns, ring/badge/underline today indicators, blocked-day styling, subtitles, icon overlays, etc.). **Photo Story** presets (`property-hero`, `cabin-retreat`) auto-fill the container background from the property's primary gallery photo on first load (stock photo when none exists). Designer presets keep their authored palette — org brand color applies to the export canvas frame only, not today/booked/header fills. Once a calendar is autosaved, the baked-in `imageUrl` persists — a later gallery change does not retroactively update an already-customized calendar. **Blank calendar** does not autosave — **Save Template** appears in the top bar only after the user edits the blank canvas; the first save creates a named row under **Custom**. **Saved custom templates** autosave to their row (same as designer presets). Format tabs update the canvas immediately; designer presets load any autosaved state for that format when switching — if a preset was autosaved before a design refresh, switching to it again replays the **old** saved styles rather than the updated preset defaults; re-select a fresh format/property or clear that autosave row to see the current preset. Legacy autosaves keyed to retired preset ids (e.g. `editorial-serif`) still render saved `designJson.styles`; re-selecting that preset id falls back to blank defaults.

**Template menus:** Design and Video have no Archived folder and no archive/unarchive actions. Builtin categories stay visible (**Rename** only). Custom categories can be **Removed**. Built-in templates: **Rename** and **Move**. Saved custom and AI-generated rows: **Rename**, **Move**, and **Remove** (Remove permanently deletes the row; related format rows that share `aiGenerationId` stay in sync). Calendar designer presets and category sections stay always visible. Saved custom calendar templates (under **Custom**, excluding **Blank calendar**) expose **⋮ → Rename** (updates all related Square / Portrait / Landscape rows) and **⋮ → Remove**. Preferences for Design/Video catalog labels and moves persist in **localStorage** per property (`marketing-catalog:*`). Move on a saved row writes `designJson.categoryId` (unlike presets, which store the override in catalog prefs).

### Campaign templates (Design & Video)

Shared categories: **Promos** (₱500 off, ₱300 off, 10% off, free breakfast, free parking), **Last slots** (1 / 3 / 5), **Giveaway** (spotlight / raffle), **Fully booked** (stamp / waitlist). Design's 12 presets render in Instagram post, Instagram story, and Facebook post formats.

- **Design:** The preset library uses an editorial "Quiet Coast" design system across all 12 layouts (`₱500 off`, `₱300 off`, `10% off`, `Free breakfast`, `Free parking`, `Last 1/3/5 slots`, `Giveaway`, `Giveaway raffle`, `Fully booked`, `Join waitlist`) — photo-led compositions with a bottom-anchored gradient scrim (not a flat overlay) so photos stay bright at top and legible at bottom, and the brand accent used sparingly as a hairline rule, a stroke-only ring, or a small outline pill — never a filled shape or badge. CTA chrome is a continuous **rounded outline** SVG (`lib/polotno/roundedOutlineSvg.ts`) — Polotno figure strokes clip to the fill and looked like broken C-brackets on thin pills. Elements → Shapes leads with the same **CTA outline** chip. Presets do **not** ship a full-canvas overlay frame layer (avoids blocking element selection in the editor). Typography: `Fraunces` (serif headlines), `Jost` (tracked small-caps labels), `Plus Jakarta Sans` (body copy), `Space Grotesk` (date numerals). No stars, hexagons, sunbursts, dashed "ticket" borders, or rotation. The org/property brand color auto-tints the accent role when a preset loads. Brand changes are intentionally not live-synced to an open canvas — Reset or reselect the preset to apply the new color. `fully-booked` keeps a fixed ink/red stamp palette; `giveaway-raffle` keeps a fixed red/gold accent. Each preset also uses its own photo-scrim tint and no-photo page fallback so thumbnails stay distinct. Designer presets **autosave once per preset + format** (`designJson.sourcePresetId` = preset id + `aspectPreset`) — they do **not** appear as extra cards in the Templates grid. Sidebar **Templates → +** (**Save template**) creates an explicit custom row (`sourcePresetId: custom`) that does appear in the grid; click it to reload. Saved custom and AI-generated rows: **Rename**, **Move**, **Remove**. Built-in templates: **Rename**, **Move**. Rename / Move / Remove on an AI generation apply to all three formats that share `aiGenerationId` (Instagram Post, Story, Facebook Post). Autosave continues to patch that custom row while it is selected. The OpenPolotno side panel's **Elements** includes **Logo** (org `email_logo_url` when configured; click to add as canvas image) above Lines/Shapes; **Upload** and **Background** both expose **Upload** (local image pick) + property gallery grid; Background **Photos** grid sets page background, Upload grid adds canvas images. Session uploads are shared between both tabs. Sidebar collapse + **drag-to-resize** …
- **Video (Quiet Coast Motion):** **Video-only** categories — Soft stay, Flash deal, Last openings, Social proof, Fully booked, Seasonal (~16 storyboard recipes: e.g. Quiet morning, Weekday cut, One left, Guest love, Sold out, Ber months). Design’s Promos/Last slots/Giveaway set is unchanged. Each recipe owns clip count, durations (1–12s), which clips carry text, overlay mode (`none` / `soft-scrim` / `bottom-band` / `top-band`), transitions, and optional motion. Craft matches Design Quiet Coast: Fraunces / Jost / Plus Jakarta Sans, cream text `#fff7eb` (not brand-brown titles), outline CTAs in the same cream, soft accent scrims. Preview header zoom pill matches Calendar (**Zoom out / % / Zoom in / Fit to View / Fullscreen**); workspace pans without visible scrollbars. Sidebar template thumbs are Remotion stills of the **first clip** (property media when available). Timeline uses CapCut-style filmstrip clips with Remotion stills of each scene (photo + text/CTA), not raw photos alone. Old preset ids (`promo-500-off`, etc.) are retired from the sidebar (clean break); legacy autosaves still open via a soft fallback recipe. Scene settings: Overlay, Motion, Transition, Duration, Layout kind, Elements. **Music** — Jamendo import is **server-side** (`marketing-music` `import-jamendo`) into Storage before export (browser Jamendo CDN is CORS-blocked). Sidebar: Format → Category → presets; autosave to `marketing_templates`. Preview **Undo / Redo / Reset**; Remotion player + timeline. …

| Tab      | Export           | Publish                                                   |
| -------- | ---------------- | --------------------------------------------------------- |
| Calendar | **Download PNG** | **Publish**                                               |
| Design   | **Download PNG** | **Publish**                                               |
| Video    | **Download MP4** | **Publish** (Instagram; Facebook video not supported yet) |

**Publish** renders the asset, then opens the publish dialog: pick channel (Facebook / Instagram), account, post vs story, optional AI caption, confirm.

**Prerequisite:** Meta Page + Instagram must be connected under the property **Guest Inbox** (`/org/:orgSlug/property/:propertySlug/inbox` → Manage → Channels). If none are connected, the dialog links to Inbox.

Recent attempts appear in **Recent publishes** below the tabs.

### Templates (`marketing_templates`)

| Field          | Notes                                               |
| -------------- | --------------------------------------------------- |
| `name`         | Operator label                                      |
| `contentType`  | `calendar` \| `design` \| `video`                   |
| `platform`     | Optional target hint (e.g. `facebook`, `instagram`) |
| `aspectPreset` | Optional aspect ratio preset id                     |
| `designJson`   | Editor state (JSON object)                          |

**API:** `marketing-templates` — **`?property_id=`** required (or first owned property).

| Method | Body / query                                                         | Action                       |
| ------ | -------------------------------------------------------------------- | ---------------------------- |
| GET    | `?id=` optional                                                      | List templates or single row |
| POST   | `{ name, contentType, platform?, aspectPreset?, designJson? }`       | Create                       |
| PATCH  | `{ id, name?, contentType?, platform?, aspectPreset?, designJson? }` | Update                       |
| DELETE | `{ id }` or `?id=`                                                   | Delete                       |

Auth: admin JWT (`serveAdmin` + `resolveAdminPropertyId`).

### Publish to Meta (`marketing_publications`)

**API:** `publish-to-meta` — GET list / POST publish

```json
{
  "connectionId": "<social_channel_connections.id>",
  "publishType": "facebook_post | instagram_post | instagram_story",
  "imageUrl": "https://… or data:image/png;base64,…",
  "mediaUrl": "alias for imageUrl",
  "mediaType": "image | video",
  "caption": "optional",
  "scheduledAt": "optional ISO8601"
}
```

Or use **`platform`** + **`postType`** (`post` | `story`) instead of **`publishType`**.

- Data URLs are uploaded to **`property-media`** before Meta publish.
- **GET** `publish-to-meta?limit=40` returns recent **`marketing_publications`**.

**AI captions:** `generate-marketing-caption` POST — `{ platform, postType, contentHint?, nightlyRate?, availabilityText? }`.

**AI calendar templates:** Calendar sidebar **Generate with AI** opens a modal (bottom sheet below `lg`): **Look** prompt; **Suggestions** (4 featured by default, **View more** reveals all 12 pastel themes with mini palette previews) that fill a full Instagrammable prompt; **Layout / Type / Background** visual pickers (thumbnail + short hint; `auto` or locked). Collapsed **Show advanced settings**: **Show on calendar** switches (property name, month & year, month arrows, subtitle, weekdays, legend — applied client-side after compile) and **Use when generating** (property photo / amenities / availability — unavailable options disabled). Header copy: “Creates beautiful AI generated calendars you can edit.” Requires a non-empty prompt (client + edge). `generate-marketing-template` POST — `{ contentType: 'calendar', prompt, includeContext?, amenitiesText?, availabilityText?, preferences? }` → schema-constrained tokens. Host preferences fold into the model prompt; the client also **locks** non-`auto` layout/font/background on the returned tokens, then compiles via `lib/calendarAiTokens.ts` (palette sanitize + WCAG-readable day numbers / headers / legend). When the property photo include is enabled, each of the three formats receives a **randomly selected property image** (not always the cover photo) so the variations look different. Saves **three** custom `marketing_templates` rows (Square / Portrait / Landscape) sharing one `aiGenerationId` — one AI call. Removing any format deletes the whole set. Partial save failures toast `Saved N of 3`. Results appear under **Custom**.

**AI design templates:** Design sidebar **Generate with AI** opens the same modal as two inset panels: **Content** then **Look**. Content: equal-tile category grid (`promo`, `slots`, `giveaway`, `fully-booked`, or `custom`; `custom` leaves copy empty), a message textarea (category default; count inside the field), and **Include** toggles (property photo, org logo, property name, CTA). Org logos render as a **1×1 circle** (center cover-crop + full corner radius), including when dropped from Elements. Look: **Suggestions**, a look prompt (count inside the field), then Layout / Type / Background pickers. Disabled toggles show a hint (e.g., add a property photo or org logo in settings). The prompt and the category/content/includes are sent to `generate-marketing-template` (`contentType: 'design'`). The backend returns design tokens (layout, typography, palette, background, CTA, overlays) and the client compiles them into a Polotno document via `lib/polotno/polotnoAiCampaignDocuments.ts`. When the property photo include is enabled, each of the three formats receives a **randomly selected property image** (not always the cover photo) so the variations look different — the compiler always places that photo on the canvas (full-bleed background, or the lower band for photo-bottom layouts), even if the model picked a gradient/solid mood. Sidebar thumbnails are captured from the live canvas at save/select time and stored on `designJson.thumbnailDataUrl`, so generating a new design does not overwrite other custom cards. Compiles prioritize readability: high-contrast text panels, bottom gradient overlays for text-over-image layouts, and clamped WCAG-safe panel colors. Generated templates are saved like any other design campaign (Square / Portrait / Landscape) under **Custom**.

**AI video templates:** Video sidebar **Generate with AI** opens the same Content/Look modal: Content is a category grid (`soft-stay`, `flash-deal`, `last-openings`, `social-proof`, `fully-booked`, `seasonal`), a message textarea (category default), and **Include** toggles (property photo, org logo, property name, CTA). Look: **Suggestions** (8 curated storyboard vibes — each stamps its mood colors onto the generated video palette, plus soft Duration/Type/Motion locks the host can still change), a look prompt, then **Duration**, **Type** (4 font pairings), and **Motion** (Auto / Calm / Energetic / Cinematic) pickers. The backend returns a small storyboard token payload — scene count, each scene's kind/duration/transition/motion, one font pairing, and one flat copy bundle (headline/subheadline/promo line/date labels/CTA/footer) — not a full scene graph. The client compiler (`lib/video/videoAiProjectBuilder.ts`) assigns each scene a narrative role by position (opening = hook, closing = CTA, middle scenes = b-roll or offer beats depending on kind), distributes the copy bundle onto the right scenes, and renders through the exact same Remotion composition as hand-authored templates — same motion overrides, same transitions, same typography pipeline. When the property photo include is enabled, each of the three saved formats (Instagram Story / Post / Landscape) gets a different rotation through the property's photos and gallery videos. Saves **three** custom `marketing_templates` rows sharing one `aiGenerationId` — one AI call. Generated videos are saved like any other custom video (Rename/Move/Remove fan out across all three formats) under **Custom**.

- Resolves **`social_channel_connections`** for the property org (Meta inbox connect flow).
- **Facebook:** `POST /{page-id}/photos` with `url` + `message`; future **`scheduledAt`** uses `scheduled_publish_time`.
- **Instagram:** media container + `media_publish` (`STORIES` for stories, `IMAGE` for feed).
- Every attempt logged on **`marketing_publications`** (`pending` \| `published` \| `failed`).
- Future IG schedule: stored as **`pending`** (no native schedule API in v1).

**Meta OAuth:** all inbox + publishing scopes are requested on connect. Configure Meta app **use cases** first — see **[[meta-app-review|Meta app setup — Guest Inbox + Marketing Content Studio]]** (scope → use case table). If OAuth fails with **Invalid Scopes**, add the missing use cases there before reconnecting. Optional: `META_OAUTH_EXCLUDE_PUBLISHING_SCOPES=1` for inbox-only connect.

### Permissions

Uses platform admin allow-list (`ADMIN_ALLOWED_EMAILS`) via **`serveAdmin`**. Property scope via **`?property_id=`**.

## Telegram marketing (legacy module)

| Concern     | Path                                                                              |
| ----------- | --------------------------------------------------------------------------------- |
| Settings UI | `ui/src/features/dashboard/bookings/components/TelegramMarketingSettingsCard.tsx` |
| Edge        | `supabase/functions/telegram-marketing-settings/`                                 |

See [notifications.md](./notifications.md) for the unified page layout and save paths.

## Implementation map

| Concern                          | Path                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content Studio UI                | `ui/src/features/dashboard/marketing/`                                                                                                                                                                                                                                                                                                    |
| Calendar builder                 | `ui/src/features/dashboard/marketing/components/calendar-builder/`                                                                                                                                                                                                                                                                        |
| Calendar designer presets        | `ui/src/features/dashboard/marketing/lib/calendarPresets.ts` — 14 presets, 7 categories, sidebar metadata + style partials                                                                                                                                                                                                                |
| Property photo preset helper     | `ui/src/features/dashboard/marketing/lib/calendarPropertyPhoto.ts` — stock → property cover photo at preset load only                                                                                                                                                                                                                     |
| Brand accent on calendar         | `ui/src/features/dashboard/marketing/lib/calendarBrandColors.ts`                                                                                                                                                                                                                                                                          |
| Brand accent on campaign designs | `ui/src/features/dashboard/marketing/lib/designBrandColors.ts` — resolves brand-tinted accent, contrast-safe foreground, fixed semantic colors, and per-preset palette preservation                                                                                                                                                       |
| Design editor (OpenPolotno)      | `PolotnoDesignStudio.tsx`, `polotno/KamePolotnoEditor.tsx`, `polotno/KamePolotnoToolbarHistory.tsx` — header actions must be memoized (`useMarketingStudioHeaderActions`); fingerprint via MST snapshot (not per-render `toJSON`); Save uses lazy `designJsonForSave` getter; thumbs only from sidebar hook (no duplicate studio priming) |
| Design autosave / cleanup        | `lib/designAutosave.ts`, `hooks/useDesignTemplateCleanup.ts` — one row per preset+format; purge legacy infinite autosaves; custom saves use `sourcePresetId: custom`                                                                                                                                                                      |
| Studio header actions            | `marketingStudioHeaderActions.tsx` — stable `setActions`; callers memoize action trees (unstable trees → Maximum update depth)                                                                                                                                                                                                            |
| Builder chrome (Design/Video)    | `MarketingBuilderHeader.tsx` (`MarketingStudioModeTabs` inline), `MarketingPreviewHeader.tsx` (Video)                                                                                                                                                                                                                                     |
| Sidebar layout (all tabs)        | `MarketingEditorSidebar.tsx`, `useMarketingSidebarLayout.ts` — default **288px** all tabs; expand resets to default; drag resize 220–480px; drag below 160px collapses                                                                                                                                                                    |
| Kame Polotno shell               | `ui/src/features/dashboard/marketing/components/design-editor/polotno/KamePolotnoEditor.tsx`                                                                                                                                                                                                                                              |
| Custom text panel                | `ui/src/features/dashboard/marketing/components/design-editor/polotno/KameTextPanel.tsx`                                                                                                                                                                                                                                                  |
| Side panel shell                 | `ui/src/features/dashboard/marketing/components/design-editor/polotno/KameSidePanelShell.tsx`                                                                                                                                                                                                                                             |
| Overlay config + anchor          | `configurePolotnoOverlays.ts`, `usePolotnoOverlayAnchor.ts`, `usePolotnoOverlayDebug.ts` (dev)                                                                                                                                                                                                                                            |
| Blueprint CSS scope (admin UI)   | `postcss.config.js` + Vite `scopeBlueprintCssPlugin`; import via `marketing/styles/polotno-blueprint.css` — `.bp5-*` scoped to `.polotno-studio-root` only                                                                                                                                                                                |
| Elements / Layers wrappers       | `ui/src/features/dashboard/marketing/components/design-editor/polotno/KameBuiltinPanels.tsx`, `polotno/KameElementsPanel.tsx`                                                                                                                                                                                                             |
| Property media panels            | `ui/src/features/dashboard/marketing/components/design-editor/polotno/PropertyMediaPanels.tsx`                                                                                                                                                                                                                                            |
| Campaign → Polotno JSON          | `lib/polotno/polotnoCampaignDocuments.ts` + `roundedOutlineSvg.ts` — 12 builders; CTA is continuous rounded-outline SVG (not clipped figure stroke)                                                                                                                                                                                       |
| Polotno shapes panel             | `lib/polotno/kamePolotnoShapes.ts` — CTA outline first, then filled pill / rounded / circle / rect + basics                                                                                                                                                                                                                               |
| Polotno store / export           | `ui/src/features/dashboard/marketing/lib/polotno/polotnoStore.ts`                                                                                                                                                                                                                                                                         |
| Video editor (Remotion scenes)   | `ui/src/features/dashboard/marketing/components/video-editor/`                                                                                                                                                                                                                                                                            |
| Video timeline + settings        | `VideoTimeline.tsx`, `VideoEditorSettings.tsx`, `VideoTextPositionOverlay.tsx`, `VideoMusicSettings.tsx`, `MarketingTemplatesPanel.tsx`                                                                                                                                                                                                   |
| Video project schema             | `ui/src/features/dashboard/marketing/lib/video/` (`videoCategories.ts`, `videoStoryboardRecipes.ts`, `videoProjectDefaults.ts`, `videoTextSlots.ts`, …)                                                                                                                                                                                   |
| Video motion signatures          | `ui/src/features/dashboard/marketing/lib/video/videoMotionProfiles.ts` — per-template zoom/pan/spring profile, per-scene overrides, fallback profile                                                                                                                                                                                      |
| Video layouts + look             | `videoTemplateLayouts.ts`, `videoTemplateTypography.ts` — Quiet Coast Motion positions, outline CTAs, Fraunces/Jost/Jakarta                                                                                                                                                                                                               |
| Marketing music API              | `marketing-music` edge function; Jamendo tracks are imported **server-side** (`action: import-jamendo`) into property Storage — browser fetch of Jamendo CDN is CORS-blocked and cannot be used for Remotion export                                                                                                                       |
| Templates edge                   | `supabase/functions/marketing-templates/`                                                                                                                                                                                                                                                                                                 |
| Publish edge                     | `supabase/functions/publish-to-meta/`                                                                                                                                                                                                                                                                                                     |
| AI captions                      | `supabase/functions/generate-marketing-caption/`                                                                                                                                                                                                                                                                                          |
| AI template tokens               | `supabase/functions/generate-marketing-template/` + `_shared/marketingTemplateGenerationAi.ts`; calendar compiler `lib/calendarAiTokens.ts`; prompt UI `components/shared/MarketingAiGeneratePanel.tsx`                                                                                                                                   |
| Meta Graph helpers               | `supabase/functions/_shared/metaPublishing.ts`                                                                                                                                                                                                                                                                                            |
| Media upload                     | `supabase/functions/_shared/marketingMediaUpload.ts`                                                                                                                                                                                                                                                                                      |
| OAuth scopes                     | `supabase/functions/_shared/metaInboxConfig.ts` (`META_PUBLISHING_SCOPES`)                                                                                                                                                                                                                                                                |
| Migration                        | `supabase/migrations/20260917120000_marketing_studio.sql`                                                                                                                                                                                                                                                                                 |

## Progress overview

| Section                                  | Status     |
| ---------------------------------------- | ---------- |
| DB tables + grants                       | Documented |
| `marketing-templates` CRUD               | Documented |
| `generate-marketing-caption`             | Documented |
| `generate-marketing-template` (calendar) | Documented |
| `generate-marketing-template` (design)   | Documented |
| `generate-marketing-template` (video)    | Documented |
| `publish-to-meta`                        | Documented |
| Content Studio UI                        | Documented |
