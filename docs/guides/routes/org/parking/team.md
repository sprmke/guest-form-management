# Parking Team — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/team`

> **Status:** Documented

## Progress overview

| Section          | E2E save | Validation     | Docs       | Notes                                      |
| ---------------- | -------- | -------------- | ---------- | ------------------------------------------ |
| Stats cards      | ✓        | —              | Documented | Same component as property team            |
| Members tab      | ✓        | —              | Documented | Built-in + custom roles; edit permissions  |
| Invitations tab  | ✓        | Email required | Documented | Accept link uses `scope=parking`           |
| Permissions tab  | ✓        | —              | Documented | Custom roles CRUD + role matrix (same UX)  |
| Invite dialog    | ✓        | Email required | Documented | Manager / Staff / Viewer + custom roles    |
| Remove dialog    | ✓        | —              | Documented | Label: Remove from Parking                 |
| RBAC enforcement | ✓        | —              | Documented | `parking-access` + route guard + edge APIs |

---

## Overview

Parking-scoped team management mirrors the property team page:

- Built-in roles: **Manager**, **Staff**, **Viewer**
- **Custom roles** with editable permission presets (`parking_custom_roles`)
- Org owner and org admins appear virtually as **Manager** (`fromOrg: true`) — not editable from parking team
- Members / Invitations / Permissions tabs, invite flow, edit permissions dialog, and custom role form match property team UX (parking-scoped permission catalog only)

---

## Standard roles

| Role    | `role_id` | Notes                                                                    |
| ------- | --------- | ------------------------------------------------------------------------ |
| Manager | `MANAGER` | Full parking access; invitable; org owner/admin shown as virtual Manager |
| Staff   | `STAFF`   | Bookings edit, pricing/notifications view                                |
| Viewer  | `VIEWER`  | Read-only + `team:view`                                                  |

Permission presets: `ui/src/features/dashboard/team/lib/parkingTeamConstants.ts` (server mirror: `_shared/parkingTeamPermissions.ts`).

Custom roles store a JSON permission array validated against the same parking catalog.

---

## Edge functions

| Function                    | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `parking-team-members`      | List / update / remove members               |
| `parking-team-invitations`  | List / invite / resend / cancel              |
| `parking-team-custom-roles` | List / create / update / delete custom roles |
| `parking-access`            | Caller permissions for nav guard             |
| `accept-parking-invite`     | Post-OAuth accept (`{ token }`)              |

Query/body scope: **`parking_id`** / **`parkingId`**.

---

## Implementation map

| Concern       | Path                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Page          | `ui/src/features/dashboard/team/pages/ParkingTeamPage.tsx`                                            |
| Shared tabs   | `TeamMembersTab`, `TeamInvitationsTab`, `TeamPermissionsTab` (`scope="parking"`)                      |
| Scope config  | `ui/src/features/dashboard/team/lib/teamScopeConfig.ts`                                               |
| Hooks         | `useParkingTeam`, `useParkingTeamMutations`, `useParkingPermissions`                                  |
| Route guard   | `RequireParkingPermission` + `parkingRoute('team', …)`                                                |
| Accept invite | `AcceptInvitePage` + `acceptInviteApi.acceptParkingInvite`                                            |
| Sidebar       | `buildParkingNavSections` — **Team** item                                                             |
| DB            | `parking_custom_roles`; `parking_members` / `parking_invitations` `role_id` accepts UUID custom roles |

---

## Related

- Property team: [../property/team.md](../property/team.md)
- Org team: [../team.md](../team.md) (org scope)
