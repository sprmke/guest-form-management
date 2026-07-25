# Guest web chat (`/properties/:propertySlug/messages`)

## Progress overview

| Section      | E2E     | Validation | Docs | Notes                                     |
| ------------ | ------- | ---------- | ---- | ----------------------------------------- |
| Contact host | Partial | Yes        | Yes  | Auth on Contact host; dates in chat modal |
| Chat thread  | Partial | Yes        | Yes  | Realtime via Supabase                     |
| Host inbox   | Partial | Yes        | Yes  | **Web** tab on Guest Inbox                |

**Status:** Documented

**Flow spec:** `docs/temp/guest-contact-host-flow.md` (Phase 0 approved Jul 2026).

## Overview

Pre-booking messaging between an authenticated guest and the property host. Threads use **`social_conversations`** / **`social_messages`** with **`platform = web`** and appear in the org **Guest Inbox** (**Web** tab).

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

## API

| Function                  | Method | Auth      | Notes                                                         |
| ------------------------- | ------ | --------- | ------------------------------------------------------------- |
| `guest-web-chat-resume`   | GET    | Guest JWT | `?property_slug=` — existing thread if messages exist         |
| `guest-web-chat-start`    | POST   | Guest JWT | `{ propertySlug, checkInDate, checkOutDate }` — first inquiry |
| `guest-web-chat-messages` | GET    | Guest JWT | `?conversation_id=`; `before` cursor                          |
| `guest-web-chat-messages` | POST   | Guest JWT | `{ conversationId, text }`                                    |

Host replies use **`social-inbox-send`** (web branch).

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

## Implementation map

| Area            | Path                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Sheet (primary) | `ui/src/features/guest/chat/components/ContactHostSheet.tsx`                                                |
| Full page       | `ui/src/features/guest/chat/pages/PropertyChatPage.tsx`                                                     |
| Thread UI       | `ui/src/features/guest/chat/components/GuestChatThread.tsx`                                                 |
| Hooks / API     | `ui/src/features/guest/chat/hooks/useGuestChat.ts`, `lib/guestChatApi.ts`                                   |
| CTA hook        | `ui/src/features/guest/marketing/properties/hooks/usePropertyContactHost.ts`                                |
| Host card       | `ui/src/features/guest/marketing/shared/components/ListingHostCard.tsx`                                     |
| Edge            | `supabase/functions/guest-web-chat-resume/`, `guest-web-chat-start/`, `guest-web-chat-messages/`            |
| Auto-reply      | `supabase/functions/_shared/webInboxAutoReply.ts` — when inbox Automation → Send automatically → Chat is on |
| Migration       | `supabase/migrations/20260719153000_web_guest_chat.sql`                                                     |
| Host inbox      | `ui/src/features/dashboard/inbox/**` — **Web** tab                                                          |

## Related

- [properties.md](./properties.md) — property detail + Contact host
- [org/inbox.md](./org/inbox.md) — operator Guest Inbox
- `.cursor/rules/social-inbox.mdc`
