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
| Nav avatar | —        | —          | Documented | Explore: guest menu; host: Dashboard avatar  |
| Profile    | ✅       | Client     | Documented | `guest-profile` + avatar upload              |
| Stays      | ✅       | —          | Documented | `guest-trips`; property rental bookings only |
| Wishlist   | ✅       | —          | Documented | `guest_saved_properties`                     |
| Messages   | ✅       | —          | Documented | Web chat threads → property messages URL     |

---

## Overview

Signed-in guests see a **rounded avatar** in the marketing nav (explore pages only). The dropdown links to account pages. Anonymous guests still use the **checkout auth modal** — no `/for-guests/login` pages.

**Host marketing (`/for-hosts`):** signed-in hosts see the same pill + avatar pattern — **Explore** switches to guest mode; avatar menu opens **Dashboard**. Signed-out hosts see **Explore** + **Sign In**.

Stays, Wishlist, and Messages each have their own dedicated guide — see [stays.md](./stays.md), [wishlist.md](./wishlist.md), [messages.md](./messages.md). This guide covers the account shell (nav + sidebar) and the Profile page in full detail.

---

## Host-facing knowledge

Guests manage their own display name, bio, phone, location, and photo from their account — hosts can't edit a guest's profile on their behalf. A guest's profile is separate from any individual booking; changing it doesn't change details already submitted on a booking form.

**Common host questions**

- Q: Can I update a guest's profile photo or bio for them?
  A: No — that's guest-managed. If a booking has the wrong contact info, edit the booking itself rather than the guest's account profile.
- Q: Does updating their profile change their existing bookings?
  A: No. Profile info (name, bio, phone, location, photo) is separate from booking details already submitted.

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

Guest **property rental bookings** linked to the signed-in account. See [stays.md](./stays.md) for the full fields/API/behavior breakdown.

---

## Wishlist (`/account/wishlist`)

Saved-properties grid (the guest's heart/favorites list). See [wishlist.md](./wishlist.md).

---

## Messages (`/account/messages`)

Cross-property web chat inbox hub. See [messages.md](./messages.md).

---

## Settings (hidden)

**`/account/settings`** is not linked in nav (redirects to **`/account/profile`**). **`GuestAccountSettingsPage`** remains in the repo for a future pass. Sign out lives in the account sidebar / avatar menu.

## Implementation map

| Concern        | Path                                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nav menu       | `ui/src/features/guest/account/components/GuestAccountMenu.tsx`                                                                                                                                           |
| Layout + guard | `ui/src/features/guest/account/components/GuestAccountLayout.tsx`, `ui/src/features/guest/account/components/GuestAccountSidebar.tsx`, `ui/src/features/guest/account/components/RequireGuestSession.tsx` |
| Pages          | `ui/src/features/guest/account/pages/*`, `ui/src/features/guest/account/components/GuestMessagesHub.tsx`, `ui/src/features/guest/account/components/GuestMessageThreadRow.tsx`                            |
| API client     | `ui/src/features/guest/account/lib/guestAccountApi.ts`                                                                                                                                                    |
| Edge services  | `supabase/functions/_shared/guestProfileService.ts`                                                                                                                                                       |
| Migration      | `supabase/migrations/20260920120000_guest_account_profiles.sql`                                                                                                                                           |

---

## Related

- [index.md](./index.md) — `/account` redirect
- [stays.md](./stays.md) · [wishlist.md](./wishlist.md) · [messages.md](./messages.md)
- [auth.md](../auth.md) — checkout modal auth
- [properties.md](../properties.md) — save heart / wishlist gate
