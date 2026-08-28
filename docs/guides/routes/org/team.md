---
title: 'Organization Team — operator guide'
status: active
tags: [guides, routes, org, team]
updated: 2026-08-28
---

# Organization Team — operator guide

Route: `/org/:orgSlug/team`

> **Status:** Documented (granular org hub RBAC + listing assignment)

## Progress overview

| Section           | E2E save | Validation       | Docs       | Notes                                 |
| ----------------- | -------- | ---------------- | ---------- | ------------------------------------- |
| Stats cards       | ✓        | —                | Documented | From API member/invite counts         |
| Roles / templates | ✓        | Name + perms     | Documented | Seeded + custom org hub templates     |
| Members tab       | ✓        | —                | Documented | Search, scope summary, manage, remove |
| Invitations tab   | ✓        | Email + listings | Documented | Invite, resend, cancel                |
| Permissions tab   | ✓        | Tree + CRUD      | Documented | Editable templates + matrix           |
| Invite dialog     | ✓        | Email + listings | Documented | Org tree + listing picker             |
| Manage dialog     | ✓        | —                | Documented | Contact + org perms + listings        |
| Remove dialog     | ✓        | —                | Documented | Cleans org-assigned listing rows      |
| RBAC              | ✓        | —                | Documented | Granular org leaves + listing scope   |

---

## Overview

Organization-scoped **team management** with **granular org hub permissions** and **listing assignment** (properties + parkings). Members and invitations load from **`org-team-*`** edge functions via **`useOrgTeam`**.

The **org owner** appears virtually (`isOwner: true`). Invited members get:

1. **Org hub permissions** — leaf IDs on `organization_members.permissions` (dashboard, cross-listing bookings, inventory, team, settings sections, plans view, import).
2. **Listing access** — either **All listings** (`all_listings = true`, current + future) or explicit assignments materialized as `property_members` / `parking_members` with `assigned_via_org = true`.

**Seat counting:** Org admin rows count toward org team seats; org-assigned property/parking rows do **not** add property-pool seats.

Org **delete** and **Plans checkout/downgrade** remain **owner-only** (not grantable).

**Plan gating:** Viewing the team is always free. **Invite Member** at the pooled cap opens the inline upgrade modal (`teamManagement`); **Continue to payment** goes to org Plans. Server enforces via `requireOrgTeamInviteAllowed`. Loading the members list runs seat reconciliation — excess org admins and property members are auto-deactivated with a **Plan limit** badge.

---

## Host-facing knowledge

Organization **Team** is where the owner invites co-admins who can help run every property in the org. You see who has access, resend or cancel pending invites, and review what owners versus admins can do. Invites must use a Gmail address because sign-in is Google-only. The owner always appears at the top and cannot be removed from this list.

**Common host questions**

- Q: What’s the difference between Owner and Admin?
  A: Both can work across all properties and manage the team. Only the owner can change organization settings (including delete org) and add new properties. Admins handle day-to-day operations on existing listings.
- Q: Why does the invite require a Gmail address?
  A: Hosts sign in with Google. The invite email must match the Google account the person will use to accept.
- Q: Can an admin invite someone else?
  A: Yes. Org admins with team manage access can invite other admins, resend invites, and remove members, except the owner.

---

## Roles

| Role      | Storage                                  | Access                                                                               |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| **Owner** | `organizations.owner_id`                 | Full org + all properties; cannot be removed or deactivated from Team                |
| **Admin** | `organization_members.role_id = 'ADMIN'` | Full org team management + all property modules; org settings PATCH still owner-only |

---

## Tabs

### Members

- Virtual owner row (Owner badge) — **Manage** opens host details; **Owner** role is read-only.
- Org admins: **Manage** (self or `org:team:manage`) includes contact + **Admin** role when caller can manage; deactivate / remove via actions menu.
- Search + role filter; phone shown under email when set.

### Invitations

- Pending invites with role, sent date, expiry (UI shows dates as e.g. **July 6, 2026**).
- **Resend** rotates token, refreshes expiry, sends Resend email. Failed resend restores the previous token/expiry.
- **Cancel** marks invitation `cancelled`.
- Members cannot deactivate or remove their own org ADMIN row.

