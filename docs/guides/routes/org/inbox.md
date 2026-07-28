# Guest Inbox (`/org/:orgSlug/inbox`)

## Progress overview

| Section       | E2E     | Validation | Docs | Notes                                                                                                 |
| ------------- | ------- | ---------- | ---- | ----------------------------------------------------------------------------------------------------- |
| Messages tab  | Partial | Partial    | Yes  | Facebook Messenger DMs live; Instagram DMs blocked (see Known issues); comments not in thread list UI |
| Channels tab  | Partial | Partial    | Yes  | Meta OAuth + disconnect; Instagram link status incorrect when IG Business is on Page                  |
| Quick replies | Yes     | Yes        | Yes  | 10 default booking templates seeded; no media attachments                                             |
| Automation    | Partial | Yes        | Yes  | Suggest-on-open; auto-send opt-in with per-platform toggles (Facebook, Instagram, Chat)               |

**Status:** Documented (roadmap below is authoritative for next work)

## Overview

Org operators view and reply to guest messages from Facebook Messenger, on-site **Web** chat, and (planned) Instagram DMs in one inbox. Page header: **Guest Inbox** with subtitle _View and reply to guest messages from connected channels._ TikTok and Airbnb appear as **Coming soon** until partner APIs are available.

**Route:** `/org/:orgSlug/inbox`

**Deep link:** `?conversationId=<uuid>` selects that thread (and opens the conversation pane on mobile). Optional `?platform=web|facebook|instagram` sets the platform tab filter. Telegram Chat notifications use `conversationId` + `platform=web`.

## Permissions

| Permission         | UI                                                                       |
| ------------------ | ------------------------------------------------------------------------ |
| `org:inbox:view`   | Open inbox, read threads, scroll-sync (`meta-inbox-backfill` light mode) |
| `org:inbox:reply`  | Send replies, AI suggest                                                 |
| `org:inbox:manage` | Channels connect/disconnect, quick replies, automation, full backfill    |

## Sections (current behavior)

### Messages (main view)

- Full-height split layout: thread list + conversation
- **Platform tabs** — All, **Web**, Facebook, Instagram (Instagram tab shows no live threads until IG connect bug is fixed)
- **Filters** — status row (All / Unread / Pending / Replied) + type popover (Chats / Comments)
- **Search** — server-side on **synced DB rows only** (guest name, preview, message body); debounced 300ms. Does **not** search Meta-wide or unscrolled history. Empty state explains when `metaHasMore` is true.
- **Infinite scroll** — 40 threads/page from DB; when DB cursor is exhausted and `metaHasMore`, scroll calls `meta-inbox-backfill` (`light: true`) then lists next DB page
- **Load earlier messages** in conversation view (`before` cursor, 50 per page); scroll to top auto-loads more when available
- Media-only messages: Graph attachment metadata fetched on message load when missing (up to 12 per request); new backfills include `attachments` fields
- Inbound attachment URLs render inline; **images/videos open in preview modal**
- Outbound replies are **text only** today
- **Desktop notifications** when tab is in background (browser permission; uses system sound where supported)
- Realtime via Supabase on `social_messages` / `social_conversations` (RLS: org owner or org ADMIN; guests read own web threads)
- Webhook preserves `participant_name` from backfill; resolves sender name via Graph when missing on new threads

### Settings (header buttons → modals)

- **Channels** — Meta block (Facebook Messenger + Instagram DMs): Connect / Reconnect / Disconnect. Disconnect hard-deletes Meta connections, OAuth picker state, and all Facebook/Instagram conversations for the org. Connect/Reconnect wipes prior Meta inbox data before saving the new Page token. Initial connect syncs **one** Graph page (~25–50 conversations); older threads load on scroll. Multi-Page OAuth → **Choose Facebook Page** dialog. TikTok/Airbnb coming soon (Preview in mock mode).
- **Quick replies** — CRUD on `social_reply_templates`; **10 default templates** auto-seeded when org has none (on Meta connect + first Quick replies open). Platform filter All / Facebook / Instagram.
- **Automation** — **Manage AI response** row opens a nested modal (`InboxAiResponseDialog`) editing free-text `aiSystemPrompt` (org instructions layered on top of the base prompt — never replaces Known facts/quick-reply guidance or the safety policy); includes a **Reset to default** button that fills a starter template. Composer still has a manual **Suggest** (sparkles) button per-thread — there is no auto-fill-on-open toggle. **Send automatically** is opt-in (`auto_reply_mode=send`); when enabled, per-platform toggles for Facebook, Instagram, and **Chat** (`platform_toggles.web`). Web auto-reply fires after guest sends via `guest-web-chat-messages` (no Meta 24h window). Settings GET/PATCH returns **`aiAvailable`** / **`aiError`** when Gemini/Groq keys are missing or invalid.

