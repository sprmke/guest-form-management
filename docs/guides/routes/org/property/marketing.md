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
- Q: Where do I set up marketing Telegram alerts?
  A: Those live on the **Notifications** page under the Marketing module, not on this Content Studio page.

## Marketing Content Studio

Property-scoped **Marketing Content Studio**: build availability calendars, social graphics, and short promo videos, then publish to connected Facebook Pages and Instagram accounts.

### Content Studio tabs

**Calendar / Design / Video** mode tabs sit **inline in each builder top bar** (between the builder title and Download/Publish actions) — not on a separate page row.

| Tab      | Builder chrome                                                                                                                                                                | Canvas / fields                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Calendar | **Calendar Builder** top bar — **mode tabs**, autosave status **or Save Template**, Download PNG, Publish; **Templates** sidebar (**Custom** first, then designer categories) | **Live Preview** sub-header — Undo/Redo/Reset + month nav, zoom                                                            |
| Design   | **Design Builder** top bar — **mode tabs**, **autosave status**, Download PNG, Publish; **Templates** sidebar (Format / Category / Templates)                                 | OpenPolotno canvas — toolbar **Undo / Redo / Reset** (reset reloads preset default; confirmation modal) + element controls |
| Video    | **Video Builder** top bar — **mode tabs**, **autosave status**, Download MP4, Publish; **Templates** sidebar (Format / Category / Templates)                                  | **Live Preview** sub-header — Undo / Redo / Reset + Remotion player + scene timeline                                       |

**Autosave:** Design and Video editors persist to `marketing_templates` automatically (~2.5s after the last edit). The toolbar shows **Unsaved** → **Saving…** → **Saved**.

**Calendar:** Designer presets (Editorial, Minimal, etc.) **autosave** per preset + format (`designJson.sourcePresetId` + `aspectPreset`). **Blank calendar** does not autosave — **Save Template** appears in the top bar only after the user edits the blank canvas; the first save creates a named row under **Custom**. **Saved custom templates** autosave to their row (same as designer presets). Format tabs update the canvas immediately; designer presets load any autosaved state for that format when switching.

**Hidden templates & categories:** Design and Video sidebars include a **Hidden** category chip (always last; cannot be renamed or hidden). Presets and builtin categories hidden via **⋮ → Hide** appear there with **Unhide**. Calendar uses a **Hidden** sidebar section at the bottom with the same behavior (category sections and preset cards also expose **Hide** in **⋮**). Preferences persist in **localStorage** per property (`marketing-catalog:*`).

### Campaign templates (Design & Video)

Shared categories: **Promos** (₱500 off, ₱300 off, 10% off, free breakfast, free parking), **Last slots** (1 / 3 / 5), **Giveaway**, **Fully booked**.

- **Design:** … OpenPolotno side panel — **Elements** includes **Logo** (org `email_logo_url` when configured; click to add as canvas image) above Lines/Shapes; **Upload** and **Background** both expose **Upload** (local image pick) + property gallery grid; Background **Photos** grid sets page background, Upload grid adds canvas images. Session uploads are shared between both tabs. Sidebar collapse + **drag-to-resize** …
- **Video:** … Sidebar: Format → Category → campaign presets (autosave persists edits to `marketing_templates` in the background — no separate **Saved** list in the sidebar). Editor settings: rename/delete the current autosaved row when one exists. Editor: inline template name; preview header **Undo / Redo / Reset** (confirmation modal — reloads preset default); hover text in the preview and drag (grip handle) to reposition — Remotion renders text; per-scene **Elements** panel — **Add element** supports Background, Image, **Logo** (org `email_logo_url`), Text, CTA; logo/image layers are draggable on canvas, removable in the list, resizable via sidebar slider or canvas corner handle (`widthPct` on layer). **Music** section — **Trending** / **Search** (Jamendo, free API via `JAMENDO_CLIENT_ID`), **Upload** (property audio → `property-media`), **Link** (paste URL → server import), volume slider. Selected tracks are cached to Storage for stable export. Template list **⋮**: **Move**, Hide (presets). …

| Tab      | Export           | Publish                                                   |
| -------- | ---------------- | --------------------------------------------------------- |
| Calendar | **Download PNG** | **Publish**                                               |
| Design   | **Download PNG** | **Publish**                                               |
| Video    | **Download MP4** | **Publish** (Instagram; Facebook video not supported yet) |

**Publish** renders the asset, then opens the publish dialog: pick channel (Facebook / Instagram), account, post vs story, optional AI caption, confirm.

**Prerequisite:** Meta Page + Instagram must be connected under **`/org/:orgSlug/inbox`** (same OAuth as Guest Inbox). If none are connected, the dialog links to Inbox.

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

- Resolves **`social_channel_connections`** for the property org (Meta inbox connect flow).
- **Facebook:** `POST /{page-id}/photos` with `url` + `message`; future **`scheduledAt`** uses `scheduled_publish_time`.
- **Instagram:** media container + `media_publish` (`STORIES` for stories, `IMAGE` for feed).
- Every attempt logged on **`marketing_publications`** (`pending` \| `published` \| `failed`).
- Future IG schedule: stored as **`pending`** (no native schedule API in v1).

