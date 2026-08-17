---
title: 'Guest & host auth — operator guide'
status: active
tags: [guides, routes, auth]
updated: 2026-08-17
---

# Guest & host auth — operator guide

Routes:

- `/for-hosts/login` · `/for-hosts/register` · `/for-hosts/forgot-password` · `/for-hosts/reset-password` · `/for-hosts/verify-email`
- `/sign-in` — legacy redirect → `/for-hosts/login` (preserves `?redirect=`)
- `/for-guests/*` — redirects to `/` (guest auth is modal-only at checkout, no standalone guest login page)

> **Status:** Documented — host Google OAuth wired for sign-in/register; guest checkout modal (email OTP + Google/Facebook) wired; host forgot/reset-password pages are UI scaffolding only (not yet wired to Supabase).

## Progress overview

| Section                    | E2E save | Validation | Docs       | Notes                                                        |
| -------------------------- | -------- | ---------- | ---------- | ------------------------------------------------------------ |
| Auth layout                | —        | —          | Documented | Split branding panel + form (host only)                      |
| Host Google login          | ✅       | —          | Documented | Only method wired — single "Continue with Google" button     |
| Host register (Google)     | ✅       | —          | Documented | Same as login; default redirect `/onboarding`                |
| Host forgot/reset password | ❌       | Client     | Documented | Pages exist, email/password UI present, **not wired** (mock) |
| Guest checkout auth        | ✅       | Client     | Documented | Modal at calendar Proceed + form Submit + save heart         |
| Guest account nav          | ✅       | —          | Documented | Avatar on explore; `/account/*` when signed in               |
| Mode switcher              | —        | —          | Documented | Global curtain; admin sidebar + marketing/auth triggers      |

---

## Overview

Guests browse dates and fill the booking form **without signing in**. Auth appears only when they commit to book:

1. **Property detail → Reserve** (desktop `BookingCard`, mobile sticky bar) — `usePropertyReserve` with `onOpenForm` opens **`GuestAuthModal`** first when anonymous, then **`GuestBookingFormModal`** (same pattern as Contact host)
2. **Calendar → Proceed** — `GuestAuthModal` (Airbnb-style)
3. **Property calendar → Book Now** — `usePropertyReserve` without `onOpenForm` navigates to `/form` and gates with `GuestAuthModal` first
4. **Property detail → Contact host** — `GuestAuthModal` first when anonymous, then **`ContactHostSheet`**
5. **Form → Submit** (final step) — same modal if session expired
6. **Save property (heart)** — any listing card, list row, or detail gallery Save button → `GuestAuthModal` when anonymous; persists to `guest_saved_properties` after login (OAuth resume via `save_property` intent)

Marketing **Become a host?** on explore pages runs the global mode-switch curtain to **`/for-hosts`**. On `/for-hosts`, the pill CTA is **Explore** (back to guest mode); signed-in hosts use the avatar menu for **Dashboard**, signed-out hosts see **Sign In** → **`/for-hosts/login`**.

When a guest session exists on **explore** pages, a **rounded avatar** appears beside **Become a host?** with links to **`/account/*`** (profile, stays, wishlist, messages). See **[[profile|Guest account — operator guide]]**.

### Guest checkout modal

- Single email field → **Continue** → OTP code emailed (unified sign-in/sign-up via `signInWithOtp` + `shouldCreateUser: true`)
- **Google** and **Facebook** OAuth (returns to the same property URL)
- No phone sign-in
- No dedicated `/for-guests/login` page — the modal is the only guest entry point

Resume after OAuth: `sessionStorage` (`guestAuthResume.ts`) restores navigation to the form, contact-host sheet, booking-form modal, or auto-submits after social/email auth. After a full-page OAuth redirect, `GuestAuthContext` reads the stored resume when the session becomes active (in-memory pending callbacks are lost on reload).

### Host sign-in

1. User clicks **Continue with Google** on `/for-hosts/login` or `/for-hosts/register` — this is the only sign-in control shown to hosts (no email/password fields render for the `host` audience).
2. `supabase.auth.signInWithOAuth({ provider: 'google' })` with callback to the same auth page + `?redirect=`.
3. On return, **`useHostGoogleAuth`** + **`resolvePostSignInPath`** routes to onboarding or the org dashboard.

Guards send unauthenticated hosts to **`hostLoginPath(currentPath)`**.

