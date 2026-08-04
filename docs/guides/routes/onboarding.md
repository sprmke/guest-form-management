---
title: 'Onboarding — operator guide'
status: active
tags: [guides, routes, onboarding]
updated: 2026-08-04
---

# Onboarding — operator guide

Route: `/onboarding`

> **Status:** Documented

## Progress overview

| Section      | E2E save | Validation | Docs       | Notes                                                    |
| ------------ | -------- | ---------- | ---------- | -------------------------------------------------------- |
| Organization | ✅       | ✅         | Documented | Name + contact phone (no role on this step)              |
| Hosting      | ✅       | ✅         | Documented | Property and/or Parking toggles + details                |
| Verify       | ✅       | ✅         | Documented | Valid ID + property/parking proof; rights + contract end |
| Get Verified | ✅       | ✅         | Documented | Tier 2 persuasion + public Recommended badge (Phase 1)   |

---

## Overview

New hosts land here after Google sign-in when they have no organization. Creates an **organization**, first **property** and/or **parking**, then submits **base host verification** for review.

If the user already has an **accessible** organization (owned or assigned, and not hard-rejected), the page redirects to **`/org/:slug/dashboard`** (last-used or first) — same rule as the **`/org`** hub. A user may own **at most one usable** organization; **`create-organization`** rejects a second owned org with **409**, but owners whose only org was **hard-rejected** may start a **new application**. Hard-rejected hosts land on **`/verification-rejected`** after sign-in.

---

## Host-facing knowledge

First-time hosts complete this wizard right after signing in with Google — organization details, what you host (property and/or parking), and identity verification uploads.

**Common host questions**

- Q: How long does verification take after I finish onboarding?
  A: Review usually takes a few hours up to about three business days before listings can go fully live.
- Q: Can I host both a rental unit and a parking slot?
  A: Yes — select both Property and Parking in the hosting step and complete the matching verification sections.
- Q: I already belong to another host's team — why did onboarding skip?
  A: If you already have access to an organization, you're sent to that dashboard instead of creating a second one you own.

---

## Steps

1. **Organization** — organization name, contact **Name**, **Contact number**. Organization name availability is checked after typing pauses (reserved-name rules below).
2. **Hosting** — choose **Property** and/or **Parking** (multi-select toggles); fill tower/unit and/or parking slot in the same step. **Property name** is required when Property is selected (tower + unit alone do not enable Continue). Property names follow the same reserved-name rules as org names. At least one host type must be selected. Residence is currently Azure-only (field **?** help).
3. **Verify** — unified step header → trust notice + **Let’s get verified**; upload fields after click. **Valid ID** + **Property verification** (Property Rights + contract end when applicable + proof of ownership + platform + access screenshot) and/or **Parking verification** (Parking Rights + contract end + proof upload).

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
2. `POST upload-org-verification-asset` — Tier 1: `valid_id`; plus `social_proof` + `property_ownership_proof` when property mode; plus `parking_social_proof` when parking mode. **Get Verified (Tier 2):** `selfie_with_id`, `ownership_proof`, `azure_pmo_confirmation` — private bucket **`org-verification-assets`**
3. `POST submit-org-verification` `{ tier: 'base', socialPlatform?, propertyRelationship?, propertyContractEndDate?, parkingRelationship?, parkingContractEndDate? }` → `organizations.settings.verification.baseStatus = pending`
4. Redirect: property settings → parking settings → org dashboard

---

## Enhanced verification (after onboarding)

Two-tier model (see **Get Verified** sidebar modal):

| Tier | Name            | Unlock                                        | Documents                                                                                 |
| ---- | --------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | **Verified**    | Required to host (onboarding)                 | Valid ID + property/parking verification per **`host_modes`**                             |
| 2    | **Recommended** | **Recommended** badge on host page + listings | Selfie with ID, additional proof of ownership/authorization, Azure PMO email confirmation |

Tier names are display-only. Server tiers stay **`base`** (Tier 1) and **`enhanced`** (Tier 2), and the public flag stays **`verifiedBadge`**.

### Phase 1 UX (shipped)

- Modal persuasion when Tier 2 is editable: benefit bullets + compact **Recommended badge preview** live **inside** the Tier 2 card (above documents), not above Tier 1. Hidden on Tier 1 changes-requested and when Tier 2 is pending/approved.
- **Tier rank cards** in the modal header: clickable Verified / Recommended cards with status badges; one tier panel visible at a time. Opens on the most relevant step (e.g. Recommended when Tier 1 is approved).
- Modal title follows the active step: **Get Verified** / **Get Recommended**; **Changes requested** in forced resubmit (stepper hidden).
- On phone/tablet the modal is a **bottom sheet** (`ResponsiveModal` `sheetLayout="split"`): sticky header + footer, middle section scrolls so long Verified uploads are not clipped.
- Sidebar CTA uses a soft primary wash and “Earn your Recommended badge.” when Tier 2 is not yet approved. Stays visible as **Verification** when both tiers are approved (status view; contract renewals / reverification later).
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
