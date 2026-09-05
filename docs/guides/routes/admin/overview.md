---
title: 'Super Admin Overview — operator guide'
status: active
tags: [guides, routes, admin]
updated: 2026-09-04
---

# Super Admin Overview — operator guide

Route: `/admin`

> **Status:** Documented

## Progress overview

| Section         | E2E save         | Validation | Docs | Notes                                                                                              |
| --------------- | ---------------- | ---------- | ---- | -------------------------------------------------------------------------------------------------- |
| KPI strip       | Done (read-only) | —          | Done | 8–9 `StatCard`s, most linking to the matching list page; platform-wide exact counts                |
| Charts          | Done (read-only) | —          | Done | Growth area (12 mo, Total/New toggle) · Plan-mix donut · AI-cost-by-feature bar                    |
| Attention queue | Done (read-only) | —          | Done | Approvals in review · open tickets · undisbursed payouts · orgs with no live plan — links to lists |
| Recent activity | Done (read-only) | —          | Done | Latest orgs / subscription changes / support tickets                                               |
| Range toggle    | n/a              | —          | Done | 30d / 90d / 12mo — scopes the AI-spend KPI + AI-cost chart                                         |
| Sidebar nav     | n/a              | —          | Done | Grouped into labelled sections (`SUPER_ADMIN_NAV_GROUPS`) below a header-less Overview link        |

> Tracked by [`docs/workflow/in-progress/super-admin-console-overhaul.md`](../../../workflow/in-progress/super-admin-console-overhaul.md).

---

## Overview

Landing page for the **platform super-admin** area — a distinct tier from org/property admin and from the legacy `ADMIN_ALLOWED_EMAILS` gate. It is a **data dashboard**: the `super-admin-overview` edge function (`?range=30d|90d|12mo`) returns KPI rollups, a 12-month org/subscription growth series, live plan mix, AI cost by feature, an attention queue, and recent activity. A condensed "Jump to" grid at the bottom still mirrors the sidebar destinations.

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

## Navigation

Both the Overview card grid and the Platform sidebar are driven by `SUPER_ADMIN_NAV_GROUPS`
(`superAdminPlatformNav.ts`). The sidebar renders **Overview** (`/admin`, no group heading) then
each group as a labelled section:

| Group             | Items → destination                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organizations     | Hosts `/admin/hosts` · Developments `/admin/developments` · Properties `/admin/properties`                                                                                          |
| Billing & catalog | Pricing plans `/admin/pricing/plans` · Subscriptions `/admin/pricing/subscriptions` · Payment settings `/admin/pricing/payment-settings` · Parking payouts `/admin/parking/payouts` |
| Operations        | Approvals `/admin/approvals` · Support tickets `/admin/support`                                                                                                                     |
| Content           | Announcements `/admin/announcements` · FAQs `/admin/support/faqs`                                                                                                                   |
| Platform          | AI Management `/admin/settings`                                                                                                                                                     |

`SUPER_ADMIN_PLATFORM_DESTINATIONS` (flat, group order) is still exported for the "Jump to" card
grid and future global search. Group headings are hidden when the sidebar is collapsed.

---

## API reference

| Method | Endpoint                         | Notes                                                                                                                                      |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `super-admin-overview?range=30d` | `range` = `30d` \| `90d` \| `12mo`. Returns `kpis`, `growthSeries`, `planMix`, `aiCostByFeature`, `attention`, `recent`. Super-admin only. |

---

## Implementation map

| Concern       | Path                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------ |
| Page          | `ui/src/features/dashboard/super-admin/pages/SuperAdminOverviewPage.tsx`                   |
| Components    | `ui/src/features/dashboard/super-admin/components/super-admin-overview/*`                  |
| Hook          | `ui/src/features/dashboard/super-admin/hooks/useSuperAdminOverview.ts`                     |
| Edge function | `supabase/functions/super-admin-overview/index.ts`                                         |
| Shared nav    | `ui/src/features/dashboard/super-admin/lib/superAdminPlatformNav.ts`                       |
| Sidebar       | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts` (`buildSuperAdminNavSections`) |
| Shell / guard | `SuperAdminShell.tsx` / `RequireSuperAdmin.tsx`                                            |
| Paths         | `ui/src/features/dashboard/super-admin/lib/superAdminPaths.ts`                             |
| Routes        | `ui/src/features/dashboard/super-admin/routes/index.tsx`                                   |

---

## Related docs

- [Route index](../README.md)
- [`docs/PROJECT.md`](../../PROJECT.md)
- [`.cursor/rules/admin-auth.mdc`](../../../../.cursor/rules/admin-auth.mdc) — legacy admin tier this super-admin tier is layered on top of

---

## Pending / follow-ups

- [ ] MRR / revenue trend chart (needs subscription-event history, not just current snapshots).
- [ ] Audit-log feed once super-admin action logging lands (Phase 6 backlog).
- [ ] Global ⌘K search over orgs / hosts / properties / tickets.
