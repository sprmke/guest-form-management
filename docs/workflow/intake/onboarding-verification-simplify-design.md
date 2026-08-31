---
stage: intake
title: 'Onboarding verification simplify — design'
status: approved
tags: [onboarding, verification, design]
updated: 2026-08-29
related:
  - docs/workflow/planned/onboarding-verification-simplify.md
  - docs/workflow/in-progress/host-verification-tiers.md
  - docs/workflow/done/verification-scope-split.md
---

# Onboarding verification simplify — design

Keep the three-step hosting wizard. Collect **Property Rights** on Step 2 from existing verification-rights values (Parking Rights when parking-only). Require only a **Valid ID** on Step 3. Reclassify every other current Step 3 verification document under **Recommended** (host or listing). Do not delete existing Tier 2 documents.

## Locked decisions

| Decision                        | Choice                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rights options                  | Reuse `ORG_VERIFICATION_RIGHTS` (Property Owner, Authorized Representative, Sublessee, Property Admin). Label **Property Rights** / **Parking Rights**. No Team RBAC ids, no `PROPERTY_CONTACT_ROLES`. |
| Save                            | Org `contactRole` on `create-organization`. Same value as listing `relationship` on each created property/parking. One role when both host modes are selected.                                         |
| Contract end                    | Stays on **Step 2** when the role is Authorized Representative or Sublessee (not a document).                                                                                                          |
| Host Facebook Page              | Move from host base → **host Recommended**.                                                                                                                                                            |
| Listing ownership/parking proof | Move from listing base → **listing Recommended**.                                                                                                                                                      |
| Listing go-live                 | Super-admin still approves listing **base** (rights + contract end, **no proof**) → listing `ACTIVE`.                                                                                                  |
| Existing Recommended docs       | Keep. Host: selfie, platform-admin screenshot, optional legitimacy/BIR. Listing: additional proof + Azure PMO.                                                                                         |
| Host base vs plan               | Host **base** (Valid ID) is not plan-gated. Recommended submits stay gated (`recommendedBadgeEligible`).                                                                                               |

## Document matrix

| Surface                        | Required documents / fields                                                     |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Onboarding Step 2              | Hosting details + Property Rights / Parking Rights (+ contract end when needed) |
| Onboarding Step 3              | Valid ID only                                                                   |
| Host Tier 1 (`base`)           | Valid ID                                                                        |
| Host Tier 2 (`enhanced`)       | Existing Recommended docs **plus Facebook Page** (`social_proof`)               |
| Listing Tier 1 (`base`)        | Relationship + contract end when needed. **No proof file.**                     |
| Listing Tier 2 (`recommended`) | Existing docs **plus** primary ownership/parking proof (`proof`)                |
| Listing contract renewal       | Still requires a proof file (unchanged)                                         |

Host vs listing scopes stay split (Get Verified = org; listing modal = property/parking).

## Go-live

Onboarding still creates `INACTIVE` listings and still submits listing **base** so `/admin/approvals` can activate them. Base submit no longer uploads proof. `submit-listing-recommended` still requires listing base **approved** first.

## Plan gating (required for Finish setup)

Today `submit-org-verification` `tier: 'base'` calls `requireOrgPropertyFeature(..., 'verifiedBadgeEligible')`. New orgs are Free and listings are `INACTIVE`, so Finish setup fails. Ungate host **base** only. Leave Recommended (host + listing) gated.

## Out of scope

- New role catalogs or Team invite RBAC
- Subscription picker during onboarding
- Changing which plan unlocks Recommended
- Host-verification-tiers Phase 3 search boost
- Onboarding left-panel showcase redesign (separate intake item)

## Success

- New host completes onboarding with Property Rights / Parking Rights + Valid ID only.
- Super-admin can approve host (ID) and listing (rights) and set the listing `ACTIVE` without ownership proof.
- Facebook Page appears on host Recommended; ownership proof appears on listing Recommended; prior Recommended docs remain.
- Free hosts can submit Valid ID; they still cannot submit Recommended without the matching plan.
