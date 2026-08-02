---
title: 'Organization Team — operator guide'
status: active
tags: [guides, routes, org, team]
updated: 2026-08-02
---

# Organization Team — operator guide

Route: `/org/:orgSlug/team`

> **Status:** Documented (live — org team v1)

## Progress overview

| Section         | E2E save | Validation     | Docs       | Notes                                  |
| --------------- | -------- | -------------- | ---------- | -------------------------------------- |
| Stats cards     | ✓        | —              | Documented | From API member/invite counts          |
| Roles card      | —        | —              | Documented | Owner + Admin descriptions             |
| Members tab     | ✓        | —              | Documented | Search, deactivate, remove             |
| Invitations tab | ✓        | Email required | Documented | Invite, resend (email), cancel         |
| Permissions tab | —        | —              | Documented | Standard roles + org permission matrix |
| Invite dialog   | ✓        | Email required | Documented | Admin role only                        |
| Remove dialog   | ✓        | —              | Documented | Destructive confirm                    |
| RBAC            | ✓        | —              | Documented | Owner + org ADMIN                      |

---

## Overview

Organization-scoped **team management**. Members and invitations load from **`org-team-*`** edge functions via **`useOrgTeam`**.

**Summary cards** (top of page): Total Members, Owners, Admins, Pending Invites — `AdminMetricCard` / `OrgTeamStatsCards` (same shell as Finance, Bookings, Maintenance).

The **org owner** (`organizations.owner_id`) appears in the member list **virtually** (`isOwner: true`) — not stored in `organization_members`. Invited **Admins** get full access to all properties in the org (same effective permissions as owner on property routes).

Org **Settings** (profile, danger zone) remains **owner-only** on the server for v1.

---

## Host-facing knowledge

Organization **Team** is where the owner invites co-admins who can help run every property in the org. You see who has access, resend or cancel pending invites, and review what owners versus admins can do. Invites must use a Gmail address because sign-in is Google-only. The owner always appears at the top and cannot be removed from this list.

**Common host questions**

- Q: What’s the difference between Owner and Admin?
  A: Both can work across all properties and manage the team. Only the owner can change organization settings (including delete org) and add new properties. Admins handle day-to-day operations on existing listings.
- Q: Why does the invite require a Gmail address?
  A: Hosts sign in with Google. The invite email must match the Google account the person will use to accept.
- Q: Can an admin invite someone else?
  A: Yes — org admins with team manage access can invite other admins, resend invites, and remove members (except the owner).

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

| Field | Storage                                  | Validation                                                                         |
| ----- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Email | `organization_invitations.email`         | Required, trimmed; **`@gmail.com`** or **`@googlemail.com`** only (Google sign-in) |
| Phone | `organization_invitations.contact_phone` | Required PH mobile `09XXXXXXXXX`; copied to `organization_members` on accept       |
| Role  | `role_id`                                | **`ADMIN`** only (invitable)                                                       |

Name comes from the invitee's Google account on accept; edit later via **Host details** on the member row.

---

## API

| Action                         | Function                         | Method | Auth                                                                                |
| ------------------------------ | -------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| Current user org access        | `org-access?org_slug=`           | GET    | JWT — returns **`permissions[]`**, **`accessKind`**, capability flags for UI guards |
| List members (+ virtual owner) | `org-team-members?org_slug=`     | GET    | Owner, platform admin, active org ADMIN                                             |
| Update member                  | `org-team-members`               | PATCH  | `{ memberId, status? }` — manage                                                    |
| Remove member                  | `org-team-members`               | DELETE | `{ memberId }` — manage                                                             |
| List invitations               | `org-team-invitations?org_slug=` | GET    | Same as members                                                                     |
| Invite                         | `org-team-invitations`           | POST   | `{ email, contactPhone, roleId: 'ADMIN' }` — `org:team:invite`                      |
| Resend                         | `org-team-invitations`           | POST   | `{ action: 'resend', invitationId }` — `org:team:manage`                            |
| Cancel                         | `org-team-invitations`           | DELETE | `{ invitationId }` — `org:team:manage`                                              |
| Accept invite                  | `accept-org-invite`              | POST   | JWT; body `{ token }`; email must match invite                                      |

Invite email link: `/accept-invite?token=…&scope=org`. **Accept page:** org logo + org name (via **`get-team-invite-preview`**); signed-in users must tap **Accept** (no auto-accept on load). **Subject:** `{Org name} - Team Invitation`. **Body:** inviter, org name, Admin role, expiry, accept CTA. Branding/from address uses the org’s **first property** (`getFirstPropertyIdForOrg`) — same Resend shell as property invites. If create fails after Resend errors, the pending row is rolled back; use **Resend** on an existing pending invite to retry delivery. Resend API errors surface in the UI toast (not a generic message).

Auth: Bearer JWT + `verifyOrgTeamAccess` (`_shared/orgAuth.ts`). Query **`?org_id=`** or **`?org_slug=`** (UI uses `scopedOrgFunctionsUrl`).

When org access is revoked (deactivated org admin, removed member), **`RequireOrgPermission`** shows **`TenantAccessDenied`** (**No organization access**) instead of redirecting to `/org`.

---

## Database

| Table                      | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `organization_members`     | Active org admins (`role_id = 'ADMIN'`) |
| `organization_invitations` | Pending org invites (7-day TTL)         |

Migration: `supabase/migrations/20260909120000_org_team.sql`

---

## Implementation map

| Area             | Path                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Page             | `ui/src/features/dashboard/team/pages/OrgTeamPage.tsx`                                        |
| Summary cards    | `ui/src/features/dashboard/team/components/OrgTeamStatsCards.tsx` (`AdminMetricCard`)         |
| Hook             | `ui/src/features/dashboard/team/hooks/useOrgTeam.ts`                                          |
| Org access hook  | `ui/src/features/dashboard/team/hooks/useOrgPermissions.ts`                                   |
| Route guard      | `ui/src/features/dashboard/org/components/RequireOrgPermission.tsx`                           |
| Access denied UI | `ui/src/features/dashboard/org/components/TenantAccessDenied.tsx`                             |
| Edge functions   | `org-access`, `org-team-members`, `org-team-invitations`, `accept-org-invite`                 |
| Shared server    | `_shared/orgTeamService.ts`, `_shared/orgTeamPermissions.ts`, `_shared/orgTeamInviteEmail.ts` |
| Route            | `ui/src/features/dashboard/routes/index.tsx`                                                  |
| Sidebar          | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts` — Org → Team                      |
| Accept page      | `ui/src/features/dashboard/team/pages/AcceptInvitePage.tsx`                                   |

---

## Related docs

- [Property team](./property/team.md) — property-scoped roles (Manager / Staff / Viewer)
- [`docs/PROJECT.md`](../../PROJECT.md) — multi-tenancy + team RBAC

---

## Pending / follow-ups

- [ ] Org settings / danger zone access for org ADMIN (today owner-only on server)
- [ ] Transfer ownership flow
- [ ] `last_active_at` tracking for org members
