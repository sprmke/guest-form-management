---
title: 'Organization Settings — operator guide'
status: active
tags: [guides, routes, org, settings]
updated: 2026-08-02
---

# Organization Settings — operator guide

Route: `/org/:orgSlug/settings`

> **Status:** Documented

## Progress overview

| Section           | E2E save | Validation   | Docs | Notes                                                                     |
| ----------------- | -------- | ------------ | ---- | ------------------------------------------------------------------------- |
| Basic information | Yes      | Yes          | Done | Logo, name, slug, brand color, tagline, description, contact info         |
| Socials           | Yes      | Yes          | Done | Social URLs; main platform auto-derived on save                           |
| Danger zone       | Partial  | Slug confirm | Done | Delete when no bookings; finance/maintenance can block; see § Danger zone |

---

## Overview

Organization settings uses `AdminSectionNavLayout` with **two save paths**. The desktop **Unsaved changes** footer stays in the main content column (aligned to `max-w-4xl`) so the secondary section nav stays fully usable.

1. **Profile** (`organizations` + `organizations.settings` JSONB) → `update-organization`
2. **Operator** (`org_settings` row) → `org-settings` — social links + team logo only (email automations live on each property)

Logo upload is immediate via `upload-org-settings-asset` (`team_logo` → `org_settings.email_logo_url` + `organizations.logo_url`).

**Email routing, SD cron tuning, parking defaults, and automation toggles** are **per property** in **`app_settings`** — see **[[guides/routes/org/property/settings|Property Settings — operator guide]]** § Email automations.

---

## Host-facing knowledge

Organization settings control your brand identity and public presence: logo, name, tagline, description, brand color, and social links that appear on your host page and guest-facing surfaces. Guest contact details for templates are managed on the **Team** page, not here. Email automations, payment defaults, and booking-specific options live on each **property’s** settings instead.

**Common host questions**

- Q: Where do I set the email address guests see on booking messages?
  A: Per-property settings and team contact info — not on this org profile page. Update the property’s operator settings or the owner’s contact row on **Org team**.
- Q: What happens if I delete the organization?
  A: Deletion is permanent and only allowed when there is no booking history (and no blocking finance or maintenance records). You must type the organization slug to confirm. Your Google sign-in account stays; only this org and its properties are removed.
- Q: Does changing brand color affect every property?
  A: Org brand color tints organization-level admin pages and can serve as a fallback. Each property can still set its own color for guest pages and property admin.

---

## Sections

### Basic information

| Field             | Storage                                                 | Validation                                                                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organization logo | `org_settings.email_logo_url`, `organizations.logo_url` | JPEG/PNG/WebP upload                                                                                                                                                                                                                                                               |
| Organization name | `organizations.name`                                    | 2–120 chars; globally unique (case-insensitive); **reserved names blocked** (see [onboarding.md](../onboarding.md) § Reserved organization / property names)                                                                                                                       |
| URL slug          | `organizations.slug`                                    | Read-only preview; re-allocated on name change                                                                                                                                                                                                                                     |
| Brand color       | `organizations.settings.brandColor`                     | Optional hex `#RRGGBB`; defaults to `#24a88e` when unset. Tints **org-scoped admin pages** only (org hub redirect, org dashboard, org settings, org properties). Property guest pages and property admin use per-property `app_settings.brand_color` (falls back here when unset). |
| Tagline           | `organizations.settings.tagline`                        | Max 60 chars                                                                                                                                                                                                                                                                       |
| Description       | `organizations.description`                             | Max 500 chars + counter                                                                                                                                                                                                                                                            |

Guest/operator **contact name, phone, and email** for templates and public surfaces are edited on **Org team** (`/org/:orgSlug/team` → **Contact** on the owner row) and **Property team** (property MANAGER row). Legacy `organizations.settings.contact*` keys remain as read fallback only — not edited on this page.

**Public host page (`/hosts/:orgSlug`):** Owner name and photo come from the **team owner** — OAuth profile (`auth.users` metadata) plus optional **display name** from **Org team** (`organization_members.display_name`). Tagline and description come from **Basic information** above. **Brand color** (`organizations.settings.brandColor`) tints the guest shell and hero accents. **Socials** below render as outbound icon links when URLs are set in **Socials**.

### Socials

| Field         | Storage                             | Notes                                                                                                  |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Airbnb        | `org_settings.airbnb_url`           | Optional; DB value wins over `AIRBNB_URL` env                                                          |
| Facebook page | `org_settings.facebook_reviews_url` | Optional; saved DB value wins over `FACEBOOK_REVIEWS_URL` env; env used only when column is null/empty |
| Instagram     | `org_settings.instagram_url`        | Optional; DB value wins over `INSTAGRAM_URL` env                                                       |
| TikTok        | `org_settings.tiktok_url`           | Optional; DB value wins over `TIKTOK_URL` env                                                          |
| Main platform | `org_settings.main_social_platform` | Auto-set on save from filled URLs (first valid platform); properties inherit when empty                |