## API reference

| Function                    | Method    | Notes                                                                                             |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `meta-inbox-oauth-start`    | POST      | Returns OAuth URL                                                                                 |
| `meta-inbox-oauth-callback` | GET       | Public redirect                                                                                   |
| `meta-inbox-oauth-pages`    | GET       | Pending Pages for picker                                                                          |
| `meta-inbox-oauth-complete` | POST      | Connect selected Page                                                                             |
| `meta-inbox-backfill`       | POST      | One Graph page per request; `light: true` for scroll sync                                         |
| `meta-inbox-status`         | GET       | Connections; `metaSyncInProgress` / `metaHasMore`                                                 |
| `meta-inbox-disconnect`     | POST      | Disconnect Meta                                                                                   |
| `meta-inbox-webhook`        | GET/POST  | Meta events (DMs, comments webhook handlers exist)                                                |
| `social-inbox-threads`      | GET       | DB-only list (`limit`, `cursor`, `search`); returns `metaHasMore`                                 |
| `social-inbox-messages`     | GET/POST  | Messages (`before` + `hasMore`) / mark read                                                       |
| `social-inbox-send`         | POST      | Text reply to DM or comment                                                                       |
| `social-inbox-templates`    | CRUD      | Quick replies                                                                                     |
| `social-inbox-ai-suggest`   | POST      | AI draft with guest-safe property/org grounding + output guard; returns `{ suggestion, flagged }` |
| `social-inbox-settings`     | GET/PATCH | Automation toggles                                                                                |

## Implementation map

| Area         | Path                                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page         | `ui/src/features/dashboard/inbox/pages/OrgInboxPage.tsx`                                                                                                                                                                             |
| Thread list  | `ui/src/features/dashboard/inbox/components/InboxThreadList.tsx`                                                                                                                                                                     |
| Conversation | `ui/src/features/dashboard/inbox/components/InboxConversationView.tsx`                                                                                                                                                               |
| Channels     | `ui/src/features/dashboard/inbox/components/InboxChannelsTab.tsx`                                                                                                                                                                    |
| Hooks        | `ui/src/features/dashboard/inbox/hooks/useInbox.ts`                                                                                                                                                                                  |
| API client   | `ui/src/features/dashboard/inbox/lib/inboxApi.ts`                                                                                                                                                                                    |
| Mock data    | `ui/src/features/dashboard/inbox/lib/inboxMockData.ts`, `inboxMockStore.ts`, `inboxMockMode.ts`                                                                                                                                      |
| Webhook      | `supabase/functions/meta-inbox-webhook/index.ts`                                                                                                                                                                                     |
| Shared       | `supabase/functions/_shared/socialInboxService.ts`, `metaInboxGraph.ts`, `metaInboxBackfill.ts`, `metaInboxAutoReply.ts`, `metaInboxWebhookHandler.ts`, `inboxAiGuestContext.ts`, `inboxAiSafetyGuard.ts`, `socialInboxAiService.ts` |
| Migrations   | `20260910120000_social_inbox.sql`, `20260914120000_social_inbox_meta_backfill_state.sql`, `20260914130000_social_inbox_meta_backfill_done.sql`                                                                                       |
| E2E runbook  | `docs/operations/inbox-e2e-runbook.md`                                                                                                                                                                                               |

## Backend notes

- DM `external_thread_id` = `{platform}:{participantId}`; legacy Meta conversation IDs migrated on connect/webhook.
- OAuth persists Page token immediately; **initial** backfill = one Graph page via `meta-inbox-backfill`; further pages on scroll (`light: true`) then `social-inbox-threads` (DB-only).
- Comment webhooks (`handleMetaFeedWebhook`, `handleMetaIgCommentWebhook`) write `conversation_type = 'comment'` rows, but the Messages UI does not surface them in the thread list yet (type filter exists; no comment threads synced from typical DM-only backfill).

### AI grounding & guard

`suggestInboxReply` (`socialInboxAiService.ts`) loads guest-safe facts before every Gemini/Groq call:

| Layer   | Module                    | Role                                                                                                                         |
| ------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Context | `inboxAiGuestContext.ts`  | Org active properties; property rates/amenities/rules/cancellation/payment/location; blocked dates; org quick reply snippets |
| Guard   | `inboxAiSafetyGuard.ts`   | Intent-aware: allow normal guest topics; block other-guest PII, owner finance, internal ops; reject ungrounded PHP amounts   |
| Prompt  | `socialInboxAiService.ts` | Injects `Known facts` block; prefers property facts, then quick replies; fallback copy when flagged                          |