### Permissions

- **Roles** card — **Owner** and **Admin** (built-in only; no org custom roles in v1).
- **Role Permissions** — Organization + Team modules (read-only reference; mirrors v1 server behavior).

#### Default org permission presets

| Permission                    | Owner | Admin |
| ----------------------------- | :---: | :---: |
| Org dashboard — view          |   ✓   |   ✓   |
| Properties — view             |   ✓   |   ✓   |
| Properties — add (create)     |   ✓   |   —   |
| Properties — manage (edit)    |   ✓   |   ✓   |
| Org settings — view / edit    |   ✓   |   —   |
| Delete organization           |   ✓   |   —   |
| Team — view / invite / manage |   ✓   |   ✓   |

Org admins receive full **property** access on all org properties (implicit; not rows in this matrix).

---

## Invite Member dialog

| Field               | Storage                                  | Validation                                                                         |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Email               | `organization_invitations.email`         | Gmail / Googlemail only                                                            |
| Phone               | `organization_invitations.contact_phone` | PH mobile                                                                          |
| Org role / template | `role_id`                                | Built-in `ADMIN` or `organization_custom_roles.id`                                 |
| Org permissions     | `permissions` JSONB                      | Granular leaf array; tree UI                                                       |
| All listings        | `all_listings`                           | Toggle — includes current + future listings                                        |
| Listing assignments | `listing_assignments`                    | When not all listings: `{ properties: [{ propertyId, roleId }], parkings: [...] }` |

Default invite mode: **Select listings** (empty until host picks). **All listings** opt-in for co-admins.

On accept, `accept-org-invite` upserts `organization_members` and calls **`syncOrgListingMemberships`** to create/update org-assigned `property_members` / `parking_members`.

---

## Manage member dialog

PATCH **`org-team-members`** with `{ memberId, displayName?, contactPhone?, roleId?, permissions?, allListings?, listingAssignments?, status? }`. Listing changes re-sync org-assigned rows. Remove deletes org-assigned property/parking memberships for that user in the org.

---

## API

| Action                            | Function                          | Method            | Auth / body                                                                     |
| --------------------------------- | --------------------------------- | ----------------- | ------------------------------------------------------------------------------- |
| Current user org access           | `org-access?org_slug=`            | GET               | JWT — `permissions[]`, `canListAllProperties`, capability flags                 |
| List members (+ virtual owner)    | `org-team-members?org_slug=`      | GET               | `org.team:view`; returns `teamInviteCapacity`                                   |
| Update member                     | `org-team-members`                | PATCH             | Permissions + listing fields; reactivate → `requireOrgTeamInviteAllowed`        |
| Remove member                     | `org-team-members`                | DELETE            | `{ memberId }` — cleans org-assigned listing rows                               |
| List invitations                  | `org-team-invitations?org_slug=`  | GET               | Same as members                                                                 |
| Invite                            | `org-team-invitations`            | POST              | `{ email, contactPhone, roleId, permissions, allListings, listingAssignments }` |
| Resend / cancel invite            | `org-team-invitations`            | POST / DELETE     | `org.team.invitations:*`                                                        |
| Accept invite                     | `accept-org-invite`               | POST              | JWT `{ token }`; syncs listing memberships                                      |
| List custom roles                 | `org-team-custom-roles?org_slug=` | GET               | `org.team:view`                                                                 |
| Create / update / delete template | `org-team-custom-roles`           | POST/PATCH/DELETE | `org.team.roles:*`                                                              |

Invite email link: `/accept-invite?token=…&scope=org`. **Accept page:** org logo + org name (via **`get-team-invite-preview`**); signed-in users must tap **Accept** (no auto-accept on load). **Subject:** `{Org name} - Team Invitation`. **Body:** inviter, org name, Admin role, expiry, accept CTA. Branding/from address uses the org’s **first property** (`getFirstPropertyIdForOrg`) — same Resend shell as property invites. If create fails after Resend errors, the pending row is rolled back; use **Resend** on an existing pending invite to retry delivery. Resend API errors surface in the UI toast (not a generic message).

