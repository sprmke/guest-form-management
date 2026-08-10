---
title: 'Booking Detail — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-10
---

# Booking Detail — operator guide

Route: `/org/:orgSlug/property/:propertySlug/bookings/:bookingId` (legacy flat: `/bookings/:bookingId` via `LegacyAdminRedirect`)

> **Status:** Documented

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                                           |
| -------------- | -------- | ---------- | ---------- | ----------------------------------------------- |
| View mode      | —        | —          | Documented | Simplified header + regrouped tabs              |
| Edit mode      | Yes      | Yes        | Documented | `BookingEditTabs` (real tabs) + sticky save bar |
| Progress panel | Yes      | —          | Documented | `WorkflowPanel` — separate from the edit form   |

---

## Overview

Two-column layout on tablet/desktop: **booking details** (left) and **Progress** (`WorkflowPanel`, right, `lg:sticky`). On mobile (`<md`), a compact summary strip (`BookingDetailMobileSummary`) stays above the fold and **Progress** renders before the full detail panel so admins see workflow state without scrolling past the guest form.

The page auto-refreshes the booking every **60 seconds** while the tab is visible (`document.visibilityState === 'visible'`) so Gmail-listener and `sd-refund-cron` transitions surface without a manual reload.

**View mode** and **edit mode** are visually distinct on the same route (no modal):

- **View:** `BookingDetailHeader` (identity + quiet stay line + **Edit booking** and `⋯`) + `BookingDetailTabs` (`SegmentedControl`) — Overview, Guests, Parking (when `need_parking`), Pets (when `has_pets`), Pricing (hidden while `PENDING_REVIEW`), Files. Content renders through read-only panel components in `booking-detail/panels/`.
- **Edit:** `BookingEditTabs` — a ring-highlighted "Editing booking" shell with its own real tab strip (Guest / Stay / Parking / Pets / Docs / Workflow). Hero and view tabs are hidden while editing.

**Edit booking** on the header (desktop) or mobile summary opens edit mode inline in the left column.

---

## View mode

**Header** (`BookingDetailHeader`): guest name, `StatusBadge`, booking-source badge, one muted stay line (dates + pax/nights), and the page's only primary action — **Edit booking** — beside a single **More actions** (`⋯`) trigger.

**Actions** (`BookingDetailActionsMenu`, fed by `buildBookingDetailActions`), in two groups separated by a divider:

| Group         | Items                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `edit`        | **Add/Edit parking**, **Add/Edit pets** (open edit mode on that tab), **Add/Open pay parking** |
| `guest-links` | **Open stay guide**, **Copy stay guide link** — only once the token exists                     |

Each action declares its `group`; the menu chunks consecutive same-group actions and draws a `DropdownMenuSeparator` (desktop) or a `role="group"` hairline (sheet) between chunks, so "change this booking" and "share with the guest" don't read as one flat list. Rendered as a bottom sheet below `lg` and a dropdown above it; the mobile summary shows the same pair (**Edit booking** + `⋯`) once details are expanded. Workflow Proceed/Cancel stay on the Progress rail; **Copy booking ID** stays in the booking meta card.

**Stay guide** (`useBookingStayGuideLink`): the hook owns eligibility (`isStayGuideEligibleStatus` — RFCI, RFCO, Pending SD Refund, Completed), the shareable URL, and a one-shot `issue-guest-stay-guide-token` backfill for rows that predate auto-issue on transition. It previously held a permanent block in the Progress rail, which spent rail height on every RFCI+ booking for a link that is neither a pipeline stage nor something a host needs on every visit. The two menu rows appear **only when the URL resolves** — a row that silently does nothing while the token is still minting is worse than no row. Copy confirms with a toast; Open uses `window.open` with `noopener,noreferrer`.

**Tabs** (`BookingDetailTabs`, backed by panels in `booking-detail/panels/`):

