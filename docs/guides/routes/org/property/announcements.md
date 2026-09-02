---
title: 'Property Announcements'
status: active
tags: [guides, routes, org, property, announcements]
updated: 2026-09-01
---

# Property Announcements

Route: `/org/:orgSlug/property/:propertySlug/announcements` (+ `/announcements/:announcementId` detail)

Legacy redirect: `/org/:orgSlug/property/:propertySlug/help-support/announcements` → dedicated route above.

> **Status:** Documented

## Progress overview

| Section       | E2E | Validation | Docs | Notes                                                      |
| ------------- | --- | ---------- | ---- | ---------------------------------------------------------- |
| Summary cards | Yes | N/A        | Yes  | Active / Action required / Attention / Updates             |
| Archive feed  | Yes | N/A        | Yes  | Platform + development groups, 5-up pages                  |
| Detail view   | Yes | N/A        | Yes  | Back, sticky status card, full body, optional link button  |
| Banner link   | Yes | N/A        | Yes  | Desktop banner; red-dot nav when unread (mobile + desktop) |

## Overview

Property team members open **Announcements** from the sidebar (above Help & Support) to read platform maintenance, product updates, and development notices scoped to their org and linked buildings. On other dashboard pages, a compact banner shows the highest-priority notice on **desktop** (`lg+`); **All (N)** opens this archive. The banner is **not shown on mobile**. A **red dot** on **Announcements** (sidebar and **More** menu) appears while any notice is unread — same indicator pattern as Settings issues. Opening a notice marks it read (device-local). The banner is also **hidden** on this page — four summary stat cards replace it. Visible to **every** non–plan-limited property team member (same baseline as Help & Support). Suspended orgs may still open Announcements.

## Host-facing knowledge

This is where you read official notices from Kame Homes — scheduled maintenance, new features, and updates for your building or development. Unread notices show a small red dot and stronger title; open a row to mark it read. You can dismiss the desktop dashboard banner (×); the list always shows active notices until we turn them off or the schedule ends.

**Common host questions**

- Q: Why do I see a banner on every page?
  A: On desktop, most dashboard pages show the most important active notice at the top. Tap **All** to open Announcements, or **Dismiss** (×) to hide that notice from the banner. On phone, open **Announcements** from **More** — a red dot means you still have unread notices. The banner does not repeat on the Announcements page itself.
- Q: What does the red dot on Announcements mean?
  A: You have at least one unread notice. Open each notice to clear the unread state. Editing a notice can mark it unread again.
- Q: Can I hide an announcement?
  A: You can dismiss it from the desktop dashboard banner (×). It remains in the list and opens from **Read more**. Banner dismiss is separate from read/unread.
- Q: What's the difference between Platform and a development name?
  A: **Platform** applies to all hosts. A development name (e.g. your building) applies only to properties linked to that development.

## Summary cards

Four **StatCard**s in a 2×2 / four-column grid: **Active** (total count), **Action required** (critical), **Attention** (warning), **Updates** (info). Same card pattern as property Dashboard KPIs.

## Archive feed

Active notices from **`list-host-announcements`**, merged for this property's org and linked development. Grouped under **Platform** and each development name. Each group is one **panel** with `divide-y` rows (no double borders). Rows are **clickable** — unread rows use a white/background fill, semibold title, and a small red unread dot **inline beside the title**; read rows use a super-light gray fill and medium weight (no primary tint). Opening detail marks the notice read (localStorage per org). Up to **five** rows per page; **Previous** / **Next** chevrons in the section header.

**Detail** (`/announcements/:announcementId`): same page title and subtitle as the list, **stat cards** then **Back** then a **`surface-card`** detail panel (status header · severity marker · title · body · optional link button). Opening the page marks that notice as read.

## Permissions

| Control       | Decision | Notes                                                                   |
| ------------- | -------- | ----------------------------------------------------------------------- |
| **Plans**     | N/A      | Free for all property members; not tier-gated                           |
| **Team RBAC** | N/A      | Baseline access — same as Help & Support (`bookings:view` not required) |

## Implementation map

| Layer       | Path                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Page        | `ui/src/features/dashboard/announcements/pages/HostAnnouncementsListPage.tsx`                  |
| Detail      | `ui/src/features/dashboard/announcements/pages/HostAnnouncementDetailPage.tsx`                 |
| Detail card | `ui/src/features/dashboard/announcements/components/HostAnnouncementDetailCard.tsx`            |
| Stats       | `ui/src/features/dashboard/announcements/components/HostAnnouncementStatCards.tsx`             |
| Feed        | `ui/src/features/dashboard/announcements/components/HostAnnouncementCard.tsx`                  |
| Banner      | `ui/src/features/dashboard/announcements/components/AdminAnnouncementBanner.tsx` (`lg+` only)  |
| Strip       | `ui/src/features/dashboard/announcements/components/HostAnnouncementBannerStrip.tsx`           |
| Unread nav  | `ui/src/features/dashboard/announcements/hooks/useHostAnnouncementHasUnread.ts`                |
| Read state  | `ui/src/features/dashboard/announcements/lib/hostAnnouncementReadState.ts`                     |
| Dismiss     | `ui/src/features/dashboard/announcements/lib/hostAnnouncementBannerDismiss.ts` (banner × only) |
| API         | `list-host-announcements`                                                                      |
| Routes      | `ui/src/features/dashboard/announcements/routes/index.tsx`                                     |

## Related

- [Property Help & Support](./help-support.md)
- [Super-admin Announcements](../../admin/announcements.md)
