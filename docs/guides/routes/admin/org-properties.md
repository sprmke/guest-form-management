---
title: 'Super Admin Org Properties — operator guide'
status: active
tags: [guides, routes, admin, properties]
updated: 2026-08-02
---

# Super Admin Org Properties — operator guide

Route: `/admin/orgs/:orgSlug/properties`

> **Status:** Documented — minimal scaffold

## Progress overview

| Section   | E2E save         | Validation | Docs | Notes                                    |
| --------- | ---------------- | ---------- | ---- | ---------------------------------------- |
| Name list | Done (read-only) | —          | Done | Plain bullet list of property names only |

---

## Overview

Minimal super-admin view of a single organization's property names, reached by org slug rather than host ID. It reuses the **org-scoped** hooks (`useOrganizations`, `useProperties`) instead of a dedicated super-admin edge function — the super-admin session is authorized because the caller's email is in `SUPER_ADMIN_EMAILS`, which `list-organizations` treats as "can see all orgs" (see [`docs/architecture/edge-functions.md`](../../../architecture/edge-functions.md) `list-organizations`).

This is not linked from any super-admin nav card today; it exists as a direct-URL utility (e.g. reached by typing the org slug), and is a much thinner view than [`/admin/hosts/:hostId/orgs/properties`](./host-detail/properties.md) — no stats, filters, cards, or actions.

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`).

---

## Host-facing knowledge

This is an internal, bare-bones lookup the platform team can use to quickly check which properties exist under one organization by its URL slug. It shows names only — no photos, stats, or settings — and hosts never see or use it.

**Common host questions**

- Q: Is this the same as the properties page I use in my own dashboard?
  A: No — this is a stripped-down internal view for the platform team with just property names, not the full properties page you use.
- Q: Does this page show any of my property's booking or revenue data?
  A: No — it only lists property names.

---

## Behavior / edge cases

- Title shows `"{org name} — Properties"` once the organization is found in the caller's org list; falls back to plain `"Properties"` if no match (e.g. slug not found).
- Renders a plain `<ul>` of property names — no links, thumbnails, or per-row actions.
- Loading and error states are simple text, no skeletons.
- If the organization has zero properties, shows `"No properties yet."`.

---

## API reference

| Action     | Endpoint                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Orgs       | `GET list-organizations` — all orgs when caller is a super admin (used to resolve the org name for the header) |
| Properties | `GET list-properties?orgSlug=` — properties for the given org slug                                             |

---

## Implementation map

| Concern                     | Path                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| Page                        | `ui/src/features/dashboard/super-admin/pages/SuperAdminPropertiesPage.tsx`                      |
| Hooks (shared, org feature) | `ui/src/features/dashboard/org/hooks/useOrganizations.ts` (`useOrganizations`, `useProperties`) |
| Edge functions              | `supabase/functions/list-organizations/index.ts`, `supabase/functions/list-properties/index.ts` |

---

## Related docs

- [Route index](../README.md)
- [Host properties (fuller equivalent)](./host-detail/properties.md)
- [Org properties (org-owner equivalent)](../org/properties.md)
- [`docs/PROJECT.md`](../../PROJECT.md)

---

## Pending / follow-ups

- [ ] Consider replacing with the richer `OrgPropertyCard` grid (as used on `/admin/properties` and `/admin/hosts/:id/orgs/properties`) or removing this route if it's fully superseded by the host-detail properties tab.
- [ ] Not linked from any nav card today — confirm whether it should be reachable from `/admin/hosts/:hostId/orgs` org cards.
