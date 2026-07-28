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
| AI grounding   | `supabase/functions/_shared/inboxAiGuestContext.ts`     |
| AI guard       | `supabase/functions/_shared/inboxAiSafetyGuard.ts`      |
| Web auto-reply | `supabase/functions/_shared/webInboxAutoReply.ts`       |
| Web guest chat | `supabase/functions/_shared/webGuestChatService.ts`     |
| UI API         | `ui/src/features/dashboard/inbox/lib/inboxApi.ts`       |
| UI hooks       | `ui/src/features/dashboard/inbox/hooks/useInbox.ts`     |

## Tabs

1. **Messages** — thread list + conversation composer
2. **Channels** — connect Meta (FB + IG); TikTok/Airbnb coming soon
3. **Quick replies** — `social_reply_templates` CRUD
4. **Automation** — AI suggest vs auto-send toggles; per-platform toggles include **Chat** (`platform_toggles.web`)

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
2. Enforce messaging window for DMs (**Meta only**)
3. Insert outbound row + update conversation `reply_status`

## Web guest inbound + auto-reply

1. Guest `POST guest-web-chat-messages` → inbound row + `last_inbound_at`
2. If automation `auto_reply_mode=send` and `platform_toggles.web !== false`, `maybeAutoReplyToWebInbound` sends AI outbound (no Meta window)
3. Realtime → guest chat + host inbox

## AI suggest / auto-reply grounding

Before Gemini/Groq, `suggestInboxReply` loads facts via `buildAiGroundingFacts`:

1. **Property settings** — rates, address/map, payment methods (incl. account name/number), cancellation, amenities, availability
2. **Quick replies** — org `social_reply_templates` (platform-filtered) as fallback when property facts do not cover the question
3. **Guard** — `classifyGuestInquiryIntent` + `assertSafeGuestReply`; normal guest topics (payment, location, cancellation, availability) should answer; block other-guest PII, owner finance, ungrounded prices

Returns `{ suggestion, flagged }`; flagged → safe fallback + operator badge.

## Related rules

- `.cursor/rules/social-inbox.mdc` — invariants
- `.cursor/skills/meta-messaging/SKILL.md` — Meta App Review + Graph API
- `.cursor/rules/supabase-edge-functions.mdc` — handler skeleton
