---
title: 'Property Settings — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-21
---

# Property Settings — operator guide

Route: `/org/:orgSlug/property/:propertySlug/settings`

> **Status:** Documented

## Progress overview

| Section            | E2E save | Validation | Docs | Notes                                                                    |
| ------------------ | -------- | ---------- | ---- | ------------------------------------------------------------------------ |
| Basic Information  | Done     | Done       | Done | Required fields marked with *; save blocked until complete               |
| Property Details   | Done     | Done       | Done | Azure North residence defaults + limits                                  |
| Guest Form         | Done     | Done       | Done | Pet / parking / decor toggles + required Cleaning Time                   |
| Location           | Done     | Done       | Done | Address + map pin required                                               |
| Payment            | Done     | Done       | Done | Server-enforced; QR via upload only                                      |
| Building Forms     | Done     | Done       | Done | Shared GAF + pet PDF fields                                              |
| Email automations  | Done     | Done       | Done | Recipients, timing, toggles per property                                 |
| Integrations       | Done     | Done       | Done | Telegram + AI optional; GAF/pet via Resend inbound                       |
| Voice Receptionist | Done     | Done       | Done | Hidden unless `aiReceptionist` (Business+); saves with page Save Changes |
| AI Overrides       | Done     | Done       | Done | Hidden unless plan has AI credits (`aiMonthlyCreditAllowance` > 0)       |
| Danger Zone        | Done     | Done       | Done | Archive + delete with confirmations                                      |

> **Also editable in Page Editor:** Photos & Videos, Brand color, Description, Amenities, House Rules, Cancellation, and Socials — same fields, same storage (`properties.settings` / `app_settings`). Edit in **Settings** or **Public Pages → Property → Edit** (live preview). Do not treat them as separate copies.

---

## Overview

Living operator spec for property settings: what each section does, how data is saved, and setup completeness. **Save Changes** persists only dirty sections that pass validation — incomplete required areas still show a red dot for setup tracking.

---

## Host-facing knowledge

Property Settings is where you complete operational setup: basic info, capacity, location, payment details, building forms, email automations, and integrations. Listing content (photos, description, amenities, house rules, cancellation, socials, brand color) can be edited here **or** under **Public Pages → Edit** on the Property card — both screens save to the same place. You can save section by section, and incomplete required areas show a red dot until they're done.

**Common host questions**

- Q: Do I have to fill out every section before anything saves?
  A: No. **Save Changes** only saves the sections you've edited that pass validation, so you can finish contact details today and payment later. Incomplete required areas still show a warning dot until you get to them.
- Q: What's the difference between Archive and Delete?
  A: Archive hides the property from active use but keeps all bookings and history. Delete permanently removes an empty property, and it's blocked if any bookings exist, so use Archive instead for units with past stays.
- Q: Where do guests see my cancellation policy and house rules?
  A: House rules and cancellation policy appear on your public property listing. Automated email wording is edited separately on the Templates page.
- Q: Where do I configure which documents guests must submit (GAF, pet approval, etc.)?
  A: Document requirements are set at the **development** level by the platform team (Super Admin → Developments → Document Requirements). All properties in that development inherit the same list.
- Q: Where is the PMO / documents-approver email set?
  A: On the development in Super Admin (**Developments → Email automations → PMO email**). Property Settings only holds your property/team ops email (alerts, Reply-To, CC on GAF/pet), not the PMO To address.
- Q: Where do I edit amenities, house rules, or cancellation?
  A: In **Property Settings**, or in **Public Pages → Property → Edit** if you want a live preview. Both save the same data.
- Q: Where do I upload listing photos?
  A: **Property Settings → Photos & Videos**, or the listing Page Editor gallery. Photos are shared across the listing, property cards, and Marketing.