| Tab      | Panel(s)                                                                     | Content                                                                                                             |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Overview | `StayDetailsPanel`, `AiValidationPanel`, `OtherInfoPanel`, `BookingMetaCard` | Stay details; document checks (receipts + valid ID); notes (hidden when empty); booking id + timestamps             |
| Guests   | `GuestsPanel`                                                                | Booker (reach + identity) + Guest list table with `Name` / `Age` / `Valid ID` column heads                          |
| Parking  | `ParkingPanel`                                                               | **Only when `need_parking`.** Vehicle, rates, endorsement                                                           |
| Pets     | `PetsPanel`                                                                  | **Only when `has_pets`.** Pet fields + photo / vaccination / approved form                                          |
| Pricing  | `PricingSummaryPanel`                                                        | **Hidden while `status === 'PENDING_REVIEW'`.** Rates & fees ledger, guest settlement, receipts, voucher, SD refund |
| Files    | `DocumentsPanel`                                                             | Uploaded assets in labeled groups (Payments, IDs, Parking, Pets, Approvals, Booking) — empty groups hidden          |

Conditional tabs fall back to Overview via `resolveBookingViewTab` (`lib/resolveBookingViewTab.ts`) when parking/pets are cleared or pricing is hidden.

Document thumbnails (`BookingDocPreview`) open `BookingDetailAssetPreviewModal` — an in-page preview using signed URLs resolved via `resolveAssetUrlForBrowser` for private storage buckets. The Guest list table and **Document checks** rows use `DocPreview` with `compact` for square thumbs; in Document checks the thumb is passed **no** verdict so the row mark stays the single verdict signal, and a row whose file is gone renders a dashed `ImageOff` tile to keep the column aligned. Compact AI results (`ReceiptAiVerdictMark` / `ReceiptAiVerdictBadge` with `compact`) are an icon-only chip whose glyph is the verdict (`receiptAiVerdictGlyph`): teal check for valid / likely valid, rose cross for invalid, amber triangle for unclear — shape first, color as reinforcement, with the full "AI: …" wording on `aria-label`/`title`. Full-width notice cards on workflow upload forms keep the longer "Looks like…" copy. The preview modal carries **no** mark in its title row — the verdict is a tinted **result banner** (`ReceiptAiVerdictBanner`) directly under the header, reading verdict first (`Invalid`), then the quiet `AI document check` attribution, then the summary sentence, all in the verdict's own hue (`receiptAiMetaForPreviewAsset` resolves verdict + summary by label or stored URL). The banner also renders while a check is in flight (neutral tone, spinner, `Checking document`) and when a verdict has no summary; it renders nothing for `skipped`/absent verdicts. A summary is capped at four lines and scrolls, and only becomes a tab stop when it actually overflows (measured with `ResizeObserver`). A shared **AI document backfill** (`useReceiptAiBackfill`) silently re-validates receipts/valid IDs that predate AI verdicts (skipped once `status` is `COMPLETED` or `CANCELLED`); panels show a loading state on the specific document being backfilled.

**Mobile summary** (`BookingDetailMobileSummary`): name + status + source + quiet stay line; **Details** expand toggle in view mode; primary ring + **Editing** pill + **Discard** button in edit mode (Details toggle hidden while editing).

**Booking Meta** (`BookingMetaCard` — id, created, updated, copy-id) lives on the **Overview** tab in the main column (not under the Progress rail).

**Guest list** (`GuestsPanel`): a real `<table>` with `scope="col"` heads (`Name` / `Age` / `Valid ID`) and an `sr-only` caption, so the roster columns are labeled instead of implied. Name cell = slot qualifier (`Primary`…`Fifth`, sentence case) over the name (`truncate` + `title` for long names, muted `—` when unrecorded); **Age** is a centered tabular column singularized at `1 yr`; **Valid ID** is right-aligned and resolves in this order — uploaded thumb (`DocPreview compact`) → dashed **No ID** tile when `requiresValidId(age)` (18+) → **Not required** for a recorded minor → `—` when age is unknown, since a missing age can't justify either claim.

