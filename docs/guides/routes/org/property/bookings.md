---
title: 'Bookings List — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-17
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

1. **Mobile (`max-lg`):** brand hero with tenant switcher + **Import** icon + **New booking** icon (property scope); overlapping floating toolbar with **date range** only (same as Finance / Maintenance); layout frosted header hidden on this route.
2. **Desktop (`lg+`):** page header — **date range** (top right) + **Import** (outline) + **New booking** → `/properties/:propertySlug/form`
3. **Summary cards** — Action Required, Pending Docs, Confirmed Stays, History (Finance-style `surface-card`; count + inline status hints; click toggles `?stage=` filter)
4. **Toolbar** (`BookingFilters` in page body — always visible, matches Finance / Maintenance):
   - **Mobile (`max-lg`):** search + refine icon (opens sheet for status / more filters / sort / per-page) + view toggle
   - **Desktop (`lg+`):** **Status** · **Filters** (more only) · **search (flex)** · sort · per-page · **View**. Filters left of search; presentation controls on the right. Toolbar controls match Team height (`h-10` + `min-h-[44px]` → 44px). Status/Filters popovers omit redundant titles and use comfortable row spacing.
5. Active view content + pagination (table/card only)

---

## Host-facing knowledge

This page is your main dashboard for all bookings at this property. Summary cards group reservations by workflow stage, and you can switch between table, card, kanban, or calendar views to find and work bookings the way you prefer.

**Common host questions**

- Q: What do the summary cards at the top mean?
  A: They group bookings by where they are in your workflow: things needing your action, waiting on guest documents, confirmed upcoming stays, and past or cancelled bookings. Tap a card to filter the list.
- Q: Can I move a booking forward without opening every detail page?
  A: Yes. In kanban view you can drag bookings between columns or click a card to open a quick workflow panel with the same actions as the full booking page.
- Q: How do I create a new booking?
  A: Use **New booking** in the page header. It opens the guest booking form for this property.
- Q: Can I bulk-import bookings from a spreadsheet?
  A: Yes. Use **Import** beside **New booking** (property bookings only). Upload a CSV or Excel file (or download your Google Sheet as Excel/CSV first), confirm column mapping, then review the rows. Select **Need fixing** to see problem rows; **Fix** opens the complete row so you can correct every invalid value together. **Skipped** rows stay openable the same way, so use **Restore** to bring them back, or **Fix** to correct them. Imported bookings start in **Imported** status and don't trigger new-booking emails or calendar events.

---

## CSV import (modal wizard)

**Gated:** org owner/admin, or property team members explicitly granted **`import:manage`**. Hidden at org-wide bookings scope.

**Entry:** **Import** button in the page header (desktop) or hero icon (mobile). Opens `ImportWizardModal` — no route change. Target property is fixed from the current page context (no property picker).

**Steps:**

1. **Upload** — CSV or Excel (`.csv`, `.xlsx`, `.xls`), max 2,000 rows / 15 MB. Calls `import-parse-file` (CSV via PapaParse; Excel via SheetJS, **first worksheet only**). File is held in storage until commit or cancel. **Continue** stays disabled until the file parses successfully; no toast on success. **Back** from later steps returns here with the same file — use **Replace** to pick a different file.
   - **Google Sheets:** not a native upload — in Sheets use **File → Download → Microsoft Excel (.xlsx)** or **CSV**, then upload that file.
   - **Download template** first opens a short confirmation explaining that existing CSV or spreadsheet files can be uploaded as-is because column matching is automatic. **Download template** confirms and builds a CSV client-side (`lib/importCsvTemplate.ts`); **Cancel** returns to Upload. The file has one header row of 21 canonical columns (starting with `guest_display_name`, which commits to DB column `guest_facebook_name`) plus one example row showing the expected date (`YYYY-MM-DD`), time (`HH:mm`), and yes/no shapes. It must stay uploadable as-is — no note lines and no second table, or every row's column count disagrees with the header and the upload fails. Legacy header `guest_facebook_name` still auto-maps.
   - **QA fixtures:** run `node scripts/dev/generate-import-booking-fixtures.mjs` — writes scenario CSVs and matching `.xlsx` samples under `temp/import-booking/` (gitignored; see README there).
   - **Parse tolerance:** a UTF-8 BOM is stripped, blank lines are skipped, and ragged rows (a trailing note, a short row, an over-wide row) are accepted — they arrive as fixable rows in Preview instead of rejecting the file. Only unparseable input (e.g. an unterminated quoted field) aborts the upload.
