---
name: social-inbox
description: Guest Inbox at property and parking — Meta OAuth, webhooks, unified threads, quick replies, AI suggest/auto-reply. Use when implementing or extending ui/src/features/dashboard/inbox or social-inbox / meta-inbox edge functions.
---

# Social Guest Inbox skill

## Routes

| Scope    | UI path                                      | Page                    |
| -------- | -------------------------------------------- | ----------------------- |
| Property | `/org/:orgSlug/property/:propertySlug/inbox` | `PropertyInboxPage.tsx` |
| Parking  | `/org/:orgSlug/parking/:parkingSlug/inbox`   | `ParkingInboxPage.tsx`  |

Org `/org/:orgSlug/inbox` redirects to Properties. Shared shell: `InboxPage.tsx`. Guides: `docs/guides/routes/org/property/inbox.md`, `org/parking/inbox.md`.

## Architecture map

| Layer          | Path                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| Types (server) | `supabase/functions/_shared/socialInboxTypes.ts`                          |
| Scope resolve  | `supabase/functions/_shared/metaInboxScope.ts`                            |
| Inbox auth     | `supabase/functions/_shared/inboxAccess.ts`                               |
| DB helpers     | `supabase/functions/_shared/socialInboxService.ts`                        |
| Meta Graph     | `supabase/functions/_shared/metaInboxGraph.ts`                            |
| Connect/life   | `supabase/functions/_shared/metaInboxConnect.ts`, `metaInboxLifecycle.ts` |
| Webhook ingest | `supabase/functions/_shared/metaInboxWebhookHandler.ts`                   |
| AI replies     | `supabase/functions/_shared/socialInboxAiService.ts`                      |
| UI API         | `ui/src/features/dashboard/inbox/lib/inboxApi.ts`                         |
| UI hooks       | `ui/src/features/dashboard/inbox/hooks/useInbox.ts`                       |

## Scope model

- **Org Meta** = `social_channel_connections` with `property_id`/`parking_id` null (default for all units). First property Meta connect creates this when missing.
- **Override** = row with `property_id` or `parking_id` set. Effective connection = override if connected, else org default.
- **Web** at property: `property_id` filter. Parking web guest chat deferred (`parking_id` column ready).
- **Meta threads (1A):** inherited scope shows full org Page thread list + “Using org Meta”.
- **Quick replies / Automation:** org-scoped data; managed from **property** Manage UI (`inbox:manage`). Parking is Channels-only.

Pass `property_id` or `parking_id` on every inbox edge call; `resolveInboxAccess` requires one of them.

## Permissions

| Property / parking |
| ------------------ |
| `inbox:view`       |
| `inbox:reply`      |
| `inbox:manage`     |

## Manage menu

1. **Messages** — property + parking
2. **Channels** — property + parking
3. **Quick replies** / **Automation** — property only (`showSettingsManageTabs`)

## Related rules

- `.cursor/rules/social-inbox.mdc`
- `.cursor/skills/meta-messaging/SKILL.md`
- Plan: `docs/workflow/done/inbox-org-property-parking.md`
