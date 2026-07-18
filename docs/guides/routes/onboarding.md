# Onboarding — operator guide

Route: `/onboarding`

> **Status:** Documented

## Progress overview

| Section      | E2E save | Validation | Docs       | Notes                                 |
| ------------ | -------- | ---------- | ---------- | ------------------------------------- |
| Residence    | —        | —          | Documented | Fixed Azure North (read-only)         |
| Organization | ✅       | ✅         | Documented | Name 2–120 chars                      |
| Host type    | ✅       | ✅         | Documented | Property · Parking · Both · Add later |
| Details      | ✅       | ✅         | Documented | Conditional property/parking blocks   |

---

## Overview

New hosts land here after Google sign-in when they have no organization. Creates an **organization** (required) and optionally the first **property** and/or **parking slot**.

---

## Steps

1. **Residence** — read-only `Azure North Residences`
2. **Organization** — `name` (required)
3. **Host type** — `property` | `parking` | `both` | `later` (org only)
4. **Details** — property block (tower, unit, display name) and/or parking block (tower, level, slot label, type, display name)

**Add later** skips step 4 and creates org only → `/org/:orgSlug/dashboard`.

---

## Save path

1. **Continue** → `POST create-organization` with `hostModes`, optional property fields, optional `parking` object
2. Seeds `org_settings`; optional `app_settings` / `parking_settings`
3. Redirect: property settings → parking settings → org dashboard (priority order)

---

## API reference

| Endpoint              | Method | Auth |
| --------------------- | ------ | ---- |
| `create-organization` | POST   | JWT  |

---

## Implementation map

| Concern | Path                                                     |
| ------- | -------------------------------------------------------- |
| Page    | `ui/src/features/dashboard/org/pages/OnboardingPage.tsx` |
| Edge    | `supabase/functions/create-organization/index.ts`        |
