---
title: 'Onboarding — operator guide'
status: active
tags: [guides, routes, onboarding]
updated: 2026-08-17
---

# Onboarding — operator guide

Route: `/onboarding`

> **Status:** Documented

## Progress overview

| Section      | E2E save | Validation | Docs       | Notes                                                                     |
| ------------ | -------- | ---------- | ---------- | ------------------------------------------------------------------------- |
| Organization | ✅       | ✅         | Documented | Name + contact phone (no role on this step)                               |
| Hosting      | ✅       | ✅         | Documented | Property and/or Parking toggles + details                                 |
| Verify       | ✅       | ✅         | Documented | Host: Valid ID + Facebook Page; Listing: rights + proof (save path split) |
| Get Verified | ✅       | ✅         | Documented | Host CTA on org routes; listing verification CTA on property/parking only |

---

## Overview

New hosts land here after Google sign-in when they have no organization. Creates an **organization**, first **property** and/or **parking**, then submits **base host verification** for review.

If the user already has an **accessible** organization (owned or assigned, and not hard-rejected), the page redirects to **`/org/:slug/dashboard`** (last-used or first) — same rule as the **`/org`** hub. A user may own **at most one usable** organization; **`create-organization`** rejects a second owned org with **409**, but owners whose only org was **hard-rejected** may start a **new application**. Hard-rejected hosts land on **`/verification-rejected`** after sign-in.

---

## Host-facing knowledge

First-time hosts complete this wizard right after signing in with Google: organization details, what you host (property and/or parking), and identity verification uploads.

**Common host questions**

- Q: How long does verification take after I finish onboarding?
  A: Review usually takes a few hours up to about three business days before listings can go fully live.
- Q: Can I host both a rental unit and a parking slot?
  A: Yes. Select both Property and Parking in the hosting step, then complete the matching verification sections.
- Q: I already have access to another host's organization. Why did onboarding skip the setup steps?
  A: If you already have access to an organization, you're sent to that dashboard instead of creating a second one you own.
- Q: Why did a contract renewal popup appear when I logged in?
  A: One of your property or parking listings has a hosting contract ending soon, in grace, or past grace. The reminder shows the listing name and how many days you have left.
- Q: Can I dismiss the renewal reminder and deal with it later?
  A: Before the contract ends, yes — dismiss snoozes it until tomorrow (Manila time). During grace you can dismiss until you refresh the page. Once access is locked for that listing, submit a renewal from inside that listing's dashboard.
- Q: Where do I upload a renewed hosting contract?
  A: Tap **Submit renewal contract** in the reminder, or open **Verification** from the property or parking sidebar.

---

## Steps

1. **Organization** — organization name, contact **Name**, **Contact number**. Organization name availability is checked after typing pauses (reserved-name rules below).
2. **Hosting** — choose **Property** and/or **Parking** (multi-select toggles); fill tower/unit and/or parking slot in the same step. **Property name** is required when Property is selected (tower + unit alone do not enable Continue). Property names follow the same reserved-name rules as org names. At least one host type must be selected. Residence is currently Azure-only (field **?** help).
3. **Verify** — trust notice + **Let's get verified**. **Host:** Valid ID + Facebook Page screenshot. **Per listing (same fields as before):** Property and/or Parking rights (+ contract end when applicable) + ownership/authorization proof. Save path splits host vs listing (see below).

Contact name pre-fills from the Google account display name when available.

### Reserved organization / property names

Hosts cannot use display names that impersonate the development or claim to be “official”, including evasion with extra punctuation or spacing (e.g. `Az.u.r.e North`). Blocked patterns (case-insensitive, punctuation ignored):

- **Azure North** and **Azure North Residence(s)**
- **Azure Official**, **Azure North Official**, **Azure North Residence Official**
- Any name containing the word **Official** as its own token (e.g. `My Official Host` — not `Unofficial`)

Enforced on onboarding, org settings, property settings, and **Add property** (`create-organization`, `update-organization`, `create-property`, `update-property`, `check-organization-name`, `check-property-name`). Shared logic: `reservedDisplayNames.ts` (UI + edge).

### Unit uniqueness (sublease handoff) — planned

**Tower+unit:** new properties are created **`INACTIVE`**. If another org already has an **`ACTIVE`** listing for the same tower+unit, onboarding shows a non-blocking **succession warning** (org name only) — Continue is allowed. Super-admin **Approve** on `/admin/approvals` activates this listing and archives the peer ACTIVE listing. Helpers who only need dashboard access should use **Team invite** instead of creating a second org; marketing-only helpers can forward the managing host’s guest booking link.