**Scope:** uses `social_conversations.property_id` when set (web chat). Meta threads without property fall back to org property list (single property auto-expands full facts). When `inquiry_check_in/out` are set, facts include computed availability + estimated stay total for those dates.

**Fact priority:** property settings (rates, address, map link, payment methods with account name/number, cancellation title + description, today availability) → org **Quick reply** templates (`social_reply_templates`, platform-filtered) when property facts do not cover the question.

**Allowed:** weekday/weekend rates, fees, holiday % rules, amenities, house rules, full address/residence/tower/unit/floor, map link, payment methods (including GCash account name/number/QR context), cancellation policy, today/immediate availability, inquiry-date quote, booking/calendar URLs, quick reply snippets.

**Intent-aware guard:** normal inquiries (availability, rates, payment, location, cancellation, parking, pets, check-in/out) should be answered from facts — not refused. Sensitive inquiries (other guests, owner revenue/profit, internal ops) → polite decline is allowed; finance data in reply is blocked.

**Denied:** other guests' bookings/PII, owner finance, maintenance, Telegram/internal settings, secrets, ungrounded prices.

**Org custom instructions (`ai_system_prompt`, managed via Automation → Manage AI response):** layered on top of the base prompt and Known facts/quick-reply guidance — never replaces them, so a host's free-text tone/context notes cannot suppress the safety policy or fact grounding.

**API:** `social-inbox-ai-suggest` returns `{ suggestion, flagged }`. UI shows **AI declined to answer** when `flagged: true`.

---

## Known issues (fix before new features)

| Issue                          | Symptom                                                                                      | Likely cause / fix direction                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Instagram not linked           | Channels shows **Not linked to your Facebook Page** even when Page has IG Business account   | `meta-inbox-status` / connect flow not detecting or persisting `instagram_business_account`; verify `persistMetaPageConnection` + status card reads `instagram` connection row |
| Search misses guests           | Guest exists on Facebook but search returns empty until thread is scroll-loaded              | Search is DB-only; depends on backfill coverage (see Roadmap § Sync)                                                                                                           |
| Pending filter infinite loader | 3–5 pending threads but bottom spinner keeps loading                                         | **Fixed:** Meta scroll-sync disabled when status/type/platform/search filters active                                                                                           |
| Comments invisible             | Only DMs in list; FB/IG comment webhooks write DB rows but operators cannot view/reply in UI | Thread list + send path need comment thread type end-to-end                                                                                                                    |
| Auto-send vs suggest           | Automation can send without operator review                                                  | **Fixed:** suggest-on-open default path; auto-send opt-in only                                                                                                                 |

---

## Roadmap & next goals

Prioritized themes for Guest Inbox v2. Check items in [`docs/todos/`](../../../todos/README.md) as they ship.

### P0 — Platform reliability & data foundation

1. **Instagram DMs working** — _Blocked until Meta App Review / Advanced Access._
2. **Background conversation sync** — Stop relying on scroll-triggered Graph calls on every session. Options (pick one in implementation):
   - **A.** Post-connect + scheduled `meta-inbox-backfill` worker until `meta_backfill_done`, persisting all threads/messages to DB.
   - **B.** Incremental cron/webhook-only with periodic catch-up job.
   - Goal: page refresh reads from DB only; no perceived “reload from Meta” on open.
3. **Full search after sync** — Once (2) is done, search/filter/query entire org inbox in DB (name, preview, message body) without “not loaded yet” empty state.
4. **Pending / status filter scroll bug** — Fix infinite `fetchNextPage` when filtered result set is small but `metaHasMore` is true (do not chain Meta sync for filtered queries, or stop when page returns `< limit` rows).
5. **Connect / disconnect hardening** — Audit for hangs, duplicate backfill, stale tokens, partial cleanup, race between webhook + backfill + disconnect. Document idempotent disconnect (connections, conversations, messages, webhook events, OAuth state, backfill columns). Add operator-visible error recovery (Reconnect) without zombie sync state.

### P1 — Messaging & media

6. **Outbound media** — Send photos/videos in DMs per Meta attachment APIs (size/type limits, 24h window). Composer attachment picker + upload to Meta send payload.
7. **Inbound media lightbox** — ~~Click image → modal preview~~ **Done** (`InboxMediaPreviewDialog`).
8. **Facebook + Instagram comments** — List `conversation_type=comment` in thread list; reply / private reply per Meta rules; link to post URL (`linked_post_url`).

### P2 — Quick replies & automation