2. **Match** — AI suggests column → field matches (`import-ai-map-columns`). The same step uses the Preview-style clickable summary cards, ordered **Matched** then **Need input**. It auto-selects Need input whenever unresolved columns exist; otherwise it selects Matched. Need input shows every ambiguous/unmatched header with sample values and a booking-field selector; Matched shows the confirmed source → target pairs. Works without AI keys (all columns appear under Need input). Continue stays on this four-step flow, requires every mandatory booking field to be mapped, then persists the complete mapping with `import-save-mapping`.
3. **Preview** — row validation errors (blocking) vs property mismatch warnings (non-blocking). The Ready / Need fixing / Skipped / Warnings summary cards are the filters. Entering the step auto-selects **Need fixing** when any error rows exist, otherwise **Ready**; if the host clears the error queue while Need fixing is selected, it switches to Ready. Select the active card again to show all. The Issue column has a fixed readable width and shows the field, reason, and quoted bad value. **Fix** opens a row editor at the same desktop width as the import wizard: **Row details** are on the left and all blocking **Fields to fix** are on the right; invalid fields remain visible in Row details using their original bad value and red text, while missing invalid values appear as `—`. Client validation runs on every edit. The primary **Fix** action stays disabled until every flagged value is valid, then `import-update-row` `{ fieldValues }` patches `raw_data` and re-validates server-side. **Skip** leaves a row out of the import (matching the **Skipped** status) and keeps its validation issues so the row stays reviewable. Skip and Fix use equal minimum widths. **Skipped** rows stay clickable (row or **Fix**) and open the same editor titled **Skipped row N** with **Restore** + **Fix** instead of Skip + Fix; Restore calls `import-update-row` `{ validationStatus: 'valid' }` and re-validates — a row that comes back still invalid moves to Need fixing and toasts that it needs fixing. A skipped row with no blocking issues shows Restore alone as the primary action. The editor's queue and its Skip/Restore mode are fixed when it opens: opening from Need fixing walks the error rows, opening from Skipped walks the skipped rows, and Prev/Next stay available in both. Acting on a row drops it from that queue and moves to the next one in it; the editor never switches queues mid-session and closes once the queue it opened with is empty. Ready rows use the **Import** switch. Phone: stacked cards + bottom sheet; tablet+: table + dialog.
4. **Commit** — a compact summary shows how many bookings are ready and how many rows are not included. Under it, the host reviews only the rows that will be created in a paginated table: source row number, guest, check-in, check-out, total guests (adults + children), and booking rate. Ten rows render at a time; phone layouts use compact stacked rows with the same information. The review reads from the existing Preview cache and makes no extra API request. Email and calendar side-effect details are intentionally omitted from this screen to avoid confusion. `import-commit` inserts rows with **`status = IMPORTED`** and **`imported_from_batch_id`**; no email/calendar/PDF side effects. Success toast + list refresh.

**Leave / discard:** Closing the wizard (X, Escape, overlay) after a file is parsed asks for confirm (**Leave this import?**). **Discard import** runs `import-cancel` (deletes batch + storage) and closes; **Keep working** or Escape dismisses only the confirm and returns to the current step. Both dismiss paths are blocked while a network action is in flight.

**Manual override after commit:** from booking detail, admin can move **`IMPORTED → PENDING_REVIEW`** or **`IMPORTED → CANCELLED`** (manual-only).

**Filters:** **Imported** appears in the status filter and **History** stage card (`?stage=history`). Imported rows are excluded from Action Required, SD-refund cron, and guest calendar availability.

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
- **Click** a card or **drop** on a valid column → opens **workflow modal** with stage-specific forms and actions only (no progress stepper — kanban column is the pipeline). Uses `WorkflowPanel` `variant="modal"`, which swaps its body for the Pending Review confirmation card while the booking sits on that status. Forms use `WorkflowFormShell` `variant="modal"` (no nested sub-form card). Dropping on **GAF / Parking / Pet** from **Pending Review** is valid when **Proceed to Pending Documents** would place the booking on that sub-step (there is no separate Docs column).
- Invalid drops show “Cannot drop here”; valid drops open the modal so the admin completes transitions with the same forms and confirm flow as `/bookings/:bookingId` (automation triggers stay on the detail page).
- **Open booking** outline button in the modal header opens the full detail page in a new tab.
- Drag-drop does **not** auto-transition without going through the workflow panel.

---

## Filters & query params

Existing params unchanged: `q`, `status`, `from`, `to`, `hasPets`, `needParking`, `sort`, `page`, `limit`, `view`.

`from` / `to` filter on **check-in date** and apply to **every status** — navigating to a month with no check-ins shows an empty list. (Pending Review rows used to be exempt so new submissions were never hidden; that made month navigation look broken and was removed.) No range is applied until the host picks one, so the default landing view still lists all active bookings.

`showCompletedBookings` remains supported for calendar/kanban (auto-enabled in those views); there is no UI toggle — use the **History** stage card or status filter for completed rows.

New: `stage` (see above).

---

## API

- `list-bookings` edge function — admin JWT; see [[PROJECT|Guest Form Management — Project Documentation]] API table.
- CSV import: `import-parse-file`, `import-ai-map-columns`, `import-save-mapping`, `import-preview`, `import-update-row`, `import-commit`, `import-cancel` — all require **`import:manage`** (or org owner/admin) + `?property_id=`.

---

## Implementation map

| Concern               | Path                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| Page                  | `ui/src/features/dashboard/bookings/pages/BookingsListPage.tsx`                |
| Import wizard modal   | `ui/src/features/dashboard/import/components/ImportWizardModal.tsx`            |
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
