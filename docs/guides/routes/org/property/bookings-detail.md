---
title: 'Booking Detail — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-02
---

# Booking Detail — operator guide

Route: `/org/:orgSlug/property/:propertySlug/bookings/:bookingId` (legacy flat: `/bookings/:bookingId` via `LegacyAdminRedirect`)

> **Status:** Documented

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                                           |
| -------------- | -------- | ---------- | ---------- | ----------------------------------------------- |
| View mode      | —        | —          | Documented | Header + tabbed read-only panels                |
| Edit mode      | Yes      | Yes        | Documented | `BookingEditTabs` (real tabs) + sticky save bar |
| Progress panel | Yes      | —          | Documented | `WorkflowPanel` — separate from the edit form   |

---

## Overview

Two-column layout on tablet/desktop: **booking details** (left) and **Progress** (`WorkflowPanel`, right, `lg:sticky`). On mobile (`<md`), a compact summary strip (`BookingDetailMobileSummary`) stays above the fold and **Progress** renders before the full detail panel so admins see workflow state without scrolling past the guest form.

The page auto-refreshes the booking every **60 seconds** while the tab is visible (`document.visibilityState === 'visible'`) so Gmail-listener and `sd-refund-cron` transitions surface without a manual reload.

**View mode** and **edit mode** are visually distinct on the same route (no modal):

- **View:** `BookingDetailHeader` (reservation summary) + `BookingDetailTabs` (`SegmentedControl`) — Overview, Guests, Stay, Pricing (hidden while `PENDING_REVIEW`), Files. Content renders through read-only panel components in `booking-detail/panels/`.
- **Edit:** `BookingEditTabs` — a ring-highlighted "Editing booking" shell with its own real tab strip (Guest / Stay / Parking / Pets / Docs / Workflow). Hero and view tabs are hidden while editing.

**Edit booking** on the header (desktop) or mobile summary opens edit mode inline in the left column.

---

## View mode

**Header** (`BookingDetailHeader`): booking id prefix, `StatusBadge`, booking-source badge (Facebook / Airbnb), guest name, stay date range + pax/nights pill, flag chips (`BookingDetailFlagChips` — parking / pets / decor), **Pay parking** button, **Edit booking**.

**Tabs** (`BookingDetailTabs`, backed by panels in `booking-detail/panels/`):

| Tab      | Panel(s)                                        | Content                                                                                               |
| -------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Overview | `GuestInfoPanel`, `OtherInfoPanel`              | Guest identity + contact; source, decor, referral, special requests                                   |
| Guests   | `GuestsPanel`                                   | Additional guest slots with valid ID previews                                                         |
| Stay     | `StayDetailsPanel`, `ParkingPanel`, `PetsPanel` | Check-in/out, duration, party size; Parking/Pets shown when applicable                                |
| Pricing  | `PricingSummaryPanel`                           | **Hidden while `status === 'PENDING_REVIEW'`.** Pricing summary, receipts, voucher, SD refund receipt |
| Files    | `DocumentsPanel`                                | All uploaded assets aggregated in one grid                                                            |

Document thumbnails (`BookingDocPreview`) open `BookingDetailAssetPreviewModal` — an in-page preview using signed URLs resolved via `resolveAssetUrlForBrowser` for private storage buckets. A shared **AI document backfill** (`useReceiptAiBackfill`) silently re-validates receipts/valid IDs that predate AI verdicts (skipped once `status` is `COMPLETED` or `CANCELLED`); panels show a loading state on the specific document being backfilled.

**Mobile summary** (`BookingDetailMobileSummary`): status badge + **Details** expand toggle in view mode; primary ring + **Editing** pill + **Discard** button in edit mode (Details toggle hidden while editing).

**Booking Meta** (`BookingMetaCard` — id, created, updated, copy-id) sits under the Progress panel on desktop, or at the bottom of the expanded mobile panel.

---

## Edit mode

Triggered by **Edit booking** on the header (desktop) or mobile summary once details are expanded.

### Layout

`BookingEditTabs` renders a ring-highlighted container with an "Editing booking" banner + **Discard**, a `SegmentedControl` tab strip, and one tab's fields inside `BookingDetailCard tone="edit"` (same primitive view-mode panels use, so edit/view read as one visual system):

| Tab      | Component            | Notes                                                                    |
| -------- | -------------------- | ------------------------------------------------------------------------ |
| Guest    | `GuestIdentityTab`   | Identity, additional guest slots (add/remove), decor, referral, requests |
| Stay     | `StayDetailsTab`     | Dates/times; adults/children/nights are derived, not directly editable   |
| Parking  | `ParkingTab`         | Toggle + plate/brand/color when `need_parking`                           |
| Pets     | `PetsTab`            | Toggle + pet fields when `has_pets`                                      |
| Docs     | `DocumentsTab`       | Shown only when `shouldShowDocumentsTab(...)` (booking source / pets)    |
| Workflow | `WorkflowDetailsTab` | Pricing/settlement fields via `progressFormPayloadFromState`             |

