# Property Settings — operator guide

Route: `/org/:orgSlug/property/:propertySlug/settings`

> **Status:** Documented

## Progress overview

| Section            | E2E save | Validation | Docs | Notes                                                         |
| ------------------ | -------- | ---------- | ---- | ------------------------------------------------------------- |
| Basic Information  | Done     | Done       | Done | Required fields marked with *; save blocked until complete    |
| Photos & Videos    | Done     | Done       | Done | Min 3 photos; section banner when below minimum               |
| Property Details   | Done     | Done       | Done | Azure North residence defaults + limits                       |
| Amenities          | Done     | Done       | Done | Min 5 selected; section banner when below minimum             |
| House Rules        | Done     | Done       | Done | Presets + custom rules; shown on public listing               |
| Cancellation       | Done     | Done       | Done | Presets + custom; shown on public listing + booking card      |
| Location           | Done     | Done       | Done | Address + map pin required                                    |
| Socials            | Done     | Done       | Done | Per-property social links                                     |
| Payment            | Done     | Done       | Done | Server-enforced; QR via upload only                           |
| Building Forms     | Done     | Done       | Done | Shared GAF + pet PDF fields                                   |
| Email automations  | Done     | Done       | Done | Recipients, timing, toggles per property                      |
| Integrations       | Done     | Done       | Done | Google (Gmail + Calendar + Sheet) required; Telegram optional |
| Voice Receptionist | Done     | Done       | Done | Opt-in AI voice assistant; own settings row, not app_settings |
| Danger Zone        | Done     | Done       | Done | Archive + delete with confirmations                           |

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

---

## Setup completeness

**Save Changes** saves **only dirty sections that pass validation** — you do not need every section complete first. Within a section, only **changed fields** are validated for that save (e.g. contact information can save even when other basic fields are still incomplete). Valid filled sections persist; invalid dirty sections are skipped and highlighted. If some sections save and others do not, you get a toast: _New changes has been saved._

Incomplete sections still show a **red dot** on the in-page section nav and on the sidebar **Settings** link (for setup tracking).

| Rule                                                           | Required?                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| Basic info (name, type, tower/unit for condos, contact fields) | Yes                                                          |
| Description                                                    | No                                                           |
| Photos                                                         | Yes — at least **3** images                                  |
| Property details (capacity, check-in/out)                      | Yes                                                          |
| Amenities                                                      | Yes — at least **5** selected                                |
| Location (address + map pin)                                   | Yes                                                          |
| Socials (Facebook page)                                        | Yes — org Facebook counts when property inherits             |
| Brand color (Basic information)                                | No — defaults to `#24a88e`; property inherits org when unset |
| Payment (provider, account, QR upload)                         | Yes                                                          |
| Building forms (GAF fields + signature)                        | Yes                                                          |
| Email automations (PMO/property email, timing, toggles)        | Yes                                                          |
| Google integration (Gmail, Calendar, Spreadsheet)              | Yes                                                          |
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

