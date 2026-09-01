---
title: 'Super Admin Announcements — operator guide'
status: active
tags: [guides, routes, admin]
updated: 2026-09-01
---

# Super Admin Announcements — operator guide

Route: `/admin/announcements`

> **Status:** Documented

## Progress overview

| Section               | E2E save | Validation | Docs | Notes               |
| --------------------- | -------- | ---------- | ---- | ------------------- |
| Platform-wide notices | Done     | Server     | Done | All signed-in hosts |

---

## Overview

Platform-wide host dashboard banners — maintenance windows, product releases, billing outages — shown to **every** signed-in host regardless of development. Development-specific notices (pool closure, tower work) stay on **`/admin/developments/:slug` → Announcements**.

Sidebar: **Announcements** (megaphone), separate from **AI Management**.

**Development announcements** — outline button beside **Add announcement** links to **`/admin/developments`**; open a development → Announcements section for residence-scoped notices.

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`).

---

## Host-facing knowledge

Hosts see platform notices labeled **Platform** in the dashboard banner and the dedicated **Announcements** sidebar item. Development notices show the development name instead.

**Common host questions**

- Q: Why do I only see one announcement on my dashboard?
  A: The dashboard shows the highest-priority active notice (critical first, then warning, then info). Open **Announcements** in the sidebar or tap **All (N)** on the banner to read the full list.
- Q: Can I dismiss them?
  A: Hosts can dismiss a notice from the dashboard banner (×). It stays on the **Announcements** archive page. If you edit the notice, it reappears on the banner because the content changed.

---

## Fields

| Field    | Storage                                        | Validation                                                                |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Title    | `platform_host_settings.announcements[].title` | Required, ≤160 chars                                                      |
| Message  | `…body`                                        | Required, ≤4000 chars                                                     |
| Severity | `…severity`                                    | `info` \| `warning` \| `critical`                                         |
| Active   | `…active`                                      | Inactive rows filtered server-side                                        |
| Schedule | `…startsAt` / `…endsAt`                        | Optional calendar dates (DatePicker; Asia/Manila day boundaries, no time) |
| Link     | `…linkUrl` / `…linkLabel`                      | URL must be `http://` or `https://`; label ≤80                            |

---

## Save path

1. Edit on **`/admin/announcements`** → **Save**
2. `PATCH update-platform-host-settings` with `{ announcements: [...] }`
3. Hosts read merged platform + development rows via **`list-host-announcements`**

---

## Implementation map

| Concern | Path                                                                                        |
| ------- | ------------------------------------------------------------------------------------------- |
| Page    | `ui/src/features/dashboard/super-admin/pages/SuperAdminAnnouncementsPage.tsx`               |
| Editor  | `ui/src/features/dashboard/announcements/components/HostAnnouncementEditor.tsx`             |
| Hook    | `ui/src/features/dashboard/super-admin/hooks/usePlatformHostSettings.ts`                    |
| Edge    | `get-platform-host-settings/`, `update-platform-host-settings/`, `list-host-announcements/` |
| Nav     | `superAdminPlatformNav.ts` → **Announcements**                                              |

---

## Related docs

- [Development Settings — Announcements](./development-detail.md#announcements)
- [AI Management](./settings.md) — no announcements here