A single `useForm` instance lives in `BookingEditForm.tsx` (not per-tab) so React Hook Form keeps every field's value even while its tab isn't mounted. A sticky footer (`BookingEditStickyBar`) holds **Cancel** + **Save**; Save is disabled until the guest form or the Workflow tab is dirty.

Tabs with invalid fields show a small error-dot badge; submitting a failing form switches to the first errored tab and scrolls to the first invalid field (`BookingEditTabsHandle.focusFirstError`).

### Validation

- Adults, children, and **nights** are read-only — derived from guest ages and check-in/out dates.
- Date pickers enforce booked-date overlap via `get-booked-dates`.

### Workflow-sensitive revert

When status is in the revert-eligible pipeline (`PENDING_DOCUMENTS` and its nested sub-statuses, or `READY_FOR_CHECKIN`) and the draft changes a **workflow-sensitive** field (names, email, phone, dates/times, parking/pet details, decor flag, guest docs, etc. — see `workflowSensitiveGuestDiff.ts`), a sensitive-fields notice appears and the save button reads **Save & Revert Status**. Saving sets status → `PENDING_REVIEW` and clears nested doc completion per `pendingDocumentsClearPatchForGuestEditRevert` (booking-workflow.mdc §2.3).

Non-sensitive edits (e.g. special requests only) do not revert status.

### Save path

1. `useUpdateBooking` → authenticated `guest_submissions` patch via Supabase client (direct table update, not an edge function).
2. On success: refreshes the booking + bookings-list caches, then calls **`sync-booking-integrations`** (Google Calendar + Sheets refresh from the saved row — no workflow emails, no orchestrator).

---

## Progress panel

`WorkflowPanel` (right rail) is unaffected by the edit-form redesign — it owns:

- **Pipeline stepper** (`BookingStepper`) with `StatusBadge` — click any step/sub-step to preview it without transitioning.
- **Stage sub-form** (`WorkflowSubFormHost`) — pricing, parking settlement, guest balance, SD refund, surprise-decor staff ack, depending on the viewed step.
- **Stay guide block** — auto-issues a guest stay-guide token/link once the booking reaches an RFCI+ status (`issue-guest-stay-guide-token`).
- **Automation triggers** (collapsible) — manual "Run Gmail poll", "Run check-out automation" (sd-refund-cron), "Resend SD refund form email", shown only for the statuses where each applies.
- **Transition actions bar** — Proceed / Back / mark-sub-step-complete-or-incomplete / **Cancel booking**, each behind a confirm modal with dev-control checkboxes (session-persisted per booking; see `admin-auth.mdc` §5 and `workflowDevControls.ts`).

`PendingReviewWorkflowGate` wraps the panel while `status === PENDING_REVIEW`: admins must check "I reviewed the guest submission…" (session-storage ack, keyed by `status_updated_at`) before workflow actions unlock.

Every transition/cancel call goes through `transition-booking` / `cancel-booking`, which delegate all side effects to `_shared/workflowOrchestrator.ts` — see `.cursor/rules/booking-workflow.mdc` for the full status enum, transition graph, and side-effect matrix (never duplicated here).

---

## Pay parking

**Pay parking** (header / mobile summary) opens `PayParkingModal` for late/at-checkin parking guests, or navigates straight to the guest pay-parking page (`buildPayParkingPath`) when parking was already availed (`hasPayParkingAvailed`).

---

## Permissions

Property-scoped admin session + allow list (`RequireAdmin` / org context). Same as `/org/:orgSlug/property/:propertySlug/bookings`.

---

## Host-facing knowledge

This is the page a host opens to manage one specific booking end to end — guest details, documents, pricing, and every step of the check-in/check-out workflow.

**Common host questions**

- Q: Why can't I see the pricing yet?
  A: Pricing only appears once you've moved the booking past the initial review step — this keeps the page focused on reviewing the guest's request first.
- Q: I edited the guest's check-in date and now the booking jumped back to review — why?
  A: Changing a detail that affects the booking's documents or paperwork (dates, contact info, parking/pet info, uploaded IDs) automatically sends it back to the review stage so those steps get re-checked with the new information.
- Q: Will editing a booking send the guest another email?
  A: No — saving changes on this page only updates the booking record, calendar, and spreadsheet. It never re-sends guest emails on its own; those only go out from the workflow actions on the right side.
- Q: The guest submitted their check-out refund form — why doesn't it show yet?
  A: The page checks for updates automatically every minute, but you can also use "Check for guest submission" to refresh right away.
- Q: Can I go back a step if I made a mistake?
  A: Yes — most stages have a "Back to…" option to return to the previous step without losing the guest's data.

---

## Implementation map

