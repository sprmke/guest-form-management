# Guest web chat (`/properties/:propertySlug/messages`)

## Progress overview

| Section      | E2E     | Validation | Docs | Notes                       |
| ------------ | ------- | ---------- | ---- | --------------------------- |
| Contact host | Partial | Yes        | Yes  | Dates + guest auth required |
| Chat thread  | Partial | Yes        | Yes  | Realtime via Supabase       |
| Host inbox   | Partial | Yes        | Yes  | **Web** tab on Guest Inbox  |

**Status:** Documented

## Overview

Pre-booking messaging between an authenticated guest and the property host. Threads are stored in **`social_conversations`** / **`social_messages`** with **`platform = web`** and appear in the org **Guest Inbox** (**Web** platform tab).

**Route:** `/properties/:propertySlug/messages?checkInDate=YYYY-MM-DD&checkOutDate=YYYY-MM-DD`

## Entry (property detail)

1. Guest selects check-in and check-out on **`BookingCard`** (desktop) or calendar (mobile redirect when dates missing).
2. **Contact host** on **`ListingHostCard`** runs **`usePropertyContactHost`** → **`requireGuestAuth`** → navigate to chat URL.
3. Missing/invalid dates → redirect to **`/properties/:propertySlug`** (or calendar when dates missing from CTA).

## Page behavior

| Guard         | Action                                                |
| ------------- | ----------------------------------------------------- |
| Invalid dates | Redirect to property detail                           |
| Not signed in | **`GuestAuthModal`**; resume navigate after OAuth/OTP |
| Signed in     | **`guest-web-chat-start`** upserts thread             |

**UI:** Host header (avatar, name, property + date range), scrollable message list, fixed composer. Guest messages align right; host replies align left.

**Realtime:** Supabase channel on **`social_messages`** for the conversation id (guest RLS).

## API

| Function                  | Method | Auth      | Notes                                         |
| ------------------------- | ------ | --------- | --------------------------------------------- |
| `guest-web-chat-start`    | POST   | Guest JWT | `{ propertySlug, checkInDate, checkOutDate }` |
| `guest-web-chat-messages` | GET    | Guest JWT | `?conversation_id=`; `before` cursor          |
| `guest-web-chat-messages` | POST   | Guest JWT | `{ conversationId, text }`                    |

Host replies use existing **`social-inbox-send`** (web branch — no Meta API).

## Data model

| Column / key           | Value                              |
| ---------------------- | ---------------------------------- |
| `platform`             | `web`                              |
| `external_thread_id`   | `web:{propertyId}:{guestUserId}`   |
| `property_id`          | Listing UUID                       |
| `guest_user_id`        | `auth.users.id`                    |
| `inquiry_check_in/out` | From query params at thread create |
| Guest inbound message  | `direction = inbound`              |
| Host outbound message  | `direction = outbound`             |

One thread per guest + property pair.

## Implementation map

| Area        | Path                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| Page        | `ui/src/features/guest/chat/pages/PropertyChatPage.tsx`                      |
| Thread UI   | `ui/src/features/guest/chat/components/GuestChatThread.tsx`                  |
| Hooks / API | `ui/src/features/guest/chat/hooks/useGuestChat.ts`, `lib/guestChatApi.ts`    |
| CTA hook    | `ui/src/features/guest/marketing/properties/hooks/usePropertyContactHost.ts` |
| Host card   | `ui/src/features/guest/marketing/shared/components/ListingHostCard.tsx`      |
| Edge        | `supabase/functions/guest-web-chat-start/`, `guest-web-chat-messages/`       |
| Shared      | `supabase/functions/_shared/webGuestChatService.ts`                          |
| Migration   | `supabase/migrations/20260719153000_web_guest_chat.sql`                      |
| Host inbox  | `ui/src/features/dashboard/inbox/**` — **Web** tab                           |

## Related

- [properties.md](./properties.md) — property detail + Contact host
- [org/inbox.md](./org/inbox.md) — operator Guest Inbox
- `.cursor/rules/social-inbox.mdc`
