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

| Section               | E2E save | Validation | Docs | Notes                                  |
| --------------------- | -------- | ---------- | ---- | -------------------------------------- |
| Platform AI           | Done     | Server     | Done | Kill switch + quota enforcement toggle |
| AI Voice Receptionist | Done     | Server     | Done | Platform-wide kill switch              |

---

## Overview

Platform-wide AI controls for the super-admin team. Changes apply across all organizations and properties immediately.

**Access:** `RequireSuperAdmin` — email must be in `SUPER_ADMIN_EMAILS` (server) / `VITE_SUPER_ADMIN_EMAILS` (client UX gate).

---

## Host-facing knowledge

These controls are internal to the platform team. Hosts do not see or manage them.

**Common host questions**

- Q: Why did AI features stop working for my organization?
  A: The platform team may have disabled AI platform-wide or your organization may have hit usage limits when quota enforcement is on. Contact support if you need help.
- Q: Can I turn on the AI voice receptionist for my property?
  A: Only when the platform team has enabled it globally. Per-property settings live in your property dashboard once the platform switch is on.

---

## Platform AI

| Control            | Effect                                                                             |
| ------------------ | ---------------------------------------------------------------------------------- |
| **Enabled**        | Master kill switch for shared Gemini/Groq features across the platform             |
| **Enforce quotas** | When on, org-level AI usage quotas are enforced (disabled when Platform AI is off) |

### Save path

1. Toggle in UI → `PATCH ai-platform-global-settings`
2. Persists `ai_platform_global_settings` singleton row

---

## AI Voice Receptionist

| Control     | Effect                                                       |
| ----------- | ------------------------------------------------------------ |
| **Enabled** | Platform-wide kill switch for the voice receptionist product |

### Save path

1. Toggle in UI → `PATCH voice-receptionist-global-settings`
2. Persists `voice_receptionist_global_settings` singleton row

---

## API reference

| Action                           | Endpoint                                           |
| -------------------------------- | -------------------------------------------------- |
| Read / update platform AI        | `GET` / `PATCH ai-platform-global-settings`        |
| Read / update voice receptionist | `GET` / `PATCH voice-receptionist-global-settings` |

---

## Implementation map

| Concern | Path                                                                                     |
| ------- | ---------------------------------------------------------------------------------------- |
| Page    | `ui/src/features/dashboard/super-admin/pages/SuperAdminSettingsPage.tsx`                 |
| Cards   | `AiPlatformKillSwitchCard.tsx`, `VoiceReceptionistKillSwitchCard.tsx`                    |
| Hooks   | `useAiPlatformGlobalSettings.ts`, `useVoiceReceptionistGlobalSettings.ts`                |
| Edge    | `supabase/functions/ai-platform-global-settings/`, `voice-receptionist-global-settings/` |
| Nav     | `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts#buildSuperAdminNavSections`   |
| Paths   | `ui/src/features/dashboard/super-admin/lib/superAdminPaths.ts`                           |
| Routes  | `ui/src/features/dashboard/super-admin/routes/index.tsx`                                 |

---

## Related docs

- [Super Admin Overview](./overview.md)
- [`docs/architecture/edge-functions.md`](../../../architecture/edge-functions.md) — AI edge function inventory
- [`docs/archive/operations/ai-platform-billing.md`](../../../archive/operations/ai-platform-billing.md)

---

## Pending / follow-ups

- [ ] None known.
