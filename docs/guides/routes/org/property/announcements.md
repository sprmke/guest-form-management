---
title: 'Property Announcements'
status: active
tags: [guides, routes, org, property, announcements]
updated: 2026-09-01
---

# Property Announcements

Route: `/org/:orgSlug/property/:propertySlug/announcements`

Legacy redirect: `/org/:orgSlug/property/:propertySlug/help-support/announcements` → dedicated route above.

> **Status:** Documented

## Progress overview

| Section       | E2E | Validation | Docs | Notes                                          |
| ------------- | --- | ---------- | ---- | ---------------------------------------------- |
| Summary cards | Yes | N/A        | Yes  | Active / Action required / Attention / Updates |
| Archive feed  | Yes | N/A        | Yes  | Platform + development groups, 5-up pages      |
| Banner link   | Yes | N/A        | Yes  | **All (N)** on other pages opens this archive  |

## Overview

Property team members open **Announcements** from the sidebar (above Help & Support) to read platform maintenance, product updates, and development notices scoped to their org and linked buildings. On other dashboard pages, a compact banner shows the highest-priority notice; **All (N)** opens this archive. The banner is **hidden** on this page — four summary stat cards replace it. Visible to **every** non–plan-limited property team member (same baseline as Help & Support). Suspended orgs may still open Announcements.

## Host-facing knowledge

This is where you read official notices from Kame Homes — scheduled maintenance, new features, and updates for your building or development. You cannot dismiss them; they stay until we turn them off or the schedule ends.

**Common host questions**

- Q: Why do I see a banner on every page?
  A: On most dashboard pages we show the most important active notice at the top. Tap **All** to open Announcements, or **Dismiss** (×) to hide that notice from the banner. Dismissed notices stay in the Announcements archive. The banner does not repeat on the Announcements page itself.
- Q: Can I hide an announcement?
  A: You can dismiss it from the dashboard banner (×). It remains listed under **Announcements** in the sidebar until we turn it off or it expires. Editing a notice brings it back on the banner.
- Q: What's the difference between Platform and a development name?
  A: **Platform** applies to all hosts. A development name (e.g. your building) applies only to properties linked to that development.

## Summary cards

Four **StatCard**s in a 2×2 / four-column grid: **Active** (total count), **Action required** (critical), **Attention** (warning), **Updates** (info). Same card pattern as property Dashboard KPIs.

## Archive feed

Active notices from **`list-host-announcements`**, merged for this property's org and linked development. Grouped under **Platform** and each development name. Each group is a single **panel** (`surface-card`) with divided rows — no per-item floating cards. Rows use a **left severity rail** (rose / amber / neutral) and typography only (no icon boxes or status pills). Optional link aligns right on desktop. Up to **five** rows per page with compact **Previous** / **Next** chevrons in the section header.

## Permissions

| Control       | Decision | Notes                                                                   |
| ------------- | -------- | ----------------------------------------------------------------------- |
| **Plans**     | N/A      | Free for all property members; not tier-gated                           |
| **Team RBAC** | N/A      | Baseline access — same as Help & Support (`bookings:view` not required) |

## Implementation map

| Layer   | Path                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------- |
| Page    | `ui/src/features/dashboard/announcements/pages/HostAnnouncementsPage.tsx`                      |
| Stats   | `ui/src/features/dashboard/announcements/components/HostAnnouncementStatCards.tsx`             |
| Feed    | `ui/src/features/dashboard/announcements/components/HostAnnouncementCard.tsx`                  |
| Banner  | `ui/src/features/dashboard/announcements/components/AdminAnnouncementBanner.tsx`               |
| Dismiss | `ui/src/features/dashboard/announcements/lib/hostAnnouncementBannerDismiss.ts` (banner × only) |
| API     | `list-host-announcements`                                                                      |
| Routes  | `ui/src/features/dashboard/announcements/routes/index.tsx`                                     |

## Related

- [Property Help & Support](./help-support.md)
- [Super-admin Announcements](../../admin/announcements.md)