**Pricing** (`BookingPricingSummary`, `layout="page"`): flat `text-overline` sections inside one card — no nested boxes. Only section heads are uppercase; data labels are sentence case, so the panel has a single overline level.

| Section              | Rows                                                                                                         | Notes                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **Rates & fees**     | Booking rate → down payment → balance after down payment → security deposit → pet fee → additional guest fee | `BookingDetailRow` ledger with `numeric` (tabular, right-aligned). Guest-balance items only       |
| **Parking**          | Charged to guest, paid to parking owner + caption "Collected on the Parking Request step."                   | Separate because `computeTotalGuestBalance` **excludes** parking — mixing it broke the arithmetic |
| **Guest settlement** | Total guest balance → balance paid (`₱0.00` when none recorded) → **Unpaid** (bold amber)                    | Only when unpaid > 0                                                                              |

A row with no recorded amount is dropped rather than rendered as `—` or `₱0.00`, and a section with no remaining rows is hidden entirely. Once `COMPLETED`, rates/parking are replaced by the `HostNetBreakdown` ledger card + SD refund summary.

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

Pet-detail fields (toggle, name, type, breed, age, vaccination date) are only workflow-sensitive when the property's resolved document requirements include a `has_pets`-triggered requirement (or the literal id `pet`) — properties without pet documentation configured never revert on pet-field edits alone. Parking-field sensitivity is unaffected (parking stays a hardcoded step outside `documentRequirements`).

Non-sensitive edits (e.g. special requests only) do not revert status.

### Save path

1. `useUpdateBooking` → authenticated `guest_submissions` patch via Supabase client (direct table update, not an edge function).
2. On success: refreshes the booking + bookings-list caches, then calls **`sync-booking-integrations`** (Google Calendar + Sheets refresh from the saved row — no workflow emails, no orchestrator).

---

## Progress panel

`WorkflowPanel` (right rail) shows **one pipeline stage at a time** — a stage deck rather than a permanently expanded vertical stepper. `viewedStep` remains the single source of truth for which stage is on screen; the deck, the map modal, the sub-form, and the actions bar all read it.