**Validation:** at least one social URL. Main platform is derived automatically on save (not editable at org level).

Properties inherit org social URLs and main platform when their `app_settings` columns are empty — see **property settings** § Socials.

**App origin** (email links, default GCash QR base URL) is **not** per-org — set deployment env **`PUBLIC_GUEST_APP_ORIGIN`**. Legacy `org_settings.public_guest_app_origin` is used only when the env var is unset.

### Danger zone — delete organization

**Route UI:** Danger zone section → confirm dialog → type org **slug** → `delete-organization`.

**E2E status:** Works for orgs with **no booking history** and **no property-scoped finance or maintenance rows** (see blockers below). Owner-only (`verifyOrgOwner`). On success, UI navigates to `/org` and invalidates org/property lists.

#### Process (in order)

1. **Client** — Operator types the org slug exactly; `OrgDangerZoneSection` enables delete only on match.
2. **`delete-organization`** (DELETE, body `{ orgId }`) — Authenticated user must own the org (or platform admin).
3. **Pre-check** — Counts `guest_submissions` for all properties in the org. If **any** row exists → **409** (delete aborted; nothing removed).
4. **Storage cleanup (best-effort)** — For each property, removes objects in bucket **`property-media`** whose paths are listed in `properties.settings.media` (gallery uploads only). Failures are logged; delete still proceeds.
5. **DB delete** — `DELETE FROM organizations WHERE id = …` (service role). Postgres cascades to dependent rows (see below). If a **RESTRICT** FK still references a property → **409** _“Organization is still referenced by other records…”_.

#### What gets deleted (when delete succeeds)

| Layer                        | Removed                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Organization**             | `organizations` row (name, slug, description, `logo_url`, `settings` JSONB — tagline, brand color, contact fields)                                |
| **Org operator config**      | `org_settings` row (email routing, automations, social URLs, team logo URL column)                                                                |
| **Properties**               | All `properties` rows for the org (name, slug, tower/unit, `settings` JSONB including media metadata)                                             |
| **Property operator config** | `app_settings` per property (payment provider, GCash fields, GAF defaults, integration IDs)                                                       |
| **Telegram**                 | `telegram_admin_settings`, `telegram_finance_settings`, `telegram_maintenance_settings`, `telegram_marketing_settings`, `telegram_staff_settings` |
| **Gmail integration**        | `gmail_mail_integration`, `gmail_listener_state` per property                                                                                     |
| **Storage (explicit)**       | **`property-media`** objects referenced in each property’s `settings.media`                                                                       |

All of the above are removed via **ON DELETE CASCADE** from `organizations` → `properties`, except guest/finance/maintenance blockers below.

#### What is **not** deleted (blockers or gaps)

| Item                             | Behavior                                                                                                                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bookings**                     | **Blocks delete.** Any `guest_submissions` row on any org property → **409** before delete runs. Bookings are **never** bulk-deleted by this action.                                                            |
| **Finance ledger**               | **Can block delete.** `finance_line_items` uses **ON DELETE RESTRICT** on `property_id`. Rows with no bookings but existing finance lines → delete fails with **409** (not pre-checked in edge function today). |
| **Maintenance items**            | **Can block delete.** `maintenance_items` uses **ON DELETE RESTRICT**. Same **409** behavior as finance.                                                                                                        |
| **Org team logo files**          | **Not removed.** Files under `app-settings-assets` / `team-logo/org/{orgId}/…` may remain as orphans.                                                                                                           |
| **Property app-settings assets** | **Not removed.** GCash QR, GAF signature uploads in `app-settings-assets` may remain as orphans.                                                                                                                |
| **Booking uploads**              | N/A when delete succeeds (no bookings). Bucket **`booking-assets`** is untouched by this function.                                                                                                              |
| **Gmail OAuth row**              | **Removed** for org properties (encrypted refresh tokens deleted with property cleanup). Production approvals use Resend inbound, not Gmail.                                                                    |
| **External email**               | Sent mail is not recalled; Resend/platform config is env-scoped, not org-scoped.                                                                                                                                |
| **Telegram / Gmail logs**        | `processed_emails`, `telegram_*_notification_log`, `finance_telegram_reminder_log`, etc. are **not** org-scoped; rows tied to deleted bookings/properties may remain as orphans.                                |
| **Auth account**                 | **Kept.** `auth.users` (owner) and other organizations owned by the same user are unchanged.                                                                                                                    |
| **Deployment env**               | **Kept.** `PUBLIC_GUEST_APP_ORIGIN`, `FACEBOOK_REVIEWS_URL`, Gmail OAuth app, Resend, Gemini/Groq keys, etc.                                                                                                    |