- Q: Where is listing verification?
  A: Open **Verification** from the property sidebar (not org **Get Verified**). That flow covers ownership proof, contract dates, and the Recommended badge for this listing. Submitting listing **Recommended** tier requires a paid plan with **`recommendedBadgeEligible`**; the upgrade modal links to **Plans & Billing**.
- Q: My contract is ending — what should I do?
  A: A renewal reminder may appear when you log in. Tap **Submit renewal contract** or use **Verification** in the sidebar to upload an updated contract before the grace period ends.
- Q: What does the Cleaning Time setting do?
  A: It's the shortest gap your cleaner needs between one guest checking out and the next guest checking in **on the same day**. Set it under **Guest Form → Cleaning Time** — it's required and always at least 1 hour. Guests can't pick a check-in or check-out time on the booking form that leaves less than that gap.

---

## Setup completeness

**Save Changes** saves **only dirty sections that pass validation** — you do not need every section complete first. Within a section, only **changed fields** are validated for that save (e.g. contact information can save even when other basic fields are still incomplete). Valid filled sections persist; invalid dirty sections are skipped and highlighted. **Exception — Payment:** if payment methods are edited, Save is disabled until the whole Payment section’s required fields are valid (it does not partially save other sections alongside an incomplete payment draft). If **no** dirty section is savable, the button stays visible but **disabled**. If some sections save and others do not, you get a toast: _New changes has been saved._

Incomplete sections still show a **red dot** on the in-page section nav (**desktop `lg+` sidebar only** — the mobile horizontal chip strip is hidden) and on the sidebar **Settings** link (for setup tracking). On phone/tablet, Settings uses the same **brand hero** shell as other admin pages (`AdminMobilePage`); Save appears as a hero icon when there are unsaved changes. On desktop, the amber **Unsaved changes** bar is pinned to the **main content column** only (`max-w-4xl`, same measure as the form) so it does not cover the secondary section nav.

| Rule                                                           | Required? |
| -------------------------------------------------------------- | --------- |
| Basic info (name, type, tower/unit for condos, contact fields) | Yes       |
| Property details (capacity, check-in/out)                      | Yes       |
| Location (address + map pin)                                   | Yes       |
| Payment (provider, account name, account number)               | Yes       |
| Payment QR (per method)                                        | No        |
| Building forms (GAF fields + signature)                        | Yes       |
| Email automations (property/team email, timing, toggles)       | Yes       |
| Telegram integrations                                          | No        |

Field-level errors appear **as you edit** a field (on change). After **Save Changes**, all remaining issues are shown at once. Section banners (orange) appear for **Integrations** when needed — not for sections with individual inputs.

