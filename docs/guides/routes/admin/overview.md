# Super Admin Overview — operator guide

Route: `/admin`

> **Status:** Documented

## Progress overview

| Section       | E2E save         | Validation | Docs | Notes                          |
| ------------- | ---------------- | ---------- | ---- | ------------------------------ |
| Overview grid | Done (read-only) | —          | Done | Static link cards, no API call |

---

## Overview

Landing page for the **platform super-admin** area — a distinct tier from org/property admin and from the legacy `ADMIN_ALLOWED_EMAILS` gate. It renders four navigation cards (Developments, Properties, Approvals, Hosts) and makes no API calls of its own; all data lives on the destination pages.

**Access:** `RequireSuperAdmin` — email must be in `SUPER_ADMIN_EMAILS` (server) / `VITE_SUPER_ADMIN_EMAILS` (client UX gate). Uses the same signed-in session as the legacy admin dashboard (`useAdminSession`), so a super admin must already be signed in via Google OAuth; being super admin does not require being in `ADMIN_ALLOWED_EMAILS`.

---

## Host-facing knowledge

The Super Admin area is an internal control panel for the platform team — it is not visible to hosts, organizations, or guests, and hosts never need to know it exists.

**Common host questions**

- Q: I run a property — can I see this page?
  A: No. This area is only for the platform team that operates the booking system itself, not for hosts or their staff.
- Q: Does anything here affect my organization's settings?
  A: Only if the platform team makes a change on your behalf (for example, listing your property under a development). Your own organization, property, and team settings are managed from your regular dashboard.

---

## Navigation cards

| Card         | Destination           |
| ------------ | --------------------- |
| Developments | `/admin/developments` |
| Properties   | `/admin/properties`   |
| Approvals    | `/admin/approvals`    |
| Hosts        | `/admin/hosts`        |

---

## API reference

None — static navigation only.

---

## Implementation map

| Concern | Path                                                                     |
| ------- | ------------------------------------------------------------------------ |
| Page    | `ui/src/features/dashboard/super-admin/pages/SuperAdminOverviewPage.tsx` |
| Shell   | `ui/src/features/dashboard/super-admin/components/SuperAdminShell.tsx`   |
| Guard   | `ui/src/features/dashboard/super-admin/components/RequireSuperAdmin.tsx` |
| Paths   | `ui/src/features/dashboard/super-admin/lib/superAdminPaths.ts`           |
| Routes  | `ui/src/features/dashboard/super-admin/routes/index.tsx`                 |

---

## Related docs

- [Route index](../README.md)
- [`docs/PROJECT.md`](../../PROJECT.md)
- [`.cursor/rules/admin-auth.mdc`](../../../../.cursor/rules/admin-auth.mdc) — legacy admin tier this super-admin tier is layered on top of

---

## Pending / follow-ups

- [ ] None known — page is intentionally minimal.
