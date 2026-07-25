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

---

## Steps

1. **Organization** — organization name, contact **Name**, **Contact number**
2. **Hosting** — choose **Property** and/or **Parking** (multi-select toggles); fill tower/unit and/or parking slot in the same step. **Property name** is required when Property is selected (tower + unit alone do not enable Continue). At least one host type must be selected.
3. **Verify** — unified step header → trust notice + **Let’s get verified**; upload fields after click. **Valid ID** + **Property verification** (Property Rights + contract end when applicable + proof of ownership + platform + access screenshot) and/or **Parking verification** (Parking Rights + contract end + proof upload).

Contact name pre-fills from the Google account display name when available.

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

- Sidebar **Get Verified** CTA (`AdminLayout`) opens modal
- Required: selfie with ID, ownership / Azure sublease email, 1–2 Azure PMO email screenshots
- `submit-org-verification` `{ tier: 'enhanced' }` → `enhancedStatus = pending`
- When **approved** (super-admin review later): public **`/hosts/:orgSlug`** shows **Verified** badge (`get-public-host.verifiedBadge`)

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
