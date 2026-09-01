---
title: 'Org Help & Support'
status: active
tags: [guides, routes, org, help-support]
updated: 2026-08-17
---

# Org Help & Support

Route: `/org/:orgSlug/help-support` (+ `/docs`, `/tickets`, `/tickets/new`, `/tickets/:ticketId`)

Announcements are **property-only** — see [Property Announcements](./property/announcements.md). Org `/help-support/announcements` redirects to the Help index.

> **Status:** Documented

## Progress overview

| Section      | E2E | Validation | Docs | Notes                                        |
| ------------ | --- | ---------- | ---- | -------------------------------------------- |
| All sections | Yes | Yes        | Yes  | Same feature as the property scope, org-wide |

## Overview

Identical feature to [Property Help & Support](./property/help-support.md), mounted at the org level instead — tickets filed here have `property_id`/`parking_id` left null (org-level). Visible to every org team member, not gated behind a specific permission (`org:dashboard:view` baseline, same as Dashboard).

## Host-facing knowledge

Same as the property-level page: documentation, AI Assistant, and support tickets, just for questions that aren't about a specific property or parking listing.

**Common host questions**

- Q: Should I file a ticket from the org page or a property page?
  A: Either works, so pick whichever you're already on. We can still see which property or parking listing (if any) a ticket was filed from.

## API reference · Implementation map

Same as [Property Help & Support](./property/help-support.md) — org-scoped calls use `orgId`/`orgSlug` instead of `propertyId`.

## Related docs

- [Route index](../README.md)
- [Property Help & Support](./property/help-support.md)
- [Parking Help & Support](./parking/help-support.md)
- [Super-admin ticket management](../admin/support.md)
