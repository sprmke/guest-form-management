# Booking Detail — operator guide

Route: `/org/:orgSlug/property/:propertySlug/bookings/:bookingId` (legacy flat: `/bookings/:bookingId`)

> **Status:** Documented

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                            |
| -------------- | -------- | ---------- | ---------- | -------------------------------- |
| View mode      | —        | —          | Documented | Hero + tabbed read-only panels   |
| Edit mode      | Yes      | Yes        | Documented | `BookingEditShell` + sticky save |
| Workflow panel | Yes      | —          | Documented | Separate from edit form          |

---

## Overview

Two-column layout on tablet/desktop: **booking details** (left) and **Progress** (`WorkflowPanel`, right). On mobile (`<md`), a compact summary strip stays above the fold; **Details** expands the detail panel; **Progress** remains visible without scrolling past the entire form.

**View mode** and **edit mode** are visually distinct on the same route (no modal):

- **View:** `BookingDetailHero` (reservation summary) + `SegmentedControl` tabs — Overview, Guests, Stay, Pricing (hidden in `PENDING_REVIEW`), Files. Content uses read-only `ViewPanel` / `DetailRow` rows (no input chrome).
- **Edit:** `BookingEditShell` (primary ring, “Editing booking” banner, Discard). Form fields only — hero and tabs are hidden.

**Edit booking** on the hero (desktop) or mobile summary opens edit mode inline in the left column.

---

## View mode

**Hero:** booking id prefix, `StatusBadge`, booking source badge, guest name, stay pills, flag chips, Pay parking, **Edit booking**.

**Tabs:**

| Tab      | Content                                                                                      |
| -------- | -------------------------------------------------------------------------------------------- |
| Overview | Guest information, other information (source, decor, referral, requests)                     |
| Guests   | Additional guest slots with valid ID previews                                                |
| Stay     | Check-in/out, duration, party size; Parking / Pets panels when applicable                    |
| Pricing  | Hidden while `PENDING_REVIEW`; `BookingPricingSummary`, receipts, voucher, SD refund receipt |
| Files    | All uploaded assets for the booking (aggregated grid)                                        |

Document thumbnails open an in-page preview modal (signed URLs for private buckets).

**Mobile summary** in view mode: status badge + Details expand. In edit mode: primary ring, **Editing** pill, **Discard** (Details toggle hidden).

**Booking Meta** (ID, created, updated) sits under the Progress panel (desktop) or at the bottom of the expanded mobile panel.

---

## Edit mode

Triggered by **Edit booking** on the hero (desktop) or mobile summary when details are expanded.

Wrapped in **`BookingEditShell`** — visually separate from view mode (ring, tinted banner, Discard).

### Layout

- **Section jump nav** — horizontal chips: Guest, Stay, Parking, Pets, Docs (when applicable), Workflow. Scrolls to the target section.
- **Guest Form Details** — collapsible; guest identity, additional guests, stay, parking, pets, decor, referral, requests, source, documents.
- **Workflow Details** — collapsible (default closed); pricing/settlement fields via `BookingProgressFormsEdit`.
- **Sticky save bar** — Cancel + Save fixed at the bottom of the edit card. Save disabled until the form or workflow section is dirty.

### Validation

Required fields show inline errors under the control. Failed submit shows a toast and scrolls to the first invalid field.

- Adults, children, and **nights** are read-only (derived from guest ages and check-in/out dates).
- Date pickers enforce booked-date overlap via `get-booked-dates`.

### Workflow-sensitive revert

When status is in the revert-eligible pipeline (`PENDING_DOCUMENTS`, substeps, or `READY_FOR_CHECKIN`) and the draft changes a **workflow-sensitive** field (names, email, phone, dates/times, parking/pet details, decor flag, guest docs, etc.), an amber banner appears and the save button reads **Save & Revert Status**. Saving sets status → `PENDING_REVIEW` and clears nested doc completion per server rules.

Non-sensitive edits (e.g. special requests only) do not revert status.

### Save path

`useUpdateBooking` → admin patch on `guest_submissions` + `sync-booking-integrations` on success (calendar + sheet; no workflow emails from edit save).

---

## Progress panel

`WorkflowPanel` handles status transitions, stage sub-forms, and **Cancel booking**. Not replaced by the edit form redesign.

`PendingReviewWorkflowGate` wraps the panel when status is `PENDING_REVIEW` (confirm guest data before workflow actions).

---

## Permissions

Property-scoped admin session + allow list (`RequireAdmin` / org context). Same as `/bookings` list.

---

## Implementation map

| Concern                 | Path                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Page                    | `ui/src/features/dashboard/bookings/pages/BookingDetailPage.tsx`                                             |
| View hero               | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailHero.tsx`                         |
| View panels             | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailViewPanels.tsx`                   |
| View row primitives     | `ui/src/features/dashboard/bookings/components/booking-detail/bookingDetailViewPrimitives.tsx`               |
| Edit shell              | `ui/src/features/dashboard/bookings/components/booking-detail/BookingEditShell.tsx`                          |
| Doc preview tiles       | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDocPreview.tsx`                         |
| Mobile summary          | `ui/src/features/dashboard/bookings/components/BookingDetailMobileSummary.tsx`                               |
| Edit form               | `ui/src/features/dashboard/bookings/components/BookingEditForm.tsx`                                          |
| Edit layout primitives  | `ui/src/features/dashboard/bookings/components/BookingEditLayout.tsx`                                        |
| Flag chips              | `ui/src/features/dashboard/bookings/components/BookingDetailFlagChips.tsx`                                   |
| Sensitive revert notice | `ui/src/features/dashboard/bookings/components/ReadyForCheckinSensitiveFieldsNotice.tsx`                     |
| Workflow                | `ui/src/features/dashboard/bookings/components/WorkflowPanel.tsx`                                            |
| Update mutation         | `ui/src/features/dashboard/bookings/hooks/useUpdateBooking.ts`                                               |
| Revert rules            | `ui/src/features/dashboard/bookings/lib/workflowSensitiveGuestDiff.ts`, `.cursor/rules/booking-workflow.mdc` |

---

## Related docs

- [Bookings list](./bookings.md)
- [Route index](../../README.md)
- [`docs/planning/NEW_FLOW_PLAN.md`](../../../planning/NEW_FLOW_PLAN.md) §3.1
