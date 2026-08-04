---
title: 'Import history — operator guide'
status: active
tags: [guides, routes, org, property, import]
updated: 2026-08-05
---

# Import history — operator guide

Route: `/org/:orgSlug/property/:propertySlug/import-history`

> **Status:** Documented

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                          |
| -------------- | -------- | ---------- | ---------- | ------------------------------ |
| Batch list     | —        | —          | Documented | Paginated from edge function   |
| Revert dialog  | via API  | dry-run    | Documented | Confirms moved/modified rows   |

---

## Overview

Read-only history of CSV import batches for one property. Lets admins review past uploads and **revert** a committed batch (cancels imported bookings).

Reachable from **Import** wizard ("View past imports") or directly by URL. Same **`import:manage`** permission as the wizard — org owner/admin or explicitly granted property members.

---

## Host-facing knowledge

This page lists every CSV file you imported for this property — when it ran, how many rows, and whether it finished or was reverted.

**Common host questions**

- Q: What happens when I revert an import?
  A: Bookings from that file that are still in **Imported** status are cancelled. If you already moved some into your live workflow, the revert dialog asks whether to cancel those too.
- Q: Can I undo a revert?
  A: No — reverted batches stay marked reverted. Re-import the file if you need those bookings back.

---

## Batch list

Each row shows: original filename, status badge, row count, created date, creator email.

| Batch status | Meaning                                      |
| ------------ | -------------------------------------------- |
| `committed`  | Import finished — bookings in DB             |
| `reverted`   | Admin reverted — linked bookings cancelled   |
| `failed`     | Commit or parse failed — see batch error     |
| In-progress  | Wizard left mid-flow (`uploaded` … `previewed`) |

Data from **`import-list-batches`** (`GET ?property_id=&limit=&page=`).

---

## Revert

Available only for **`committed`** batches.

1. Admin clicks **Revert** → **`import-revert`** dry-run loads counts (`stillImported`, `moved`, `modifiedSinceImport`).
2. Dialog shows warnings for rows moved out of Imported or edited after import.
3. Optional checkbox: include moved rows in cancel.
4. Confirm → **`import-revert`** (`includeMoved` optional) transitions each target booking **`IMPORTED → CANCELLED`** (manual override, no side effects). Batch → **`reverted`**. Bookings list cache invalidates.

`imported_from_batch_id` is kept on cancelled rows for audit traceability.

---

## Permissions

Same gate as the Import wizard:

| Tier     | Permission id          | Default grant                          |
| -------- | ---------------------- | -------------------------------------- |
| Org      | `org:import:manage`    | Owner, org admin                       |
| Property | `import:manage`        | Explicit per-member grant only         |

Server: **`resolveImportAccess`** on every `import-*` endpoint.

---

## API reference

| Action        | Endpoint              |
| ------------- | --------------------- |
| List batches  | GET `import-list-batches` |
| Revert dry-run / commit | POST `import-revert` (`dryRun`, `includeMoved`) |

---

## Implementation map

| Concern        | Path                                                              |
| -------------- | ----------------------------------------------------------------- |
| Page           | `ui/src/features/dashboard/import/pages/ImportHistoryPage.tsx`    |
| Hooks          | `ui/src/features/dashboard/import/hooks/useImportBatches.ts`, `useRevertImportBatch.ts` |
| Route          | `ui/src/features/dashboard/bookings/routes/propertyRoutes.tsx` (`import-history`) |
| Access helper  | `supabase/functions/_shared/importAccess.ts`                      |
| Revert logic   | `supabase/functions/import-revert/index.ts`                       |

---

## Related docs

- [Bookings list — Import wizard](./bookings.md)
- [Route index](../../README.md)
- [Booking workflow rule](../../../../.cursor/rules/booking-workflow.mdc) — `IMPORTED` status
- [`docs/PROJECT.md`](../../../PROJECT.md)

---

## Pending / follow-ups

- [ ] Duplicate-detection warning on re-import (same email + check-in + property) — fast-follow, not in v1
