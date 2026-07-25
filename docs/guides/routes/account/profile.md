# Guest account — operator guide

Routes (authenticated explore mode):

- `/account` → redirects to `/account/profile`
- `/account/profile`
- `/account/stays` (legacy `/account/trips` redirects here)
- `/account/wishlist`
- `/account/messages`

> **Status:** Documented — nav avatar + account shell + profile/stays/wishlist/messages.

## Progress overview

| Section    | E2E save | Validation | Docs       | Notes                                        |
| ---------- | -------- | ---------- | ---------- | -------------------------------------------- |
| Nav avatar | —        | —          | Documented | Explore mode only; beside **Become a host?** |
| Profile    | ✅       | Client     | Documented | `guest-profile` + avatar upload              |
| Stays      | ✅       | —          | Documented | `guest-trips`; property rental bookings only |
| Wishlist   | ✅       | —          | Documented | `guest_saved_properties`                     |
| Messages   | ✅       | —          | Documented | Web chat threads → property messages URL     |

---

## Overview

Signed-in guests see a **rounded avatar** in the marketing nav (explore pages only). The dropdown links to account pages. Anonymous guests still use the **checkout auth modal** — no `/for-guests/login` pages.

**Host marketing (`/for-hosts`):** unchanged Sign In / Dashboard CTA — no guest avatar.

---

## Account shell

Explore account routes use a **dashboard-style sidebar** (not horizontal tabs):

- Desktop: sticky card sidebar with avatar, vertical nav + sliding active pill, log out
- Mobile: one marketing header menu (explore links) + **horizontal account nav strip** below the header — no second drawer or hamburger
- Content sits below the fixed marketing nav (`pt-16 lg:pt-20`) so page titles no longer clash with the site header

Sub-nav: Profile · Stays · Wishlist · Messages (log out in sidebar footer)

---

## Profile (`/account/profile`)

- Edit display name, bio, phone, location, profile photo
- API: **`guest-profile`** GET/PATCH, **`upload-guest-profile-asset`** POST
- DB: **`guest_profiles`** (RLS scoped to `auth.uid()`)
- Avatar resolution: profile row → OAuth metadata → initials

---

## Stays (`/account/stays`)

Guest **property rental bookings** linked to the signed-in account — not flights, experiences, or other trip types.

- Lists **`guest_submissions`** for `guest_user_id` or matching **`guest_email`**
- **`submit-form`** sets **`guest_user_id`** when the request includes a valid session JWT
- Cards link to **`/properties/:slug/form?bookingId=`** (pending review) or **`/properties/:slug/sd-form?bookingId=`** when applicable

API: **`guest-trips`** GET (internal name unchanged)

---

## Wishlist (`/account/wishlist`)

- Compact property grid inside **`GuestAccountContentCard`** (same bordered shell as profile / empty state)
- **`WishlistPropertyCard`** — fixed **240px** (`15rem`) grid tracks (explore carousel scale), square thumbnails, compact `text-xs` meta, consistent `gap-3` / `gap-4` spacing; heart unsave opens **confirm dialog** before remove
- Slugs from **`guest_saved_properties`**; same save flow as listing pages

---

## Messages (`/account/messages`)

- Master-detail hub: thread list (left) + inline chat history (right); on mobile, list then conversation with back
- Lists **`social_conversations`** where **`platform=web`**, guest owns the thread (`guest_user_id` or linked `external_participant_id`), and at least one message exists (`subject_preview`)
- Compose in-place via **`guest-web-chat-messages`** POST; realtime updates on **`social_messages`**

API: **`guest-messages`** GET · **`guest-web-chat-messages`** GET/POST

---

## Settings (hidden)

**`/account/settings`** is not linked in nav (redirects to **`/account/profile`**). **`GuestAccountSettingsPage`** remains in the repo for a future pass. Sign out lives in the account sidebar / avatar menu.

## Implementation map

| Concern        | Path                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------- |
| Nav menu       | `ui/src/features/guest/account/components/GuestAccountMenu.tsx`                              |
| Layout + guard | `GuestAccountLayout.tsx`, `GuestAccountSidebar.tsx`, `RequireGuestSession.tsx`               |
| Pages          | `ui/src/features/guest/account/pages/*`, `GuestMessagesHub.tsx`, `GuestMessageThreadRow.tsx` |
| API client     | `ui/src/features/guest/account/lib/guestAccountApi.ts`                                       |
| Edge services  | `supabase/functions/_shared/guestProfileService.ts`                                          |
| Migration      | `supabase/migrations/20260920120000_guest_account_profiles.sql`                              |

---

## Related

- [auth.md](../auth.md) — checkout modal auth
- [properties.md](../properties.md) — save heart / wishlist gate
