# Notifications — operator guide

Route: `/org/:orgSlug/property/:propertySlug/notifications`

Deep link: `?module=marketing|staff|operations|finance|maintenance|chat` scrolls to that module section.

> **Status:** Documented

## Progress overview

| Section     | E2E save | Validation | Docs       | Notes                                      |
| ----------- | -------- | ---------- | ---------- | ------------------------------------------ |
| Marketing   | ✅       | ✅         | Documented | Gated setup + manage cards                 |
| Staff       | ✅       | ✅         | Documented | Gated setup + manage cards                 |
| Operations  | ✅       | ✅         | Documented | Gated setup + manage cards                 |
| Finance     | ✅       | ✅         | Documented | Gated setup + template modal               |
| Maintenance | ✅       | ✅         | Documented | Gated setup + template modal               |
| Chat        | ✅       | ✅         | Documented | Inbound guest web chat → Telegram template |

---

## Overview

Single hub for all **Telegram notification bots** on a property.

### Per-module flow (all six bots)

0. **Shared bot token** — optional card at the top. Save one token for all modules; **Test token** runs Telegram `getMe`. When you enable a module, the bot token field pre-fills from this value (still editable). Help opens step-by-step BotFather instructions.
1. **Enable notifications** — master toggle (**off by default**; opt-in per module). When off, only this toggle is shown.
2. **Telegram connection** — bot token row, chat ID row (inline **?** help on each label), **Find chat ID** scanner (uses the bot token to list recent group/channel chats from Telegram), and **Connect** beside chat ID. After a successful verify the button becomes a green **Connected** state (disabled); editing either field resets to **Connect**. Failed verify shows **Connection failed** beside the section title and an outline-destructive **Connect** to retry. Saved credentials are returned from the settings API and shown in the fields (hidden by default; use the eye toggle to reveal).
3. **Manage cards** — after connect, shown inside a bordered group (Marketing/Staff: **Notification controls**; Operations: **Workflow alerts**; Finance/Maintenance: **Reminder message**; Chat: **New message**), same card pattern as **Telegram connection**:
   - **Marketing:** Schedule alerts (daily times + calendar rules) · Message templates
   - **Staff:** Schedule alerts · Message templates
   - **Operations:** Message templates (6 scenarios)
   - **Finance / Maintenance:** Reminder message (single template; module enable toggle only — no per-template switch)
   - **Chat:** New message template for every inbound guest message (placeholders include `{{chat_source}}`, `{{chat_content}}`, attachment helpers, and `{{conversation_link}}` → `/org/:orgSlug/inbox?conversationId=…&platform=web|facebook|instagram`)

### Saving behavior

| Action                                 | When it persists                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Enable notifications** toggle        | Immediately on change                                                                      |
| **Connect** (successful verify)        | Bot token and chat ID auto-saved to the server                                             |
| **Save** in schedule / template modals | Templates, schedule fields, and per-template toggles                                       |
| **Reset** in schedule modals           | Restores schedule/control fields to factory defaults (draft only until **Save**)           |
| **Reset** in template editor toolbar   | Restores the current template tab to its factory default (draft only until modal **Save**) |

There is no module-level **Save** or **Reset** footer — credentials must not require a separate save after Connect.

### Modals

| Manage target     | UI                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schedule alerts   | Daily times + **Calendar content** (urgency threshold, new-booking date limit with descriptions). Staff: daily summary time only. **Reset** beside **Save** restores defaults                                                                                                                                                                                                                                                    |
| Message templates | Per-template **toggle switches** (Marketing, Staff, Operations — **on by default**); sidebar nav shows on/off dot when >2 tabs. Finance / Maintenance / Chat: template editor only (module `enabled` gates sends). **Reset** in editor toolbar (between **Placeholders** and **Send preview**) restores that tab's default template. Module `enabled` + per-template toggle (where present) must both be on for cron/event sends |
| Placeholders      | **Placeholders** button in template dialog header → stacked modal above (search + tap-to-copy). Each token shows a short label and **e.g.** sample value                                                                                                                                                                                                                                                                         |

Legacy URLs redirect here — see [previous guide version](./notifications.md) redirect table (`…/marketing`, `…/finance?tab=settings`, etc.).

**Property Settings → Integrations → Telegram** **Configure** links deep-link via `?module=…`.

### Section nav

Page header subtitle: **Configure Telegram notifications for this property.**

**Sidebar:** uppercase **Telegram notifications** group label above module links (PMA templates pattern), with separator before additional groups when added later (e.g. email).

**Main content:** **Shared bot token** card, then **Telegram notifications** group heading with module count badge before the six module cards. Each module card includes a short description of what it sends.

---

## Host-facing knowledge

