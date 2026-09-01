---
title: 'Parking Help & Support'
status: active
tags: [guides, routes, org, parking, help-support]
updated: 2026-08-17
---

# Parking Help & Support

Route: `/org/:orgSlug/parking/:parkingSlug/help-support` (+ `/docs`, `/tickets`, `/tickets/new`, `/tickets/:ticketId`)

Announcements: [Announcements](./announcements.md) (`/announcements`). Legacy `/help-support/announcements` redirects there.

> **Status:** Documented

## Progress overview

| Section      | E2E | Validation | Docs | Notes                                              |
| ------------ | --- | ---------- | ---- | -------------------------------------------------- |
| All sections | Yes | Yes        | Yes  | Same feature as the property scope, parking-scoped |

## Overview

Identical feature to [Property Help & Support](../property/help-support.md), mounted for a parking slot instead of a property — tickets filed here carry `parking_id` (and `property_id` null). Visible to every parking team member, not gated behind a specific permission (`bookings:view` baseline, same as Dashboard).

## Host-facing knowledge

Same as the property-level page: documentation, AI Assistant, and support tickets, just scoped to this parking listing.

**Common host questions**

- Q: If I file a ticket about a parking issue, does your team know it's about parking?
  A: Yes. Tickets filed from a parking listing's Help & Support page are tagged with that listing, so our team has the context automatically.

## API reference · Implementation map

Same as [Property Help & Support](../property/help-support.md) — parking-scoped calls use `parkingId` instead of `propertyId`.

## Related docs

- [Route index](../../README.md)
- [Org Help & Support](../help-support.md)
- [Property Help & Support](../property/help-support.md)
- [Super-admin ticket management](../../admin/support.md)
