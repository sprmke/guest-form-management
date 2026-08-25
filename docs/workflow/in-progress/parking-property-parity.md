---
title: 'Parking ↔ property production parity'
stage: in-progress
status: in-progress
updated: 2026-08-26
tags: [workflow, in-progress, parking, property]
---

# Parking ↔ property production parity

**Status: v1 parity shipped (2026-08-23). Plan stays open until org-level plan entitlements replace interim parking ungating — see [Pending](#pending--do-not-forget) below.**

**2026-08-25 update, not a close:** [`org-level-billing-migration.md`](../done/org-level-billing-migration.md) shipped org-level billing — `property_subscriptions` is gone entirely and `resolvePropertyEntitlements` now _always_ resolves via the org's subscription (never a per-property fallback). This makes the existing `firstActivePropertyIdForOrg` proxy (used by `resolveTelegramEntitlementPropertyId`/`resolveListingEntitlementPropertyId` for parking) more consistent than before — there's now exactly one entitlement source per org instead of a property potentially diverging from its org's bundle. **It does not close this plan's blocker**, though: that proxy still requires the org to have at least one property to resolve through. An org with parking listings and zero properties still has no entitlement path and would still hit `firstActivePropertyIdForOrg`'s `null` case — `PARKING_INTERIM_UNGATED_FEATURES` in `useFeatureGate.ts` is still load-bearing for that case. Closing this properly needs a genuinely property-independent org entitlement lookup (resolve straight from `organization_id`, no property proxy at all) — out of scope for the billing migration, which was scoped to property billing, not parking's entitlement architecture. One concrete building block the migration does add: `getActiveOrgSubscription(organizationId)` in `_shared/planEntitlements.ts` now exists and resolves a live subscription straight from an org id with no property involved at all — whoever picks this up could build a parking-native `resolveOrgEntitlements(organizationId)` on top of it (merging features + Free fallback the same way `resolvePropertyEntitlements` does) instead of the property-proxy dance.

Align parking with property for production readiness without copying stay-specific product (Meta inbox, GAF/SD, Marketing, Maintenance, public page editors, voice receptionist).

**Original plan:** Cursor plan `parking_property_parity` (do not edit the plan file in `.cursor/plans/`).

---

## Shipped (v1)

| #   | Workstream                                            | Status | Notes                                                                                                           |
| --- | ----------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| 1   | Interim ungating (Telegram + AI Assistant on parking) | ✅     | `useFeatureGate`, `telegramSettingsHttp`, `dashboard-assistant-chat` skip property plan when `parkingId` only   |
| 2   | Guest parking web chat                                | ✅     | `guest-web-chat-start` / `resume` + `parkingSlug`; Contact Host on listing; Stays hub threads; Telegram inbound |
| 3   | Archive / restore                                     | ✅     | Settings danger zone; `update-parking` `{ status }`; public APIs **ACTIVE** only                                |
| 4   | Date blocks on Pricing                                | ✅     | `parking_blocked_dates` migration; pricing UI block/unblock; broadcast candidate filter                         |
| 5   | Email automation toggles                              | ✅     | Settings **Email** section; `parking_settings.automation_toggles`; gated broadcast + expire cron                |
| 6   | Live dashboard stats                                  | ✅     | `dashboard-stats?parking_id=`; `ParkingDashboardPage` wired                                                     |
| 7   | Route guides + edge-functions                         | ✅     | Parking inbox/settings/notifications/dashboard/pricing/parkings; AI assistant org-plan note                     |

**Follow-up polish (same initiative, 2026-08-24):**

| Item                                                                                                | Status |
| --------------------------------------------------------------------------------------------------- | ------ |
| Property + parking Settings section descriptions (short, matched)                                   | ✅     |
| Guest + parking registration form stepper **`title`** = section heading; shared **`hint`** subtitle | ✅     |

---

## Pending — do not forget

These are **not** optional polish — the plan cannot move to [`../done/`](../done/) until the org-plan dependency is resolved or explicitly deferred with a tracked successor task.

### Blocked on org-level plans

| Task                                                                                                                             | Owner / when                                                                                                                                                                                                    | Touch points                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replace **interim parking ungating** with real **org entitlement** checks for `telegramNotifications` and `aiDashboardAssistant` | A property-independent `resolveOrgEntitlements(organizationId)` needs to be built on top of the new `getActiveOrgSubscription` (see [`org-level-billing-migration.md`](../done/org-level-billing-migration.md)) | `ui/.../plans/hooks/useFeatureGate.ts`, `supabase/functions/_shared/telegramSettingsHttp.ts`, `supabase/functions/dashboard-assistant-chat/index.ts`, `useAiAssistantAccess` |
| Remove interim-un gate comments/docs; document final org-plan matrix in notifications + AI assistant guides                      | Same release as above                                                                                                                                                                                           | `docs/guides/routes/org/parking/notifications.md`, `docs/architecture/ai-dashboard-assistant.md`                                                                             |

**Do not** wire parking to `property_subscriptions` / `usePropertyEntitlements` as a permanent fix — parking entitlements are **org-scoped** per locked decision.

### Deploy / migration (when shipping to hosted env)

| Migration                                             | Purpose                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `20261103130000_telegram_chat_parking_scope.sql`      | Parking-scoped Telegram chat settings                           |
| `20261104120000_parking_blocked_dates_automation.sql` | `parking_blocked_dates` + `parking_settings.automation_toggles` |

Run via normal dev → prod cutover (`bun run deploy:supabase:dev` first; prod only with team unlock). Local: `bun run db:migrate`.

### Verify in QA (manual)

- [ ] Parking listing **Contact Host** → thread in parking Inbox + optional Chat Telegram alert
- [ ] Guest **Stays** lists parking threads with correct name/image
- [ ] Archive parking → hidden on `/parkings/:slug`; restore reverses
- [ ] Pricing **Block** dates → slot excluded from broadcast candidates
- [ ] Email toggles off → no host request / confirmed / no-host emails for that slot
- [ ] Parking dashboard KPIs non-zero when bookings exist in range
- [ ] Telegram enable + AI assistant usable on parking routes **without** property subscription (interim — retest after org plans)

---

## Explicitly out of scope (do not expand this plan)

- Org-level / portfolio subscription implementation itself ([`org-level-billing-migration.md`](../done/org-level-billing-migration.md))
- Thick parking booking detail (claim-only stays)
- Meta Channels on parking
- Marketing, Maintenance, Templates, Public Pages editor, Voice Receptionist, stay-guide / SD / GAF on parking
- Property→parking auto-search ([`parking-e2e-later-phases.md`](../planned/parking-e2e-later-phases.md) Phase 2b)

---

## Implementation map (shipped)

| Area              | Paths                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest web chat    | `supabase/functions/_shared/webGuestChatService.ts`, `guest-web-chat-start/`, `guest-web-chat-resume/`, `ui/.../ContactHostSheet.tsx`, `ParkingDetailPage.tsx`, `GuestMessagesHub.tsx` |
| Archive           | `ui/.../parking/components/ParkingSettingsCard.tsx`, `update-parking`                                                                                                                  |
| Date blocks       | `supabase/functions/_shared/parkingBlockedDates.ts`, `parking-pricing/`, `ParkingPricingPage.tsx`                                                                                      |
| Email automations | `parkingAutomationToggles.ts`, `ParkingEmailAutomationSection.tsx`, `parkingBroadcast*.ts`                                                                                             |
| Dashboard stats   | `dashboard-stats/`, `dashboardService.ts`, `useParkingDashboardStats.ts`                                                                                                               |
| Interim ungate    | `useFeatureGate.ts`, `telegramSettingsHttp.ts`, `dashboard-assistant-chat/index.ts`                                                                                                    |
| Form step labels  | `guestFormSteps.ts`, `parkingRegistrationSteps.ts`, `GuestFormStepper.tsx`                                                                                                             |

---

## Route guides (updated)

- [`docs/guides/routes/org/parking/inbox.md`](../../guides/routes/org/parking/inbox.md)
- [`docs/guides/routes/org/parking/settings.md`](../../guides/routes/org/parking/settings.md)
- [`docs/guides/routes/org/parking/notifications.md`](../../guides/routes/org/parking/notifications.md)
- [`docs/guides/routes/org/parking/dashboard.md`](../../guides/routes/org/parking/dashboard.md)
- [`docs/guides/routes/org/parking/pricing.md`](../../guides/routes/org/parking/pricing.md)
- [`docs/guides/routes/parkings.md`](../../guides/routes/parkings.md)
- [`docs/guides/routes/form.md`](../../guides/routes/form.md)
- [`docs/architecture/edge-functions.md`](../../architecture/edge-functions.md)
- [`docs/architecture/ai-dashboard-assistant.md`](../../architecture/ai-dashboard-assistant.md)

---

## Close criteria (`/workflow-done`)

Move to [`../done/`](../done/) when **either**:

1. Org-level plan entitlements ship and interim ungating is removed + docs updated, **or**
2. Team explicitly accepts interim ungating as long-term debt and tracks org plans in a **separate** in-progress doc (this doc then closes as “v1 parity only”).

Until then, keep this file in **`in-progress/`** so the org-plan follow-up is not lost.

---

Back to [in-progress index](./README.md).
