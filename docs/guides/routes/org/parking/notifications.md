# Parking notifications — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/notifications`

> **Status:** Documented

## Progress overview

| Section | E2E save | Docs       | Notes                                       |
| ------- | -------- | ---------- | ------------------------------------------- |
| Parking | ✓        | Documented | Ops alerts (reservation, check-in, payment) |
| Finance | ✓        | Documented | Due-date reminders for parking transactions |

---

## Overview

Two Telegram sections (same layout as property notifications):

0. **Shared bot token** — optional card at the top (one token for Parking + Finance modules). **Test token** validates via Telegram `getMe`. Help covers BotFather setup. Chat ID fields include **Help** with lookup steps.
1. **Parking** — reservation request, check-in reminder, payment received (`telegram_parking_settings`)
2. **Finance** — operating expense due-date reminders (`telegram_finance_settings`)

Deep links: `?module=finance` scrolls to the Finance section.

---

## Host-facing knowledge

Parking **Notifications** configures Telegram alerts for this slot. The **Parking** section covers reservation-style alerts (new request, check-in reminder, payment received) once those flows are fully live. The **Finance** section sends due-date reminders for expense lines you track on parking finance. Each section needs a Telegram bot token and chat ID, plus a test send to confirm delivery.

**Common host questions**

- Q: Do I need two different Telegram setups?
  A: You can use one bot and chat for both sections, or separate channels if you want ops alerts and finance reminders in different group chats.
- Q: Why aren’t I getting parking reservation alerts yet?
  A: Reservation Telegram templates are wired for this slot, but some reservation events depend on the parking booking flow shipping. Finance due-date reminders work today when finance Telegram is enabled and transactions have due dates.
- Q: How do I jump straight to finance reminders?
  A: Open notifications with the finance module selected in the URL, or scroll to the **Finance** card on this page.

---

## Parking section

`TelegramParkingSettingsCard` → `GET/PATCH telegram-parking-settings?parking_id=`

POST actions: `verify_parking_telegram_env`, `send_draft_preview`, `render_draft_preview`

DB: `telegram_parking_settings` (one row per parking slot). Seeded on first GET.

---

## Finance section

Reuses property `TelegramFinanceSettingsCard` — scoped automatically to the parking slot via `useAdminAssetScope()`.

`GET/PATCH/POST telegram-finance-settings?parking_id=`

- Enable toggle, bot token, chat ID, default reminder template
- POST: `verify_finance_telegram_env`, `send_test_due_reminders`, `send_draft_preview`, `render_draft_preview`

DB: `telegram_finance_settings.parking_id` (one row per parking slot). Seeded on first finance GET.

Cron: global `telegram-finance-cron` (hourly) processes unpaid `finance_line_items` with `parking_id` when finance Telegram is enabled for that slot.

---

## Implementation map

| Concern       | Path                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| Page          | `ui/src/features/dashboard/parking/pages/ParkingNotificationsPage.tsx`          |
| Parking card  | `ui/src/features/dashboard/parking/components/TelegramParkingSettingsCard.tsx`  |
| Finance card  | `ui/src/features/dashboard/bookings/components/TelegramFinanceSettingsCard.tsx` |
| Finance hooks | `ui/src/features/dashboard/bookings/hooks/useTelegramFinanceSettings.ts`        |
| Parking edge  | `supabase/functions/telegram-parking-settings/index.ts`                         |
| Finance edge  | `supabase/functions/telegram-finance-settings/index.ts`                         |
| Cron          | `supabase/functions/telegram-finance-cron/index.ts`                             |

---

## Related

- Parking finance transactions: [finance.md](./finance.md)
- Property notifications: [../property/notifications.md](../property/notifications.md)