**Meta OAuth:** all inbox + publishing scopes are requested on connect. Configure Meta app **use cases** first — see **`docs/operations/meta-app-review.md`** (scope → use case table). If OAuth fails with **Invalid Scopes**, add the missing use cases there before reconnecting. Optional: `META_OAUTH_EXCLUDE_PUBLISHING_SCOPES=1` for inbox-only connect.

### Permissions

Uses platform admin allow-list (`ADMIN_ALLOWED_EMAILS`) via **`serveAdmin`**. Property scope via **`?property_id=`**.

## Telegram marketing (legacy module)

| Concern     | Path                                                                              |
| ----------- | --------------------------------------------------------------------------------- |
| Settings UI | `ui/src/features/dashboard/bookings/components/TelegramMarketingSettingsCard.tsx` |
| Edge        | `supabase/functions/telegram-marketing-settings/`                                 |

See [notifications.md](./notifications.md) for the unified page layout and save paths.

## Implementation map

| Concern                        | Path                                                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content Studio UI              | `ui/src/features/dashboard/marketing/`                                                                                                                                 |
| Design editor (OpenPolotno)    | `ui/src/features/dashboard/marketing/components/design-editor/PolotnoDesignStudio.tsx`, `polotno/KamePolotnoEditor.tsx`, `polotno/KamePolotnoToolbarHistory.tsx`       |
| Builder chrome (Design/Video)  | `MarketingBuilderHeader.tsx` (`MarketingStudioModeTabs` inline), `MarketingPreviewHeader.tsx` (Video)                                                                  |
| Sidebar layout (all tabs)      | `MarketingEditorSidebar.tsx`, `useMarketingSidebarLayout.ts` — default **288px** all tabs; expand resets to default; drag resize 220–480px; drag below 160px collapses |
| Kame Polotno shell             | `ui/src/features/dashboard/marketing/components/design-editor/polotno/KamePolotnoEditor.tsx`                                                                           |
| Custom text panel              | `ui/src/features/dashboard/marketing/components/design-editor/polotno/KameTextPanel.tsx`                                                                               |
| Side panel shell               | `ui/src/features/dashboard/marketing/components/design-editor/polotno/KameSidePanelShell.tsx`                                                                          |
| Overlay config + anchor        | `configurePolotnoOverlays.ts`, `usePolotnoOverlayAnchor.ts`, `usePolotnoOverlayDebug.ts` (dev)                                                                         |
| Blueprint CSS scope (admin UI) | `postcss.config.js` + Vite `scopeBlueprintCssPlugin`; import via `marketing/styles/polotno-blueprint.css` — `.bp5-*` scoped to `.polotno-studio-root` only             |
| Elements / Layers wrappers     | `ui/src/features/dashboard/marketing/components/design-editor/polotno/KameBuiltinPanels.tsx`, `polotno/KameElementsPanel.tsx`                                          |
| Property media panels          | `ui/src/features/dashboard/marketing/components/design-editor/polotno/PropertyMediaPanels.tsx`                                                                         |
| Campaign → Polotno JSON        | `ui/src/features/dashboard/marketing/lib/polotno/polotnoCampaignDocuments.ts`                                                                                          |
| Polotno store / export         | `ui/src/features/dashboard/marketing/lib/polotno/polotnoStore.ts`                                                                                                      |
| Video editor (Remotion scenes) | `ui/src/features/dashboard/marketing/components/video-editor/`                                                                                                         |
| Video timeline + settings      | `VideoTimeline.tsx`, `VideoEditorSettings.tsx`, `VideoTextPositionOverlay.tsx`, `VideoMusicSettings.tsx`, `MarketingTemplatesPanel.tsx`                                |
| Video project schema           | `ui/src/features/dashboard/marketing/lib/video/` (`videoTextSlots.ts`, `videoTextSlotContent.tsx`, `videoCompositionLayout.tsx`)                                       |
| Marketing music API            | `marketing-music` edge function; `useMarketingMusic.ts`                                                                                                                |
| Templates edge                 | `supabase/functions/marketing-templates/`                                                                                                                              |
| Publish edge                   | `supabase/functions/publish-to-meta/`                                                                                                                                  |
| AI captions                    | `supabase/functions/generate-marketing-caption/`                                                                                                                       |
| Meta Graph helpers             | `supabase/functions/_shared/metaPublishing.ts`                                                                                                                         |
| Media upload                   | `supabase/functions/_shared/marketingMediaUpload.ts`                                                                                                                   |
| OAuth scopes                   | `supabase/functions/_shared/metaInboxConfig.ts` (`META_PUBLISHING_SCOPES`)                                                                                             |
| Migration                      | `supabase/migrations/20260917120000_marketing_studio.sql`                                                                                                              |

## Progress overview

| Section                    | Status     |
| -------------------------- | ---------- |
| DB tables + grants         | Documented |
| `marketing-templates` CRUD | Documented |
| `publish-to-meta`          | Documented |
| Content Studio UI          | Documented |