Auth: Bearer JWT + `verifyOrgTeamAccess` (`_shared/orgAuth.ts`). Query **`?org_id=`** or **`?org_slug=`** (UI uses `scopedOrgFunctionsUrl`).

When org access is revoked (deactivated org admin, removed member), **`RequireOrgPermission`** shows **`TenantAccessDenied`** instead of redirecting to `/org`. Plan-limited seats (`organization_members.status = inactive`, `plan_limited = true`) return **`planLimited: true`** from **`org-access`** and show **Access paused** — contact the organization owner to upgrade the plan and restore access (full-page gate in **`OrgAdminShell`**, no sidebar chrome), with **Home** → **`/org`** (other usable org or onboarding) and **Sign out**. The member's role is saved; dashboard access stays off until a seat opens. **Plan seat banner (Members tab):** when members are paused by plan limits, a warning banner (`planLimitedTeamCopy.ts`) offers **Upgrade** (next tier, e.g. Starter when on Free at cap) and **Activate** at cap opens that flow instead of hitting **`upgradeHook`**. **Invite Member** shows a corner plan pill (`TeamInviteTierBadge`) when team seats are at cap or team management is gated. Soft-allow (no permission required): **`org-access`**, **`list-organizations`** (includes plan-limited org admins), **`list-properties`** / **`verifyOrgListAccess`** (empty property set for plan-limited org admins), and **`notifications-list`** / **`notifications-mark-read`** (empty inbox / no-op mark). Permissioned org endpoints still return **403**. **`OrgPlanLimitedGate`** must not mount **`AdminLayout`** on access errors (avoids 403 fan-out from notifications / assistant).

---

## Database

| Table                               | Purpose                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `organization_members`              | Org admins: `permissions`, `all_listings`, `listing_assignments`, `saved_permissions` |
| `organization_invitations`          | Pending invites with same permission/listing payload                                  |
| `organization_custom_roles`         | Org hub templates (Full Access, Operations, Read Only, custom)                        |
| `property_members.assigned_via_org` | Listing grant from org team — excluded from property seat pool                        |
| `parking_members.assigned_via_org`  | Same for parking                                                                      |

Migration: `supabase/migrations/20261209130000_org_team_granular_permissions.sql`

---

## Implementation map

| Area             | Path                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Page             | `ui/src/features/dashboard/team/pages/OrgTeamPage.tsx`                                                                                         |
| Summary cards    | `ui/src/features/dashboard/team/components/OrgTeamStatsCards.tsx` (`AdminMetricCard`)                                                          |
| Hook             | `ui/src/features/dashboard/team/hooks/useOrgTeam.ts`                                                                                           |
| Org access hook  | `ui/src/features/dashboard/team/hooks/useOrgPermissions.ts`                                                                                    |
| Route guard      | `ui/src/features/dashboard/org/components/RequireOrgPermission.tsx`                                                                            |
| Access denied UI | `ui/src/features/dashboard/org/components/TenantAccessDenied.tsx`                                                                              |
| Edge functions   | `org-access`, `org-team-members`, `org-team-invitations`, `org-team-custom-roles`, `accept-org-invite`                                         |
| Shared server    | `_shared/orgTeamService.ts`, `_shared/orgTeamPermissions.ts`, `_shared/orgTeamListingAssignment.ts`, `_shared/orgLegacyPermissionExpansion.ts` |
| Route            | `ui/src/features/dashboard/routes/index.tsx`                                                                                                   |
| Sidebar          | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts` — Org → Team                                                                       |
| Accept page      | `ui/src/features/dashboard/team/pages/AcceptInvitePage.tsx`                                                                                    |

---

## Related docs

- [Property team](./property/team.md) — property-scoped roles (Manager / Staff / Viewer)
- [`docs/PROJECT.md`](../../PROJECT.md) — multi-tenancy + team RBAC

---

## Pending / follow-ups

- [ ] Org settings / danger zone access for org ADMIN (today owner-only on server)
- [ ] Transfer ownership flow
- [ ] `last_active_at` tracking for org members
