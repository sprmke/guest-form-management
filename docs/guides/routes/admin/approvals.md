# Super Admin Approvals — operator guide

Route: `/admin/approvals`

> **Status:** Documented — scaffold / empty queue

## Progress overview

| Section         | E2E save                 | Validation | Docs | Notes                     |
| --------------- | ------------------------ | ---------- | ---- | ------------------------- |
| Approvals queue | N/A (no data source yet) | —          | Done | Empty-state scaffold only |

---

## Overview

Placeholder page for a future platform-level approvals queue (e.g. org verification review, host applications). Today it renders only a header, a disabled search input, a view-mode toggle, and a permanent empty state — there is no backing API, query, or data model yet.

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`).

---

## Host-facing knowledge

This page is reserved for a future queue the platform team will use to review pending approvals. It isn't in use yet and has no effect on hosts today.

**Common host questions**

- Q: Does this page affect my organization's verification status?
  A: Not yet — organization verification review currently happens outside this page. This screen is a placeholder for a future approvals workflow.
- Q: Is there something waiting on the platform team's approval here?
  A: No — this queue is always empty right now because nothing feeds into it yet.

---

## Behavior / edge cases

- Search input is present but `disabled` — it does not filter anything because there is nothing to filter.
- The view-mode toggle (table/grid) has no effect since `SuperAdminApprovalsTable` always renders the same empty state regardless of mode.
- No pagination, sorting, or row actions exist.

---

## API reference

None — no edge function or query wired up yet.

---

## Implementation map

| Concern             | Path                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Page                | `ui/src/features/dashboard/super-admin/pages/SuperAdminApprovalsPage.tsx`                             |
| Table / empty state | `ui/src/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminApprovalsTable.tsx` |
| View toggle         | `ui/src/features/dashboard/super-admin/components/shared/SuperAdminListViewToggle.tsx`                |

---

## Related docs

- [Route index](../README.md)
- [`docs/PROJECT.md`](../../PROJECT.md)

---

## Pending / follow-ups

- [ ] Define the data source for the approvals queue (what gets queued, from where).
- [ ] Wire up list/detail/approve/reject edge functions once the data model exists.
- [ ] Enable the search input once real rows exist.