Notifications is the one place to set up Telegram alerts for this property — marketing schedules, staff summaries, booking workflow updates, finance and maintenance reminders, and new guest chat messages. Each module has its own on/off switch, Telegram connection, and message templates.

**Common host questions**

- Q: Do I have to save again after connecting Telegram?
  A: No — once you enter your bot token and chat ID and tap **Connect** successfully, credentials save automatically. Template and schedule changes save when you confirm in each modal.
- Q: Can I turn off just one type of alert?
  A: Yes — each module (Marketing, Staff, Operations, Finance, Maintenance, Chat) has its own **Enable notifications** toggle so you can opt in only to what you need.
- Q: I used to have separate Staff or Operations pages — where did they go?
  A: They all moved here. Old links to Staff, Operations, Finance, or Maintenance settings redirect to the matching section on this Notifications page.

---

## Save paths

Each module uses its existing edge function (property-scoped via `property_id`):

| Module      | Edge function                   | UI component                      |
| ----------- | ------------------------------- | --------------------------------- |
| Marketing   | `telegram-marketing-settings`   | `TelegramMarketingSettingsCard`   |
| Staff       | `telegram-staff-settings`       | `TelegramStaffSettingsCard`       |
| Operations  | `telegram-admin-settings`       | `TelegramAdminSettingsCard`       |
| Finance     | `telegram-finance-settings`     | `TelegramFinanceSettingsCard`     |
| Maintenance | `telegram-maintenance-settings` | `TelegramMaintenanceSettingsCard` |
| Chat        | `telegram-chat-settings`        | `TelegramChatSettingsCard`        |

Credentials unlock logic: `telegramCredentialsReady()` — saved token **and** chat ID on server, or both fields filled in the current draft.

**Chat send path:** after each inbound guest message insert (`webGuestChatService.sendGuestWebMessage`, Meta DM webhook), `notifyTelegramChatInbound` loads `telegram_chat_settings` for the conversation property (or first org property with Chat enabled for org-level Meta threads) and sends when `enabled`. `{{chat_source}}` resolves to **Web chat**, **Facebook Messenger**, or **Instagram** from `social_conversations.platform`. Attachment-only messages fill `{{chat_content}}` as `(attachment)` and set `{{attachment_line}}` / `{{attachment_summary}}`.

---

## Permissions

- `RequireAdmin` + `RequireOrgContext` via `PropertyAdminShell`.
- Server: `verifyAdminJwt` on every settings edge function.

---

## Implementation map

| Concern                                            | Path                                                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Page                                               | `ui/src/features/dashboard/bookings/pages/NotificationsPage.tsx`                                            |
| Shared bot token card                              | `…/telegram-notifications/TelegramGlobalBotTokenCard.tsx`                                                   |
| Help dialogs                                       | `…/telegram-notifications/TelegramHelpDialog.tsx`, `…/lib/telegramHelpContent.ts`                           |
| Global bot hook + context                          | `…/hooks/useTelegramGlobalBotToken.ts`, `…/TelegramNotificationsGlobalBotContext.tsx`                       |
| Edge: shared token                                 | `supabase/functions/telegram-global-settings/index.ts`                                                      |
| Chat settings card                                 | `ui/src/features/dashboard/bookings/components/TelegramChatSettingsCard.tsx`                                |
| Chat notify (inbound)                              | `supabase/functions/_shared/telegramChat.ts` → `notifyTelegramChatInbound`                                  |
| Module shell (enable → credentials → manage cards) | `ui/src/features/dashboard/bookings/components/telegram-notifications/TelegramNotificationModuleLayout.tsx` |
| Module loading skeleton                            | `…/TelegramNotificationModuleSkeleton.tsx`                                                                  |
| Manage summary card                                | `…/TelegramSettingsManageCard.tsx`                                                                          |
| Manage / template dialogs                          | `…/TelegramManageDialog.tsx`, `…/TelegramTemplatesManageDialog.tsx`                                         |
| Credential auto-save on Connect                    | `ui/src/features/dashboard/bookings/hooks/useTelegramCredentialAutoSave.ts`                                 |
| Stacked placeholders modal                         | `…/TelegramPlaceholdersNestedDialog.tsx`                                                                    |
| Credentials helpers                                | `…/telegramCredentials.ts`                                                                                  |
| Section nav                                        | `ui/src/features/dashboard/bookings/components/AdminSectionNavLayout.tsx`                                   |
| Dialog stacking (`overlayClassName`)               | `ui/src/components/ui/dialog.tsx`                                                                           |

---

## Related docs

- [Route index](../../README.md)
- [`docs/PROJECT.md`](../../../PROJECT.md)
- [`docs/reference/telegram-marketing-reminders.md`](../../../reference/telegram-marketing-reminders.md)