**Property name** uniqueness is **per organization** (not a cross-host lock).

Pair with lease/contract end + reverification so the previous listing is archived before (or when) the next host goes live.

### Property / Parking Rights

Separate dropdowns when both modes are selected — **Property Rights** on property verification, **Parking Rights** on parking verification. Shared options:

- **Property Owner**
- **Authorized Representative**
- **Sublessee**
- **Property Admin**

**Contract end date** — required when rights are **Authorized Representative** or **Sublessee**; calendar picker (defaults to today, Asia/Manila); stored as **`organizations.settings.verification.propertyContractEndDate`** or **`parkingContractEndDate`** (`YYYY-MM-DD`).

Selected rights are also saved as org **`contactRole`** on **`create-organization`** (property rights when both modes are selected).

### Trust copy (Verify step)

- To create a scam-free platform, every host is verified before listings go live
- Sensitive details may be redacted if verification-relevant info stays visible
- Uploads stored securely; never shown on public listings
- Review: a few hours up to 3 days
- Access screenshot help is platform-specific (Facebook Page roles, Instagram admin, Airbnb host dashboard)

---

## Save path

1. **Finish setup** → `POST create-organization` (contact + hostModes + property/parking; **`contactRole`** from verification rights)
2. `POST upload-org-verification-asset` — Host Tier 1: `valid_id`, `social_proof` (Facebook Page) → bucket **`org-verification-assets`**
3. `POST submit-org-verification` `{ tier: 'base' }` → `organizations.settings.verification.baseStatus = pending`
4. Per created listing: `POST upload-listing-authorization-asset` (`proof`) then `POST submit-listing-authorization` (rights + contract end) → `settings.listingAuthorization.baseStatus = pending` (bucket **`listing-authorization-assets`**)
5. Redirect: property settings → parking settings → org dashboard

Host Tier 2 (Get Verified after onboarding): `selfie_with_id`, `platform_admin_proof` + `platformAdminPlatform`; optional `legitimacy_check_proof`, `business_permit_bir`.

Listing Tier 2 (listing verification modal): `additional_proof`, `azure_pmo_confirmation` via `submit-listing-recommended`.

---

## Enhanced verification (after onboarding)

Two-tier model (see **Get Verified** sidebar modal):

| Tier | Name            | Unlock                                  | Documents                                                                  |
| ---- | --------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| 1    | **Verified**    | Required to host (onboarding)           | Valid ID + Facebook Page screenshot                                        |
| 2    | **Recommended** | Org-wide Recommended badge on host page | Selfie with ID; other-platform admin screenshot; optional legitimacy / BIR |

**Listing verification** (separate scope, per property/parking): Tier 1 ownership/authorization proof + rights; Tier 2 additional proof + Azure PMO → listing Recommended badge. Property/parking sidebars show a **Verification** CTA (not the org **Get Verified** modal). See [`verification-scope-split`](../../workflow/in-progress/verification-scope-split.md).

Tier names are display-only. Server tiers stay **`base`** (Tier 1) and **`enhanced`** (Tier 2), and the public flag stays **`verifiedBadge`**.

### Listing contract renewal

When a property or parking listing's hosting contract nears expiry, is in grace, or is locked, an org-wide **renewal reminder modal** appears on admin login (one listing at a time, highest urgency first). It replaces the old full-page strip/lock gate.

| Phase               | When                                | Dismiss?                                           |
| ------------------- | ----------------------------------- | -------------------------------------------------- |
| Pre-expiry          | T−15 days → day before contract end | Yes — daily snooze (Manila date, per listing)      |
| Grace               | Contract end → T+4                  | Yes until page refresh (no daily snooze write)     |
| Locked              | After grace                         | Non-dismissible on that listing's admin shell only |
| Consideration grant | Super-admin temporary access        | Dismissible once per day                           |

**Submit renewal contract** opens **Listing Verification** in renew mode → `submit-listing-authorization` renew path. Mutual exclusion: renewal modal never stacks with an open Listing Verification modal.

---