| Field         | Storage                            | Validation                                                                                                                                                                                                                                                                              |
| ------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Property name | `properties.name`                  | 2–120 chars; **unique per organization** (case-insensitive)                                                                                                                                                                                                                             |
| URL slug      | `properties.slug`                  | Auto-derived from name on save; globally unique                                                                                                                                                                                                                                         |
| Brand color   | `app_settings.brand_color`         | Optional hex `#RRGGBB`; UI shows **inherited** org color when unset; **Reset** clears property override back to org / `#24a88e`                                                                                                                                                         |
| Property type | `properties.type`                  | Condo enables residence / tower / unit                                                                                                                                                                                                                                                  |
| Residence     | `properties.residence_name`        | Known residences apply defaults (see below)                                                                                                                                                                                                                                             |
| Tower         | `properties.tower`                 | Options from residence config (Azure North: Monaco, Bali, Barbados)                                                                                                                                                                                                                     |
| Unit          | `properties.unit_number`           | 4-digit. **Today:** unique per tower globally (all statuses). **Planned ([#120](https://github.com/sprmke/kame-homes/issues/120)):** unique per tower among **`ACTIVE`** properties only — same unit may exist for successive hosts after prior rows are `INACTIVE` (sublease handoff). |
| Description   | `properties.settings.description`  | Max 1000 chars                                                                                                                                                                                                                                                                          |
| Contact name  | `properties.settings.contactName`  | Required; full name when non-empty; inline error on blur                                                                                                                                                                                                                                |
| Contact role  | `properties.settings.contactRole`  | Required                                                                                                                                                                                                                                                                                |
| Phone         | `properties.settings.contactPhone` | Required; PH mobile `09XXXXXXXXX`                                                                                                                                                                                                                                                       |
| Email         | `properties.settings.contactEmail` | Required; valid email                                                                                                                                                                                                                                                                   |

### Save path

1. UI draft → **Save Changes** → `update-property` (PATCH)
2. DB columns + merged `properties.settings` JSONB

### Residence defaults (Azure North Residences)

When residence is **Azure North Residences**, the app applies:

| Field         | Default                | Allowed range          |
| ------------- | ---------------------- | ---------------------- |
| Tower options | Monaco, Bali, Barbados | From residence catalog |
| Bedrooms      | 1                      | 1–2                    |
| Bathrooms     | 1                      | 1                      |
| Floor         | 1                      | 1–29                   |
| Max adults    | 4                      | 1–6                    |
| Max children  | 0                      | 0–4                    |
| Check-in      | 2:00 PM (`14:00`)      | —                      |
| Check-out     | 12:00 PM (`12:00`)     | —                      |

Defaults apply when selecting the residence in settings and when creating a new property with that residence.

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

Per-property operational settings in `app_settings`. Empty link columns inherit organization values from `org_settings` (same runtime merge as brand color).

| Field            | Column                       | Notes                                                                                                                        |
| ---------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Facebook page    | `facebook_reviews_url`       | Required (effective value); toggle **Organization** to inherit; custom override stored in column                             |
| Airbnb           | `airbnb_url`                 | Optional; inherit or per-listing override                                                                                    |
| Instagram        | `instagram_url`              | Optional; inherit or override                                                                                                |
| TikTok           | `tiktok_url`                 | Optional; inherit or override                                                                                                |
| External reviews | `external_reviews` (JSONB)   | Up to **5**; source `facebook` \| `airbnb`; screenshot + optional proof URL; moderation `pending` until super-admin approval |
| Superhost URL    | `superhost_verification_url` | Optional Airbnb profile URL                                                                                                  |
| Superhost proof  | `superhost_proof_image_url`  | Upload via `upload-app-settings-asset` (`superhost_proof`); sets `superhost_status = pending`                                |
| Superhost status | `superhost_status`           | `none` \| `pending` \| `approved` \| `rejected`; public page uses `isSuperhost` when `approved`                              |

**UI:** Each social link row has an **Organization / Custom** toggle. Inherited rows are read-only and show the org URL with a link to org settings. **Use organization for all** / **Customize links** bulk actions apply to the four link fields only. **External reviews** and **Superhost** remain property-local.

**Uploads:** Review screenshots use `upload-app-settings-asset` with `assetType=external_review_image` + `reviewId` (URL returned; persisted on Save via `externalReviews` PATCH).

**Public API:** `get-public-property` merges approved external reviews with Kame guest reviews; each review includes optional `source` (`kame` \| `facebook` \| `airbnb`).

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

- Unit owner, on-site contact, owner phone, signature image
- **Tower & unit** — read-only; auto-filled from **Basic Information** (`properties.tower` + `properties.unit_number`)

Signature upload saves immediately (like payment QR) and does not reset other unsaved building-form text fields.

---

## Email automations

Per-property operational settings in `app_settings` (below Building Forms in the UI).

### Recipients

| Field                                                | Column                 | Notes                                                                   |
| ---------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| PMO email (Azure North) / Documents approver (other) | `email_to`             | Required; GAF/pet approval requests                                     |
| Property email (Azure North) / Team email (other)    | `email_reply_to`       | Required; new booking alert + guest reply-to; Gmail listener allow-list |
| Parking owners                                       | `parking_owner_emails` | Comma-separated BCC for parking broadcast                               |

**Azure North Residences** uses residence-specific labels and defaults (`propertyEmailAutomationDefaults.ts`): PMO default **`stlmonaco.theresortresidences@azurenorth.com.ph`**.

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

Opt-in AI voice assistant guests can talk to (check-in, wifi, parking, and other stay questions). Own table (`voice_receptionist_settings`), **own GET/PATCH edge function** and **own Save button** — not part of `app_settings` / the page's shared Save Changes flow.

| Field                        | Column                           | Notes                                                                                      |
| ---------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| Enable                       | `enabled`                        | Also gated by the platform-wide super-admin kill switch                                    |
| Voice                        | `voice_id`                       | Gemini Live prebuilt voice; options from `availableVoices`                                 |
| Persona prompt               | `persona_prompt`                 | Optional tone/personality guidance; guest-safe grounding is fixed and cannot be overridden |
| Max session length (sec)     | `max_session_seconds`            | Default 300                                                                                |
| Max sessions per guest / day | `max_sessions_per_guest_per_day` | Default 3                                                                                  |
| Max concurrent sessions      | `max_concurrent_sessions`        | Default 3, property-wide                                                                   |

Save path: `PATCH voice-receptionist-settings?property_id=` (`settings:edit`). Hook: `useVoiceReceptionistSettings.ts` (manual draft-state, mirrors `useAppSettings.ts`). UI: `PropertyVoiceReceptionistSection.tsx`.

**Usage panel** — read-only "Usage — last 30 days" stat grid (sessions today, last 7 days, avg.
length, estimated cost) below the Save button. `GET voice-receptionist-usage?property_id=`
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
`docs/planning/planned_modules/2026-07-30-ai-voice-receptionist.md` § Phase 6.

---

## Danger Zone

### Archive

- Confirmation modal → `update-property` with `status: INACTIVE`
- Does **not** delete data

### Restore

- Shown when property is archived (Inactive)
- Confirmation modal → `update-property` with `status: ACTIVE`

### Delete

- Confirmation modal with destructive warning
- **DELETE** `delete-property` with `{ propertyId }`
- **Blocked** when `guest_submissions` exist for this property (409)
- On success: removes property row (cascades Telegram/app settings integrations), cleans gallery storage
- Navigates to `/org/:orgSlug/properties`

**Recommendation:** Prefer **Archive** for units with booking history. Use **Delete** only for mistaken/empty properties.

---

## API reference (this page)

| Action                                       | Endpoint                                               |
| -------------------------------------------- | ------------------------------------------------------ |
| Profile + settings                           | `PATCH update-property`                                |
| Payment + building forms + email automations | `PATCH app-settings?property_id=`                      |
| Media upload/delete                          | `POST` / `DELETE upload-property-media?property_id=`   |
| Payment QR / signature                       | `POST upload-app-settings-asset?property_id=`          |
| Voice receptionist settings                  | `GET`/`PATCH voice-receptionist-settings?property_id=` |
| Voice receptionist usage/cost read           | `GET voice-receptionist-usage?property_id=`            |
| Archive                                      | `PATCH update-property` `{ status: "INACTIVE" }`       |
| Restore                                      | `PATCH update-property` `{ status: "ACTIVE" }`         |
| Delete                                       | `DELETE delete-property` `{ propertyId }`              |

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
