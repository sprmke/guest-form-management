---
title: 'Bookings List — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-05
---

# Bookings List — operator guide

Route: `/org/:orgSlug/property/:propertySlug/bookings`

> **Status:** Documented

## Progress overview

| Section                       | E2E save  | Validation | Docs | Notes                                                             |
| ----------------------------- | --------- | ---------- | ---- | ----------------------------------------------------------------- |
| Summary stage cards           | —         | —          | Done | Finance-style cards; status hints inline; click toggles `?stage=` |
| Filter bar                    | —         | —          | Done | Mobile: search + refine sheet + view; desktop: inline filters     |
| Table / card / calendar views | —         | —          | Done | Existing behavior                                                 |
| Kanban view                   | via modal | —          | Done | Reuses `WorkflowPanel` from detail page                           |
| CSV import (modal wizard)     | via modal | server     | Done | Property-scoped; gated on `import:manage`                         |
| Mobile shell                  | —         | —          | Done | Brand hero + overlap filters (`max-lg` only)                      |

---

## Overview

Paginated booking list with PMA-style **stage summary cards** and four view modes: **table**, **card**, **kanban**, **calendar**.

Layout (top → bottom):

1. **Mobile (`max-lg`):** brand hero with tenant switcher + **Import** icon + **New booking** icon (property scope); overlapping floating toolbar with date range (property scope) + filters; layout frosted header hidden on this route.
2. **Desktop (`lg+`):** page header — **date range** (top right) + **Import** (outline) + **New booking** → `/properties/:propertySlug/form`
3. **Summary cards** — Action Required, Pending Docs, Confirmed Stays, History (Finance-style `surface-card`; count + inline status hints; click toggles `?stage=` filter)
4. **Toolbar** (`BookingFilters`):
   - **Mobile (`max-lg`):** search + refine icon (opens sheet for status / more filters / sort / per-page) + view toggle. Date range stays above when shown.
   - **Desktop (`lg+`):** Row 1: search + Status + More filters + Clear; Row 2: sort + per-page | view toggle
5. Active view content + pagination (table/card only)

---

## Host-facing knowledge

This page is your main dashboard for all bookings at this property. Summary cards group reservations by workflow stage, and you can switch between table, card, kanban, or calendar views to find and work bookings the way you prefer.

**Common host questions**

- Q: What do the summary cards at the top mean?
  A: They group bookings by where they are in your workflow — things needing your action, waiting on guest documents, confirmed upcoming stays, and past or cancelled bookings. Tap a card to filter the list.
- Q: Can I move a booking forward without opening every detail page?
  A: Yes — in kanban view you can drag bookings between columns or click a card to open a quick workflow panel with the same actions as the full booking page.
- Q: How do I create a new booking?
  A: Use **New booking** in the page header — it opens the guest booking form for this property.
- Q: Can I bulk-import bookings from a spreadsheet?
  A: Yes — use **Import** beside **New booking** (property bookings only). Upload a CSV, confirm column mapping, preview rows, then commit. Imported bookings start in **Imported** status and do not trigger new-booking emails or calendar events.
- Q: Where can I see files I imported before?
  A: Open **Import**, then **Past imports**. It lists every file with its date, row count, and status, and lets you revert a finished import.
- Q: What happens when I revert an import?
  A: Bookings from that file still in **Imported** status are cancelled. If you already moved some into your live workflow, the revert dialog asks whether to cancel those too.

---

## CSV import (modal wizard)

**Gated:** org owner/admin, or property team members explicitly granted **`import:manage`**. Hidden at org-wide bookings scope.

**Entry:** **Import** button in the page header (desktop) or hero icon (mobile). Opens `ImportWizardModal` — no route change. Target property is fixed from the current page context (no property picker).

**Steps:**

1. **Upload** — CSV only, max 2,000 rows / 15 MB. Calls `import-parse-file`. File is held in storage until commit or cancel.
   - **Download template** builds the file client-side (`lib/importCsvTemplate.ts`): one header row of 21 canonical columns plus one example row showing the expected date (`YYYY-MM-DD`), time (`HH:mm`), and yes/no shapes. It must stay uploadable as-is — no note lines and no second table, or every row's column count disagrees with the header and the upload fails.
   - **Parse tolerance:** a UTF-8 BOM is stripped, blank lines are skipped, and ragged rows (a trailing note, a short row, an over-wide row) are accepted — they arrive as fixable rows in Preview instead of rejecting the file. Only unparseable input (e.g. an unterminated quoted field) aborts the upload.