Logic: `ui/src/features/dashboard/org/lib/propertySettingsCompletion.ts`, `ui/src/features/dashboard/org/lib/propertySettingsFieldError.ts`, `ui/src/features/dashboard/org/lib/propertySettingsSave.ts`

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
| Property type | `properties.type`                  | **Read-only** in settings (set at property creation). Condo enables residence / tower / unit display                                                                                                                                                  |
| Residence     | `properties.residence_name`        | **Read-only** in settings. Known residences apply defaults at creation (see below)                                                                                                                                                                    |
| Tower         | `properties.tower`                 | **Read-only** in settings. Options from residence config (Azure North: Monaco, Bali, Barbados)                                                                                                                                                        |
| Unit          | `properties.unit_number`           | **Read-only** in settings. 4-digit. Unique per tower among **`ACTIVE`** properties only ([#120](https://github.com/sprmke/kame-homes/issues/120)); many `INACTIVE` peers allowed (succession). Republish / stay ACTIVE with an ACTIVE peer → **409**. |
| Contact name  | `properties.settings.contactName`  | Required; full name when non-empty; inline error on blur                                                                                                                                                                                              |
| Contact role  | `properties.settings.contactRole`  | Required                                                                                                                                                                                                                                              |
| Phone         | `properties.settings.contactPhone` | Required; PH mobile `09XXXXXXXXX`                                                                                                                                                                                                                     |
| Email         | `properties.settings.contactEmail` | Required; valid email                                                                                                                                                                                                                                 |
| Brand color   | `app_settings.brand_color`         | Optional override; empty = inherit org. Changing it marks Settings dirty and shows **Save Changes** (saved with operational basic section via `PATCH app-settings`)                                                                                   |

### Save path

1. UI draft → **Save Changes** → `update-property` (PATCH) for profile fields; brand color → `PATCH app-settings?property_id=`
2. DB columns + merged `properties.settings` JSONB; brand color on `app_settings`

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

Listing gallery photos/videos. Storage: `properties.settings.media` via `upload-property-media` / `update-property`. Same fields are editable in **Public Pages → Property → Edit** (live preview). Brand color is under **Basic Information** (`app_settings.brand_color`) and also in the listing editor.

## Description

Stored in `properties.settings.description` (max 1000 chars). Also editable in the listing Page Editor.

---

## Property Details

Stored in `properties.settings` (+ `properties.max_guests` derived from adults + children).

| Field         | Key            | Default                | Guest-facing use                                      |
| ------------- | -------------- | ---------------------- | ----------------------------------------------------- |
| Unit type     | `unitTypeId`   | `studio` (Azure North) | Sets bedrooms, bathrooms, max adults/children         |
| Bedrooms      | `bedrooms`     | from unit type         | Read-only; from development unit type config          |
| Bathrooms     | `bathrooms`    | from unit type         | Read-only; from development unit type config          |
| Floor         | `floors`       | residence limits       | Listing detail                                        |
| Check-in      | `checkInTime`  | `14:00`                | Guest form default + early-arrival warning threshold  |
| Check-out     | `checkOutTime` | `12:00`                | Guest form default + late-departure warning threshold |
| Max adults    | `maxAdults`    | from unit type         | Read-only; guest form occupancy limit                 |
| Max children  | `maxChildren`  | from unit type         | Read-only; guest form occupancy limit                 |
| Self check-in | `selfCheckIn`  | `false`                | Public listing + stay guide                           |

**Layout:** row 1 — Unit type, Bedrooms, Bathrooms; row 2 — Floor, Max adults, Max children.

**Unit type** options come from the property's development/residence via **`GET get-residence-unit-types`**. Changing unit type updates `bedrooms`, `bathrooms`, `maxAdults`, `maxChildren`, and `max_guests` (computed sum) on save. Super admin configures per-type bedrooms/bathrooms/max guests under **Development → Unit types**.

Check-in/out times are picked via the shared **`TimePicker`** (`ui/src/components/ui/time-picker.tsx`, 30-min increments — same component used on the guest form), saved as 24-hour **`HH:mm`** strings. They appear on the public property page, house-rule presets, and — after save — pre-fill the guest booking form Stay step via **`get-guest-payment-info`** → `useGuestPaymentInfo()`.

Validated on save against residence limits (see Azure North table above). The **Cleaning Time** buffer lives in the **Guest Form** section below, not here.

---

## Amenities

Preset + custom amenities in `properties.settings.enabledAmenities` / `customAmenities`. Also editable in the listing Page Editor.

---

## House Rules

Preset + custom house rules (`enabledHouseRules` / `customHouseRules`). Also editable in the listing Page Editor. Preset catalog still mirrors `propertyHouseRulesConstants.ts`; check-in/out presets use property detail times on the public listing. Templates → **House Rules** remains email copy only.

---

## Guest Form

Per-property toggles for which sections appear on the public booking form (`/form?property=<slug>`). Stored in **`properties.settings`** (profile save — not `app_settings`).

| Toggle               | Key                  | Default | Effect when off                                                                  |
| -------------------- | -------------------- | ------- | -------------------------------------------------------------------------------- |
| Allow Pets           | `allowPets`          | `true`  | Pets step hidden; `has_pets` forced `false` on submit (server + client clamp)    |
| Allow Parking        | `allowParking`       | `true`  | Parking step hidden; `need_parking` forced `false` on submit                     |
| Allow Surprise Decor | `allowSurpriseDecor` | `true`  | Decor checkbox hidden on Stay step; `guest_requests_surprise_decor` forced false |

Section nav: **Guest Form** (after Property Details). UI: `PropertyGuestFormSettingsSection.tsx`.

Save path: **Save Changes** → dirty `guest-form` section → `update-property` settings merge (`propertyProfileSettingsPatch`).

Public exposure: resolved via **`get-guest-payment-info`** (same request as payment/GAF defaults) → `useGuestPaymentInfo()` on the guest form. Missing/invalid keys default to **`true`** (preserves legacy always-on behavior).

**Cleaning Time** — `cleaningBufferMinutes`, a **required** `Select` (1h–6h in 30-minute steps; no "off" option), stored as whole minutes (`60`–`360`, step `30`). Default (and floor) is **1 hour** — a missing/invalid saved value resolves to 60, never `null`. Only applies to a **same-day turnover**: one guest's `checkOutDate` equal to another guest's `checkInDate` on the same property. The guest booking form disables check-in times earlier than `(previous checkout time + buffer)` and check-out times later than `(next check-in time − buffer)` in the `TimePicker`, and `submit-form` re-validates the same rule server-side (`_shared/cleaningBuffer.ts`, `_shared/guestFormSettings.ts`) before saving. Does not affect non-adjacent bookings or dates with no turnover. Validated in `_shared/propertySettingsValidation.ts` (must be a valid 30-minute step between 60 and 360 — `null`/off is rejected).

**Check-in / check-out times** (configured under **Property Details**, not this section): also resolved via **`get-guest-payment-info`** as **`checkInTime`** / **`checkOutTime`** (24h `HH:mm`; defaults **`14:00`** / **`12:00`**). New guest submissions pre-fill those fields; early/late warnings on the Stay step compare against the property values. Existing **`?bookingId=`** edits keep stored submission times from **`get-form`**.

**Guest capacity** (`maxAdults`, `maxChildren`) is also exposed on **`get-guest-payment-info`**. The Stay step guest list uses these for the maximum-guests reminder and server-side validation on **`submit-form`** (occupancy rule: ages 4+ = adult, ages 0–3 = child for capacity checks).

**Booking source** (separate from these toggles): guest form uses **`?source=facebook`** / **`?source=airbnb`** for platform-specific name labels; omitting `source` stores **`Direct`** (`booking_source` column default **`Direct`** after migration `20261003140000_booking_source_default_direct.sql`).

---

## Cancellation policy

Stored in `properties.settings.cancellationPolicy`. Also editable in the listing Page Editor.

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

Social URLs, external reviews, and superhost fields in `app_settings`. Also editable in the listing Page Editor (same storage).

---

## Payment

Per-property operational settings in `app_settings` (not `properties.settings`).

| Field           | Column                                                                     | Security notes                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bank / e-wallet | `payment_provider`                                                         | Allow-list only (PH providers)                                                                                                                                                                        |
| Account name    | `gcash_name`                                                               | Full name (first + last, min 2 chars each); max 120                                                                                                                                                   |
| Account number  | `gcash_number`                                                             | Format validated per provider type                                                                                                                                                                    |
| QR image        | `payment_methods[].qrImageUrl` (+ legacy `gcash_qr_image_url` for primary) | **Optional** per method. Stage via `upload-app-settings-asset`; commits on OTP-gated PATCH. Guest form / ready-for-check-in email show QR only when a real upload exists (no platform seed fallback). |

### Save path

**Save Changes** → `app-settings` PATCH (admin JWT + `property_id` scope).

When payment methods change since last save (account fields **or** any method QR), **Save Changes** opens a verification modal (no header close control — use **Discard changes**). OTP is **not** sent automatically: the host taps **Send OTP** first; only then does the 6-digit input and **Verify and save** appear. A code is emailed to the **org owner only** (branded property email shell; subject **`Payment verification code — {listing}`**; OTP digits use the listing brand color darkened as needed for readable contrast on white). Copy differs by actor: owner → “You, **Name** (Owner), are saving **Payment settings**…” with a self-review caution; team member → “Your team member, **Name** (Role), is saving…” with “contact that person before approving.” Any team member with `settings:edit` can enter the code once the owner shares it. The server rejects payment PATCHes without a valid `settingsVerificationToken`. After a successful save, org + property team members receive a deduplicated notice email (listing name, actor name + role, timestamp Asia/Manila). Short liability copy remains in the modal footer.

**Account name** uses the same full-name rules as property contact name (first + last, min 2 characters each). **QR code** is optional on every payment method (each method has its own uploader). When **Payment** is dirty, **Save Changes** stays visible but is **disabled** until required payment fields are valid (provider, account name, account number) — QR absence does not block save. Guest payment step and `{{gcash_payment_section}}` (ready-for-check-in) render account details always and QR images only when uploaded.

Choosing a new QR image **stages** the file in Storage and updates the payment draft only — it does **not** write `app_settings` until OTP succeeds and Save completes. Closing the OTP modal without verifying (or a failed verified save) **reverts** the entire Payment section (methods, fields, and QR preview) to the last saved values.

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

**Telegram** — status cards link to `/notifications` per module (Marketing, Staff, Operations, Finance, Maintenance, Chat).

**AI services** — read-only platform key status + **Test AI** card (uses property/org context).

Production GAF/pet approvals use **Resend inbound** (`approval-email-webhook`); hosts do not connect Google accounts here.

---

## AI Overrides

Per-property overrides for the platform AI usage limits. NULL limits inherit the organization settings.

**Plan gating:** Hidden from the secondary settings nav and the settings card unless the property plan includes AI credits (`aiMonthlyCreditAllowance` > 0 — Growth/Pro and above). Free and Starter do not show this section.

| Field                | Column                 | Notes                                              |
| -------------------- | ---------------------- | -------------------------------------------------- |
| Enable               | `enabled`              | Master per-property AI toggle; also gated globally |
| Daily call limit     | `daily_call_limit`     | Blank = inherit from organization                  |
| Monthly call limit   | `monthly_call_limit`   | Blank = inherit from organization                  |
| Daily cost USD limit | `daily_cost_usd_limit` | Blank = inherit from organization                  |

Save path: section-local **Save** button → `PATCH ai-platform-property-settings?property_id=` (`settings:edit`). Hook: `useAiPlatformPropertySettings.ts` (added to `useAiPlatformSettings.ts`). UI: `PropertyAiPlatformSection.tsx`.

---

## Voice Receptionist

Opt-in AI voice assistant guests can talk to (check-in, wifi, parking, and other stay questions). Config is now stored inside `ai_platform_property_settings.feature_configs.voice_receptionist`. The section still uses `voice-receptionist-settings` for reads/writes and saves with the shared **Save Changes** footer.

| Field               | Storage path                                                               | Notes                                                                           |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Enable              | `ai_platform_property_settings.feature_configs.voice_receptionist.enabled` | Also gated by the platform-wide AI kill switch + `voice_receptionist` allowlist |
| Voice               | `voice_id`                                                                 | Gemini Live prebuilt voice; options from `availableVoices` (labeled in UI)      |
| Persona prompt      | `persona_prompt`                                                           | Optional tone guidance; guest-safe grounding is fixed and cannot be overridden  |
| Max session (sec)   | `max_session_seconds`                                                      | Default 300; allowed **60–3600**                                                |
| Max per guest / day | `max_sessions_per_guest_per_day`                                           | Default 3; allowed **1–999**                                                    |
| Max concurrent      | `max_concurrent_sessions`                                                  | Default 3, property-wide; allowed **1–50**                                      |

Save path: page **Save Changes** → `PATCH voice-receptionist-settings?property_id=` when this section is dirty (`settings:edit`). Hook: `useVoiceReceptionistSettings.ts`. UI: `PropertyVoiceReceptionistSection.tsx` (controlled from `PropertySettingsCard.tsx`).

**Test voice** — outline button beside the voice picker. `POST voice-receptionist-voice-preview?property_id=` (`settings:edit`) runs a short Gemini TTS sample using the **Basic Information property name** (not tower + unit; e.g. _"Hi, I'm the Solea Ocean View receptionist…"_) and the selected prebuilt voice, then plays PCM audio in the browser. The client sends the current **Property Name** draft so unsaved edits are reflected. Uses Gemini API tokens (not a free local sample). Hook: `usePreviewVoiceReceptionistVoice`.

**Plan gating:** Hidden from the secondary settings nav and the settings card unless the property is entitled to **`aiReceptionist`** (Business and above). When entitled, enable/save still require that feature server-side (`voice-receptionist-settings` PATCH, `voice-receptionist-start`).

**Usage panel** — read-only "Usage — last 30 days" stat grid (sessions today, last 30 days, avg.
length, estimated cost) below the form fields. `GET voice-receptionist-usage?property_id=`
(`settings:view`), hook `useVoiceReceptionistUsage`. Estimated cost is a rough per-minute
blended-rate estimate persisted on `voice_receptionist_sessions.estimated_cost_usd` when a
session ends; the same session is also recorded in `ai_platform_usage_events` (feature `voice_receptionist`) for unified platform usage.

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

| Action                                                            | Endpoint                                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Profile + settings                                                | `PATCH update-property`                                                                |
| Payment + building forms + email automations + workflow documents | `PATCH app-settings?property_id=` (payment fields require `settingsVerificationToken`) |
| Payment OTP (org owner)                                           | `POST settings-verification?property_id=` (`send_otp`, `verify_otp`)                   |
| Media upload/delete                                               | `POST` / `DELETE upload-property-media?property_id=`                                   |
| Payment QR / signature                                            | `POST upload-app-settings-asset?property_id=`                                          |
| AI platform overrides (property)                                  | `GET`/`PATCH ai-platform-property-settings?property_id=`                               |
| Voice receptionist settings                                       | `GET`/`PATCH voice-receptionist-settings?property_id=`                                 |
| Voice receptionist voice preview (TTS)                            | `POST voice-receptionist-voice-preview?property_id=`                                   |
| Voice receptionist usage/cost read                                | `GET voice-receptionist-usage?property_id=`                                            |
| Archive                                                           | `PATCH update-property` `{ status: "INACTIVE" }`                                       |
| Restore                                                           | `PATCH update-property` `{ status: "ACTIVE" }`                                         |
| Delete                                                            | `DELETE delete-property` `{ propertyId }`                                              |

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
| Cleaning buffer constants (UI)        | `ui/src/lib/cleaningBuffer.ts`                                         |
| Cleaning buffer constants (edge)      | `supabase/functions/_shared/cleaningBuffer.ts`                         |

Keep UI and edge copies in sync when changing rules.

---

## Related docs

- [Organization Settings — AI platform](../settings.md) § AI platform
- [Super Admin AI Management — Platform AI](../../admin/settings.md) § Platform AI
- [`docs/archive/operations/ai-platform-billing.md`](../../../../archive/operations/ai-platform-billing.md) — billing and quota guidance

---

## Pending / follow-ups

- [ ] Org-level residence catalog (DB-driven instead of code constants)
- [ ] Location: optional per-org Maps API key override
- [ ] Soft-delete flag instead of hard delete for edge cases
- [ ] Automated tests for property settings validation
- [x] Remove deprecated `voice-receptionist-global-settings` edge function and UI card
- [ ] Drop legacy `voice_receptionist_global_settings` table after verifying the platform switch is seeded on hosted environments
