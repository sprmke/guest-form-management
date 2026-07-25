# Guest & host auth — operator guide

Routes:

- `/for-hosts/login` · `/register` · `/forgot-password` · `/reset-password` · `/verify-email`
- `/sign-in` — legacy redirect → `/for-hosts/login` (preserves `?redirect=`)
- `/for-guests/*` — redirects to `/` (guest auth is modal-only at checkout)

> **Status:** Documented — host Google OAuth wired; guest checkout modal (email OTP + Google/Facebook).

## Progress overview

| Section              | E2E save | Validation | Docs       | Notes                                                      |
| -------------------- | -------- | ---------- | ---------- | ---------------------------------------------------------- |
| Auth layout          | —        | —          | Documented | Split branding panel + form (host only)                    |
| Host Google login    | ✅       | —          | Documented | Google only — full-width Continue with Google              |
| Host register Google | ✅       | —          | Documented | Google only; default redirect `/onboarding`                |
| Guest checkout auth  | ✅       | Client     | Documented | Modal at calendar Proceed + form Submit + save heart       |
| Guest account nav    | ✅       | —          | Documented | Avatar on explore; `/account/*` when signed in             |
| Mode switcher        | —        | —          | Documented | Admin sidebar + host auth layout only (no marketing float) |

---

## Overview

Guests browse dates and fill the booking form **without signing in**. Auth appears only when they commit to book:

1. **Property detail → Reserve** (desktop `BookingCard`, mobile sticky bar) — `usePropertyReserve` → `GuestAuthModal` when dates are set
2. **Calendar → Proceed** — `GuestAuthModal` (Airbnb-style)
3. **Property calendar → Book Now** — same modal via `usePropertyReserve`
4. **Form → Submit** (final step) — same modal if session expired
5. **Save property (heart)** — any listing card, list row, or detail gallery Save button → `GuestAuthModal` when anonymous; persists to `guest_saved_properties` after login (OAuth resume via `save_property` intent)

Marketing **Become a host?** on explore pages links to **`/for-hosts`**. On `/for-hosts` the nav shows **Sign In** → **`/for-hosts/login`**.

When a guest session exists on **explore** pages, a **rounded avatar** appears beside **Become a host?** with links to **`/account/*`** (profile, stays, wishlist, messages). See **`docs/guides/routes/account/profile.md`**.

### Guest checkout modal

- Single email field → **Continue** → OTP code emailed (unified sign-in/sign-up via `signInWithOtp` + `shouldCreateUser: true`)
- **Google** and **Facebook** OAuth (returns to the same property URL)
- No phone sign-in
- No dedicated `/for-guests/login` page

Resume after OAuth: `sessionStorage` (`guestAuthResume.ts`) restores navigation to the form, contact-host sheet, or auto-submits after social/email auth. After a full-page OAuth redirect, `GuestAuthContext` reads the stored resume when the session becomes active (in-memory pending callbacks are lost on reload).

### Host sign-in (Google only)

1. User clicks **Continue with Google** on `/for-hosts/login` or `/for-hosts/register`.
2. `supabase.auth.signInWithOAuth({ provider: 'google' })` with callback to the same auth page + `?redirect=`.
3. On return, **`useHostGoogleAuth`** + **`resolvePostSignInPath`** routes to onboarding or org dashboard.

Guards send unauthenticated hosts to **`hostLoginPath(currentPath)`**.

---

## Implementation map

| Concern               | Path                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Guest modal + context | `ui/src/features/guest/auth/components/GuestAuthModal.tsx`                                                                                |
|                       | `ui/src/features/guest/auth/context/GuestAuthContext.tsx`                                                                                 |
| Session / OTP / OAuth | `ui/src/features/guest/auth/hooks/useGuestSession.ts`                                                                                     |
|                       | `ui/src/features/guest/auth/hooks/useGuestAuthActions.ts`                                                                                 |
| OAuth resume          | `ui/src/features/guest/auth/lib/guestAuthResume.ts`                                                                                       |
| Calendar gate         | `ui/src/features/guest/calendar/pages/CalendarPage.tsx`                                                                                   |
| Property Reserve gate | `ui/src/features/guest/marketing/properties/hooks/usePropertyReserve.ts`                                                                  |
| Property save gate    | `ui/src/features/guest/marketing/properties/hooks/usePropertySave.ts`                                                                     |
| Saved properties      | `ui/src/features/guest/marketing/properties/hooks/useSavedPropertySlugsQuery.ts`, `useSavePropertyMutation.ts`, `SavedPropertiesSync.tsx` |
| Save button UI        | `ui/src/features/guest/marketing/properties/components/PropertySaveButton.tsx`                                                            |
| Form gate             | `ui/src/features/guest/form/components/GuestForm.tsx`                                                                                     |
| Host OAuth hook       | `ui/src/features/guest/auth/hooks/useHostGoogleAuth.ts`                                                                                   |
| Host routes           | `ui/src/features/guest/auth/routes/index.tsx`                                                                                             |

---

## Env / Supabase

- **Google OAuth:** `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (host + guest)
- **Facebook OAuth:** `FACEBOOK_CLIENT_ID` + `FACEBOOK_CLIENT_SECRET` (guest modal)
- Enable Email OTP in Supabase Auth dashboard for hosted projects
