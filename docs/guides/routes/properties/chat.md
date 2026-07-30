# Guest web chat (`/properties/:propertySlug/messages`)

Route: `/properties/:propertySlug/messages`

> **Status:** Documented

## Progress overview

| Section      | E2E     | Validation | Docs | Notes                                       |
| ------------ | ------- | ---------- | ---- | ------------------------------------------- |
| Contact host | Partial | Yes        | Yes  | Auth on Contact host; dates in chat modal   |
| Chat thread  | Partial | Yes        | Yes  | Phase 1 bubble UX shipped; see § UX roadmap |
| Host inbox   | Partial | Yes        | Yes  | **Web** tab on Guest Inbox                  |

**Flow spec:** `docs/temp/guest-contact-host-flow.md` (Phase 0 approved Jul 2026).

## Overview

Pre-booking messaging between an authenticated guest and the property host. Threads use **`social_conversations`** / **`social_messages`** with **`platform = web`** and appear in the org **Guest Inbox** (**Web** tab).

---

## Host-facing knowledge

Guests message you from a property listing before they book — first through a chat popup, then optionally on a full messages page. You reply from Guest Inbox like other channels.

**Common host questions**

- Q: Do guests need to pick dates before messaging me?
  A: The first time they contact you about a listing, yes — return visits can open the thread without picking dates again.
- Q: Is messaging the same as confirming a booking?
  A: No — chatting does not hold dates or create a reservation; guests still use Reserve for that.
- Q: Where do I see and answer these messages?
  A: In Guest Inbox under the Web tab, alongside your other guest conversations.

---

## Entry (property detail) — primary

1. **Contact host** on **`ListingHostCard`** → **`GuestAuthModal`** if signed out, then centered **`ContactHostSheet`** chat modal.
2. **First inquiry:** if no prior messages with this host on this property, **`BookingCalendarModal`** is required before the first send.
3. **Return visit:** existing thread loads via **`guest-web-chat-resume`** — dates optional; chat history shows immediately.
4. Guest composes message → **Send** → thread stays in modal.

**Reserve** remains separate: dates → auth → **`/properties/:slug/form`** (never chat).

## Full-screen route (return visits)

**Route:** `/properties/:propertySlug/messages?checkInDate=YYYY-MM-DD&checkOutDate=YYYY-MM-DD`

| Guard         | Action                                             |
| ------------- | -------------------------------------------------- |
| Invalid dates | Redirect to property with `?pickDates=contactHost` |
| Not signed in | **`GuestAuthModal`**; resume to messages URL       |
| Signed in     | **`guest-web-chat-start`** + thread UI             |

Use for deep links, **Open full chat**, and future guest Messages hub — not first-time Contact host entry.

## Page behavior (full-screen)

**UI:** Host header, scrollable messages, composer. Guest messages align right; host replies align left.

**Realtime:** Supabase channel on **`social_messages`** (guest RLS).

**Voice receptionist:** when enabled (global + property), the header ⋮ menu shows **Talk to
receptionist**, opening a full-screen `VoiceSessionOverlay` (Gemini Live, mic in / audio out,
procedural turtle avatar today, live captions, session countdown). On end, timeout, or error the
transcript is batch-written into this same thread as `social_messages` rows with
`source_mode='voice'` — voice turns show inline with text history in both the guest thread and
host Guest Inbox.

**Planned polish (Phase 6 — not shipped yet):** faster speech detection + AI turn latency, explicit
listening/thinking/speaking UX (brass ring / waveform), then replace the turtle with a free
browser **TalkingHead + VRM** humanoid lip-sync avatar. See plan § Phase 6 in
`docs/planning/planned_modules/2026-07-30-ai-voice-receptionist.md`.

## API

