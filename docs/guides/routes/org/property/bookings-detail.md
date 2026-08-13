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

| Section                 | E2E save | Validation | Docs       | Notes                                                                      |
| ----------------------- | -------- | ---------- | ---------- | -------------------------------------------------------------------------- |
| View mode               | —        | —          | Documented | Simplified header + regrouped tabs                                         |
| Edit mode               | Yes      | Yes        | Documented | `BookingEditTabs` (real tabs) + sticky save bar                            |
| Progress panel          | Yes      | —          | Documented | `WorkflowPanel` — separate from the edit form                              |
| AI Summary & Validation | Yes      | —          | Documented | Admin-triggered job, 5-section progress panel, coexists with manual review |

---

## Overview

Two-column layout on tablet/desktop: **booking details** (left) and **Progress** (`WorkflowPanel`, right, `lg:sticky`). On mobile (`<md`), a compact summary strip (`BookingDetailMobileSummary`) stays above the fold and **Progress** renders before the full detail panel so admins see workflow state without scrolling past the guest form.

The page auto-refreshes the booking every **60 seconds** while the tab is visible (`document.visibilityState === 'visible'`) so Gmail-listener and `sd-refund-cron` transitions surface without a manual reload.

**View mode** and **edit mode** are visually distinct on the same route (no modal):

- **View:** `BookingDetailHeader` (identity + quiet stay line + **Edit booking** and `⋯`) + `BookingDetailTabs` (`SegmentedControl`) — Overview, Guests, Parking (when `need_parking`), Pets (when `has_pets`), Pricing (hidden while `PENDING_REVIEW`), Files. Content renders through read-only panel components in `booking-detail/panels/`.
- **Edit:** `BookingEditTabs` — quiet bordered shell (same card language as view) with an "Editing booking" header + **Cancel** / **Save**, then a `SegmentedControl` strip (**Stay** / **Guests** / **Parking** / **Pets**). Document uploaders live on those domain tabs (downpayment on Stay, Valid ID on Guests, pet files on Pets) — there is no separate Edit Files tab. Each tab owns its own `BookingDetailCard tone="edit"` panel(s). Hero and view tabs are hidden while editing. The same **Cancel** / **Save** pair repeats on the sticky footer (desktop) or mobile contextual bar so actions stay reachable while scrolling. Pricing, parking settlement, guest balance, and SD refund edits live on the **Progress** rail — not in this form.

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

| Tab      | Panel(s)                                                                                        | Content                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Overview | `StayDetailsPanel`, `AiValidationPanel` (after AI Summary), `OtherInfoPanel`, `BookingMetaCard` | Stay details; **Document checks** only after a finished AI Summary run; notes; booking id + timestamps              |
| Guests   | `GuestsPanel`                                                                                   | Booker (reach + identity) + Guest list table with `Name` / `Age` / `Valid ID` column heads                          |
| Parking  | `ParkingPanel`                                                                                  | **Only when `need_parking`.** Vehicle, rates, endorsement                                                           |
| Pets     | `PetsPanel`                                                                                     | **Only when `has_pets`.** Pet fields + photo / vaccination / approved form                                          |
| Pricing  | `PricingSummaryPanel`                                                                           | **Hidden while `status === 'PENDING_REVIEW'`.** Rates & fees ledger, guest settlement, receipts, voucher, SD refund |
| Files    | `DocumentsPanel`                                                                                | Uploaded assets in labeled groups (Payments, IDs, Parking, Pets, Approvals, Booking) — empty groups hidden          |

Conditional tabs fall back to Overview via `resolveBookingViewTab` (`lib/resolveBookingViewTab.ts`) when parking/pets are cleared or pricing is hidden.

Document thumbnails (`BookingDocPreview`) open `BookingDetailAssetPreviewModal` — an in-page preview using signed URLs resolved via `resolveAssetUrlForBrowser` for private storage buckets. The Guest list table and **Document checks** rows use `DocPreview` with `compact` for square thumbs; in Document checks the thumb is passed **no** verdict so the row mark stays the single verdict signal on the **right**, vertically centred with the row, and a row whose file is gone renders a dashed `ImageOff` tile to keep the column aligned. The AI summary under each label uses verdict-colored text (teal pass, rose fail, amber unclear); the mark (`ReceiptAiVerdictMark`) repeats shape + color with full wording on `aria-label`/`title`. Full-width notice cards on workflow upload forms keep the longer "Looks like…" copy. The preview modal carries **no** mark in its title row — the verdict is a tinted banner above the file. A **result banner** (`ReceiptAiVerdictBanner`) directly under the header, reading verdict first (`Invalid`), then the quiet `AI document check` attribution, then the summary sentence, all in the verdict's own hue (`receiptAiMetaForPreviewAsset` resolves verdict + summary by label or stored URL). The banner also renders while a check is in flight (neutral tone, spinner, `Checking document`) and when a verdict has no summary; it renders nothing for `skipped`/absent verdicts. A summary is capped at four lines and scrolls, and only becomes a tab stop when it actually overflows (measured with `ResizeObserver`). **Document checks** (`AiValidationPanel`) is hidden until an admin finishes **AI Summary** (`job_status` `completed` or `failed` on `booking_ai_reviews`) — opening the booking detail page never calls Gemini. The old page-open backfill (`useReceiptAiBackfill` → `validate-booking-receipts`) is a no-op; per-document verdict columns are written by the AI Summary job (and still by admin asset upload when a host replaces a file).