- **Stage deck header** (`WorkflowStageDeckHeader`) — `Step 3 of 6`, the stage name flanked by prev/next arrows, a dot track, and a list icon that opens the full map. Index math lives in `workflowStageDeck.ts` (`buildWorkflowStageDeck`), which reuses `bookingPipeline()` rather than re-deriving stage order. These arrows **only move the view**; forward is capped at the live status (`canGoNext: viewedIndex < currentIndex`), so walking right always lands back on the current stage and no separate "return to current" control is needed. A stale `viewedStep` (e.g. parking removed while viewing it) falls back to the live stage instead of hiding the navigator. Off-pipeline rows (`CANCELLED`, `IMPORTED` — anything `bookingPipeline()` doesn't contain) render a plain status card with `StatusBadge` and no deck.
- **Two markers, never conflated** — the header carries both "where the booking is" and "what the host is looking at", and each has its own channel:
  - **Color = the booking's position.** The live stage's dot wears that status's own tone (`statusToneStyle` — the same rose / yellow / teal / amber / orange / sky language as `StatusBadge` and the calendar) inside a tinted halo, and pulses for `PENDING_REVIEW`. It does not move while the host browses. The halo is sized larger than the other dots on purpose: `READY_FOR_CHECKIN`'s tone is the same teal a completed dot already uses, so hue alone cannot carry the signal.
  - **Ring + name = what is on screen.** The viewed dot takes a neutral ring, and the stage name shows a teal check when the stage is behind the live one. The ring is suppressed while the two coincide, so the resting rail shows one marker and only splits into two once the host actually navigates away.
- **Track dots are buttons** — any reached stage is one click away, so browsing no longer means walking the arrows, and each dot names itself (`Ready for Check-out — Completed`) on `aria-label`/`title`. Not-yet-reached stages render as a `role="img"` span rather than a disabled button: they are not actionable, but they still announce and still show their name on hover. Dots are a precision affordance — the 44px arrows, swipe, and the full map remain the touch paths.
- **Browsing mode** — while `viewedStep` is behind the live status, `WorkflowActionsBar` hides its transition controls so actions can never target a stage the host is only previewing. Cancel booking is booking-scoped and stays.
- **Stage slide** (`WorkflowStageSlide`) — a native-style **push**, not a fade. For one 320ms beat both stages are on screen: the departing one translates out while the arriving one slides in from the opposite edge over it. Details that matter if you touch this:
  - Both layers use the same distance (38% of the rail), duration and curve (`cubic-bezier(0.22, 0.61, 0.36, 1)`), so the gap between them stays constant and the pair reads as one strip. A sharper expo-out is ~90% finished within 100ms, which is what made the earlier version look like a fade with a nudge.
  - Motion is **pure translation with no cross-fade**. The arriving layer is opaque (`bg-card`, matching the rail) and takes `relative z-10` to beat the absolutely positioned outgoing layer in paint order. Fading both instead lets text ghost through.
  - The two layers render from **one keyed list**. Putting the outgoing stage in its own JSX slot would give it a new key and remount the whole sub-form mid-transition, re-running its effects; keyed siblings keep the departing instance alive, and handing back the identical `children` object lets React skip re-rendering it.
  - `overflow-hidden` and the opaque background are applied **only while a transition runs**, so a resting sub-form can still overflow a popover or menu.
  - Under `prefers-reduced-motion` the outgoing layer is `hidden` and the entrance does not animate, giving an instant swap.
- **Touch** — a horizontal drag tracks the finger with damping (stiffer rubber band at either end of the deck) before committing at ≥56px, so the panel advertises that it can be swiped. Gestures starting on a form control or `[data-no-swipe]` are ignored and `touch-pan-y` leaves vertical scrolling to the browser.
- **Header sync** — the step name in `WorkflowStageDeckHeader` carries a matching, smaller directional slide (`animate-stage-label-in-*`). Without it the label swaps instantly while the body slides and the two read as unrelated events. The arrows and dot track deliberately stay still — they are chrome.
- **Full progress map** (`WorkflowProgressMapModal`) — the same `BookingStepper` on demand: whole pipeline, nested sub-steps, per-step timing. Picking a step selects it and closes the modal. The stepper already marks the current stage, so the modal title carries no status badge. Its current-step node uses the same status tone as the rail's track (completed nodes stay teal with a check), so the two views never disagree about what color the live status is. The **Pending Documents** nested tree is data-driven: the property's resolved `documentRequirements` (in `order`, filtered by `requirementApplies`) plus a hardcoded Parking row inserted where a `has_pets`-triggered requirement would land, when `need_parking`. Each row shows a short muted approval-source hint ("Email" / "Manual"). A property with an empty requirements override shows no nested tree at all — Proceed goes straight from Pending Review to Ready for Check-in.
- **Nested document sub-steps** (`WorkflowDocStepTabs`) — Pending Documents is the one stage with children, so its sub-steps are a tab strip inside the single deck slide instead of a second navigation axis. The strip spans the rail with each tab at `flex-1`, so two steps split it in half and three split it in thirds. Each tab carries a completion icon; labels are shortened for the width (`shortDocStepLabel` strips a leading "Pending " and a trailing " Request"/" Approval") and truncate rather than overflow, with the full label plus completion state on the tab's `aria-label`/`title` (`SegmentedControlOption.ariaLabel`). The strip is hidden when only one sub-step applies. The stage opens on the **first incomplete** sub-step (`defaultPendingDocNestedKey`).
- **Stage sub-form** (`WorkflowSubFormHost`) — pricing, parking settlement, guest balance, SD refund, surprise-decor staff ack, depending on the viewed step.
- **Completed stage** (`WorkflowCompletedSummaryCard`, content kind `completed_summary`) — the terminal stage has no form and no actions bar, so instead of an empty rail it shows a **Closing summary**: completion date (`status_updated_at`, falling back to `updated_at`, formatted in Asia/Manila), balance collected (`guestBalancePaidRecorded`, only when above zero), deposit returned (`sd_refund_amount`), and a link to the refund receipt when one was uploaded. Refund method, bank details and guest feedback are **not** repeated here — those stay on the Pricing tab's SD refund card. The "completed steps are read-only" banner is suppressed for this card since it is a record, not a disabled form.
- **Automation triggers** (collapsible) — manual "Run Gmail poll", "Run check-out automation" (sd-refund-cron), "Resend SD refund form email", shown only for the statuses where each applies.
- **Transition actions bar** (`WorkflowActionsBar`) — three tiers, top to bottom:
  1. A **back/forward pair** on one axis: a bordered "Back" on the left (its `aria-label`/`title` and the confirm modal name the destination) and exactly one primary CTA on the right (mark the active document complete → proceed to Ready for Check-in → proceed to the next stage). The two share height, radius and type scale, and use the same icon family — `ArrowLeft` on Back, `ArrowRight` on the CTA — so the row reads as a single direction control rather than two unrelated buttons. The CTA centres its label and arrow as one group: at rail width `justify-between` strands the arrow against the far edge. With no primary, Back expands full width and shows "Back to \<status\>". A disabled CTA takes a solid `bg-muted` fill (not the Back button's card fill, which would make the two indistinguishable); its unblock reason is a hover/focus tooltip on the button rather than a permanent caption under the row. These commit real status changes, so they are deliberately shaped and placed differently from the deck header's view-only arrows.
  2. The **step-scoped undo** ("Mark … incomplete") — quiet, full width, only while an applicable document sub-step is complete.
  3. **Cancel booking** — full-width on a soft rose wash (rose text on a 10% rose fill, deepening on hover) below a hairline, always present while allowed. Eligibility is `canCancelBookingAtStatus` (`bookingStatus.ts`): Pending Review through **Ready for Check-in** only. From Ready for Check-out onward the stay has happened, so the booking is settled or refunded rather than cancelled, and the control is gone.

  While any of these mutations is in flight the **whole footer** is disabled (`actionsBusy = transitionPending || cancelPending`), not just the button that was pressed — a cancel racing a transition would land the booking somewhere neither host intended. The running control keeps a spinner and `aria-busy`.

  Every transition and the cancel sit behind a confirm modal with dev-control checkboxes (session-persisted per booking; see `admin-auth.mdc` §5 and `workflowDevControls.ts`). Dev-control resend checkboxes (GAF/pet request emails, generate PDF) only appear when the property's resolved requirements include the matching `gaf`/`pet` id.

- Mark-complete/incomplete calls send the requirement id (or the legacy `PENDING_PARKING_REQUEST` literal for parking) as `document_completion_target`/`document_completion_clear_target` — see `useTransitionBooking.ts`.

The kanban workflow dialog (`variant="modal"`) keeps its existing shape: no deck, no map modal, sticky action footer.

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
- Q: A fee I expected isn't listed under Rates & fees.
  A: The list only shows amounts that are actually recorded on this booking. Pet and additional-guest fees appear once they apply, so a missing line means there's nothing to charge for it — not that a value is hidden.
- Q: What's the difference between "Balance after down payment" and "Total guest balance"?
  A: "Balance after down payment" is what remains on the room rate after the down payment. "Total guest balance" under Guest settlement is everything the guest still owes you in total, including the security deposit and any pet or additional-guest fees — that's the figure to collect against, and "Unpaid" is what's left of it.
- Q: Why isn't parking part of the guest's total?
  A: Parking money is handled on the Parking Request step, not with the stay balance, so it's listed in its own Parking section. That section also shows what you pay the parking owner, which is your cost rather than a guest charge.
- Q: Why does one guest show "Not required" instead of an ID?
  A: A government ID is only required for guests 18 and over, so under-age guests show "Not required". A dash means their age hasn't been recorded yet, so there's nothing to judge the requirement against.
- Q: What is the document checks section?
  A: It lists every receipt and ID the system has reviewed so far. A teal check means the check passed, a rose cross means it failed, and an amber triangle means it needs a closer look — hover or focus the mark for the exact wording. Each row also shows a thumbnail of the file and a short reason; tap the thumbnail or the document name to open it full size, where a colored banner above the file states the result and the reason so you can judge the file yourself. Items needing a second look are listed first, and the count beside the title tells you how many.
- Q: I edited the guest's check-in date and now the booking jumped back to review — why?
  A: Changing a detail that affects the booking's documents or paperwork (dates, contact info, parking/pet info, uploaded IDs) automatically sends it back to the review stage so those steps get re-checked with the new information.
- Q: Will editing a booking send the guest another email?
  A: No — saving changes on this page only updates the booking record, calendar, and spreadsheet. It never re-sends guest emails on its own; those only go out from the workflow actions on the right side.
- Q: The guest submitted their check-out refund form — why doesn't it show yet?
  A: The page checks for updates automatically every minute, but you can also use "Check for guest submission" to refresh right away.
- Q: Can I go back a step if I made a mistake?
  A: Yes — the **Back** button at the bottom left of the progress panel returns the booking to the previous step without losing the guest's data. It asks you to confirm and names the step you're moving to.
- Q: What do the dots under the step name mean?
  A: One dot per step, left to right. The bigger colored dot is where the booking actually is right now, in that status's own color — the same colors you see on the bookings list and calendar. Solid teal dots are steps already done, hollow ones haven't been reached. Hover any dot to see its name and state, and tap a done dot to jump straight to it.
- Q: The progress panel only shows one step now — where did the full list go?
  A: The panel shows the step you're working on so the action you need is always in view. Tap the list icon in its top-right corner for the whole checklist, including which document steps are done and when each stage started.
- Q: How do I look at an earlier step?
  A: Tap any filled dot on the row of dots, use the arrows beside the step name, swipe the panel sideways on a phone, or pick the step from the checklist. You can only look back at steps the booking has already passed, so tapping the right arrow until it stops brings you back to where the booking actually is. While you're looking at an earlier step the panel hides its step buttons so you can't act on the wrong stage.
- Q: The booking is finished — what does the progress panel show now?
  A: A closing summary: the date it was completed, how much the guest settled at check-out, and how much of the deposit went back to them, plus a link to the refund receipt if you uploaded one. There are no step buttons because there is nothing left to move. The full refund details — method, bank, and the guest's feedback — are on the Pricing tab.
- Q: The arrows by the step name and the buttons at the bottom both point left and right — what's the difference?
  A: The arrows next to the step name only change what you're looking at; nothing happens to the booking. The buttons at the bottom actually move the booking forward or back, and always ask you to confirm first.
- Q: Why can't I cancel this booking?
  A: Cancelling is only available up to Ready for Check-in. Once a booking reaches Ready for Check-out the stay has already happened, so it gets finished or refunded instead of cancelled.
- Q: Where is the stay guide link?
  A: In the `⋯` menu next to **Edit booking**, as **Open stay guide** and **Copy stay guide link**. It used to sit in the progress panel, but it's something you send the guest rather than a step you work through, so it moved in with the other booking actions. It appears once the booking is Ready for Check-in or later and the link has been prepared.

---

## Implementation map

| Concern                                | Path                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                                   | `ui/src/features/dashboard/bookings/pages/BookingDetailPage.tsx`                                                                                                                        |
| View header                            | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailHeader.tsx`                                                                                                  |
| View tabs                              | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailTabs.tsx`                                                                                                    |
| View panels                            | `ui/src/features/dashboard/bookings/components/booking-detail/panels/*.tsx` (`AiValidationPanel`, `StayDetailsPanel`, …)                                                                |
| Header actions menu                    | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailActionsMenu.tsx`, `ui/src/features/dashboard/bookings/lib/bookingDetailActions.ts`                           |
| Stay-guide link (URL + auto-issue)     | `ui/src/features/dashboard/bookings/hooks/useBookingStayGuideLink.ts`                                                                                                                   |
| AI validation collector                | `ui/src/features/dashboard/bookings/lib/bookingAiValidations.ts`                                                                                                                        |
| View row/card primitives               | `ui/src/features/dashboard/bookings/components/booking-detail/primitives/*.tsx`                                                                                                         |
| Doc preview tiles/modal                | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDocPreview.tsx`, `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailAssetPreviewModal.tsx` |
| Mobile summary                         | `ui/src/features/dashboard/bookings/components/BookingDetailMobileSummary.tsx`                                                                                                          |
| Edit form (owns useForm)               | `ui/src/features/dashboard/bookings/components/BookingEditForm.tsx`                                                                                                                     |
| Edit tabs shell                        | `ui/src/features/dashboard/bookings/components/booking-detail/edit/BookingEditTabs.tsx`                                                                                                 |
| Edit tab fields                        | `ui/src/features/dashboard/bookings/components/booking-detail/edit/tabs/{GuestIdentityTab,StayDetailsTab,ParkingTab,PetsTab,DocumentsTab,WorkflowDetailsTab}.tsx`                       |
| Edit sticky save bar                   | `ui/src/features/dashboard/bookings/components/booking-detail/edit/BookingEditStickyBar.tsx`                                                                                            |
| Sensitive revert notice                | `ui/src/features/dashboard/bookings/components/ReadyForCheckinSensitiveFieldsNotice.tsx`                                                                                                |
| Booking meta card                      | `ui/src/features/dashboard/bookings/components/BookingMetaCard.tsx`                                                                                                                     |
| Pay parking modal                      | `ui/src/features/dashboard/bookings/components/PayParkingModal.tsx`                                                                                                                     |
| Workflow panel                         | `ui/src/features/dashboard/bookings/components/workflow-panel/WorkflowPanel.tsx` (+ siblings in same folder)                                                                            |
| Stage deck (rail navigator)            | `ui/src/features/dashboard/bookings/components/workflow-panel/{WorkflowStageDeckHeader,WorkflowStageSlide,WorkflowDocStepTabs,WorkflowProgressMapModal}.tsx`                            |
| Stage deck index math                  | `ui/src/features/dashboard/bookings/lib/workflowStageDeck.ts`                                                                                                                           |
| Cancel eligibility by status           | `ui/src/features/dashboard/bookings/lib/bookingStatus.ts` (`canCancelBookingAtStatus`)                                                                                                  |
| Pending-review gate                    | `ui/src/features/dashboard/bookings/components/PendingReviewWorkflowGate.tsx`                                                                                                           |
| Detail query                           | `ui/src/features/dashboard/bookings/hooks/useBooking.ts`                                                                                                                                |
| Update mutation                        | `ui/src/features/dashboard/bookings/hooks/useUpdateBooking.ts`                                                                                                                          |
| Transition/cancel/automation mutations | `ui/src/features/dashboard/bookings/hooks/useTransitionBooking.ts`                                                                                                                      |
| Receipt AI backfill                    | `ui/src/features/dashboard/bookings/hooks/useReceiptAiBackfill.ts`                                                                                                                      |
| Revert rules                           | `ui/src/features/dashboard/bookings/lib/workflowSensitiveGuestDiff.ts`, `ui/src/features/dashboard/bookings/lib/bookingStatus.ts`                                                       |
| Configurable document requirements     | `ui/src/features/dashboard/bookings/lib/documentRequirements.ts` (types + defaults), `ui/src/features/dashboard/bookings/lib/workflow.ts` (nested-item/completion helpers, D2 skip)     |
| Dev-control visibility rules           | `ui/src/features/dashboard/bookings/lib/workflowDevControls.ts`                                                                                                                         |
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
- [`docs/archive/planning/NEW_FLOW_PLAN.md`](../../../../archive/planning/NEW_FLOW_PLAN.md) §3.1