9. **Default quick replies** — ~~Seed **10** org-level templates~~ **Done** (`inboxDefaultQuickReplies.ts`).
10. **Quick reply media** — Attach image/video per template; send as Meta attachment bundle with template text.
11. **Automation: suggest-first** — ~~Remove default auto-send~~ **Done:** suggest-on-open toggle; auto-send opt-in.
12. **AI with property/booking context** — **Done:** scoped facts injection + output guard (`inboxAiGuestContext.ts`, `inboxAiSafetyGuard.ts`). Allowed: property details, public availability ranges, published rates/fees/holiday rules, amenities, house rules, cancellation policy, booking form link. Denied: other guests' PII, finance, maintenance, internal fields. Returns `{ suggestion, flagged }` on suggest.
13. **AI property showcase images** — When AI suggests replies, optionally attach curated property/amenity images from `app_settings` / property media (operator-configured set per org/property).

### P3 — Booking ↔ Inbox integration

14. **Booking detail → Inbox** — On `/org/.../bookings/:bookingId`, quick action to open linked guest thread or search/connect convo (dropdown of inbox threads by name/platform); persist `booking_id` ↔ `social_conversations.id` (new FK or `guest_inbox_links` table).
15. **Inbox → Booking detail** — Conversation header: “View booking” when linked; badge on thread row for booked guests; unlinked threads show “Link booking” search.
16. **Match heuristics** — Suggest link by Facebook name, phone, email overlap with `guest_submissions` (never auto-link without confirm).

### P4 — AI intelligence & outreach

17. **Conversation intelligence** — Per-thread AI summary; flags: high booking potential, needs follow-up, stale thread, complaint, etc. Toast/banner in conversation view with actions (Mark follow-up, Dismiss, Snooze).
18. **Scheduled broadcast** — Weekly or cron-based broadcast to segmented threads (e.g. past inquiries, open leads) via Meta send API; org-configurable schedule + template; audit log + rate limits.
19. **App notifications** — ~~Browser push when tab hidden~~ **Partial:** desktop Notification API on inbound message; dedicated sound toggle TBD.

### P5 — Additional platforms

20. **Airbnb** — Requires Homes API / partnership; placeholder UI until API access.
21. **TikTok Business Messaging** — After API approval; same inbox abstraction (`social_channel_connections.platform`).

---

## Data model extensions (planned)

| Addition                                                                 | Purpose                        |
| ------------------------------------------------------------------------ | ------------------------------ |
| `social_conversations.booking_id` (nullable FK) or `inbox_booking_links` | Bidirectional booking ↔ thread |
| `social_reply_templates.attachments` (JSON)                              | Quick reply media              |
| `social_conversations.ai_flags` / `conversation_insights` table          | Lead score, follow-up, summary |
| `social_broadcast_jobs`                                                  | Scheduled broadcast queue      |
| `social_inbox_settings.notification_*`                                   | Sound, desktop notify toggles  |

---

## Chat UX roadmap (guest web + inbox)

Shared bubble components: `ui/src/components/chat/*`. Full phase list: **`docs/guides/routes/properties/chat.md`** § UX roadmap and **[`docs/todos/`](../../../todos/README.md)**.

| Phase | Inbox impact                                                                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Timestamps, date pills, sent ✓ on outbound, AI “Automated” label — **shipped**                                                                             |
| **2** | Read receipts; mark-read on open; Realtime UPDATE — **shipped**                                                                                            |
| **3** | Host edit outbound until guest read/reply; Edit/Unsend hidden when unavailable — **shipped**                                                               |
| **4** | Reply-to with quote in composer + bubble — **shipped** (Meta `reply_to.mid` on FB/IG DMs)                                                                  |
| **5** | Typing (web Broadcast), guest attachments + upload, in-thread search (floating bar below header; highlight + prev/next), offline guest email — **shipped** |
| **6** | Guest awaiting-reply badge; Chat quick-reply group + composer on web threads — **shipped**                                                                 |

---

## Related docs

- `.cursor/rules/social-inbox.mdc`
- `docs/operations/meta-app-review.md`
- `docs/operations/inbox-e2e-runbook.md`
- [`docs/todos/README.md`](../../../todos/README.md) — Guest Inbox backlog on GitHub ([#108](https://github.com/sprmke/kame-homes/issues/108))

## Pending / follow-ups (legacy checklist)

- [ ] **Operator E2E** — `docs/operations/inbox-e2e-runbook.md` (Meta OAuth, webhook tunnel, Connect → reply)
- [ ] Meta App Review (Advanced Access) — `docs/operations/meta-app-review.md`
- [ ] Property-level channel overrides
- [ ] See **Roadmap** above for v2 scope (Instagram fix, full sync, media, comments, booking link, AI, broadcast, notifications)
