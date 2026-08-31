---
stage: in-progress
title: 'Onboarding verification simplify'
status: planned
tags: [workflow, planned, onboarding, verification]
updated: 2026-08-31
---

# Onboarding verification simplify

**Goal:** Step 2 collects Property Rights (Parking Rights when parking-only) from existing `ORG_VERIFICATION_RIGHTS`; Step 3 requires Valid ID only. Facebook Page and listing proof move into the existing Recommended tiers. Listing go-live stays on listing base (rights only).

**Spec:** [`../intake/onboarding-verification-simplify-design.md`](../intake/onboarding-verification-simplify-design.md)

**Architecture:** Polish in place on `/onboarding`, `GetVerifiedModal`, `ListingVerificationModal`, and the shared `canSubmit*` helpers. Host vs listing scopes stay split. No new tables.

**Constraints:** No new role ids. Do not delete existing Recommended documents. Host base is not plan-gated; Recommended stays gated. Minimal UI copy. Update route guides in the same change.

## File map

| Area                  | Paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding UI         | [`ui/src/features/dashboard/org/pages/OnboardingPage.tsx`](../../../ui/src/features/dashboard/org/pages/OnboardingPage.tsx), [`OnboardingVerificationRightsFields.tsx`](../../../ui/src/features/dashboard/org/components/onboarding/OnboardingVerificationRightsFields.tsx), [`OnboardingHostVerificationSection.tsx`](../../../ui/src/features/dashboard/org/components/onboarding/OnboardingHostVerificationSection.tsx)                                               |
| Host rules + modal    | [`supabase/functions/_shared/orgVerification.ts`](../../../supabase/functions/_shared/orgVerification.ts), [`GetVerifiedModal.tsx`](../../../ui/src/features/dashboard/org/components/verification/GetVerifiedModal.tsx), [`orgVerificationTiers.ts`](../../../ui/src/features/dashboard/org/lib/orgVerificationTiers.ts)                                                                                                                                                 |
| Listing rules + modal | [`supabase/functions/_shared/listingAuthorization.ts`](../../../supabase/functions/_shared/listingAuthorization.ts), [`submit-listing-authorization`](../../../supabase/functions/submit-listing-authorization/index.ts), [`ListingVerificationModal.tsx`](../../../ui/src/features/dashboard/org/components/listing-authorization/ListingVerificationModal.tsx), [`listingVerificationTiers.ts`](../../../ui/src/features/dashboard/org/lib/listingVerificationTiers.ts) |
| Plan gate             | [`submit-org-verification`](../../../supabase/functions/submit-org-verification/index.ts)                                                                                                                                                                                                                                                                                                                                                                                 |
| Admin review          | Super-admin host/listing verification dialogs under `ui/src/features/dashboard/super-admin/`                                                                                                                                                                                                                                                                                                                                                                              |
| Docs                  | [`docs/guides/routes/onboarding.md`](../../guides/routes/onboarding.md), [`docs/guides/routes/admin/approvals.md`](../../guides/routes/admin/approvals.md), property/parking settings guides, [`host-verification-tiers.md`](../in-progress/host-verification-tiers.md)                                                                                                                                                                                                   |

## Tasks

1. **Step 2 Property Rights** — Required select using `ORG_VERIFICATION_RIGHTS` inside the Property card (Parking Rights inside the Parking card when parking-only). One value for property and/or parking. Show contract end on Step 2 when the rights option needs it. Pass `contactRole` into `create-organization`. Continue to require hosting details unchanged.

2. **Step 3 Valid ID only** — Remove Facebook Page and listing verification blocks from Step 3. Finish setup: upload `valid_id`, `submit-org-verification` `{ tier: 'base' }`, then `submit-listing-authorization` with relationship + contract end **without** proof upload.

3. **Host base / Recommended rules** — `canSubmitBaseVerification` = Valid ID only. `canSubmitEnhancedVerification` keeps selfie + platform admin and **requires** `socialProofPath`. Move Facebook upload into Get Verified Recommended panel. Forced host changes-requested stays Valid ID; new Facebook issues are Recommended-scoped.

4. **Listing base / Recommended rules** — `canSubmitBaseListingAuthorization` = rights (+ contract end), no `proofPath`. `canSubmitRecommendedListingAuthorization` keeps additional proof + Azure PMO and **requires** `proofPath`. Listing modal: proof upload on Recommended. **Renewal still requires proof.**

5. **Ungate host base** — Remove `verifiedBadgeEligible` from `submit-org-verification` `tier: 'base'` (and matching Get Verified base submit). Keep `recommendedBadgeEligible` on host enhanced and `submit-listing-recommended`.

6. **Super-admin queue** — Host base preview = Valid ID. Host Recommended includes Facebook Page. Listing base = rights (no proof required). Listing Recommended includes primary proof plus existing two docs.

7. **Docs** — Update onboarding save path and document tables; approvals; property/parking verification Q&A; host-verification-tiers document-set table.

## Verify

- New onboarding: Step 2 Property Rights / Parking Rights required; Step 3 Valid ID only; Finish setup succeeds on Free.
- `/admin/approvals`: approve host ID + listing rights → listing `ACTIVE` without ownership proof.
- Get Verified Recommended: Facebook Page required along with existing host Tier 2 docs.
- Listing Verification Recommended: ownership proof required along with additional proof + Azure PMO.
- Contract renewal still requires a proof file.
- Recommended submits still open the upgrade modal on Free.

## Out of scope

Subscription picker, new role catalogs, Recommended plan-eligibility changes, onboarding showcase redesign, search-boost Phase 3.
