---
title: 'Activity — operator guide'
status: active
tags: [guides, routes, org, property, activity, audit-log]
updated: 2026-09-06
---

# Activity — operator guide

Route: `/org/:orgSlug/property/:propertySlug/activity`

> **Status:** Documented

## Overview

Property-scoped slice of the org **activity / audit timeline** — every action against **this property**: booking transitions, direct booking-detail edits, cancellations, team changes for this property, settings / pricing / finance / maintenance edits, and guest actions on its public pages. Read-only.

Same feed / filters / detail sheet as the org-level page ([org/activity.md](../activity.md)); the scope is locked to this property (`scope=property`, `propertyId` bound). Listing-scoped team members see only the properties they are assigned to.

## Permissions

Gated on **`bookings:view`** (any member who can see this property's bookings). No dedicated `activity` leaf in v1.

## Related

- Org-wide view: [org/activity.md](../activity.md) · Parking: [org/parking/activity.md](../parking/activity.md)
- `<EntityActivityHistory targetType="booking" targetId={...} />` renders a compact per-booking feed on the booking detail Overview tab.

---

## Testing

| Layer | Path / spec                                                                           | Manual         |
| ----- | ------------------------------------------------------------------------------------- | -------------- |
| Unit  | `supabase/functions/_shared/activityLog.ts` catalog + redaction helpers               | —              |
| E2E   | `ui/e2e/features/dashboard/dashboardModulesSmoke.spec.ts` activity shell load (`@ci`) | CSV export     |
| N/A   | Per-booking `<EntityActivityHistory>` panel                                           | Booking detail |