2. **Match** — AI suggests column → field matches (`import-ai-map-columns`). Works without AI keys (all columns manual). When every header matched, **Columns** is skipped and the header progress bar drops to 4 segments so the count stays honest.
3. **Columns** — resolve ambiguous/unmatched headers; Continue blocked until all required booking fields are mapped; `import-save-mapping`.
4. **Preview** — row validation errors (blocking) vs property mismatch warnings (non-blocking); **Import** switch per row via `import-update-row`. Phone uses stacked cards; tablet+ uses a table.
5. **Commit** — `import-commit` inserts rows with **`status = IMPORTED`** and **`imported_from_batch_id`**; no email/calendar/PDF side effects. Success toast + list refresh.

**Leave / discard:** Closing the wizard (X, Escape, overlay) after upload asks for confirm, then `import-cancel` deletes batch + storage. Dismiss is blocked while a network action is in flight. Closing via **Past imports** also cancels any leftover uncommitted batch.

**Manual override after commit:** from booking detail, admin can move **`IMPORTED → PENDING_REVIEW`** or **`IMPORTED → CANCELLED`** (manual-only).

**Filters:** **Imported** appears in the status filter and **History** stage card (`?stage=history`). Imported rows are excluded from Action Required, SD-refund cron, and guest calendar availability.

---

## Import history (modal)

**Entry:** **Past imports** inside `ImportWizardModal` (upload step). Opens `ImportHistoryModal` as a sibling modal — no route, no URL change. Its **Back** action reopens the wizard. Same `import:manage` gate as the wizard.

Batch rows list original filename, status badge, row count, created date, creator email. Data from **`import-list-batches`** (`GET ?property_id=&limit=&page=`); the query only runs while the modal is open. Paginated (20 per page) when history is long.

| Batch status | Meaning                                         |
| ------------ | ----------------------------------------------- |
| `committed`  | Import finished, bookings in DB                 |
| `reverted`   | Admin reverted, linked bookings cancelled       |
| `failed`     | Commit or parse failed, see batch error         |
| In-progress  | Wizard left mid-flow (`uploaded` … `previewed`) |

**Revert** (only for `committed` batches):

1. **Revert** → `import-revert` dry-run loads counts (`stillImported`, `moved`, `modifiedSinceImport`).
2. Dialog warns about rows moved out of Imported or edited after import; optional checkbox includes moved rows.
3. Confirm → `import-revert` transitions each target booking **`IMPORTED → CANCELLED`** (manual override, no side effects). Batch → `reverted`; bookings list cache invalidates.

`imported_from_batch_id` is kept on cancelled rows for audit traceability. Reverts cannot be undone; re-import the file instead.

---

## Stage summary cards

Click a card to filter the list (table, card, kanban, calendar). Click again to clear.

| Card            | Label                                      | Statuses included                                                                    |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Action Required | Action Required                            | `PENDING_REVIEW`, `READY_FOR_CHECKOUT`, `PENDING_SD_REFUND`                          |
| Pending Docs    | **Pending Docs** (not “Awaiting Response”) | `PENDING_DOCUMENTS`, `PENDING_GAF`, `PENDING_PARKING_REQUEST`, `PENDING_PET_REQUEST` |
| Confirmed Stays | Confirmed Stays                            | `READY_FOR_CHECKIN`                                                                  |
| History         | History                                    | `COMPLETED`, `CANCELLED`, `IMPORTED`                                                 |

**URL:** `?stage=action_required|pending_docs|confirmed|history` (omit for all).

Counts come from a secondary list fetch (same date range, up to 100 rows, includes completed).

When a stage is active, the list query sends the matching `status[]` values to `list-bookings` (intersected with manual status filters when compatible; otherwise stage wins).

---

## Views

