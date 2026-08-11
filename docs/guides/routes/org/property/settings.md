---
title: 'Property Settings — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-03
---

# Property Settings — operator guide

Route: `/org/:orgSlug/property/:propertySlug/settings`

> **Status:** Documented

## Progress overview

| Section            | E2E save | Validation | Docs | Notes                                                                     |
| ------------------ | -------- | ---------- | ---- | ------------------------------------------------------------------------- |
| Basic Information  | Done     | Done       | Done | Required fields marked with *; save blocked until complete                |
| Photos & Videos    | Done     | Done       | Done | Min 3 photos; section banner when below minimum                           |
| Property Details   | Done     | Done       | Done | Azure North residence defaults + limits                                   |
| Amenities          | Done     | Done       | Done | Min 5 selected; section banner when below minimum                         |
| House Rules        | Done     | Done       | Done | Presets + custom rules; shown on public listing                           |
| Guest Form         | Done     | Done       | Done | Pet / parking / decor toggles; optional section                           |
| Cancellation       | Done     | Done       | Done | Presets + custom; shown on public listing + booking card                  |
| Location           | Done     | Done       | Done | Address + map pin required                                                |
| Socials            | Done     | Done       | Done | Per-property social links                                                 |
| Payment            | Done     | Done       | Done | Server-enforced; QR via upload only                                       |
| Building Forms     | Done     | Done       | Done | Shared GAF + pet PDF fields                                               |
| Email automations  | Done     | Done       | Done | Recipients, timing, toggles per property                                  |
| Booking Workflow   | Done     | Done       | Done | Calendar/Sheets sync toggles per property                                 |
| Integrations       | Done     | Done       | Done | Google optional (internal); Telegram optional; GAF/pet via Resend inbound |
| Voice Receptionist | Done     | Done       | Done | Opt-in AI voice assistant; own settings row; saves with page Save Changes |
| Danger Zone        | Done     | Done       | Done | Archive + delete with confirmations                                       |

---

## Overview

Living operator spec for property settings: what each section does, how data is saved, and setup completeness. **Save Changes** persists only dirty sections that pass validation — incomplete required areas still show a red dot for setup tracking.

---

## Host-facing knowledge

Property Settings is where you complete your listing and day-to-day setup — basic info, photos, amenities, location, payment details, building forms, email automations, and integrations. You can save section by section; incomplete required areas show a red dot until they're done.

**Common host questions**

- Q: Do I have to fill out every section before anything saves?
  A: No — **Save Changes** only saves sections you've edited that pass validation. You can finish photos today and payment details later; incomplete required areas still show a warning dot.
- Q: What's the difference between Archive and Delete?
  A: Archive hides the property from active use but keeps all bookings and history. Delete permanently removes an empty property and is blocked if any bookings exist — use Archive for units with past stays.
- Q: Where do guests see my cancellation policy and house rules?
  A: House rules and cancellation policy appear on your public property listing. Automated email wording is edited separately on the Templates page.
- Q: Where do I configure which documents guests must submit (GAF, pet approval, etc.)?
  A: Document requirements are set at the **development** level by the platform team (Super Admin → Developments → Document Requirements). All properties in that development inherit the same list.
- Q: Where is the PMO / documents-approver email set?
  A: On the development in Super Admin (**Developments → Email automations → PMO email**). Property Settings only has your property/team ops email (alerts, Reply-To, CC on GAF/pet) — not the PMO To address.

---

## Setup completeness

**Save Changes** saves **only dirty sections that pass validation** — you do not need every section complete first. Within a section, only **changed fields** are validated for that save (e.g. contact information can save even when other basic fields are still incomplete). Valid filled sections persist; invalid dirty sections are skipped and highlighted. If some sections save and others do not, you get a toast: _New changes has been saved._

