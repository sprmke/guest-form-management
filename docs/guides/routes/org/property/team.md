---
title: 'Property Team — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-24
---

# Property Team — operator guide

Route: `/org/:orgSlug/property/:propertySlug/team`

> **Status:** Documented (live — property team module complete; org-level team deferred)

## Progress overview

| Section                 | E2E save | Validation     | Docs       | Notes                                                     |
| ----------------------- | -------- | -------------- | ---------- | --------------------------------------------------------- |
| Stats cards             | ✓        | —              | Documented | From API member/invite counts                             |
| Members tab             | ✓        | —              | Documented | List, role change, activate/deactivate, remove            |
| Invitations tab         | ✓        | Email required | Documented | Invite, resend (email), cancel via API                    |
| Permissions tab         | ✓        | —              | Documented | Custom roles CRUD via API                                 |
| Invite dialog           | ✓        | Email required | Documented | Role dropdown includes **Add Custom Role**                |
| Edit permissions dialog | ✓        | —              | Documented | Role + permission overrides                               |
| Remove dialog           | ✓        | —              | Documented | Destructive confirm                                       |
| RBAC contract           | —        | —              | Documented | Server mirror + migration                                 |
| Team edge functions     | ✓        | —              | Documented | UI wired via `usePropertyTeam`                            |
| RBAC enforcement        | ✓        | —              | Documented | `property-access` + sidebar/route guards + edge functions |

---

## Overview

Property-scoped **team management**. Members, invitations, and custom roles load from edge functions; mutations invalidate TanStack Query cache.

Org owner and org admins appear in the member list **virtually** (`fromOrg: true`) — not stored in `property_members`. Org-level team lives at `/org/:orgSlug/team`.

---

## Host-facing knowledge

Team is where you invite people to help run this property and control what they can see or do: managers with broad access, staff focused on bookings and maintenance, or view-only members. You can also create custom roles with specific permissions.

**Common host questions**

- Q: What's the difference between Manager and Staff?
  A: Managers can access finance, settings, team management, and notifications editing. Staff can handle bookings and maintenance day-to-day but can't invite team members or change property settings.
- Q: How do invites work?
  A: Enter their Gmail address (they sign in with Google), choose a role, and they'll get an email link valid for seven days to accept and join this property.
- Q: Can organization owners see my property team list?
  A: Yes. Organization owners and admins show up in the member list automatically with full access, even though they aren't stored as separate property members.
- Q: What happens to my team members if I downgrade my plan?
  A: Nothing is deleted. If your new plan supports fewer members than you currently have active, the most recently added ones are automatically disabled — marked "Plan limit" — until you're back within your plan's limit. Their roles and permissions are saved, not erased. Upgrading again automatically re-enables them, oldest first, with no extra work on your end.

