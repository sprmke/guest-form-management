---
title: 'Super Admin Approvals — operator guide'
status: active
tags: [guides, routes, admin]
updated: 2026-08-02
---

# Super Admin Approvals — operator guide

Route: `/admin/approvals`

> **Status:** Documented

## Progress overview

| Section         | E2E save | Validation | Docs | Notes                                                        |
| --------------- | -------- | ---------- | ---- | ------------------------------------------------------------ |
| Approvals queue | Done     | Done       | Done | Tier 1 (host) verification; Succession badge when unit taken |
| Review dialog   | Done     | Done       | Done | Approve / Request changes / Reject; succession confirm       |

---

## Overview

Platform super-admins review **Tier 1 host verification** submissions from `/onboarding` (and host resubmits after a request for changes or rejection). Rows come from orgs where `organizations.settings.verification.baseStatus` is not `none`. Default filter is **In review** (`pending`).

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`).

---

## Host-facing knowledge

The platform team uses this page to approve host identity documents, **request changes** (host can fix and resubmit), or **reject** (hard decline).

**Reject** closes dashboard access for that organization, emails the owner a formal notice, and asks them to start a **new application** with proper documents. **Request changes** keeps shell access but **forces a non-dismissible resubmit modal** on next login until the host uploads the requested documents.

**Common host questions**

- Q: Who reviews my onboarding documents?
  A: The Kame Homes platform team. You’ll see “In review” until they approve, request changes, or decline.
- Q: What if changes are requested?
  A: When you sign in you’ll see a **Changes requested** popup you can’t close. Fix or replace the docs listed, then tap **Resubmit**.
- Q: What if my verification was declined?
  A: You’ll see a **Verification declined** screen when you sign in. Start a **new application** with clear, complete documents. You’ll also receive an email with the decision.
- Q: Does approval unlock my dashboard?
  A: You can use the dashboard after onboarding while verification is pending or approved. Changes requested blocks the UI behind a required resubmit modal. A hard reject blocks access for that organization.

---

## Behavior / edge cases

- Search filters by organization name, owner name, and owner email.
- Status filter: All / In review / Approved / Changes requested / Rejected. Default: In review.
- Row click opens a review dialog (no separate detail route).
- Rows with `hasActiveUnitConflict` show a **Succession** badge (another org already has an ACTIVE listing for the same tower+unit).
- Dialog shows **Information** first (hosting mode, rights, platform, contract dates, submitted date), then **Active listing** peers when present (org name, tower+unit, status), then **Documents** with inline image/PDF previews.
- Each document has **Full view** (nested lightbox dialog) and **Open in new tab**. Images show inline thumbnails; PDFs show a first-page thumbnail (via pdf.js).
- Dialog loads signed preview URLs for stored verification assets (1-hour expiry) on the Supabase project origin.
- Pending actions (order): **Request changes**, **Reject**, **Approve**.
- **Approve** with an ACTIVE peer: confirm dialog first — archives the peer listing(s) and activates this org’s property; future bookings stay on the old property. Without a peer, Approve runs immediately.
- **Request changes** switches the same modal into a focused step (orange header): required **multi-select** reasons (document-quality checklist), optional documents to fix, optional additional notes, preview **Host will see**, then confirm — **Back** returns to review. Host keeps shell access; on next login a **non-dismissible Changes requested** modal (no X/Close) forces **Resubmit** before using the dashboard. Only the docs selected under “Please re-upload” are shown for upload (stored as `baseChangesRequestedDocs`); other submitted docs are kept.
- **Reject** switches the same modal into a focused step (destructive header): required reason from a **5-option hard-decline dropdown** (fraud, identity mismatch, ownership, fraud history, duplicate/suspicious account), optional additional notes, **Host will see** preview — **Back** returns to review. Sets `baseRejectionKind: 'rejected'`, **emails the owner**, and **blocks** org/property/parking dashboard access. On next login the host sees `/verification-rejected` and may **Start a new application** (`/onboarding`). In-app resubmit is not allowed for hard reject.
- Notes/reason are stored in `baseRejectionReason` with `baseRejectionKind` (`changes` \| `rejected`).
- **Approve** / decide actions only when status is pending; otherwise show badge + Close (and any prior notes/reason).
- Host resubmit after **changes** (`submit-org-verification` `tier: 'base'`) sets status back to pending and clears the rejection reason/kind; the org reappears in the In review queue. Hard-rejected orgs cannot resubmit; owners may create a new organization.

---

## API reference

| Function                      | Method | Auth            | Notes                                                                                                                            |
| ----------------------------- | ------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `list-org-verifications`      | GET    | super admin JWT | Orgs with `baseStatus ≠ none`; owner profile; newest submit first; `unitConflicts[]` / `hasActiveUnitConflict`                   |
| `get-org-verification-assets` | GET    | super admin JWT | `?orgId=` — verification state + signed asset URLs                                                                               |
| `approve-org-verification`    | POST   | super admin JWT | `{ orgId, tier: 'base' }` — only when pending; clears reason/kind/docs; archives ACTIVE peers then activates this org’s property |
| `reject-org-verification`     | POST   | super admin JWT | `{ orgId, tier: 'base', kind: 'changes' \| 'rejected', reason, changesRequestedDocs? }`                                          |

Data lives in **`organizations.settings.verification`** JSONB (`baseStatus`, `baseSubmittedAt`, `baseRejectionReason`, `baseRejectionKind` = `changes` \| `rejected`, `baseChangesRequestedDocs`, assets paths). No dedicated approvals table.

---

## Implementation map

| Concern          | Path                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page             | `ui/src/features/dashboard/super-admin/pages/SuperAdminApprovalsPage.tsx`                                                                              |
| Table            | `ui/.../super-admin-approvals/SuperAdminApprovalsTable.tsx`                                                                                            |
| Review dialog    | `ui/.../super-admin-approvals/SuperAdminApprovalReviewDialog.tsx` (review / request-changes / reject panels)                                           |
| Hooks / filters  | `ui/.../hooks/useApprovals.ts`, `lib/superAdminApprovalsFilters.ts`, `lib/requestChangesMessage.ts`, `lib/rejectReasonOptions.ts`, `types/approval.ts` |
| Host resubmit UI | `GetVerifiedModal.tsx` + `HostVerificationChangesGate` in `AdminLayout`                                                                                |
| Edge             | `list-org-verifications`, `get-org-verification-assets`, `approve-org-verification`, `reject-org-verification`                                         |
| Shared shape     | `supabase/functions/_shared/orgVerification.ts` (+ UI mirrors)                                                                                         |

---

## Related docs

- [Route index](../README.md)
- [Onboarding](../onboarding.md) — base verification submit + Get Verified
- [`docs/PROJECT.md`](../../PROJECT.md) — API inventory
- Plan: [[2026-07-31-host-approvals|Wire up SuperAdmin Approvals (host verification review)]]

---

## Pending / follow-ups

- [ ] Tier 2 (`enhanced`) review UI on this page (approve/reject badge submissions).
- [ ] Optional email/Telegram notify on approve/reject.
