# Staff — operator guide

> **Moved:** Staff Telegram settings now live on **[Notifications](./notifications.md)** (`…/notifications?module=staff`).

Route (redirect): `/org/:orgSlug/property/:propertySlug/staff` → `…/notifications?module=staff`

## Implementation map

| Concern     | Path                                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| Settings UI | `ui/src/features/dashboard/bookings/components/TelegramStaffSettingsCard.tsx` |
| Edge        | `supabase/functions/telegram-staff-settings/`                                 |

See [notifications.md](./notifications.md) for the unified page layout and save paths.
