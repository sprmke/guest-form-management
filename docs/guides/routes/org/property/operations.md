# Operations — operator guide

> **Moved:** Operations workflow Telegram settings now live on **[Notifications](./notifications.md)** (`…/notifications?module=operations`).

Route (redirect): `/org/:orgSlug/property/:propertySlug/operations` → `…/notifications?module=operations`

## Implementation map

| Concern     | Path                                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| Settings UI | `ui/src/features/dashboard/bookings/components/TelegramAdminSettingsCard.tsx` |
| Edge        | `supabase/functions/telegram-admin-settings/`                                 |

See [notifications.md](./notifications.md) for the unified page layout and save paths.
