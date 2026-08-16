---
title: 'Super Admin Settings — operator guide'
status: active
tags: [guides, routes, admin]
updated: 2026-08-11
---

# Super Admin Settings — operator guide

Route: `/admin/settings`

> **Status:** Documented

## Progress overview

| Section     | E2E save | Validation | Docs | Notes                                                                 |
| ----------- | -------- | ---------- | ---- | --------------------------------------------------------------------- |
| Platform AI | Done     | Server     | Done | Kill switch + feature allowlist + default quotas (voice is a feature) |

---

## Overview

Platform-wide AI controls for the super-admin team. Changes apply across all organizations and properties immediately.

**Access:** `RequireSuperAdmin` — email must be in `SUPER_ADMIN_EMAILS` (server) / `VITE_SUPER_ADMIN_EMAILS` (client UX gate).

---

## Host-facing knowledge

These controls are internal to the platform team. Hosts do not see or manage them.

**Common host questions**

- Q: Why did AI features stop working for my organization?
  A: The platform team may have disabled AI platform-wide, removed the feature from the allowed list, or your organization may have hit usage limits when quota enforcement is on. Contact support if you need help.
- Q: Can I turn on the AI voice receptionist for my property?
  A: Only when the platform team has enabled the voice receptionist feature globally. Per-property settings live in your property dashboard once the platform switch is on.

---

## Platform AI

| Control              | Effect                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- |
| **Enabled**          | Master kill switch for all AI features across the platform                                |
| **Enforce quotas**   | When on, org-level and per-property AI usage quotas are enforced                          |
| **Allowed features** | Per-feature allowlist (`allowed_features`). Empty array = all allowed when enabled.       |
| **Default quotas**   | Daily calls, monthly calls, and daily USD cost limits inherited by orgs without overrides |

Voice receptionist is controlled by the **Allowed features** list — add or remove `voice_receptionist` to gate the product. The old standalone voice kill switch endpoint was removed.

### Save path

1. Toggle in UI → `PATCH ai-platform-global-settings`
2. Persists `ai_platform_global_settings` singleton row

---

## API reference

| Action                    | Endpoint                                    |
| ------------------------- | ------------------------------------------- |
| Read / update platform AI | `GET` / `PATCH ai-platform-global-settings` |

---

## Implementation map

| Concern | Path                                                                                   |
| ------- | -------------------------------------------------------------------------------------- |
| Page    | `ui/src/features/dashboard/super-admin/pages/SuperAdminSettingsPage.tsx`               |
| Cards   | `AiPlatformKillSwitchCard.tsx`                                                         |
| Hooks   | `useAiPlatformGlobalSettings.ts`                                                       |
| Edge    | `supabase/functions/ai-platform-global-settings/`                                      |
| Nav     | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts#buildSuperAdminNavSections` |
| Paths   | `ui/src/features/dashboard/super-admin/lib/superAdminPaths.ts`                         |
| Routes  | `ui/src/features/dashboard/super-admin/routes/index.tsx`                               |

---

## Related docs

- [Super Admin Overview](./overview.md)
- [`docs/architecture/edge-functions.md`](../../../architecture/edge-functions.md) — AI edge function inventory
- [`docs/archive/operations/ai-platform-billing.md`](../../../archive/operations/ai-platform-billing.md)

---

## Pending / follow-ups

- [ ] Drop legacy `voice_receptionist_global_settings` table in a follow-up migration after verifying the platform switch is seeded on hosted environments.