**Mobile summary** (`BookingDetailMobileSummary`): name + status + source + quiet stay line; **Details** expand toggle in view mode; primary ring + **Editing** pill + **Cancel** button in edit mode (Details toggle hidden while editing).

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

`BookingEditTabs` renders a quiet bordered container with an "Editing booking" header + **Cancel** / **Save**, a compact `SegmentedControl` (same control as view), and tab bodies that each use `BookingDetailCard tone="edit"` — the same primitive view-mode panels use:

| Tab (label) | Id        | Component          | Notes                                                                                                                                                                                            |
| ----------- | --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stay        | `stay`    | `StayDetailsTab`   | Dates/times; adults/children/nights derived; **Downpayment receipt** when booking source is not Airbnb                                                                                           |
| Guests      | `guest`   | `GuestIdentityTab` | Cards: Primary Guest, Guest list (add/remove + Valid ID), Notes & source — referral channel is the same find-us dropdown as the guest form (`FIND_US_OPTIONS`); details only for Friend / Others |
| Parking     | `parking` | `ParkingTab`       | Always available in edit (toggle on/off); plate/brand/color when enabled                                                                                                                         |
| Pets        | `pets`    | `PetsTab`          | Always available in edit (toggle on/off); when enabled: pet fields + **Vaccination record** / **Pet photo**                                                                                      |

Guest / Progress rail uploads use `BookingGuestDocReplacer` (edit wraps `BookingCompactAssetControl`): a **single compact row** (thumb + View, icon Replace, icon Remove). Empty state is a dashed row with inline Upload — no stacked preview card + full-width Replace CTA. Pet vaccination/photo uploads set `has_pets` on the server when the row still has it false, so files can upload before **Save** persists the Pets toggle (DB CHECK requires `has_pets` before pet file URLs). **View** always opens `BookingDetailAssetPreviewModal` via `useBookingAssetPreview` (Progress rail, pending-doc links, closing summary, and kanban workflow modal) — never a new browser tab. View mode still has a **Files** tab (`DocumentsPanel`) for browsing all uploaded assets.

A single `useForm` instance lives in `BookingEditForm.tsx` (not per-tab) so React Hook Form keeps every field's value even while its tab isn't mounted. Shared `BookingEditActions` render **Cancel** + **Save** in the edit header and again in `BookingEditStickyBar` (sticky footer on `lg+`, `ContextualActionBar` below). Save is disabled until the guest form is dirty; both Save buttons submit the same form id.

Tabs with invalid fields show a small error-dot badge; submitting a failing form switches to the first errored tab and scrolls to the first invalid field (`BookingEditTabsHandle.focusFirstError`).

### Validation

- Adults, children, and **nights** are read-only — derived from guest ages and check-in/out dates.
- Date pickers enforce booked-date overlap via `get-booked-dates`.

### Workflow-sensitive revert

When status is in the revert-eligible pipeline (`PENDING_DOCUMENTS` and its nested sub-statuses, or `READY_FOR_CHECKIN`) and the draft changes a **workflow-sensitive** field (names, email, phone, dates/times, parking/pet details, decor flag, guest docs, etc. — see `workflowSensitiveGuestDiff.ts`), a sensitive-fields notice appears and the save button reads **Save & Revert Status**. Saving sets status → `PENDING_REVIEW` and clears nested doc completion per `pendingDocumentsClearPatchForGuestEditRevert` (approved PDFs and completions — request PDFs are preserved unless PDF fill fields changed). Proceed to Pending Documents **always regenerates** request PDFs when the property has a GAF/pet template requirement (matched by `pdfTemplateId` or requirement `id`, not only id `gaf`/`pet`). Each upload stores a cache-bust `?v=` on the URL so previews reload after round-trips. Missing templates or generation failures **block** the transition with an error.

Pet-detail fields (toggle, name, type, breed, age, vaccination date) are only workflow-sensitive when the property's resolved document requirements include a `has_pets`-triggered requirement (or the literal id `pet`) — properties without pet documentation configured never revert on pet-field edits alone. Parking-field sensitivity is unaffected (parking stays a hardcoded step outside `documentRequirements`).

Non-sensitive edits (e.g. special requests only) do not revert status.

### Save path

1. `useUpdateBooking` → authenticated `guest_submissions` patch via Supabase client (direct table update, not an edge function).
2. On success: refreshes the booking + bookings-list caches.

---

## Progress panel

`WorkflowPanel` (right rail) shows **one pipeline stage at a time** — a stage deck rather than a permanently expanded vertical stepper. `viewedStep` remains the single source of truth for which stage is on screen; the deck, the map modal, the sub-form, and the actions bar all read it.