| Function                   | Method | Auth      | Notes                                                                                                                                                         |
| -------------------------- | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guest-web-chat-resume`    | GET    | Guest JWT | `?property_slug=` — existing thread if messages exist; also returns `voiceReceptionistEnabled`                                                                |
| `guest-web-chat-start`     | POST   | Guest JWT | `{ propertySlug, checkInDate, checkOutDate }` — first inquiry; also returns `voiceReceptionistEnabled`                                                        |
| `guest-web-chat-messages`  | GET    | Guest JWT | `?conversation_id=`; `before` cursor; returns `replyStatus` on first page load                                                                                |
| `guest-web-chat-messages`  | POST   | Guest JWT | `{ conversationId, text?, attachments?, replyToMessageId? }`, `{ action: 'mark_read', conversationId }`, or `{ action: 'unsend', conversationId, messageId }` |
| `guest-web-chat-messages`  | PATCH  | Guest JWT | `{ conversationId, messageId, text }` — edit own inbound until host read or reply                                                                             |
| `upload-guest-chat-asset`  | POST   | Guest JWT | Multipart file → **`guest-chat-attachments`** bucket; returns `{ kind, url, label? }` for send payload                                                        |
| `voice-receptionist-start` | POST   | Guest JWT | `{ propertySlug }` → `{ ephemeralToken, sessionId, model, voiceId, maxSessionSeconds }` (Gemini Live)                                                         |
| `voice-receptionist-tool`  | POST   | Guest JWT | `{ sessionId, topic }` — property-fact tool call from the live model                                                                                          |
| `voice-receptionist-end`   | POST   | Guest JWT | `{ sessionId, endReason, transcript }` — ends the session row + batch-writes transcript to `social_messages` (`source_mode='voice'`)                          |

Host replies use **`social-inbox-send`** (web branch). When the guest is offline, host web replies trigger **`guestChatEmail.ts`** → Resend **`guest-chat-reply.html`** (deduped via **`social_messages.guest_reply_email_sent_at`**).

**Realtime typing:** Supabase Broadcast channel **`chat-typing:{conversationId}`** (guest ↔ host; not persisted).

**Attachments:** JPEG/PNG/WebP/PDF up to 10 MB via **`upload-guest-chat-asset`**; stored in **`guest-chat-attachments`**; referenced on send as JSON `{ kind, url, label? }`.

**In-thread search:** Compact search control in the **chat header** (guest) or inbox conversation header (host). Opens a **dedicated search row** below the header (same bar as host inbox) with match counter, up/down navigation, and in-bubble highlights. Header identity stays visible while searching.

## Data model

| Column / key           | Value                               |
| ---------------------- | ----------------------------------- |
| `platform`             | `web`                               |
| `external_thread_id`   | `web:{propertyId}:{guestUserId}`    |
| `property_id`          | Listing UUID                        |
| `guest_user_id`        | `auth.users.id`                     |
| `inquiry_check_in/out` | From inquiry dates at thread create |
| Guest inbound message  | `direction = inbound`               |
| Host outbound message  | `direction = outbound`              |

One thread per guest + property pair.

## UX roadmap

Shared components: `ui/src/components/chat/*`, `ui/src/lib/chat/chatMessageFormat.ts`.

| Phase | Focus                                                                                                   | Status      |
| ----- | ------------------------------------------------------------------------------------------------------- | ----------- |
| **1** | Timestamps, date separators, shared bubble, guest optimistic send, sent ✓, AI badge                     | **Shipped** |
| **2** | Read receipts, mark-read, delivery lifecycle, Realtime UPDATE, guest unread                             | **Shipped** |
| **3** | Edit until read/reply, “Edited” label; Edit/Unsend hidden in ⋮ when unavailable (no error toast)        | **Shipped** |
| **4** | Reply-to-message with quote                                                                             | **Shipped** |
| **5** | Typing, guest attachments, search, offline notify                                                       | **Shipped** |
| **6** | Awaiting-reply badge when `reply_status=pending`; Chat quick-reply group in inbox composer + management | **Shipped** |

Backlog: [GitHub Issue #110 — Epic 10](https://github.com/sprmke/kame-homes/issues/110) (**Guest ↔ host chat**).

## Implementation map

| Area            | Path                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sheet (primary) | `ui/src/features/guest/chat/components/ContactHostSheet.tsx`                                                                                            |
| Full page       | `ui/src/features/guest/chat/pages/PropertyChatPage.tsx`                                                                                                 |
| Thread UI       | `ui/src/features/guest/chat/components/GuestChatThread.tsx`, `GuestChatHeaderBar.tsx`                                                                   |
| Shared bubble   | `ui/src/components/chat/ChatMessageBubble.tsx`, `ChatMessageList.tsx`, `ChatDateSeparator.tsx`, `ChatThreadSearch.tsx`, `ChatHighlightedText.tsx`       |
| Format helpers  | `ui/src/lib/chat/chatMessageFormat.ts`, `useChatTyping.ts`, `useChatThreadSearch.ts`, `chatThreadSearch.ts`, `chatAttachments.ts`                       |
| Hooks / API     | `ui/src/features/guest/chat/hooks/useGuestChat.ts`, `lib/guestChatApi.ts`                                                                               |
| Voice UI        | `ui/src/features/guest/chat/components/voice/ReceptionistAvatar.tsx`, `VoiceSessionOverlay.tsx`                                                         |
| Voice hooks/API | `ui/src/features/guest/chat/hooks/useVoiceSession.ts`, `lib/voiceReceptionistApi.ts`, `lib/voiceAudioCodec.ts`, `public/worklets/voice-pcm-recorder.js` |
| Voice edge      | `supabase/functions/voice-receptionist-start/`, `voice-receptionist-tool/`, `voice-receptionist-end/`, `_shared/voiceReceptionistService.ts`            |
| CTA hook        | `ui/src/features/guest/marketing/properties/hooks/usePropertyContactHost.ts`                                                                            |
| Host card       | `ui/src/features/guest/marketing/shared/components/ListingHostCard.tsx`                                                                                 |
| Edge            | `supabase/functions/guest-web-chat-resume/`, `guest-web-chat-start/`, `guest-web-chat-messages/`, `upload-guest-chat-asset/`                            |
| Lifecycle       | `supabase/functions/_shared/chatMessageLifecycle.ts`, `guestChatAttachments.ts`, `guestChatEmail.ts` — read, edit, reply, attachments, offline notify   |
| Auto-reply      | `supabase/functions/_shared/webInboxAutoReply.ts` — when inbox Automation → Send automatically → Chat is on                                             |
| Migration       | `20260719153000_web_guest_chat.sql`, `20260927120000_chat_message_lifecycle.sql`, `20260928120000_chat_phase5.sql`                                      |
| Host inbox      | `ui/src/features/dashboard/inbox/**` — **Web** tab                                                                                                      |

## Related

- [properties.md](./properties.md) — property detail + Contact host
- [org/inbox.md](./org/inbox.md) — operator Guest Inbox
- `.cursor/rules/social-inbox.mdc`