| View     | URL               | Notes                                                                                               |
| -------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| Table    | default (desktop) | `BookingTable`                                                                                      |
| Card     | `?view=card`      | Mobile default                                                                                      |
| Kanban   | `?view=kanban`    | Last view toggle; reuses card styling (`GuestAvatar`, flags, `StatusBadge` columns); workflow modal |
| Calendar | `?view=calendar`  | Month grid; `limit=100`, `showCompletedBookings=true`                                               |

---

## Kanban

- Columns follow workflow order: Pending Review → GAF / Parking / Pet → Ready for Check-in → Ready for Check-out → Pending SD Refund → Completed. There is **no** separate **Pending Documents** column — bookings with `status = PENDING_DOCUMENTS` appear in the first incomplete nested step (GAF, then parking, then pet; all complete → Ready for Check-in). **Cancelled** bookings are omitted from the board.
- **Click** a card or **drop** on a valid column → opens **workflow modal** with stage-specific forms and actions only (no progress stepper — kanban column is the pipeline). Uses `WorkflowPanel` `variant="modal"` + `PendingReviewWorkflowGate` `layout="inline"`. Forms use `WorkflowFormShell` `variant="modal"` (no nested sub-form card). Dropping on **GAF / Parking / Pet** from **Pending Review** is valid when **Proceed to Pending Documents** would place the booking on that sub-step (there is no separate Docs column).
- Invalid drops show “Cannot drop here”; valid drops open the modal so the admin completes transitions with the same forms and dev controls as `/bookings/:bookingId` (automation triggers stay on the detail page).
- **Open booking** outline button in the modal header opens the full detail page in a new tab.
- Drag-drop does **not** auto-transition without going through the workflow panel.

---

## Filters & query params

Existing params unchanged: `q`, `status`, `from`, `to`, `hasPets`, `needParking`, `sort`, `page`, `limit`, `view`.

`showCompletedBookings` remains supported for calendar/kanban (auto-enabled in those views); there is no UI toggle — use the **History** stage card or status filter for completed rows.

New: `stage` (see above).

---

## API

- `list-bookings` edge function — admin JWT; see [[PROJECT|Guest Form Management — Project Documentation]] API table.
- CSV import: `import-parse-file`, `import-ai-map-columns`, `import-save-mapping`, `import-preview`, `import-update-row`, `import-commit`, `import-cancel` — all require **`import:manage`** (or org owner/admin) + `?property_id=`.
- Import history: `import-list-batches` (GET), `import-revert` (POST, `dryRun` / `includeMoved`) — same gate. Server helper: `supabase/functions/_shared/importAccess.ts`.

---

## Implementation map

| Concern               | Path                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| Page                  | `ui/src/features/dashboard/bookings/pages/BookingsListPage.tsx`                |
| Import wizard modal   | `ui/src/features/dashboard/import/components/ImportWizardModal.tsx`            |
| Import history modal  | `ui/src/features/dashboard/import/components/ImportHistoryModal.tsx`           |
| Shared modal chrome   | `ui/src/features/dashboard/import/components/ImportModalChrome.tsx`            |
| Import hooks / types  | `ui/src/features/dashboard/import/hooks/`, `lib/`, `types/`                    |
| Stage mapping         | `ui/src/features/dashboard/bookings/lib/bookingStages.ts`                      |
| Summary cards         | `ui/src/features/dashboard/bookings/components/BookingsSummaryCards.tsx`       |
| Kanban board          | `ui/src/features/dashboard/bookings/components/BookingKanban.tsx`              |
| Kanban workflow modal | `ui/src/features/dashboard/bookings/components/BookingKanbanWorkflowModal.tsx` |
| Workflow (reused)     | `ui/src/features/dashboard/bookings/components/WorkflowPanel.tsx`              |
| Filters               | `ui/src/features/dashboard/bookings/components/BookingFilters.tsx`             |
| Mobile page shell     | `ui/src/components/mobile/MobileBrandHero.tsx` (`AdminMobilePage`)             |
| Routes                | `ui/src/features/dashboard/routes/index.tsx`                                   |

---

## Related docs

- [Booking detail](./bookings-detail.md)
- [Route index](../../README.md)
- [Booking workflow rule](../../../../.cursor/rules/booking-workflow.mdc)
- [`docs/PROJECT.md`](../../../PROJECT.md)