Incomplete sections still show a **red dot** on the in-page section nav (**desktop `lg+` sidebar only** — the mobile horizontal chip strip is hidden) and on the sidebar **Settings** link (for setup tracking). On phone/tablet, Settings uses the same **brand hero** shell as other admin pages (`AdminMobilePage`); Save appears as a hero icon when there are unsaved changes. On desktop, the amber **Unsaved changes** bar is pinned to the **main content column** only (`max-w-4xl`, same measure as the form) so it does not cover the secondary section nav.

| Rule                                                           | Required?                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| Basic info (name, type, tower/unit for condos, contact fields) | Yes                                                          |
| Description                                                    | No                                                           |
| Photos                                                         | Yes — at least **3** images                                  |
| Property details (capacity, check-in/out)                      | Yes                                                          |
| Amenities                                                      | Yes — at least **5** selected                                |
| Location (address + map pin)                                   | Yes                                                          |
| Socials (at least one link + main platform)                    | Yes — org values count when property inherits                |
| Brand color (Basic information)                                | No — defaults to `#24a88e`; property inherits org when unset |
| Payment (provider, account, QR upload)                         | Yes                                                          |
| Building forms (GAF fields + signature)                        | Yes                                                          |
| Email automations (property/team email, timing, toggles)       | Yes                                                          |
| Google integration (Connect Google — internal/testing)         | No — production GAF/pet approvals use Resend inbound         |
| Telegram integrations                                          | No                                                           |

Field-level errors appear **as you edit** a field (on change). After **Save Changes**, all remaining issues are shown at once. Section banners (orange) appear only for **Photos & Videos**, **Amenities**, and **Integrations** — not for sections with individual inputs.

Logic: `ui/src/features/dashboard/org/lib/propertySettingsCompletion.ts`, `ui/src/features/dashboard/org/lib/propertySettingsFieldError.ts`, `ui/src/features/dashboard/org/lib/propertySettingsSave.ts`, `ui/src/features/dashboard/org/lib/propertySocialLinks.ts`

Social inherit UI: `ui/src/features/dashboard/org/components/settings/SocialLinkInheritField.tsx`, `PropertySocialsBrandingSection.tsx`

---

## Active vs Archive

Both use the same column: `properties.status` (`ACTIVE` | `INACTIVE`).

| Control                   | What it does                                                |
| ------------------------- | ----------------------------------------------------------- |
| **Archive** (Danger Zone) | Sets `status = INACTIVE` immediately via `update-property`. |
| **Restore** (Danger Zone) | Sets `status = ACTIVE` when the property is archived.       |

**Inactive** properties keep all bookings, settings, integrations, and media. Nothing is deleted.

---

## Basic Information

### Fields

