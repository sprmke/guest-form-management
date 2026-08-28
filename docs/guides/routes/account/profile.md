---
title: 'Guest account — operator guide'
status: active
tags: [guides, routes, account]
updated: 2026-08-26
---

# Guest account — operator guide

Routes (authenticated explore mode):

- `/account` → redirects to `/account/profile`
- `/account/profile`
- `/account/stays` (legacy `/account/messages` and `/account/trips` redirect here)
- `/account/favorites` (legacy `/account/wishlist` redirects here)
- `/account/tickets` (+ `/new`, `/:ticketId`)

> **Status:** Documented — nav avatar + account shell + profile/stays/favorites/tickets.

## Progress overview

| Section    | E2E save | Validation      | Docs       | Notes                                                                               |
| ---------- | -------- | --------------- | ---------- | ----------------------------------------------------------------------------------- |
| Nav avatar | —        | —               | Documented | Explore: guest menu (Host + Explore groups when org access); host: Dashboard avatar |
| Profile    | ✅       | Client + server | Documented | `guest-profile` + avatar upload; PH mobile phone; Google Places location            |
| Stays      | ✅       | —               | Documented | Cross-property web chat hub (`guest-messages`)                                      |
| Favorites  | ✅       | —               | Documented | `guest_saved_properties`                                                            |
| Tickets    | ✅       | Server          | Documented | Explore Contact tickets — [tickets.md](./tickets.md)                                |

---

## Overview

Signed-in guests see a **rounded avatar** in the marketing nav (explore pages only). The dropdown links to account pages. Guests who also own or belong to a host organization see a **Host** section with **Dashboard** above the **Explore** links (Profile · Stays · Favorites · Tickets). **Dashboard** from explore runs the global mode-switch curtain, then opens the org dashboard; from host marketing (`/for-hosts`) it navigates directly. Anonymous guests still use the **checkout auth modal** — no `/for-guests/login` pages.

**Host marketing (`/for-hosts`):** signed-in hosts see the same pill + avatar pattern — **Explore** switches to guest mode; avatar menu opens **Dashboard**. Signed-out hosts see **Explore** + **Sign In**.

Stays, Favorites, and Tickets each have their own dedicated guide — see [stays.md](./stays.md), [favorites.md](./favorites.md), [tickets.md](./tickets.md). This guide covers the account shell (nav + sidebar) and the Profile page in full detail.

---

## Host-facing knowledge

Guests manage their own display name, bio, phone, location, and photo from their account. Hosts can't edit a guest's profile on their behalf. A guest's profile is separate from any individual booking; changing it doesn't change details already submitted on a booking form.

**Common host questions**

- Q: Can I update a guest's profile photo or bio for them?
  A: No, that's guest-managed. If a booking has the wrong contact info, edit the booking itself rather than the guest's account profile.
- Q: Does updating their profile change their existing bookings?
  A: No. Profile info (name, bio, phone, location, photo) is separate from booking details already submitted.

---

## Account shell

Explore account routes use a **dashboard-style sidebar** (not horizontal tabs):

- Desktop: sticky card sidebar with avatar, vertical nav + sliding active pill, log out
- Mobile: one marketing header menu (explore links) + **horizontal account nav strip** below the header — no second drawer or hamburger
- Content sits below the fixed marketing nav (`pt-16 lg:pt-20`) so page titles no longer clash with the site header

Sub-nav: Profile · Stays · Favorites · Tickets (log out in sidebar footer)

---

## Profile (`/account/profile`)

- Edit display name, bio, phone, location, profile photo
- Same form opens from the **host dashboard** sidebar account menu → **Profile** (modal)
- Dashboard modal: centered larger photo, read-only **Email** field above display name; **`/account/profile`** page layout unchanged
- **Phone:** optional; when set, must be an 11-digit Philippine mobile (`09…`) — same rules as team invites (`validatePhilippineMobilePhone`)
- **Location:** `LocationSearchInput` — Philippines-biased Places autocomplete (legacy `AutocompleteService` + `getDetails`); loads **Places library only** on first focus; suggestions in a Radix **Popover** (works inside dashboard Profile modal); stores city/province/country label (max 120 chars); manual typing when Maps API key is unset
- API: **`guest-profile`** GET/PATCH, **`upload-guest-profile-asset`** POST
- DB: **`guest_profiles`** (RLS scoped to `auth.uid()`)
- Avatar resolution: profile row → OAuth metadata → initials

---

## Stays (`/account/stays`)

Cross-property web chat inbox hub (nav label **Stays**). See [stays.md](./stays.md).

---

## Favorites (`/account/favorites`)

Saved-properties grid (the guest's heart/favorites list). See [favorites.md](./favorites.md).

---

## Settings (hidden)

**`/account/settings`** is not linked in nav (redirects to **`/account/profile`**). **`GuestAccountSettingsPage`** remains in the repo for a future pass. Sign out lives in the account sidebar / avatar menu.

## Implementation map

| Concern        | Path                                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nav menu       | `ui/src/features/guest/account/components/GuestAccountMenu.tsx`                                                                                                                                           |
| Layout + guard | `ui/src/features/guest/account/components/GuestAccountLayout.tsx`, `ui/src/features/guest/account/components/GuestAccountSidebar.tsx`, `ui/src/features/guest/account/components/RequireGuestSession.tsx` |
| Pages          | `ui/src/features/guest/account/pages/*`, `GuestProfileModal.tsx`, `GuestProfileForm.tsx`, `GuestMessagesHub.tsx`, `GuestMessageThreadRow.tsx`                                                             |
| Validation     | `ui/src/features/guest/account/lib/guestProfileValidation.ts`, `ui/src/lib/google-maps/LocationSearchInput.tsx`                                                                                           |
| API client     | `ui/src/features/guest/account/lib/guestAccountApi.ts`                                                                                                                                                    |
| Edge services  | `supabase/functions/_shared/guestProfileService.ts`                                                                                                                                                       |
| Migration      | `supabase/migrations/20260920120000_guest_account_profiles.sql`                                                                                                                                           |

---

## Related

- [index.md](./index.md) — `/account` redirect
- [stays.md](./stays.md) · [favorites.md](./favorites.md)
- [auth.md](../auth.md) — checkout modal auth
- [properties.md](../properties.md) — save heart / favorites gate
