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

1. **Parking** — reservation request, check-in reminder, payment received (`telegram_parking_settings`)
2. **Finance** — operating expense due-date reminders (`telegram_finance_settings`)

Deep links: `?module=finance` scrolls to the Finance section.

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