**Forgot / reset password:** `/for-hosts/forgot-password` (email form) and `/for-hosts/reset-password` (new-password form, requires `?token=`) render full UI but their submit handlers are still `TODO` stubs — not wired to Supabase. There is no live host password flow today; Google OAuth is the only functional way in.

---

## Host-facing knowledge

Hosts sign in with their Google account, so there's no separate host username or password to remember. Guests never need to create an account until the moment they're ready to actually book.

**Common host questions**

- Q: How do I sign in to my dashboard?
  A: Use "Continue with Google" on the host sign-in page. No separate password is needed.
- Q: I can't find a password option. Is that normal?
  A: Yes, right now signing in as a host only works through your Google account.
- Q: Why does a guest get asked to sign in partway through booking, not at the start?
  A: Guests can browse dates and start filling out the form freely. They're only asked to verify their identity right before the booking is actually submitted.
- Q: What sign-in options do guests have?
  A: They can use a one-time code sent to their email, or sign in with Google or Facebook.

---

## Implementation map

| Concern               | Path                                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Guest modal + context | `ui/src/features/guest/auth/components/GuestAuthModal.tsx`                                                                                                                                                                                       |
|                       | `ui/src/features/guest/auth/context/GuestAuthContext.tsx`                                                                                                                                                                                        |
| Session / OTP / OAuth | `ui/src/features/guest/auth/hooks/useGuestSession.ts`                                                                                                                                                                                            |
|                       | `ui/src/features/guest/auth/hooks/useGuestAuthActions.ts`                                                                                                                                                                                        |
| OAuth resume          | `ui/src/features/guest/auth/lib/guestAuthResume.ts`                                                                                                                                                                                              |
| Calendar gate         | `ui/src/features/guest/calendar/pages/CalendarPage.tsx`                                                                                                                                                                                          |
| Property Reserve gate | `ui/src/features/guest/marketing/properties/hooks/usePropertyReserve.ts`                                                                                                                                                                         |
| Property save gate    | `ui/src/features/guest/marketing/properties/hooks/usePropertySave.ts`                                                                                                                                                                            |
| Saved properties      | `ui/src/features/guest/marketing/properties/hooks/useSavedPropertySlugsQuery.ts`, `ui/src/features/guest/marketing/properties/hooks/useSavePropertyMutation.ts`, `ui/src/features/guest/marketing/properties/components/SavedPropertiesSync.tsx` |
| Save button UI        | `ui/src/features/guest/marketing/properties/components/PropertySaveButton.tsx`                                                                                                                                                                   |
| Form gate             | `ui/src/features/guest/form/components/GuestForm.tsx`                                                                                                                                                                                            |
| Host OAuth hook       | `ui/src/features/guest/auth/hooks/useHostGoogleAuth.ts`                                                                                                                                                                                          |
| Auth page config      | `ui/src/features/guest/auth/config/auth-page-config.ts` (`AUTH_PAGE_CONFIG.host` / `.guest`)                                                                                                                                                     |
| Login/register UI     | `ui/src/features/guest/auth/components/LoginPageContent.tsx`, `ui/src/features/guest/auth/components/RegisterPageContent.tsx`, `ui/src/features/guest/auth/components/SocialAuthButtons.tsx`                                                     |
| Forgot/reset (mock)   | `ui/src/features/guest/auth/components/ForgotPasswordPageContent.tsx`, `ui/src/features/guest/auth/components/ResetPasswordPageContent.tsx`                                                                                                      |
| Host routes           | `ui/src/features/guest/auth/routes/index.tsx`                                                                                                                                                                                                    |

---

## Env / Supabase

- **Google OAuth:** `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (host + guest)
- **Facebook OAuth:** `FACEBOOK_CLIENT_ID` + `FACEBOOK_CLIENT_SECRET` (guest modal)
- Enable Email OTP in Supabase Auth dashboard for hosted projects

---

## Related docs

- [For hosts](./for-hosts.md)
- [Calendar](./calendar.md)
- [Route index](./README.md)

---

## Pending / follow-ups

- [ ] Wire `/for-hosts/forgot-password` and `/for-hosts/reset-password` to Supabase once a host email/password sign-in path ships (today Google-only)
- [ ] `RegisterPageContent` / `LoginPageContent` guest-audience email/password branch is unused UI — no guest login route mounts it (guest auth is modal-only)
