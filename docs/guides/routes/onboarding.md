# Onboarding — operator guide

Route: `/onboarding`

> **Status:** Documented

## Progress overview

| Section      | E2E save | Validation | Docs       | Notes                                                    |
| ------------ | -------- | ---------- | ---------- | -------------------------------------------------------- |
| Organization | ✅       | ✅         | Documented | Name + contact phone (no role on this step)              |
| Hosting      | ✅       | ✅         | Documented | Property and/or Parking toggles + details                |
| Verify       | ✅       | ✅         | Documented | Valid ID + property/parking proof; rights + contract end |

---

## Overview

New hosts land here after Google sign-in when they have no organization. Creates an **organization**, first **property** and/or **parking**, then submits **base host verification** for review.

If the user already has any organization (owned or assigned), the page redirects to **`/org/:slug/dashboard`** (last-used or first) — same rule as the **`/org`** hub. A user may own **at most one** organization; **`create-organization`** rejects a second owned org with **409**.

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

1. **Organization** — organization name, contact **Name**, **Contact number**
2. **Hosting** — choose **Property** and/or **Parking** (multi-select toggles); fill tower/unit and/or parking slot in the same step. **Property name** is required when Property is selected (tower + unit alone do not enable Continue). At least one host type must be selected. Residence is currently Azure-only (field **?** help).
3. **Verify** — unified step header → trust notice + **Let’s get verified**; upload fields after click. **Valid ID** + **Property verification** (Property Rights + contract end when applicable + proof of ownership + platform + access screenshot) and/or **Parking verification** (Parking Rights + contract end + proof upload).

Contact name pre-fills from the Google account display name when available.

### Unit uniqueness (sublease handoff) — planned

**Today:** tower + unit is unique across **all** properties (ACTIVE and INACTIVE), so a new host cannot claim a unit another org already registered.

**Target ([#120](https://github.com/sprmke/kame-homes/issues/120)):** same residence / tower / unit (and the same display name across different orgs) is allowed for successive hosts — e.g. after a sublease ends — but **only one property may be `ACTIVE`** for that tower+unit at a time. Archived (`INACTIVE`) rows keep history; public listings and booking only use the active host.

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
2. `POST upload-org-verification-asset` — `valid_id`; plus `social_proof` + `property_ownership_proof` when property mode; plus `parking_social_proof` when parking mode — private bucket **`org-verification-assets`**
3. `POST submit-org-verification` `{ tier: 'base', socialPlatform?, propertyRelationship?, propertyContractEndDate?, parkingRelationship?, parkingContractEndDate? }` → `organizations.settings.verification.baseStatus = pending`
4. Redirect: property settings → parking settings → org dashboard

---

## Enhanced verification (after onboarding)

Two-tier model (see **Get Verified** sidebar modal):

| Tier | Name         | Unlock                                     | Documents                                                                 |
| ---- | ------------ | ------------------------------------------ | ------------------------------------------------------------------------- |
| 1    | **Host**     | Required to host (onboarding)              | Valid ID + property/parking verification per **`host_modes`**             |
| 2    | **Verified** | **Verified** badge on host page + listings | Selfie with ID, ownership/sublease proof, 1–2 Azure PMO email screenshots |

- Modal shows **Tier 1 status** from onboarding (read-only checklist + review state).
- **Tier 2 can be submitted anytime** — does not require Tier 1 approval first; each tier is reviewed independently.
- `submit-org-verification` `{ tier: 'enhanced' }` → `enhancedStatus = pending`
- When **Tier 2 approved**: public **`/hosts/:orgSlug`**, property detail, and parking detail show **Verified** badge (`verifiedBadge` from org enhanced verification)

---

## API reference

| Endpoint                        | Method | Auth            |
| ------------------------------- | ------ | --------------- |
| `create-organization`           | POST   | JWT             |
| `upload-org-verification-asset` | POST   | JWT (org owner) |
| `submit-org-verification`       | POST   | JWT (org owner) |

---

## Implementation map

| Concern         | Path                                                                                   |
| --------------- | -------------------------------------------------------------------------------------- |
| Page            | `ui/src/features/dashboard/org/pages/OnboardingPage.tsx`                               |
| Rights fields   | `ui/.../components/onboarding/OnboardingVerificationRightsFields.tsx`                  |
| Step header     | `ui/.../components/onboarding/OnboardingStepHeader.tsx`                                |
| Account menu    | `ui/.../components/onboarding/OnboardingProfileHeader.tsx` — Switch account · Sign out |
| Proof upload UI | `ui/.../components/onboarding/OnboardingProofUpload.tsx`                               |
| Host verify     | `ui/.../components/onboarding/OnboardingHostVerificationSection.tsx`                   |
| Property verify | `ui/.../components/onboarding/OnboardingHostAccessVerificationSection.tsx`             |
| Parking verify  | `ui/.../components/onboarding/OnboardingParkingVerificationSection.tsx`                |
| Get Verified    | `ui/.../components/verification/GetVerifiedModal.tsx`                                  |
| Shared types    | `ui/.../lib/orgVerification.ts` + `supabase/functions/_shared/orgVerification.ts`      |
| Edge            | `create-organization`, `upload-org-verification-asset`, `submit-org-verification`      |
| Storage         | migration `20260922120000_org_verification_assets.sql`                                 |
