---
title: 'Parking notifications — operator guide'
status: active
tags: [guides, routes, org, parking]
updated: 2026-08-02
---

# Parking notifications — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/notifications`

Deep links:

- `?section=activity` or `#section-activity` — in-app activity feed (bell **View all**)
- `?module=finance` — Finance Telegram section
- `?module=parking` (legacy `?module=marketing` maps to Parking)

> **Status:** Documented

## Progress overview

| Section  | E2E save | Docs       | Notes                                       |
| -------- | -------- | ---------- | ------------------------------------------- |
| Activity | ✓        | Documented | In-app bell feed (org-wide, paginated)      |
| Parking  | ✓        | Documented | Ops alerts (reservation, check-in, payment) |
| Finance  | ✓        | Documented | Due-date reminders for parking transactions |

---

## Overview

Hub for **in-app activity** (same org-wide feed as the bell) and **Telegram** alerts for this parking slot.

### In-app activity

- **Activity** section lists in-app notifications for the org (booking + inbox events).
- Desktop: the bell floats above the AI assistant button. Phone: tap **Notifications** in the bottom menu. Both open the same sheet; **View all** opens this page at **Activity** when more than five items exist.
- **Activity** card scrolls inside a max height; additional pages load as you scroll (20 per request).
- Rows show guest name and stay dates (inquiry or booked) when available; realtime toasts match the same layout.

### Telegram sections

### Shared bot token (recommended default)

One BotFather token at the top pre-fills Parking and Finance module fields. Override per module anytime. One bot handles typical volume; use **separate Chat IDs** for parking ops vs finance reminders when you want different groups.

**Telegram notifications** group heading includes **Get Help**. **Shared bot token** card: **Save and test** validates via `getMe`, then saves; **Saved** replaces the button when complete.

1. **Parking** — reservation request, check-in reminder, payment received (`telegram_parking_settings`)
2. **Finance** — operating expense due-date reminders (`telegram_finance_settings`)

**Find chat ID** is inline on the Chat ID field — **Scan for chats**, then a group dropdown. Hidden after **Connected** (group name + **Reveal** instead). Saved credentials show **@bot username** and **group name** by default; **Reveal** shows the raw token or chat ID.

Deep links: `?module=finance` scrolls to the Finance section.

---

## Host-facing knowledge

Parking **Notifications** configures Telegram alerts for this slot. The **Parking** section covers reservation-style alerts (new request, check-in reminder, payment received) once those flows are fully live. The **Finance** section sends due-date reminders for expense lines you track on parking finance. Each section needs a Telegram bot token and chat ID, plus a test send to confirm delivery.

**Common host questions**

- Q: Where is the notification bell on my phone?
  A: Tap **Notifications** in the bottom menu. On a computer it floats above the AI assistant button.
  A: No for the bot — one shared token is enough. Use separate **Chat IDs** if you want parking ops alerts and finance reminders in different groups. Each module can still use its own bot token if you override the field.
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

| Concern       | Path                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Page          | `ui/src/features/dashboard/parking/pages/ParkingNotificationsPage.tsx`                                            |
| In-app list   | `ui/src/features/dashboard/notifications/components/InAppNotificationsPanel.tsx`                                  |
| Bell          | `ui/src/features/dashboard/notifications/components/NotificationBell.tsx` (desktop FAB; mobile Notifications tab) |
| Parking card  | `ui/src/features/dashboard/parking/components/TelegramParkingSettingsCard.tsx`                                    |
| Finance card  | `ui/src/features/dashboard/bookings/components/TelegramFinanceSettingsCard.tsx`                                   |
| Finance hooks | `ui/src/features/dashboard/bookings/hooks/useTelegramFinanceSettings.ts`                                          |
| Parking edge  | `supabase/functions/telegram-parking-settings/index.ts`                                                           |
| Finance edge  | `supabase/functions/telegram-finance-settings/index.ts`                                                           |
| Cron          | `supabase/functions/telegram-finance-cron/index.ts`                                                               |

---

## Related

- Parking finance transactions: [finance.md](./finance.md)
- Property notifications: [../property/notifications.md](../property/notifications.md)