- Modal persuasion when Tier 2 is editable: benefit bullets + compact **Recommended badge preview** live **inside** the Tier 2 card (above documents), not above Tier 1. Hidden on Tier 1 changes-requested and when Tier 2 is pending/approved.
- **Tier rank cards** in the modal header: clickable Verified / Recommended cards with status badges; one tier panel visible at a time. Opens on the most relevant step (e.g. Recommended when Tier 1 is approved).
- Modal title follows the active step: **Get Verified** / **Get Recommended**; **Changes requested** in forced resubmit (stepper hidden).
- On phone/tablet the modal is a **bottom sheet** (`ResponsiveModal` `sheetLayout="split"`): sticky header + footer, middle section scrolls so long Verified uploads are not clipped.
- Sidebar CTA uses a soft primary wash and “Earn your Recommended badge.” when Tier 2 is not yet approved. Stays visible as **Verification** when both tiers are approved (status view; contract renewals / reverification later). Shown on **org** admin routes only — property/parking sidebars use the listing verification CTA instead.
- Public **Recommended** badge (`ListingRecommendedBadge`) has tooltip: identity, ownership, and Azure records checked by Kame Homes; shown on host page hero and **`ListingHostCard`** on property/parking detail (not duplicated next to the type badge).
- Copy constants: `ui/.../lib/verificationCopy.ts`.

### Phase 2–3 roadmap

- **Phase 2 (shipped in branch):** Tier 2 docs — selfie tips; **Additional Proof of Ownership/Authorization**; **Azure Property Management email confirmation** (help toggles with examples). Super-admin reviews Recommended tier at `/admin/approvals`. Asset key: **`azurePmoConfirmationPath`**; upload type **`azure_pmo_confirmation`**.
- **Phase 3 (partial):** `/admin/approvals` prioritizes Recommended pending rows. Browse/search rank boost deferred until public property listings API. Trust strip dropped. No skip Tier 1 / instant go-live.

### Behavior

- Modal shows **Tier 1 status** from onboarding as a document checklist (uploads only — not property/parking rights or contract dates); each row has a **View** button that opens a full preview (signed URLs via `get-org-verification-assets`). **Recommended (Tier 2)** uses the same submitted-docs list + **View** when `enhancedStatus ≠ none`.
- When **Tier 1 has changes requested**, a **non-dismissible** modal opens on dashboard login (no X / Close / Escape / outside click). Only the documents the admin asked to re-upload are shown; previously submitted files remain visible below the upload fields. The host must replace those and tap **Resubmit**. After resubmit, status returns to pending and the modal closes. Tier 2 persuasion is hidden in this mode.
- When **Tier 1 is hard-rejected**, the host is blocked from the dashboard (`/verification-rejected`) and must **Start a new application** (new org). In-app resubmit is not allowed.
- **Tier 2 can be submitted anytime** — does not require Tier 1 approval first; each tier is reviewed independently.
- Platform review queue: **`/admin/approvals`** (super admin) — see [admin/approvals.md](./admin/approvals.md).
- `submit-org-verification` `{ tier: 'enhanced' }` → `enhancedStatus = pending`
- When **Tier 2 approved**: public **`/hosts/:orgSlug`**, property detail, and parking detail show **Recommended** badge (`verifiedBadge` from org enhanced verification)

---

## API reference

| Endpoint                        | Method | Auth            |
| ------------------------------- | ------ | --------------- |
| `create-organization`           | POST   | JWT             |
| `upload-org-verification-asset` | POST   | JWT (org owner) |
| `submit-org-verification`       | POST   | JWT (org owner) |

---

## Implementation map

| Concern           | Path                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Page              | `ui/src/features/dashboard/org/pages/OnboardingPage.tsx`                                               |
| Rights fields     | `ui/.../components/onboarding/OnboardingVerificationRightsFields.tsx`                                  |
| Step header       | `ui/.../components/onboarding/OnboardingStepHeader.tsx`                                                |
| Account menu      | `ui/.../components/onboarding/OnboardingProfileHeader.tsx` — Switch account · Sign out                 |
| Proof upload UI   | `ui/.../components/onboarding/OnboardingProofUpload.tsx`                                               |
| Host verify       | `ui/.../components/onboarding/OnboardingHostVerificationSection.tsx`                                   |
| Property verify   | `ui/.../components/onboarding/OnboardingHostAccessVerificationSection.tsx`                             |
| Parking verify    | `ui/.../components/onboarding/OnboardingParkingVerificationSection.tsx`                                |
| Get Verified      | `ui/.../components/verification/GetVerifiedModal.tsx` (`HostVerificationChangesGate` in `AdminLayout`) |
| Badge preview     | `ui/.../components/verification/RecommendedBadgePreview.tsx`                                           |
| Verification copy | `ui/.../lib/verificationCopy.ts`                                                                       |
| Shared types      | `ui/.../lib/orgVerification.ts` + `supabase/functions/_shared/orgVerification.ts`                      |
| Edge              | `create-organization`, `upload-org-verification-asset`, `submit-org-verification`                      |
| Storage           | migration `20260922120000_org_verification_assets.sql`                                                 |