| Field         | Storage                            | Validation                                                                                                                                                                                                                                            |
| ------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Property name | `properties.name`                  | 2–120 chars; **globally unique** (case-insensitive); **reserved names blocked** (see [onboarding.md](../../onboarding.md) § Reserved organization / property names); availability checked after typing pauses                                         |
| URL slug      | `properties.slug`                  | Auto-derived from name on save; globally unique                                                                                                                                                                                                       |
| Brand color   | `app_settings.brand_color`         | Optional hex `#RRGGBB`; UI shows **inherited** org color when unset; **Reset** clears property override back to org / `#24a88e`                                                                                                                       |
| Property type | `properties.type`                  | **Read-only** in settings (set at property creation). Condo enables residence / tower / unit display                                                                                                                                                  |
| Residence     | `properties.residence_name`        | **Read-only** in settings. Known residences apply defaults at creation (see below)                                                                                                                                                                    |
| Tower         | `properties.tower`                 | **Read-only** in settings. Options from residence config (Azure North: Monaco, Bali, Barbados)                                                                                                                                                        |
| Unit          | `properties.unit_number`           | **Read-only** in settings. 4-digit. Unique per tower among **`ACTIVE`** properties only ([#120](https://github.com/sprmke/kame-homes/issues/120)); many `INACTIVE` peers allowed (succession). Republish / stay ACTIVE with an ACTIVE peer → **409**. |
| Description   | `properties.settings.description`  | Max 1000 chars                                                                                                                                                                                                                                        |
| Contact name  | `properties.settings.contactName`  | Required; full name when non-empty; inline error on blur                                                                                                                                                                                              |
| Contact role  | `properties.settings.contactRole`  | Required                                                                                                                                                                                                                                              |
| Phone         | `properties.settings.contactPhone` | Required; PH mobile `09XXXXXXXXX`                                                                                                                                                                                                                     |
| Email         | `properties.settings.contactEmail` | Required; valid email                                                                                                                                                                                                                                 |

### Save path

1. UI draft → **Save Changes** → `update-property` (PATCH)
2. DB columns + merged `properties.settings` JSONB

### Residence defaults (Azure North Residences)

When residence is **Azure North Residences**, the app applies:

| Field         | Default                | Allowed range              |
| ------------- | ---------------------- | -------------------------- |
| Tower options | Monaco, Bali, Barbados | From residence catalog     |
| Bedrooms      | 1                      | 1–2                        |
| Bathrooms     | 1                      | 1                          |
| Floor         | 1                      | 1–29                       |
| Max adults    | 4 (Studio unit type)   | From development unit type |
| Max children  | 1 (Studio unit type)   | From development unit type |
| Unit type     | `studio`               | Dropdown from development  |
| Check-in      | 2:00 PM (`14:00`)      | —                          |
| Check-out     | 12:00 PM (`12:00`)     | —                          |

Defaults apply when creating a new property with that residence (not when editing an existing property — location fields are read-only after creation). New Azure North properties default to **Studio** unit type.

---

## Photos & Videos

### Behavior

- Uploads save **immediately** (no Save Changes required).
- **POST** `upload-property-media` → Supabase Storage bucket `property-media` → append to `properties.settings.media`.
- Reorder / cover photo → **PATCH** `update-property` with `settings.media`.
- **DELETE** `upload-property-media` removes storage object + DB entry.
- File picker uses a transparent overlay on the upload buttons (native `<input type="file">`).

### Limits

| Type   | Max count | Max size                                        |
| ------ | --------- | ----------------------------------------------- |
| Images | 5         | 5 MB each; **minimum 3** for setup completeness |
| Video  | 1         | 25 MB                                           |

---

## Property Details

Stored in `properties.settings` (+ `properties.max_guests` derived from adults + children).

| Field         | Key            | Default                | Guest-facing use                                      |
| ------------- | -------------- | ---------------------- | ----------------------------------------------------- |
| Unit type     | `unitTypeId`   | `studio` (Azure North) | Sets max adults/children from development unit types  |
| Check-in      | `checkInTime`  | `14:00`                | Guest form default + early-arrival warning threshold  |
| Check-out     | `checkOutTime` | `12:00`                | Guest form default + late-departure warning threshold |
| Max adults    | `maxAdults`    | from unit type         | Read-only; guest form occupancy limit                 |
| Max children  | `maxChildren`  | from unit type         | Read-only; guest form occupancy limit                 |
| Self check-in | `selfCheckIn`  | `false`                | Public listing + stay guide                           |

**Unit type** options come from the property's development/residence via **`GET get-residence-unit-types`**. Changing unit type updates `maxAdults`, `maxChildren`, and `max_guests` (computed sum) on save. The **Total guests** field was removed from the UI — capacity is always adults + children from the selected type.

Check-in/out times are saved as 24-hour **`HH:mm`** strings. They appear on the public property page, house-rule presets, and — after save — pre-fill the guest booking form Stay step via **`get-guest-payment-info`** → `useGuestPaymentInfo()`.

Validated on save against residence limits (see Azure North table above).

---

## Amenities

| Data               | Storage                                |
| ------------------ | -------------------------------------- |
| Enabled preset IDs | `properties.settings.enabledAmenities` |
| Custom amenities   | `properties.settings.customAmenities`  |

Custom amenity names max **50** characters; add-field shows an inline `current/50` counter inside the input.

Saved via **Save Changes** → `update-property` settings merge.

---

## House Rules

| Data               | Storage                                 |
| ------------------ | --------------------------------------- |
| Enabled preset IDs | `properties.settings.enabledHouseRules` |
| Custom rules       | `properties.settings.customHouseRules`  |

Preset catalog mirrors `ui/src/features/dashboard/org/lib/propertyHouseRulesConstants.ts` (check-in/out, restrictions, guests & pets, property). Custom rule names max **50** characters; add-field shows an inline `current/50` counter inside the input. Check-in/out presets use property detail times on the public listing.

Templates → **House Rules** is for email copy only — not shown on `/properties/:slug`.

---

## Guest Form

Per-property toggles for which sections appear on the public booking form (`/form?property=<slug>`). Stored in **`properties.settings`** (profile save — not `app_settings`).

| Toggle               | Key                  | Default | Effect when off                                                                  |
| -------------------- | -------------------- | ------- | -------------------------------------------------------------------------------- |
| Allow Pets           | `allowPets`          | `true`  | Pets step hidden; `has_pets` forced `false` on submit (server + client clamp)    |
| Allow Parking        | `allowParking`       | `true`  | Parking step hidden; `need_parking` forced `false` on submit                     |
| Allow Surprise Decor | `allowSurpriseDecor` | `true`  | Decor checkbox hidden on Stay step; `guest_requests_surprise_decor` forced false |

Section nav: **Guest Form** (after House Rules). UI: `PropertyGuestFormSettingsSection.tsx`.

Save path: **Save Changes** → dirty `guest-form` section → `update-property` settings merge (`propertyProfileSettingsPatch`).

Public exposure: resolved via **`get-guest-payment-info`** (same request as payment/GAF defaults) → `useGuestPaymentInfo()` on the guest form. Missing/invalid keys default to **`true`** (preserves legacy always-on behavior).

**Check-in / check-out times** (configured under **Property Details**, not this section): also resolved via **`get-guest-payment-info`** as **`checkInTime`** / **`checkOutTime`** (24h `HH:mm`; defaults **`14:00`** / **`12:00`**). New guest submissions pre-fill those fields; early/late warnings on the Stay step compare against the property values. Existing **`?bookingId=`** edits keep stored submission times from **`get-form`**.

**Guest capacity** (`maxAdults`, `maxChildren`) is also exposed on **`get-guest-payment-info`**. The Stay step guest list uses these for the maximum-guests reminder and server-side validation on **`submit-form`** (occupancy rule: ages 4+ = adult, ages 0–3 = child for capacity checks).

**Booking source** (separate from these toggles): guest form uses **`?source=facebook`** / **`?source=airbnb`** for platform-specific name labels; omitting `source` stores **`Direct`** (`booking_source` column default **`Direct`** after migration `20261003140000_booking_source_default_direct.sql`).

---

## Cancellation policy

Configure how guests see refund terms on the public property page (`/properties/:propertySlug`). This is **display-only** today — actual refund enforcement still follows your booking workflow and payment process.

| Data                 | Storage                                  |
| -------------------- | ---------------------------------------- |
| Policy type + tuners | `properties.settings.cancellationPolicy` |

### Presets

| Type                                                    | Guest-facing behavior                                                                      | Listing highlight                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------- |
| **Free cancellation window** (`grace_period`)           | Full refund within N hours after booking (24 / 48 / 72 / 168)                              | Yes — shield bullet + green card        |
| **Full refund before check-in** (`full_before_checkin`) | Full refund when cancelled ≥ N days before check-in (1–30)                                 | Yes                                     |
| **Moderate** (`moderate`)                               | Grace window **or** full refund ≥ N days before check-in; otherwise non-refundable         | Yes                                     |
| **Partial refund** (`partial_before_checkin`)           | X% refund (25 / 50 / 75) when cancelled ≥ N days before check-in; otherwise non-refundable | Yes — “Partial refund” badge            |
| **Non-refundable** (`non_refundable`)                   | No refunds after confirmation                                                              | No highlight on overview / booking card |
| **Custom** (`custom`)                                   | Host-written title (80 chars) + description (500 chars)                                    | Yes when title is set                   |

**Default for new properties:** 48-hour grace period (`propertyResidenceDefaults.ts`).

### Admin UX

Section nav: **Cancellation** (after House Rules). UI: `PropertyCancellationPolicySection.tsx`

- Radio cards for each preset with one-line summary
- Tuners appear per type (grace hours, days before check-in, partial %)
- Custom type requires title + description with inline char counters (`80/80`, `500/500`)
- Live **guest preview** card mirrors `CancellationPolicyDisplay` on the public page

Save path: **Save Changes** → dirty `cancellation` section → `update-property` settings merge. Server validation: `propertySettingsValidation.ts` + `propertyCancellationPolicy.ts` (edge mirror).

Completion: optional section (no red-dot gate for setup completeness). Custom type must pass validation when that section is dirty.

### Public display

| Surface                   | Component                                     | Notes                                     |
| ------------------------- | --------------------------------------------- | ----------------------------------------- |
| Overview shield bullet    | `PropertyOverview`                            | When `showListingHighlight`               |
| Rules card                | `PropertyRules` → `CancellationPolicyDisplay` | Always shows resolved title + description |
| Booking sidebar trust row | `BookingCard`                                 | Short label when `showListingHighlight`   |

API: `get-public-property` returns `cancellationPolicy` as resolved display fields (`publicPropertyService.ts`).

### Common configuration scenarios

| Scenario                                | Recommended preset                   |
| --------------------------------------- | ------------------------------------ |
| Short-stay / instant book, low friction | 48h grace period                     |
| Flexible long-lead bookings             | Full refund 7+ days before check-in  |
| Airbnb-style balanced policy            | Moderate (48h grace + 5 days before) |
| Discounted / peak-season rate           | Non-refundable or partial 50%        |
| Building-specific legal copy            | Custom title + description           |

### Edge cases

| Case                               | Behavior                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Missing / invalid stored JSON      | Normalizes to default 48h grace                                              |
| Out-of-range tuner values          | Snapped to nearest allowed option on save                                    |
| Custom with empty title            | Save blocked; no listing highlight until title set                           |
| Custom with title only             | Highlight uses title; description falls back to contact host                 |
| Non-refundable                     | Overview + booking card hide “free cancellation” marketing                   |
| Policy change after bookings exist | Display updates immediately; does not retroactively change paid bookings     |
| Same-day / past check-in cancel    | Copy describes policy intent only — ops handles exceptions in admin workflow |

Implementation: `ui/src/features/dashboard/org/lib/propertyCancellationPolicy.ts`, `supabase/functions/_shared/propertyCancellationPolicy.ts`

---

## Location

| Field                        | Storage                 |
| ---------------------------- | ----------------------- |
| Address                      | `properties.address`    |
| City, province, country, zip | `properties.settings.*` |
| Lat/lng, place ID, Maps URL  | `properties.settings.*` |

### Multi-tenant / Google Maps

- One **platform** Google Maps API key (`VITE_GOOGLE_MAPS_API_KEY`) is used for all orgs and properties.
- Each property stores its **own** coordinates and address; data is isolated by `property_id` / org ownership.
- Restrict the API key by HTTP referrer in Google Cloud Console for production.

---

## Socials

Per-property operational settings in `app_settings`. Empty link / main-platform columns inherit organization values from `org_settings`.

| Field         | Column                 | Notes                                                                                                           |
| ------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| Facebook page | `facebook_reviews_url` | Optional; **Customize link** / **Use org link** per row                                                         |
| Airbnb        | `airbnb_url`           | Optional; inherit or per-listing override                                                                       |
| Instagram     | `instagram_url`        | Optional; inherit or override                                                                                   |
| TikTok        | `tiktok_url`           | Optional; inherit or override                                                                                   |
| Main platform | `main_social_platform` | Empty inherits org; drives guest review / voucher CTA (`review_social_*` on `get-sd-form` / `get-guest-review`) |

**UI:** Link rows use **Customize link** / **Use org link**. **Guest review link** picker sits below the link fields and lists only platforms with a filled effective URL. **External reviews** and **Superhost** remain property-local.

**Validation:** at least one effective social URL + a main platform whose effective URL is filled.
| External reviews | `external_reviews` (JSONB) | Up to **5**; source `facebook` \| `airbnb`; review text max **2000** characters; **screenshot** (platform proof) + optional **0–3 stay photos** (guest in unit — shown on public listing when approved) + optional proof URL; moderation `pending` until super-admin approval |
| Superhost URL | `superhost_verification_url` | Optional Airbnb profile URL |
| Superhost proof | `superhost_proof_image_url` | Upload via `upload-app-settings-asset` (`superhost_proof`); sets `superhost_status = pending` |
| Superhost status | `superhost_status` | `none` \| `pending` \| `approved` \| `rejected`; public page uses `isSuperhost` when `approved` |

**Uploads:** Review screenshots use `upload-app-settings-asset` with `assetType=external_review_image` + `reviewId`. Stay photos use `assetType=external_review_stay_photo` + `reviewId` + `photoIndex` (0–2). Uploads go to storage immediately; URLs persist in JSONB on **Save** (dialog header **Save** or page **Save Changes**). Any edit to an **approved** or **rejected** review (text, photos, screenshot, proof URL) resets `moderationStatus` to **`pending`** and removes it from the public listing until super-admin approves again; photo/screenshot uploads to an already-saved review also reset pending in JSONB immediately.

**Public API:** `get-public-property` merges **approved** external reviews with Kame guest reviews; pending/rejected never publish. Super-admin approves/rejects at **`/admin/approvals`** (Type = Reviews). On **reject**, the property **Dashboard** shows a **Needs attention** chip linking here (no email); the review row shows a **Rejected** badge until the host edits and resubmits (returns to **pending**).

**Admin theme:** Property admin routes use the **resolved** property brand color (property → org → default). Org admin routes use org brand color only (set under **Basic information**).

**Guest/runtime:** `resolveAppSettings(propertyId)` merges property branding for guest forms, emails, SD form, and pay-parking.

Saved via **Save Changes** → `app-settings` PATCH.

---

## Payment

Per-property operational settings in `app_settings` (not `properties.settings`).

| Field           | Column               | Security notes                                                                 |
| --------------- | -------------------- | ------------------------------------------------------------------------------ |
| Bank / e-wallet | `payment_provider`   | Allow-list only (PH providers)                                                 |
| Account name    | `gcash_name`         | Max 120 chars; no secrets                                                      |
| Account number  | `gcash_number`       | Format validated per provider type                                             |
| QR image        | `gcash_qr_image_url` | **Upload only** via `upload-app-settings-asset`; PATCH cannot set URL directly |

### Save path

**Save Changes** → `app-settings` PATCH (admin JWT + `property_id` scope).

When provider, account name, account number, or primary QR reference in the payment-methods draft changed since last save, **Save Changes** opens a confirmation modal first. The host must confirm details are correct and acknowledge they are used for guest booking payments; Kame Homes is not liable for misdirected transfers from incorrect details.

QR image upload still saves immediately via `upload-app-settings-asset` (no modal on upload).

Payment details are shown on the guest form and ready-for-check-in email for **this property only**.

---

## Building Forms

Shared GAF + pet PDF owner fields in `app_settings`:

- Unit owner, on-site contact, owner phone, unit owner / SPA signature
- **Tower & unit** — read-only; auto-filled from **Basic Information** (`properties.tower` + `properties.unit_number`)

**Signature** — one signature slot shared across tabs (upload appears on the Sign canvas; a saved draw appears on Upload). **Sign** tab: canvas draw; **Save signature** shows only while there are unsaved strokes and hides after save. **Upload** tab: PNG/JPEG file with **Replace signature** when one exists. Live GAF/pet PDF preview on the right updates while drawing and after save. **Clear** wipes the pad for a redraw; each save replaces storage and persists a versioned public URL (`?v=…`) on `gaf_unit_owner_signature_url`. Signature upload saves immediately (like payment QR) and does not reset other unsaved building-form text fields.

---

## Email automations

Per-property operational settings in `app_settings` (below Building Forms in the UI).

### Recipients

| Field                                             | Column                 | Notes                                                                                            |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| Property email (Azure North) / Team email (other) | `email_reply_to`       | Required. Ops inbox: new booking alerts + CC on GAF/pet requests; Reply-To on most guest emails. |
| Parking owners                                    | `parking_owner_emails` | Comma-separated BCC for parking broadcast                                                        |

**GAF / pet request `To:`** is **not** edited here. It comes from the property’s development **PMO email** (`developments.settings.pmoEmail` via super-admin `/admin/developments/:slug`), then legacy `app_settings.email_to`, then the Azure North default. The Automation toggles panel shows that resolved address as read-only.

**Azure North Residences** uses residence-specific labels and defaults (`propertyEmailAutomationDefaults.ts`): PMO fallback **`stlmonaco.theresortresidences@azurenorth.com.ph`**.

### Check-out timing & defaults

| Field                                    | Column                                 | Notes                             |
| ---------------------------------------- | -------------------------------------- | --------------------------------- |
| SD refund email lead (hours)             | `sd_refund_cron_email_lead_minutes`    | Default **3** h before checkout   |
| Days after checkout to stop guest emails | `sd_refund_cron_max_checkout_age_days` | Default **30**; **0** = no cutoff |

**Parking rate** is configured on the **Pricing** page only (`default_parking_rate_guest` via `property-pricing`), not in Email automations.

### Automated sends

Master switches in `app_settings.automation_toggles` (JSONB). Missing keys default to **enabled**. Saved via **`app-settings` PATCH** with recipient/timing fields.

---

## Integrations

Read-only status on this page. Connect/disconnect via cards linking to dedicated settings flows.

---

## Voice Receptionist

Opt-in AI voice assistant guests can talk to (check-in, wifi, parking, and other stay questions). Own table (`voice_receptionist_settings`) and **own GET/PATCH edge function** — draft state lives on the property Settings page and saves with the shared **Save Changes** footer (same as profile / `app_settings`), not a section-local Save button.

| Field               | Column                           | Notes                                                                          |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Enable              | `enabled`                        | Also gated by the platform-wide super-admin kill switch                        |
| Voice               | `voice_id`                       | Gemini Live prebuilt voice; options from `availableVoices` (labeled in UI)     |
| Persona prompt      | `persona_prompt`                 | Optional tone guidance; guest-safe grounding is fixed and cannot be overridden |
| Max session (sec)   | `max_session_seconds`            | Default 300; allowed **60–3600**                                               |
| Max per guest / day | `max_sessions_per_guest_per_day` | Default 3; allowed **1–999**                                                   |
| Max concurrent      | `max_concurrent_sessions`        | Default 3, property-wide; allowed **1–50**                                     |

Save path: page **Save Changes** → `PATCH voice-receptionist-settings?property_id=` when this section is dirty (`settings:edit`). Hook: `useVoiceReceptionistSettings.ts`. UI: `PropertyVoiceReceptionistSection.tsx` (controlled from `PropertySettingsCard.tsx`).

**Test voice** — outline button beside the voice picker. `POST voice-receptionist-voice-preview?property_id=` (`settings:edit`) runs a short Gemini TTS sample with a fixed headline (_"Hi, I'm the Kame Homes receptionist…"_) using the selected prebuilt voice, then plays PCM audio in the browser. Uses Gemini API tokens (not a free local sample). Hook: `usePreviewVoiceReceptionistVoice`.

**Usage panel** — read-only "Usage — last 30 days" stat grid (sessions today, last 30 days, avg.
length, estimated cost) below the form fields. `GET voice-receptionist-usage?property_id=`
(`settings:view`), hook `useVoiceReceptionistUsage`. Estimated cost is a rough per-minute
blended-rate estimate persisted on `voice_receptionist_sessions.estimated_cost_usd` when a
session ends — visibility only, not a billing figure (Gemini Live bills by token, not duration).

**Guest-side hardening (Task 5):** sessions also end with `end_reason='timeout'` after 45s of
no guest/assistant speech activity (idle timeout, distinct from the max-session-length cap);
mic permission is requested before minting a session so a denial never consumes a daily-cap
slot; hard connection drops / mic disconnects call the end endpoint immediately (no zombie
sessions); mic-permission and cap-limit errors show plain-language copy in the overlay and stay
open until the guest dismisses them (no forced auto-close).

**Guest UX polish (Phase 6):** **6.1–6.4 shipped** (speech VAD; rich bubbles; leaner prompts;
booth UI; premium human concierge portrait). Admin settings fields above are unchanged. Plan:
[[2026-07-30-ai-voice-receptionist|AI Voice Receptionist — Implementation Plan]] § Phase 6.

---

## Danger Zone

### Archive

- Confirmation modal → `update-property` with `status: INACTIVE`
- Does **not** delete data

### Restore

- Shown when property is archived (Inactive)
- Confirmation modal → `update-property` with `status: ACTIVE`
- **409** when another org already has an ACTIVE listing for the same tower+unit — toast shows the server message; property stays Inactive

### Delete

- Confirmation modal with destructive warning
- **DELETE** `delete-property` with `{ propertyId }`
- **Blocked** when `guest_submissions` exist for this property (409)
- On success: removes property row (cascades Telegram/app settings integrations), cleans gallery storage
- Navigates to `/org/:orgSlug/properties`

**Recommendation:** Prefer **Archive** for units with booking history. Use **Delete** only for mistaken/empty properties.

---

## API reference (this page)

| Action                                                            | Endpoint                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| Profile + settings                                                | `PATCH update-property`                                |
| Payment + building forms + email automations + workflow documents | `PATCH app-settings?property_id=`                      |
| Media upload/delete                                               | `POST` / `DELETE upload-property-media?property_id=`   |
| Payment QR / signature                                            | `POST upload-app-settings-asset?property_id=`          |
| Voice receptionist settings                                       | `GET`/`PATCH voice-receptionist-settings?property_id=` |
| Voice receptionist voice preview (TTS)                            | `POST voice-receptionist-voice-preview?property_id=`   |
| Voice receptionist usage/cost read                                | `GET voice-receptionist-usage?property_id=`            |
| Archive                                                           | `PATCH update-property` `{ status: "INACTIVE" }`       |
| Restore                                                           | `PATCH update-property` `{ status: "ACTIVE" }`         |
| Delete                                                            | `DELETE delete-property` `{ propertyId }`              |

---

## Shared validation modules

| Layer                                 | Path                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------- |
| UI                                    | `ui/src/lib/validation/fieldValidation.ts`                             |
| Edge                                  | `supabase/functions/_shared/fieldValidation.ts`                        |
| Residence defaults (UI)               | `ui/src/features/dashboard/org/lib/propertyResidenceDefaults.ts`       |
| Email automation copy/defaults (UI)   | `ui/src/features/dashboard/org/lib/propertyEmailAutomationDefaults.ts` |
| Residence defaults (edge)             | `supabase/functions/_shared/propertyResidenceDefaults.ts`              |
| Email automation copy/defaults (edge) | `supabase/functions/_shared/propertyEmailAutomationDefaults.ts`        |

Keep UI and edge copies in sync when changing rules.

---

## Pending / follow-ups

- [ ] Org-level residence catalog (DB-driven instead of code constants)
- [ ] Location: optional per-org Maps API key override
- [ ] Soft-delete flag instead of hard delete for edge cases
- [ ] Automated tests for property settings validation