**Plan gating:** Viewing the team is always free. **Send Invitation** is gated by `teamManagement.enabled` and `teamManagement.maxMembers` (active members + pending invites + the owner + any org-level admins with implicit access — all count toward the cap on both client and server). **Free is capped at 1** (the owner alone — same mechanism as every paid tier's cap, not a separate "disabled" state, so the owner already occupies the one slot and any invite attempt hits the at-limit path); Starter/Pro/Business/Managed/Commission raise the cap (see `docs/architecture/plans-feature-matrix.md`). Over the cap navigates to **org Plans & Billing** with review pre-opened (`?feature=teamManagement`) instead of calling `property-team-invitations`; server enforces the same count via **`requireTeamInviteAllowed`**. Client uses **`useFeatureGate` → `canUse`** (fail-closed while entitlements load). The **Team** page title shows a solid `TierBadge` when the property isn't yet entitled to invite beyond the Free cap. **Manually re-activating** an existing inactive member hits the same cap check — it's blocked with an upgrade prompt if it would push the property over budget, not just invite.

**Downgrade / expiration:** if a plan change (downgrade, a lapsed subscription auto-suspending after nonpayment, or being added to/removed from an org portfolio bundle) drops the seat budget below the number of currently active members, the newest-assigned members are **automatically deactivated** (never removed) until the property is back within budget — same as a manual deactivate (permissions stashed, restorable), just server-triggered. These rows show a **"Plan limit"** badge instead of the plain "Disabled" one, and a banner above the member list offers **Upgrade** whenever 1+ members are in that state. Upgrading later (or an admin freeing a seat by deactivating someone else) automatically restores the longest-waiting plan-limited members first, oldest to newest, up to the new budget — no host action required. A member an admin deactivated on purpose is never touched by this and never auto-restored.

---

## RBAC contract (finalized)

### Access kinds

| Kind                | How resolved                                             | Permissions                                        |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| **Org owner**       | `organizations.owner_id = auth.uid()`                    | Full catalog (implicit; no `property_members` row) |
| **Org admin**       | Active `organization_members` row with `role_id = ADMIN` | Full catalog (implicit; virtual row in team list)  |
| **Platform admin**  | `ADMIN_ALLOWED_EMAILS`                                   | Full catalog (same bypass as today)                |
| **Property member** | Active row in `property_members`                         | `permissions` JSONB on row                         |
| **Inactive member** | Row exists, `status = inactive`                          | None — API access denied                           |

### Standard roles

Three roles at property scope. **Manager** replaces the old PMA split of Property Manager vs Sublease.

| Role    | UI label | `role_id` literal | Intent                                                                       |
| ------- | -------- | ----------------- | ---------------------------------------------------------------------------- |
| Manager | Manager  | `MANAGER`         | Full property access (not org delete/billing)                                |
| Staff   | Staff    | `STAFF`           | Bookings + maintenance operations; **no Team module** (sidebar/route hidden) |
| Viewer  | Viewer   | `VIEWER`          | Read-only across modules                                                     |

### Custom roles

- Stored in **`property_custom_roles`** (UUID primary key).
- Member/invite **`role_id`** = built-in literal **or** custom role UUID string.
- Unique name per property (case-insensitive).
- Deleting blocked while members or pending invites reference the role.

### Permission IDs

Canonical list (keep in sync with `propertyTeamConstants.ts` and `_shared/propertyTeamPermissions.ts`):

`bookings:view`, `bookings:edit`, `bookings:workflow`, `finance:view`, `finance:edit`, `pricing:view`, `pricing:edit`, `maintenance:view`, `maintenance:edit`, `notifications:view`, `notifications:edit`, `templates:view`, `templates:edit`, `settings:view`, `settings:edit`, `team:view`, `team:invite`, `team:manage`

**Overrides:** Client may store any **subset of the catalog** on the member/invite row (can exceed role preset — e.g. grant `finance:view` to a Viewer if checkboxes allow).

**Role change:** Server resets to role/custom-role preset unless the request sends an explicit `permissions[]` override list (matches UI).

**Custom role edit:** When a custom role definition changes, server updates `permissions` on all **active** members with that `role_id`. Inactive members restore the updated preset on activate (not the old snapshot).

### Default permission presets

| Permission                | Manager | Staff | Viewer |
| ------------------------- | :-----: | :---: | :----: |
| Bookings — view           |    ✓    |   ✓   |   ✓    |
| Bookings — edit           |    ✓    |   ✓   |   —    |
| Bookings — workflow       |    ✓    |   ✓   |   —    |
| Finance — view / edit     |    ✓    |   —   |   —    |
| Pricing — view            |    ✓    |   ✓   |   ✓    |
| Pricing — edit            |    ✓    |   —   |   —    |
| Maintenance — view / edit |    ✓    |   ✓   |  view  |
| Notifications — view      |    ✓    |   ✓   |   ✓    |
| Notifications — edit      |    ✓    |   —   |   —    |
| Templates — view          |    ✓    |   ✓   |   ✓    |
| Templates — edit          |    ✓    |   —   |   —    |
| Settings — view / edit    |    ✓    |   —   |   —    |
| Team — view               |    ✓    |   —   |   ✓    |
| Team — invite / manage    |    ✓    |   —   |   —    |

**Staff cap:** `verifyPropertyAccess` clamps active `STAFF` members to the Staff preset (stale `team:*` permissions in DB are ignored).

Property delete/archive remains **org owner** only — not a property-role permission.

### Deactivate / activate

| State                   | `status`   | `permissions`        | `saved_permissions`        | `plan_limited` |
| ----------------------- | ---------- | -------------------- | -------------------------- | -------------- |
| Active                  | `active`   | Effective grant list | `NULL`                     | `false`        |
| Inactive (manual)       | `inactive` | `[]`                 | Snapshot before deactivate | `false`        |
| Inactive (plan-limited) | `inactive` | `[]`                 | Snapshot before deactivate | `true`         |

On activate: built-in roles restore `saved_permissions` (or role preset if empty). **Custom-role** members restore the **current custom-role preset** (not the pre-deactivate snapshot). Clear `saved_permissions` and `plan_limited`.

`plan_limited` distinguishes an admin's deliberate deactivate from one team-seat reconciliation (`reconcilePropertyTeamSeats` in `_shared/planEntitlements.ts`) made automatically because the current plan doesn't cover this seat — see **Downgrade / expiration** above. Any manual status change (deactivate or activate) always clears it, so a real admin decision is never overwritten by a later automatic restore.

### Invitations

| Field       | Column        | Rule                                                |
| ----------- | ------------- | --------------------------------------------------- |
| Email       | `email`       | Trimmed; compared case-insensitively on accept      |
| Role        | `role_id`     | Built-in or custom UUID                             |
| Permissions | `permissions` | JSONB; defaults to role preset                      |
| Token       | `token`       | Opaque hex; unique                                  |
| Expiry      | `expires_at`  | **7 days** from send (`PROPERTY_INVITE_TTL_DAYS`)   |
| Status      | `status`      | `pending` \| `accepted` \| `expired` \| `cancelled` |

**Uniqueness:** One **pending** invite per `(property_id, lower(email))`. Block invite if email is already an active member on that property. Block invite/accept if the email or signed-in user already has **organization-level property access** (org owner or active org ADMIN). Failed invite email on create deletes the pending row; failed resend restores the previous token/expiry.

**Accept flow (v1):** Resend email → `/accept-invite?token=…` → preview (org logo, name, property line) → **Sign in with Google** if needed → review **Accept invite** → tap **Accept** → invite email must match session email → upsert `property_members`, mark invite `accepted`. Property-only members have **no org-scoped routes** (sidebar org name is read-only; `/org/:slug/*` redirects to their assigned property). Invitee may already belong to other orgs/properties.

**Pending members:** No `property_members` row until accept — `pending` exists only on invitations.

### Team API permission gates

| Action                                    | Required permission |
| ----------------------------------------- | ------------------- |
| List members / invitations / custom roles | `team:view`         |
| Invite / resend / cancel invitation       | `team:invite`       |
| Update/remove member; CRUD custom roles   | `team:manage`       |

Enforcement on bookings/finance/etc. uses **`verifyPropertyAccess`** on property-scoped edge functions (see **`property-access`** for UI guards). Org routes use **`org-access`** + **`RequireOrgPermission`**; sidebar filtered via **`filterOrgNavSections`**.

When access is revoked (deactivated member, removed from property, or lost org membership), route guards show **`TenantAccessDenied`** instead of redirecting to `/org`: **No property access** (with link to org properties when org slug is known) or **No organization access** (link **Home** → `/org` hub, which re-resolves dashboard or onboarding).

---

## Sections

### Members

- Search by name or email; filter by role (`MANAGER`, `STAFF`, `VIEWER`, custom).
- Non-org members: change role via select or **Manage** dialog, **Edit Permissions**, **Deactivate** / **Activate**, **Remove from Property**.
- Deactivated members: **Disabled** badge, role select locked, **permissions cleared** until reactivated. Deactivated by team-seat reconciliation instead of an admin: **Plan limit** badge (tooltip explains why) instead of the plain Disabled one.
- When 1+ members are currently plan-limited, a banner above the list shows the count with an **Upgrade** button (opens the upgrade modal targeted at `teamManagement`).
- Org owner and org admins (virtual, `fromOrg: true`): **Org** badge; **Manage in org** link to `/org/:orgSlug/team` when viewer has `org:team:view` (no property-level contact edit).
- Property members: role dropdown, permissions, deactivate, remove when caller has `team:manage`.
- Guest-facing contact resolves from active property **MANAGER** `display_name` / `contact_phone`, then org owner team row, then legacy settings.
- Cannot deactivate/remove yourself or the last active member with `team:manage` (org owner still has implicit access).

### Invitations

- List pending invites with role, sent date, expiry (UI dates as e.g. **July 6, 2026**).
- **Resend** and **Cancel** — resend rotates token, refreshes expiry, and sends Resend email.

### Permissions

- Matrix of property permissions by role (built-in + custom columns).
- **Roles** card — built-in role summaries, then custom roles list. Empty custom roles: centered empty state with **New Role** CTA (`team:manage`); header **New Role** outline button only when at least one custom role exists.

### Invite Member dialog

| Field | Storage                              | Validation                                                                         |
| ----- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| Email | `property_invitations.email`         | Required, trimmed; **`@gmail.com`** or **`@googlemail.com`** only (Google sign-in) |
| Phone | `property_invitations.contact_phone` | Required PH mobile `09XXXXXXXXX`; copied to `property_members` on accept           |
| Role  | `role_id`                            | Built-in, custom UUID, or **Add Custom Role** from dropdown (opens create dialog)  |

Name comes from the invitee's Google account on accept; edit later via **Host details** on the member row.

### Edit Permissions dialog

| Field       | Storage             | Validation                           |
| ----------- | ------------------- | ------------------------------------ |
| Role        | `role_id`           | Resets checklist to preset on change |
| Permissions | `permissions` JSONB | Checkbox list by category            |

---

## Database

| Table                   | Purpose                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `property_custom_roles` | Named permission presets per property                                              |
| `property_members`      | `user_id`, `role_id`, `permissions`, `status`, `saved_permissions`, `plan_limited` |
| `property_invitations`  | Pending invites + token + expiry                                                   |

Migrations: `supabase/migrations/20260908120000_property_team_rbac.sql`, `supabase/migrations/20261108140000_property_members_plan_limited.sql` (`plan_limited`)

RLS enabled with **no authenticated policies** — edge functions use `service_role` (same pattern as `finance_line_items`).

---

## API reference

| Action                                                 | Endpoint                                               | Method                                    | Permission                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| List members (+ virtual org owner/admins)              | `property-team-members?property_id=`                   | GET                                       | `team:view`                                                                                                                          |
| Update member (role, permissions, activate/deactivate) | `property-team-members`                                | PATCH                                     | `team:manage`                                                                                                                        |
| Remove member                                          | `property-team-members?property_id=&memberId=`         | DELETE                                    | `team:manage`                                                                                                                        |
| List pending invitations                               | `property-team-invitations?property_id=`               | GET                                       | `team:view`                                                                                                                          |
| Invite member                                          | `property-team-invitations`                            | POST                                      | `team:invite`                                                                                                                        |
| Resend invitation                                      | `property-team-invitations`                            | POST `{ action: "resend", invitationId }` | `team:invite`                                                                                                                        |
| Cancel invitation                                      | `property-team-invitations?property_id=&invitationId=` | DELETE                                    | `team:invite`                                                                                                                        |
| List custom roles                                      | `property-team-custom-roles?property_id=`              | GET                                       | `team:view`                                                                                                                          |
| Create custom role                                     | `property-team-custom-roles`                           | POST                                      | `team:manage`                                                                                                                        |
| Update custom role                                     | `property-team-custom-roles`                           | PATCH                                     | `team:manage`                                                                                                                        |
| Delete custom role                                     | `property-team-custom-roles?property_id=&roleId=`      | DELETE                                    | `team:manage`                                                                                                                        |
| Accept invitation                                      | `accept-property-invite`                               | POST `{ token }`                          | JWT (invitee email must match). Returns **`{ propertyId, memberId, orgSlug, propertySlug, propertyName }`**.                         |
| Current user access                                    | `property-access?property_id=`                         | GET                                       | JWT — returns **`{ accessKind, permissions[], memberId?, orgSlug, propertySlug, propertyName }`** (no specific permission required). |

Auth: Bearer JWT + `verifyPropertyAccess` (`_shared/orgAuth.ts`). `property_id` or body `propertyId` required on team admin endpoints.

**Update member → activate over the seat cap:** PATCH `{ status: 'active' }` on an inactive member runs the same `requireTeamInviteAllowed` check an invite does; if it would exceed `teamManagement.maxMembers`, the response is the standard `{ upgradeHook: true, feature: 'teamManagement' }` envelope (`jsonUpgradeHook`), same shape the client already handles for invite-at-limit.

**Invite email:** On create/resend, `propertyTeamInviteEmail.ts` sends via Resend using the configurable template shell. **Subject:** `{Org name} - {Property name} - Team Invitation`. **Body:** inviter name; `{property} - {unit}` join line as `{name} invites you to join … as {role}`; role description paragraph (built-in presets from `BUILTIN_ROLE_EMAIL_DESCRIPTIONS` in `propertyTeamPermissions.ts`; custom roles — scoped-permissions line); expiry; Google sign-in note; accept CTA. Link: **`{PUBLIC_GUEST_APP_ORIGIN}/accept-invite?token=…`**. Deliverability: verify Resend domain (SPF/DKIM/DMARC) on the sending domain to reduce spam-folder placement.

---

## Implementation map

| Concern              | Path                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Page                 | `ui/src/features/dashboard/team/pages/PropertyTeamPage.tsx`                                                  |
| Data hooks           | `ui/src/features/dashboard/team/hooks/usePropertyTeam.ts`                                                    |
| API client           | `ui/src/features/dashboard/team/lib/teamApi.ts`                                                              |
| Components           | `ui/src/features/dashboard/team/components/*`                                                                |
| UI constants         | `ui/src/features/dashboard/team/lib/propertyTeamConstants.ts`                                                |
| Server RBAC          | `supabase/functions/_shared/propertyTeamPermissions.ts`                                                      |
| Team service         | `supabase/functions/_shared/propertyTeamService.ts`                                                          |
| Seat reconciliation  | `supabase/functions/_shared/planEntitlements.ts#reconcilePropertyTeamSeats`                                  |
| Invite email         | `supabase/functions/_shared/propertyTeamInviteEmail.ts`                                                      |
| Accept page          | `ui/src/features/dashboard/team/pages/AcceptInvitePage.tsx`                                                  |
| Accept API client    | `ui/src/features/dashboard/team/lib/acceptInviteApi.ts`                                                      |
| Permissions hook     | `ui/src/features/dashboard/team/hooks/usePropertyPermissions.ts`                                             |
| Route guards         | `ui/src/features/dashboard/org/components/RequirePropertyPermission.tsx`                                     |
| Access denied UI     | `ui/src/features/dashboard/org/components/TenantAccessDenied.tsx`                                            |
| Org route guards     | `ui/src/features/dashboard/org/components/RequireOrgPermission.tsx`                                          |
| Org permissions hook | `ui/src/features/dashboard/team/hooks/useOrgPermissions.ts`                                                  |
| Nav filtering        | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts#filterPropertyNavSections`                        |
| Property access      | `supabase/functions/_shared/orgAuth.ts#verifyPropertyAccess`                                                 |
| Edge functions       | `property-team-members`, `property-team-invitations`, `property-team-custom-roles`, `accept-property-invite` |
| Route                | `ui/src/features/dashboard/routes/index.tsx` (`team`, `accept-invite`)                                       |
| Sidebar nav          | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts`                                                  |
| Path helper          | `ui/src/features/dashboard/org/lib/tenantPaths.ts`                                                           |

---

## Related docs

- [Route index](./README.md)
- [`docs/PROJECT.md`](../../PROJECT.md) — multi-tenancy + team RBAC
- Org-level team (future): separate org roles (`OWNER`, org `ADMIN`)

---

## Pending / follow-ups

- [x] DB: `property_members`, `property_custom_roles`, `property_invitations`
- [x] RBAC contract + `propertyTeamPermissions.ts` + `verifyPropertyAccess`
- [x] Edge functions: list/invite/update/remove + custom roles + accept invite
- [x] Wire Team UI to API (`usePropertyTeam`)
- [x] Invite email (Resend) + `/accept-invite` page
- [x] Enforce permissions on property-scoped admin edge functions + sidebar/route guards
- [x] Org-level team page (`/org/:orgSlug/team`) + `organization_members`
- [x] Team-seat downgrade/expiration reconciliation (`plan_limited`, `reconcilePropertyTeamSeats`) — auto-disable over-budget members on plan change/suspension, auto-restore on upgrade, never delete
- [ ] Org-level team has no equivalent seat-limit or reconciliation concept yet — org roles aren't plan-gated by count today