#### API

|              |                                                                                         |
| ------------ | --------------------------------------------------------------------------------------- |
| **Endpoint** | `DELETE /functions/v1/delete-organization`                                              |
| **Body**     | `{ "orgId": "<uuid>" }`                                                                 |
| **Success**  | `{ deletedOrganizationId }`                                                             |
| **Errors**   | **409** booking history; **409** other FK references; **403/404** not owner / not found |

#### Implementation map

| Concern       | Path                                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI            | `ui/src/features/dashboard/org/components/org-settings/OrgDangerZoneSection.tsx`                                                                                 |
| Hook          | `ui/src/features/dashboard/org/hooks/useDeleteOrganization.ts`                                                                                                   |
| Edge function | `supabase/functions/delete-organization/index.ts`                                                                                                                |
| FK / cascade  | `supabase/migrations/20260629180000_multi_tenancy_foundation.sql`, `20260703150000_org_settings.sql`, `20260821120000_multi_tenancy_late_tables_property_id.sql` |

## Validation

Save runs **`planOrgSettingsSave`** (client) before PATCH. Only **dirty** sections that pass validation are saved — basic info and socials can save independently. Within basic information, only **changed fields** are validated for that save (contact info can save without completing unrelated basic fields). Inline field errors appear **on change** once a field has been edited, or on invalid dirty sections after a failed save.

**Nav indicators:** Incomplete required fields show a red dot on the matching section in the settings submenu and on **Settings** in the main sidebar. While editing on this page, dots reflect the draft; elsewhere they reflect the last saved snapshot via `OrgSettingsIssuesSync`.

| Area                        | Client                                                                                | Server                                            |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Organization name           | Required; 2–120 chars; uniqueness checked after typing pauses; reserved names blocked | `update-organization` + `check-organization-name` |
| Tagline / description       | Optional; max length when filled                                                      | `update-organization`                             |
| Brand color                 | Optional hex `#RRGGBB`; defaults to `#24a88e` when unset                              | `update-organization`                             |
| Facebook URL                | Optional `http(s)` URL                                                                | `org-settings` PATCH                              |
| Main social platform        | Required when any social URL is set                                                   | `org-settings` PATCH                              |
| Instagram / TikTok / Airbnb | Optional `http(s)` URL                                                                | `org-settings` PATCH                              |

Per-property operator settings (email routing, parking defaults, SD cron, automations) are validated on **property settings** — see **[[guides/routes/org/property/settings|Property Settings — operator guide]]**.

Danger zone: slug confirmation + `delete-organization`; blocked when booking history exists (see § Danger zone).

---

## Implementation map

| Concern                          | Path                                                                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                             | `ui/src/features/dashboard/org/pages/OrgSettingsPage.tsx`                                                                                                                          |
| Basic + socials + email sections | `ui/src/features/dashboard/org/components/org-settings/OrgProfileSettingsSections.tsx`                                                                                             |
| Client validation                | `ui/src/features/dashboard/org/lib/orgSettingsCompletion.ts`, `ui/src/features/dashboard/org/lib/orgSettingsFieldError.ts`, `ui/src/features/dashboard/org/lib/orgSettingsSave.ts` |
| Sidebar issue sync               | `ui/src/features/dashboard/org/components/OrgSettingsIssuesSync.tsx`, `ui/src/features/dashboard/org/lib/orgSettingsIssuesStore.ts`                                                |
| Saved completion hook            | `ui/src/features/dashboard/org/hooks/useOrgSettingsCompletion.ts`                                                                                                                  |
| `update-organization`            | `supabase/functions/update-organization/index.ts`                                                                                                                                  |
| Brand color resolution           | `supabase/functions/_shared/orgBrandColor.ts`, `supabase/functions/_shared/appSettings.ts#resolveAppSettings`                                                                      |
| Guest + admin theme CSS          | `ui/src/lib/brandColor.ts`, `ui/src/layouts/MainLayout.tsx`, `ui/src/features/dashboard/bookings/components/AdminBrandTheme.tsx`                                                   |
| App origin resolver              | `supabase/functions/_shared/publicAppOrigin.ts`                                                                                                                                    |
| Social URL resolver              | `supabase/functions/_shared/orgSocialLinks.ts`                                                                                                                                     |
| `org-settings`                   | `supabase/functions/org-settings/index.ts`                                                                                                                                         |
| `delete-organization`            | `supabase/functions/delete-organization/index.ts`                                                                                                                                  |
| Social columns migration         | `supabase/migrations/20260821190000_org_settings_social_links.sql`                                                                                                                 |

---

## Related docs

- [Route index](../README.md)
- [`docs/architecture/validation-and-env.md`](../../../architecture/validation-and-env.md) — `PUBLIC_GUEST_APP_ORIGIN`, `FACEBOOK_REVIEWS_URL`
