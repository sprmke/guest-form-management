---
name: social-inbox
description: Org-level Guest Inbox — Meta OAuth, webhooks, unified threads, quick replies, AI suggest/auto-reply. Use when implementing or extending ui/src/features/inbox or social-inbox / meta-inbox edge functions.
---

# Social Guest Inbox skill

## Route

- **UI:** `/org/:orgSlug/inbox` → `ui/src/features/dashboard/inbox/pages/OrgInboxPage.tsx`
- **Guide:** `docs/guides/routes/org/inbox.md`

## Architecture map

| Layer          | Path                                                    |
| -------------- | ------------------------------------------------------- |
| Types (server) | `supabase/functions/_shared/socialInboxTypes.ts`        |
| DB helpers     | `supabase/functions/_shared/socialInboxService.ts`      |
| Meta Graph     | `supabase/functions/_shared/metaInboxGraph.ts`          |
| Webhook ingest | `supabase/functions/_shared/metaInboxWebhookHandler.ts` |
| AI replies     | `supabase/functions/_shared/socialInboxAiService.ts`    |
| UI API         | `ui/src/features/dashboard/inbox/lib/inboxApi.ts`       |
| UI hooks       | `ui/src/features/dashboard/inbox/hooks/useInbox.ts`     |

## Tabs

1. **Messages** — thread list + conversation composer
2. **Channels** — connect Meta (FB + IG); TikTok/Airbnb coming soon
3. **Quick replies** — `social_reply_templates` CRUD
4. **Automation** — AI suggest vs auto-send toggles

## Connect flow

1. `POST meta-inbox-oauth-start` → Meta OAuth URL
2. `GET meta-inbox-oauth-callback` → store page token, subscribe webhooks, backfill
3. `GET meta-inbox-status` → connection cards

## Inbound flow

1. `POST meta-inbox-webhook` (signed)
2. Dedupe `social_webhook_events`
3. Upsert `social_conversations` + `social_messages`
4. Realtime → UI invalidates TanStack Query

## Outbound flow

1. `POST social-inbox-send` with `org:inbox:reply`
2. Enforce messaging window for DMs
3. Insert outbound row + update conversation `reply_status`

## Related rules

- `.cursor/rules/social-inbox.mdc` — invariants
- `.cursor/skills/meta-messaging/SKILL.md` — Meta App Review + Graph API
- `.cursor/rules/supabase-edge-functions.mdc` — handler skeleton