- **Stage deck header** (`WorkflowStageDeckHeader`) — `Step 3 of 6`, the stage name flanked by prev/next arrows, a dot track, and a list icon that opens the full map. Index math lives in `workflowStageDeck.ts` (`buildWorkflowStageDeck`), which reuses `bookingPipeline()` rather than re-deriving stage order. These arrows **only move the view**; forward is capped at the live status (`canGoNext: viewedIndex < currentIndex`), so walking right always lands back on the current stage and no separate "return to current" control is needed. A stale `viewedStep` (e.g. parking removed while viewing it) falls back to the live stage instead of hiding the navigator. Off-pipeline rows (`CANCELLED`, `IMPORTED` — anything `bookingPipeline()` doesn't contain) render a plain status card with `StatusBadge` and no deck.
- **Two markers, never conflated** — the header carries both "where the booking is" and "what the host is looking at", and each has its own channel:
  - **Color = the booking's position.** The live stage's dot wears that status's own tone (`statusToneStyle` — the same rose / yellow / teal / amber / orange / sky language as `StatusBadge` and the calendar) inside a tinted halo, and pulses for `PENDING_REVIEW`. It does not move while the host browses. The halo is sized larger than the other dots on purpose: `READY_FOR_CHECKIN`'s tone is the same teal a completed dot already uses, so hue alone cannot carry the signal.
  - **Ring + name = what is on screen.** The viewed dot takes a neutral ring, and the stage name shows a teal check when the stage is behind the live one. The ring is suppressed while the two coincide, so the resting rail shows one marker and only splits into two once the host actually navigates away.
- **Track dots are buttons** — any reached stage is one click away, so browsing no longer means walking the arrows, and each dot names itself (`Ready for Check-out — Completed`) on `aria-label`/`title`. Not-yet-reached stages render as a `role="img"` span rather than a disabled button: they are not actionable, but they still announce and still show their name on hover. Dots are a precision affordance — the 44px arrows, swipe, and the full map remain the touch paths.
- **Browsing mode** — while `viewedStep` is behind the live status, `WorkflowActionsBar` hides return/proceed and **Cancel booking**; **Mark … incomplete** and automation triggers hide for the same reason. Stage sub-forms stay **editable**; a **Save** control appears when drafts are dirty so hosts can correct pricing/settlement without opening Edit Booking. On the **live** stage, field and uploader changes **autosave** (debounced) via `useUpdateBooking` — no Save button — so the footer stays Return / Proceed / Cancel. If live autosave fails, Save reappears so the host can retry.
- **Stage slide** (`WorkflowStageSlide`) — a native-style **push**, not a fade. For one 320ms beat both stages are on screen: the departing one translates out while the arriving one slides in from the opposite edge over it. Details that matter if you touch this:
  - Both layers use the same distance (38% of the rail), duration and curve (`cubic-bezier(0.22, 0.61, 0.36, 1)`), so the gap between them stays constant and the pair reads as one strip. A sharper expo-out is ~90% finished within 100ms, which is what made the earlier version look like a fade with a nudge.
  - Motion is **pure translation with no cross-fade**. The arriving layer is opaque (`bg-card`, matching the rail) and takes `relative z-10` to beat the absolutely positioned outgoing layer in paint order. Fading both instead lets text ghost through.
  - The two layers render from **one keyed list**. Putting the outgoing stage in its own JSX slot would give it a new key and remount the whole sub-form mid-transition, re-running its effects; keyed siblings keep the departing instance alive, and handing back the identical `children` object lets React skip re-rendering it.
  - `overflow-hidden` and the opaque background are applied **only while a transition runs**, so a resting sub-form can still overflow a popover or menu.
  - Under `prefers-reduced-motion` the outgoing layer is `hidden` and the entrance does not animate, giving an instant swap.
- **Touch** — a horizontal drag tracks the finger with damping (stiffer rubber band at either end of the deck) before committing at ≥56px, so the panel advertises that it can be swiped. Gestures starting on a form control or `[data-no-swipe]` are ignored and `touch-pan-y` leaves vertical scrolling to the browser.
- **Header sync** — the step name in `WorkflowStageDeckHeader` carries a matching, smaller directional slide (`animate-stage-label-in-*`). Without it the label swaps instantly while the body slides and the two read as unrelated events. The arrows and dot track deliberately stay still — they are chrome.
- **Full progress map** (`WorkflowProgressMapModal`) — the same `BookingStepper` on demand: whole pipeline, nested sub-steps, per-step timing. Picking a step selects it and closes the modal. The stepper already marks the current stage, so the modal title carries no status badge. Its current-step node uses the same status tone as the rail's track (completed nodes stay teal with a check), so the two views never disagree about what color the live status is. The **Pending Documents** nested tree is data-driven: the property's resolved `documentRequirements` (in `order`, filtered by `requirementApplies`) plus a hardcoded Parking row appended last when `need_parking`. Each row shows a short muted approval-source hint ("Email" / "Manual"). A property with an empty requirements override shows no nested tree at all — Proceed goes straight from Pending Review to Ready for Check-in.
- **Nested document sub-steps** (`WorkflowDocStepTabs`) — Pending Documents is the one stage with children, so its sub-steps are a tab strip inside the single deck slide instead of a second navigation axis. The strip spans the rail with each tab at `flex-1`, so two steps split it in half and three split it in thirds. Each tab carries a completion icon; labels are shortened for the width (`shortDocStepLabel` strips a leading "Pending " and a trailing " Request"/" Approval") and truncate rather than overflow, with the full label plus completion state on the tab's `aria-label`/`title` (`SegmentedControlOption.ariaLabel`). The strip is hidden when only one sub-step applies. The stage opens on the **first incomplete** sub-step (`defaultPendingDocNestedKey`). After **Mark … complete**, the rail selects the next incomplete tab in order, or the first incomplete anywhere when steps were done out of order (e.g. Parking before Pet — `nextIncompletePendingDocKeyAfter`); when all are done, the active tab stays put and **Proceed to Ready for Check-in** unlocks.
- **Doc sub-step summary** (`PendingDocSubStatusCard`) — read-only GAF / pet (and other requirement) cards when that nested step has no pricing form. Three parts:
  - **Status** — row actions carry state: **Pending** (workflow amber) on missing support files and approval rows; **View** / **Approved** (primary link) on stored files. No separate step badge — the file list is the status.
  - **Grouped document list** — every **expected** file gets a row, not only the stored ones. Two bordered groups when applicable, each headed by its name and an `n of total` on-file count: **Sent Docs** (request PDF + support files) and **Pending Docs** or **Approved Docs** (signed copy back — header reads **Approved Docs** once the sub-step is marked complete). GAF/pet **request PDF** rows appear only when the property requirement has a matching `pdfTemplateId` or `id` (`hasApplicableDocumentPdfTemplate`); they show **View** when stored or **Pending** when missing. Proceed from Pending Review regenerates request PDFs; any later workflow transition while still at Pending Documents backfills a missing request PDF when the template applies. Preview links bust cache from `?v=` on the URL or `status_updated_at`. Missing templates block the transition. Support files (valid IDs, pet uploads) show **Pending** while missing. Custom GAF/pet requirements with no PDF template show only the approval group.
  - **Row actions** — stored files use the same **primary** preview link as asset controls elsewhere (`View`, or **Approved** on the approval row); missing files read **Pending** in workflow amber. Same `text-xs font-semibold` scale for both — only hue differentiates action vs outstanding.
- **Stage sub-form** (`WorkflowSubFormHost`) — pricing, parking settlement, guest balance, SD refund (plus editable guest SD refund details when unlocked), surprise-decor staff ack, depending on the viewed step. Forms are editable except on **Cancelled** / **Imported** bookings. The parking request form shows the non-refundable / no-reschedule warning at the bottom (below the downpayment-included checkbox and any separate receipt upload) only once every required field validates — including when browsing a completed parking step. Dirty drafts persist via `useUpdateBooking` (`progressSavePayloadForView`): **autosave on the live stage**, explicit **Save** while browsing earlier stages (or after a live autosave failure) — not via Edit Booking.
- **Completed stage** (`WorkflowCompletedSummaryCard`, content kind `completed_summary`) — the terminal stage has no form, so instead of an empty rail it shows a **Closing summary**: completion date (`status_updated_at`, falling back to `updated_at`, formatted in Asia/Manila), balance collected (`guestBalancePaidRecorded`, only when above zero), deposit returned (`sd_refund_amount`), and a link to the refund receipt when one was uploaded. Refund method, bank details and guest feedback are **not** repeated here — those stay on the Pricing tab's SD refund card (and remain editable by browsing back to Pending SD Refund on the rail).
- **Mark … incomplete** (`WorkflowMarkDocIncompleteAction`) — full-width neutral button with undo icon, rendered **above Automation Triggers** (below the stage sub-form) when the active pending-doc sub-step is already complete on the live step. Hidden while browsing earlier stages.
- Automation triggers (collapsible) — **Reconcile document approvals**, **Run check-out automation** (sd-refund-cron), **Resend SD refund form email**, shown only on the **live** workflow step (hidden while browsing earlier stages, and hidden when status is **Completed** or **Cancelled**) and only for the statuses where each applies.
  - Azure GAF/pet approvals arrive via **Resend inbound** (`approval-email-webhook`) — there is no Gmail poll. Reconcile re-applies stored PDFs after mark-incomplete.
- **Transition actions bar** (`WorkflowActionsBar`) — tiers, top to bottom:
  1. **Save** — only while browsing an earlier stage (or after a failed live autosave), when a progress sub-form is dirty. Persists via `useUpdateBooking` without changing status. On the live stage, drafts autosave instead — Save stays hidden so it does not compete with Proceed.
  2. A **return/proceed pair** on one axis: a bordered **Return to \<status\>** on the left and exactly one primary CTA on the right — **equal 50% width** when both show (`grid-cols-2`); either alone is full width. **Mark GAF / pet complete** opens a modal to upload or confirm the approved PDF; **Mark complete** stays disabled until a file is on file (manual upload or inbound approval). **Proceed to Ready for Check-in** stays blocked until every required sub-step has an approved file (GAF/pet) or parking settlement (parking).
  3. **Cancel booking** — full-width on a soft rose wash (rose text on a 10% rose fill, deepening on hover) below a hairline, on the **live** step only (hidden while browsing earlier stages). Eligibility is `canCancelBookingAtStatus` (`bookingStatus.ts`): Pending Review through **Ready for Check-in** only. From Ready for Check-out onward the stay has happened, so the booking is settled or refunded rather than cancelled, and the control is gone.

  While any of these mutations is in flight the **whole footer** is disabled (`actionsBusy = transitionPending || cancelPending || progressSavePending`), not just the button that was pressed — a cancel racing a transition would land the booking somewhere neither host intended. The running control keeps a spinner and `aria-busy`.

  Every transition and cancel sits behind a confirm modal: a one-line status change summary (from/to labels in **semibold**, not quoted) plus short bullets for what will happen (emails, documents saved, stay guide, and so on). Outbound emails respect **Property Settings → Email automations** — bullets only list emails that will actually send.

- Mark-complete/incomplete calls send the requirement id (or the legacy `PENDING_PARKING_REQUEST` literal for parking) as `document_completion_target`/`document_completion_clear_target` — see `useTransitionBooking.ts`. GAF/pet mark-complete is enforced server-side: `approved_gaf_pdf_url` / `approved_pet_pdf_url` must be set (upload via `upload-booking-asset` or inbound email listener) before the orchestrator accepts the completion.

The kanban workflow dialog (`variant="modal"`) keeps its existing shape: no deck, no map modal, sticky action footer.

**Pending Review gate.** While `status === PENDING_REVIEW` the panel keeps its stage deck header — step count, stage name, progress track, and the **View all steps** map stay readable — but the body and the whole actions bar are replaced by `WorkflowPendingReviewAck`: one card with an optional **Manual** / **AI check** segmented control. **Manual** shows the confirmation checkbox only. **AI check** shows **Run AI check** until a job has finished (`completed` or `failed` on `booking_ai_reviews`), then the checkbox with AI-specific ack copy — never both at once. The AI panel is a read-only review aid; it does not mark the booking reviewed. The ack is session storage keyed by booking id and stamped with `status_updated_at` (fallback `created_at`, `usePendingReviewAck`), so a server-side change that returns the booking to Pending Review asks for a fresh confirmation. In the kanban dialog (`variant="modal"`) the same card fills the body under the dialog header.

Every transition/cancel call goes through `transition-booking` / `cancel-booking`, which delegate all side effects to `_shared/workflowOrchestrator.ts` — see `.cursor/rules/booking-workflow.mdc` for the full status enum, transition graph, and side-effect matrix (never duplicated here).

---

## AI Summary & Validation

A property admin with `bookings:edit` can trigger an optional AI summary job from the booking detail page. The entry point is **AI Summary** in the booking header `⋯` menu (`bookingDetailActions.ts`).

The panel is a modal (`BookingAiSummaryPanel`): fixed header (title + one-line description of what the checks cover — no guest name, that's already in the page header) and footer; one body surface for idle, running, or results. It runs wider than the workflow modals (`~44rem` max) because result rows carry a summary sentence plus a findings list. Idle shows a short ready state with the check scope and **Run checks**; running shows the scan skeleton and **Checking…**; completed shows the section results list and **Got it** (dismisses — there is no re-run, to save tokens). A stuck first attempt still offers **Try again**. The edge function returns an existing `completed` job as-is and will not start a second pass.

**Document links in AI text** (`bookingAiDocumentLinks.ts`) — mentions of a stored file inside a summary or flag ("Guest 1 ID uploaded, but…", "not pet photo or vaccination record", "Downpayment receipt shows…") render as dotted-underline buttons that open the shared `BookingDetailAssetPreviewModal` (`onPreview` passed down from `WorkflowPanel`; the preview sits at `z-200` above the summary modal's `z-150`), so a finding can be checked against the file without leaving the modal. Matching is regex-alias based and **dynamic in two ways**: only files the booking actually has become links, and each section may only link its own documents (`bookingAiSectionDocumentRefs`) — otherwise a pets finding that says "images show payment receipts" would link the downpayment receipt. Unqualified "valid ID" links the primary ID only when it is the booking's single ID on file.

Each result row keeps three distinct type levels so the eye can scan it: section label (semibold), outcome word (small uppercase, tone-colored), summary sentence (`text-foreground`), then flags as a muted dotted list — flags are **not** badges, since pill-shaped flag text competed with the summary sentence for attention. Dot color alone carries severity (destructive / warning / muted).

The job runs **inline** on `POST booking-ai-review` (not background `waitUntil` — local serve drops that work); when the POST finishes, the UI refreshes to the section results list (**Looks good** / **Needs review** / **Action needed** from flags).

**Running state.** Mid-run polling is unreliable, so there is no progress to report and none is invented. Instead of a spinner, the modal renders the shape of the answer: the same five rows, at the same geometry, with placeholder bars where each summary and verdict will land, and a single teal beam (`animate-ai-scan`) sweeping down the list. The footer action drops its spinner for an indeterminate track (`animate-meta-sync-slide`, shared with Meta inbox sync) reading **Checking…**, and the processing chip uses a breathing dot rather than a third circular loader. Results then fade up row by row at a 45 ms stagger, so the wait resolves into the answer instead of being swapped for it. The list carries `role="status"` with an `sr-only` sentence naming the sections, so the state does not depend on motion; the global `prefers-reduced-motion` reset in `index.css` neutralizes the beam, the track, and the stagger.

- **Stay Details** — no AI; SQL clash + adjacent-booking + cleaning-window checks. Summary reads `2 nights · check-in 2:00 PM · check-out 12:00 PM.` (`formatTimeForDisplay`, never raw 24h), and the guest's **special request text itself** is carried as an `info` flag rather than a bare "Special requests noted." — the note is the useful part.
- **Guests** — one batched Gemini call on all uploaded guest ID images (slots 1–5), extracting name/age/nationality and flagging minors, non-Filipino, and mismatches vs typed data.
- **Pricing** — one Gemini call on the downpayment receipt, extracting amount and flagging total-vs-required mismatches.
- **Parking** — derived from Pricing results; no extra AI call.
- **Pets** — one batched Gemini call on pet photo + vaccination record, only when `has_pets` (same `gemini-2.5-flash` tier as other vision sections).

Provider/API failures are logged server-side only; the UI shows a short “could not be checked” note per section, never raw Gemini/Groq error text.

**Flag wording is upload-state-first.** Every document flag says whether the file is on record before saying what is wrong, via `missingFileFlag` / `uploadedFileFlag` / `uploadedNeedsReviewFlag` in `bookingAiReviewService.ts`:

| Situation                          | Flag reads                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| File absent                        | `Parking payment receipt not uploaded yet.`                                                                                |
| File present, unreadable           | `Downpayment receipt uploaded, but no amount could be read from it.`                                                       |
| File present, contradicts the form | `Guest 2 ID uploaded, but it shows age 17 while the form says 22.`                                                         |
| File present, invalid / unclear    | `Guest 1 ID uploaded, but the file is too unclear to confirm. Please review.` / `… does not look like a valid document. …` |

Invalid and unclear verdicts read as a plain host note — name the file, say what is wrong, then **Please review.** — built by `needsReviewText` (server) and mirrored client-side. No em dash and no `verdict: reason` shape; both were replaced because they read as machine output. The earlier phrasing ("Cannot verify parking amount: no receipt amount extracted") left the host unable to tell whether to chase an upload or re-read a file already on record, so the Parking section now branches on whether the downpayment receipt exists. Raw verdict codes never reach the UI: `uploadedNeedsReviewFlag` renders `invalid`/`unclear` as these notes, missing guest IDs are flagged **per guest slot** rather than as one "missing adult ID", and a pet run names whichever of pet photo / vaccination record is absent. Cached rows written with older wording — including the em-dash `uploaded — needs review: …` form and the bare "too unclear to confirm" hedge — are rewritten on display (`clarifyDocumentSubject`). The style guide sent with every prompt also bans verdict codes, em dashes, jargon, and AI self-reference so model-authored text matches.

Results are terse, plain-language notes with no hedging. Long model text is clamped on a **word boundary** with a trailing `…` (`clampSummary`) and a trailing partial sentence is dropped (`trimToLastSentence`), so a note never ends mid-word — a hard cut like "Not transaction proo" reads as a misspelling rather than a truncation. Rows persisted before word-boundary clamping are repaired on display (`repairTruncatedAiText`): a note that stops within a few characters of the old 100/120-char cut and has no terminal punctuation loses its dangling fragment and gains the `…`. Model text is rewritten on display (`clarifyDocumentSubject`) so bare "Images show…" / "Image displays…" become section-specific openings ("Pet submitted files show…", "Downpayment receipt displays…"); the same helper runs server-side before persist, and the prompt style guide bans unnamed "Image(s)". Each section shows **Looks good** (no flags), **Needs review** (warnings), or **Action needed** (blocking flags) based on its result flags — not merely whether the check finished; a check that could not run reads **Not checked**, a skipped one **Not applicable** (`resolveSectionOutcome`). From `sm` up, verdicts live in their own **ruled column** (104 px, hairline `border-l`, faint `bg-muted/30`) on the right of every row: a tinted round mark above the words, centered both ways in the row. Chips previously sat inline at the right edge of the title row, where each one started at a different x depending on its label and shared an edge with wrapping findings text — the column gives them one alignment and a hard boundary the findings never cross. Below `sm` the column would starve the findings, so the verdict falls back to an inline chip on the title row. The section's own icon (calendar, guests, car, paw, receipt) sits left of the title and the summary indents under it. `text-warning` is amber at 56% lightness and unreadable on a light tint, so the review verdict uses `text-warning-foreground` on light and `text-warning` on dark. The running skeleton mirrors the same two-column geometry (placeholder disc and bar in the gutter) so results land where the wait promised them. Each section is fingerprinted so a resumed or retried job (stuck / failed first attempt) skips AI calls when inputs haven't changed — completed jobs are never re-run. After a finished run, Overview shows **Document checks** with the per-document verdicts the job wrote. The panel is a read-only review aid; the booking is still marked reviewed via the **Pending Review** checkbox in the workflow panel.

**Template token:** `{{ai_stay_summary}}` resolves to the Stay Details summary (or `'Not yet reviewed'`) in Telegram staff/admin messages.

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
  A: No — saving changes on this page only updates the booking record. It never re-sends guest emails on its own; those only go out from the workflow actions on the right side.
- Q: The guest submitted their check-out refund form — why doesn't it show yet?
  A: The page checks for updates automatically every minute, but you can also use "Check for guest submission" to refresh right away.
- Q: Can I go back a step if I made a mistake?
  A: Yes — **Return to \<step\>** at the bottom left moves the booking to that earlier step without losing the guest's data. It always names the step you're moving to, asks you to confirm, and explains that no emails will be sent.
- Q: What do the dots under the step name mean?
  A: One dot per step, left to right. The bigger colored dot is where the booking actually is right now, in that status's own color — the same colors you see on the bookings list and calendar. Solid teal dots are steps already done, hollow ones haven't been reached. Hover any dot to see its name and state, and tap a done dot to jump straight to it.
- Q: The progress panel only shows one step now — where did the full list go?
  A: The panel shows the step you're working on so the action you need is always in view. Tap the list icon in its top-right corner for the whole checklist, including which document steps are done and when each stage started.
- Q: How do I look at an earlier step?
  A: Tap any filled dot on the row of dots, use the arrows beside the step name, swipe the panel sideways on a phone, or pick the step from the checklist. You can only look back at steps the booking has already passed, so tapping the right arrow until it stops brings you back to where the booking actually is. While you're looking at an earlier step you can still edit that step's fields and tap **Save** — Proceed and Cancel stay hidden so you don't move the booking from the wrong stage.
- Q: How do I change pricing or fees after we've already moved past review?
  A: On the current Progress step, edit the fields — they save on their own. To fix an earlier step, open it on the Progress panel (filled dots / arrows), edit, and tap **Save**. You don't need Edit Booking for pricing or settlement.
- Q: The booking is finished — what does the progress panel show now?
  A: A closing summary: the date it was completed, how much the guest settled at check-out, and how much of the deposit went back to them, plus a link to the refund receipt if you uploaded one. There are no step buttons because there is nothing left to move. To correct pricing or refund figures, tap back to that earlier step on the Progress panel and Save. The full refund details — method, bank, and the guest's feedback — are also on the Pricing tab.
- Q: The arrows by the step name and the buttons at the bottom both point left and right — what's the difference?
  A: The arrows next to the step name only change what you're looking at; nothing happens to the booking. **Return to …** and **Proceed to …** at the bottom actually move the booking, and always ask you to confirm first.
- Q: Why can't I cancel this booking?
  A: Cancelling is only available up to Ready for Check-in. Once a booking reaches Ready for Check-out the stay has already happened, so it gets finished or refunded instead of cancelled.
- Q: Where is the stay guide link?
  A: In the `⋯` menu next to **Edit booking**, as **Open stay guide** and **Copy stay guide link**. It used to sit in the progress panel, but it's something you send the guest rather than a step you work through, so it moved in with the other booking actions. It appears once the booking is Ready for Check-in or later and the link has been prepared.
- Q: Where do I replace a receipt or pet file when editing?
  A: On the matching Edit tab — downpayment receipt under Stay (not for Airbnb), guest IDs under Guests, vaccination record and pet photo under Pets when pets are on. Browse every uploaded file from the view-mode Files tab.
- Q: Where is the AI Summary & Validation button?
  A: In the `⋯` menu next to **Edit booking** as **AI Summary**.
- Q: Can I open a file straight from the AI results?
  A: Yes — file names in the AI notes (guest IDs, receipts, pet photo, vaccination record) are links. Clicking one opens the same file preview used elsewhere, on top of the summary.
- Q: Why don't I see Document checks on Overview?
  A: That card appears only after you finish an **AI Summary** run for this booking. Opening the booking never runs AI on its own — that saves tokens.
- Q: Does the AI summary replace the manual review checkbox?
  A: No — the AI panel is a read-only review aid. The manual checkbox on the **Pending Review** workflow card is still how you mark the booking as reviewed.
- Q: Can I re-run AI Summary after it finishes?
  A: No — one run per booking, to save tokens. Open the panel again to re-read the saved results; **Got it** closes it. If the first run got stuck or failed, **Try again** is still available.
- Q: Why are some sections skipped or showing "No AI needed"?
  A: Stay Details and Parking use plain SQL/math; Parking is also derived from the Pricing receipt. The Pets section only appears when the booking has pets. If a section has no input to check, it's marked skipped.
- Q: How many AI calls does a full run make?
  A: At most three: one for all present guest IDs (batched), one for the receipt, and one for pet photo + vaccination when pets are on. Unchanged fingerprints on a retry can make that zero.

---

## Implementation map

| Concern                                    | Path                                                                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                                       | `ui/src/features/dashboard/bookings/pages/BookingDetailPage.tsx`                                                                                                                        |
| View header                                | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailHeader.tsx`                                                                                                  |
| View tabs                                  | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailTabs.tsx`                                                                                                    |
| View panels                                | `ui/src/features/dashboard/bookings/components/booking-detail/panels/*.tsx` (`AiValidationPanel`, `StayDetailsPanel`, …)                                                                |
| Header actions menu                        | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailActionsMenu.tsx`, `ui/src/features/dashboard/bookings/lib/bookingDetailActions.ts`                           |
| Stay-guide link (URL + auto-issue)         | `ui/src/features/dashboard/bookings/hooks/useBookingStayGuideLink.ts`                                                                                                                   |
| AI validation collector                    | `ui/src/features/dashboard/bookings/lib/bookingAiValidations.ts`                                                                                                                        |
| AI summary action menu entry               | `ui/src/features/dashboard/bookings/lib/bookingDetailActions.ts`                                                                                                                        |
| AI summary panel                           | `ui/src/features/dashboard/bookings/components/booking-detail/BookingAiSummaryPanel.tsx`                                                                                                |
| AI text → document preview links           | `ui/src/features/dashboard/bookings/lib/bookingAiDocumentLinks.ts`                                                                                                                      |
| AI summary hooks                           | `ui/src/features/dashboard/bookings/hooks/useBookingAiReview.ts`, `ui/src/features/dashboard/bookings/hooks/useBookingAiReviewTrigger.ts`                                               |
| AI summary backend                         | `supabase/functions/_shared/bookingAiReviewService.ts`, `supabase/functions/booking-ai-review/index.ts`, `supabase/functions/get-booking-ai-review/index.ts`                            |
| Template placeholder catalog               | `ui/src/features/dashboard/bookings/lib/templatePlaceholderCatalog.ts`                                                                                                                  |
| View row/card primitives                   | `ui/src/features/dashboard/bookings/components/booking-detail/primitives/*.tsx`                                                                                                         |
| Doc preview tiles/modal                    | `ui/src/features/dashboard/bookings/components/booking-detail/BookingDocPreview.tsx`, `ui/src/features/dashboard/bookings/components/booking-detail/BookingDetailAssetPreviewModal.tsx` |
| Asset preview hook                         | `ui/src/features/dashboard/bookings/hooks/useBookingAssetPreview.ts`                                                                                                                    |
| Mobile summary                             | `ui/src/features/dashboard/bookings/components/BookingDetailMobileSummary.tsx`                                                                                                          |
| Edit form (owns useForm)                   | `ui/src/features/dashboard/bookings/components/BookingEditForm.tsx`                                                                                                                     |
| Edit tabs shell                            | `ui/src/features/dashboard/bookings/components/booking-detail/edit/BookingEditTabs.tsx`                                                                                                 |
| Edit tab fields                            | `ui/src/features/dashboard/bookings/components/booking-detail/edit/tabs/{GuestIdentityTab,StayDetailsTab,ParkingTab,PetsTab}.tsx`                                                       |
| Guest doc replace (edit)                   | `ui/src/features/dashboard/bookings/components/BookingGuestDocReplacer.tsx` (wraps `BookingCompactAssetControl`)                                                                        |
| Compact asset control (edit + Progress)    | `ui/src/features/dashboard/bookings/components/BookingCompactAssetControl.tsx`                                                                                                          |
| Edit sticky save bar                       | `ui/src/features/dashboard/bookings/components/booking-detail/edit/BookingEditStickyBar.tsx` (`BookingEditActions` shared with header)                                                  |
| Sensitive revert notice                    | `ui/src/features/dashboard/bookings/components/ReadyForCheckinSensitiveFieldsNotice.tsx`                                                                                                |
| Booking meta card                          | `ui/src/features/dashboard/bookings/components/BookingMetaCard.tsx`                                                                                                                     |
| Pay parking modal                          | `ui/src/features/dashboard/bookings/components/PayParkingModal.tsx`                                                                                                                     |
| Workflow panel                             | `ui/src/features/dashboard/bookings/components/workflow-panel/WorkflowPanel.tsx` (+ siblings in same folder)                                                                            |
| Progress form Save payload                 | `ui/src/features/dashboard/bookings/lib/bookingProgressEditPayload.ts`                                                                                                                  |
| Stage deck (rail navigator)                | `ui/src/features/dashboard/bookings/components/workflow-panel/{WorkflowStageDeckHeader,WorkflowStageSlide,WorkflowDocStepTabs,WorkflowProgressMapModal}.tsx`                            |
| Stage deck index math                      | `ui/src/features/dashboard/bookings/lib/workflowStageDeck.ts`                                                                                                                           |
| Cancel eligibility by status               | `ui/src/features/dashboard/bookings/lib/bookingStatus.ts` (`canCancelBookingAtStatus`)                                                                                                  |
| Pending-review gate                        | `ui/src/features/dashboard/bookings/components/workflow-panel/WorkflowPendingReviewAck.tsx`, `ui/src/features/dashboard/bookings/hooks/usePendingReviewAck.ts`                          |
| Detail query                               | `ui/src/features/dashboard/bookings/hooks/useBooking.ts`                                                                                                                                |
| Update mutation                            | `ui/src/features/dashboard/bookings/hooks/useUpdateBooking.ts`                                                                                                                          |
| Transition/cancel/automation mutations     | `ui/src/features/dashboard/bookings/hooks/useTransitionBooking.ts`                                                                                                                      |
| Receipt AI helpers (no page-open backfill) | `ui/src/features/dashboard/bookings/hooks/useReceiptAiBackfill.ts`                                                                                                                      |
| Revert rules                               | `ui/src/features/dashboard/bookings/lib/workflowSensitiveGuestDiff.ts`, `ui/src/features/dashboard/bookings/lib/bookingStatus.ts`                                                       |
| Configurable document requirements         | `ui/src/features/dashboard/bookings/lib/documentRequirements.ts` (types + defaults), `ui/src/features/dashboard/bookings/lib/workflow.ts` (nested-item/completion helpers, D2 skip)     |
| Property email automation toggles          | `ui/src/features/dashboard/org/components/property-settings/PropertyEmailAutomationsSection.tsx`, `ui/src/features/dashboard/org/lib/propertyEmailAutomation.ts`                        |
| Transition confirm effect copy             | `ui/src/features/dashboard/bookings/lib/workflowTransitionEffectsCopy.ts`                                                                                                               |
| Status machine + orchestrator (server)     | `supabase/functions/_shared/statusMachine.ts`, `supabase/functions/_shared/workflowOrchestrator.ts`                                                                                     |

---

## API reference

| Action                                 | Endpoint                                                             |
| -------------------------------------- | -------------------------------------------------------------------- |
| Load booking                           | Supabase `guest_submissions` select (admin session)                  |
| Save edit-form fields                  | Supabase `guest_submissions` update (admin session)                  |
| Advance/back a workflow step           | `POST transition-booking`                                            |
| Cancel booking                         | `POST cancel-booking`                                                |
| Upload/replace a guest document        | `POST upload-booking-asset`                                          |
| Manually reconcile stored GAF/pet PDFs | `POST reconcile-document-approvals`                                  |
| Manually run check-out automation      | `POST sd-refund-cron` (scoped to `{ bookingId }`)                    |
| Resend SD refund form email            | `POST send-sd-refund-form-email`                                     |
| Issue/refresh guest stay-guide link    | `POST issue-guest-stay-guide-token`                                  |
| Optional admin receipt re-validate     | `POST validate-booking-receipts` (not called from booking detail UI) |
| Trigger AI summary job                 | `POST booking-ai-review`                                             |
| Poll AI summary job                    | `GET get-booking-ai-review`                                          |

---

## Related docs

- [Bookings list](./bookings.md)
- [Route index](../../README.md)
- [`.cursor/rules/booking-workflow.mdc`](../../../../../.cursor/rules/booking-workflow.mdc) — canonical status enum, transition graph, side-effect matrix
- [`.cursor/rules/admin-auth.mdc`](../../../../../.cursor/rules/admin-auth.mdc) §5 — workflow side effects + property email automations
- [`docs/archive/planning/NEW_FLOW_PLAN.md`](../../../../archive/planning/NEW_FLOW_PLAN.md) §3.1
