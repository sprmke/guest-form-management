---
name: social-inbox
description: Guest Inbox at org, property, and parking — Meta OAuth, webhooks, unified threads, quick replies, AI suggest/auto-reply. Use when implementing or extending ui/src/features/dashboard/inbox or social-inbox / meta-inbox edge functions.
---

# Social Guest Inbox skill

## Routes

| Scope    | UI path                                      | Page                    |
| -------- | -------------------------------------------- | ----------------------- |
| Org      | `/org/:orgSlug/inbox`                        | `OrgInboxPage.tsx`      |
| Property | `/org/:orgSlug/property/:propertySlug/inbox` | `PropertyInboxPage.tsx` |
| Parking  | `/org/:orgSlug/parking/:parkingSlug/inbox`   | `ParkingInboxPage.tsx`  |

Shared shell: `InboxPage.tsx`. Guides: `docs/guides/routes/org/inbox.md`, `org/property/inbox.md`, `org/parking/inbox.md`.

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

- **Org Meta** = `social_channel_connections` with `property_id`/`parking_id` null (default for all units).
- **Override** = row with `property_id` or `parking_id` set. Effective connection = override if connected, else org default.
- **Web** at property: `property_id` filter. Parking web guest chat deferred (`parking_id` column ready).
- **Meta threads (1A):** inherited scope shows full org Page thread list + “Using org Meta”.
- **Quick replies / Automation / Marketing publish:** org-only (org Meta connection).

Pass `property_id` or `parking_id` on inbox edge calls; `resolveInboxAccess` picks org vs property vs parking perms.

## Permissions

| Org                | Property / parking |
| ------------------ | ------------------ |
| `org:inbox:view`   | `inbox:view`       |
| `org:inbox:reply`  | `inbox:reply`      |
| `org:inbox:manage` | `inbox:manage`     |

## Tabs

1. **Messages** — all scopes
2. **Channels** — all scopes (org default vs override)
3. **Quick replies** / **Automation** — org only

## Related rules

- `.cursor/rules/social-inbox.mdc`
- `.cursor/skills/meta-messaging/SKILL.md`
- Plan: `docs/workflow/done/inbox-org-property-parking.md`