| Concern                                | Path                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                                   | `ui/src/features/dashboard/bookings/pages/BookingDetailPage.tsx`                                                                                                                        |
| View header                            | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailHeader.tsx`                                                                                                  |
| View tabs                              | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailTabs.tsx`                                                                                                    |
| View panels                            | `ui/src/features/dashboard/bookings/components/booking-detail/panels/*.tsx`                                                                                                             |
| View row/card primitives               | `ui/src/features/dashboard/bookings/components/booking-detail/primitives/*.tsx`                                                                                                         |
| Doc preview tiles/modal                | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDocPreview.tsx`, `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailAssetPreviewModal.tsx` |
| Mobile summary                         | `ui/src/features/dashboard/bookings/components/BookingDetailMobileSummary.tsx`                                                                                                          |
| Edit form (owns useForm)               | `ui/src/features/dashboard/bookings/components/BookingEditForm.tsx`                                                                                                                     |
| Edit tabs shell                        | `ui/src/features/dashboard/bookings/components/booking-detail/edit/BookingEditTabs.tsx`                                                                                                 |
| Edit tab fields                        | `ui/src/features/dashboard/bookings/components/booking-detail/edit/tabs/{GuestIdentityTab,StayDetailsTab,ParkingTab,PetsTab,DocumentsTab,WorkflowDetailsTab}.tsx`                       |
| Edit sticky save bar                   | `ui/src/features/dashboard/bookings/components/booking-detail/edit/BookingEditStickyBar.tsx`                                                                                            |
| Flag chips                             | `ui/src/features/dashboard/bookings/components/BookingDetailFlagChips.tsx`                                                                                                              |
| Sensitive revert notice                | `ui/src/features/dashboard/bookings/components/ReadyForCheckinSensitiveFieldsNotice.tsx`                                                                                                |
| Booking meta card                      | `ui/src/features/dashboard/bookings/components/BookingMetaCard.tsx`                                                                                                                     |
| Pay parking modal                      | `ui/src/features/dashboard/bookings/components/PayParkingModal.tsx`                                                                                                                     |
| Workflow panel                         | `ui/src/features/dashboard/bookings/components/workflow-panel/WorkflowPanel.tsx` (+ siblings in same folder)                                                                            |
| Pending-review gate                    | `ui/src/features/dashboard/bookings/components/PendingReviewWorkflowGate.tsx`                                                                                                           |
| Detail query                           | `ui/src/features/dashboard/bookings/hooks/useBooking.ts`                                                                                                                                |
| Update mutation                        | `ui/src/features/dashboard/bookings/hooks/useUpdateBooking.ts`                                                                                                                          |
| Transition/cancel/automation mutations | `ui/src/features/dashboard/bookings/hooks/useTransitionBooking.ts`                                                                                                                      |
| Receipt AI backfill                    | `ui/src/features/dashboard/bookings/hooks/useReceiptAiBackfill.ts`                                                                                                                      |
| Revert rules                           | `ui/src/features/dashboard/bookings/lib/workflowSensitiveGuestDiff.ts`, `ui/src/features/dashboard/bookings/lib/bookingStatus.ts`                                                       |
| Status machine + orchestrator (server) | `supabase/functions/_shared/statusMachine.ts`, `supabase/functions/_shared/workflowOrchestrator.ts`                                                                                     |

---

## API reference

| Action                              | Endpoint                                            |
| ----------------------------------- | --------------------------------------------------- |
| Load booking                        | Supabase `guest_submissions` select (admin session) |
| Save edit-form fields               | Supabase `guest_submissions` update (admin session) |
| Refresh Calendar + Sheet after save | `POST sync-booking-integrations`                    |
| Advance/back a workflow step        | `POST transition-booking`                           |
| Cancel booking                      | `POST cancel-booking`                               |
| Upload/replace a guest document     | `POST upload-booking-asset`                         |
| Manually run Gmail approval poll    | `POST gmail-listener`                               |
| Manually run check-out automation   | `POST sd-refund-cron` (scoped to `{ bookingId }`)   |
| Resend SD refund form email         | `POST send-sd-refund-form-email`                    |
| Issue/refresh guest stay-guide link | `POST issue-guest-stay-guide-token`                 |
| Backfill AI document verdicts       | `POST validate-booking-receipts`                    |

---

## Related docs

- [Bookings list](./bookings.md)
- [Route index](../../README.md)
- [`.cursor/rules/booking-workflow.mdc`](../../../../../.cursor/rules/booking-workflow.mdc) — canonical status enum, transition graph, side-effect matrix
- [`.cursor/rules/admin-auth.mdc`](../../../../../.cursor/rules/admin-auth.mdc) §5 — dev-control checkboxes
- [`docs/planning/NEW_FLOW_PLAN.md`](../../../../planning/NEW_FLOW_PLAN.md) §3.1
