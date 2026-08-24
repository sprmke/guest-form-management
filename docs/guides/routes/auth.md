---
title: 'Guest & host auth — operator guide'
status: active
tags: [guides, routes, auth]
updated: 2026-08-23
---

# Guest & host auth — operator guide

Routes:

- `/for-hosts/login` · `/for-hosts/register`
- `/for-guests/login` · `/for-guests/register`
- `/sign-in` — legacy redirect → `/for-hosts/login` (preserves `?redirect=`)
- `/for-guests/*` (any other path) — redirects to `/for-guests/login`

> **Status:** Documented — host and guest sign-in are both fully wired to Supabase: email OTP (two-step: email → code) + Google OAuth (both audiences). No passwords anywhere, no Facebook (removed — not supported). Guest checkout keeps its own contextual modal (unchanged) in addition to the standalone pages below.

## Progress overview

| Section              | E2E save | Validation | Docs       | Notes                                                               |
| -------------------- | -------- | ---------- | ---------- | ------------------------------------------------------------------- |
| Auth layout          | —        | —          | Documented | Split branding panel + form, host or guest copy by pathname         |
| Host login/register  | ✅       | Client     | Documented | Email OTP + Google OAuth — same component/flow for both modes       |
| Guest login/register | ✅       | Client     | Documented | Email OTP + Google OAuth — standalone pages (new)                   |
| Guest checkout auth  | ✅       | Client     | Documented | Modal on form/messages entry, calendar Proceed, Reserve, save heart |
| Guest account nav    | ✅       | —          | Documented | Avatar on explore when signed in; real "Sign In" link when not      |
| Mode switcher        | —        | —          | Documented | Global curtain; admin sidebar + marketing/auth triggers             |

---

## Overview

Guests can sign in two ways, both real and both landing in the same Supabase Auth session:

1. **Contextual checkout modal** (`GuestAuthModal`) — appears when a guest opens a gated surface (booking form, messages, reserve, contact host, save) or commits an action that needs a session.
2. **Standalone pages** (`/for-guests/login`, `/for-guests/register`) — reachable directly (nav "Sign In" link, deep links, bookmarks), same email-OTP + Google flow as the modal, just as a full page.

Guests can browse listings and pick dates without signing in. Opening **`/properties/:slug/form`**, **`/parkings/:slug/form`**, or **`/messages`** directly requires auth first (modal + skeleton), same as Reserve / Contact host.

1. **Property detail → Reserve** (desktop `BookingCard`, mobile sticky bar) — `usePropertyReserve` with `onOpenForm` opens **`GuestAuthModal`** first when anonymous, then **`GuestBookingFormModal`** (same pattern as Contact host)
2. **Calendar → Proceed** — `GuestAuthModal` (Airbnb-style)
3. **Property calendar → Book Now** — `usePropertyReserve` without `onOpenForm` navigates to `/form` and gates with `GuestAuthModal` first
4. **Property detail → Contact host** — `GuestAuthModal` first when anonymous, then **`ContactHostSheet`**
5. **Direct form / messages entry** — `/properties/:slug/form`, `/parkings/:slug/form`, and `/messages` open **`GuestAuthModal`** on load when anonymous (skeleton until signed in); submit still re-checks if the session expired
6. **Save property (heart)** — any listing card, list row, or detail gallery Save button → `GuestAuthModal` when anonymous; persists to `guest_saved_properties` after login (OAuth resume via `save_property` intent)

Marketing **Become a host?** on explore pages runs the global mode-switch curtain to **`/for-hosts`**. On `/for-hosts`, the pill CTA is **Explore** (back to guest mode); signed-in hosts use the avatar menu for **Dashboard**, signed-out hosts see **Sign In** → **`/for-hosts/login`**. On explore pages, signed-in guests see the avatar menu (**`/account/*`** — profile, stays, wishlist, messages, see **[[profile|Guest account — operator guide]]**), signed-out guests now see a real **Sign In** link → **`/for-guests/login`**.

### Sign-in flow (both audiences)

- Single email field → **Continue** → OTP code emailed (unified sign-in/sign-up via `signInWithOtp` + `shouldCreateUser: true`) → 6-digit code entry → **Verify** (auto-submits once all 6 digits are entered)
- **Google** OAuth below the email path — same order as the guest checkout modal: email + Continue, **or** divider, then **Continue with Google** (both audiences). Facebook was removed and is not supported
- No phone sign-in, no passwords
- `/register` is a thin copy-only alias of `/login` — same form, same behavior. Since OTP verification auto-creates the account on first code entry, there's no way (or need) to distinguish "logging in" from "signing up"; a returning user who lands on `/register` by mistake just signs in normally
- The email step and the code-entry step are mutually exclusive views — once a code is sent, the Google button, divider, and register/login cross-link are hidden so the code-entry step stays focused (just Back, the 6-digit input, Verify, and a Resend link with a 30s cooldown)

Resume after OAuth (guest): `sessionStorage` (`guestAuthResume.ts`) restores navigation to the form, contact-host sheet, booking-form modal, or auto-submits after social/email auth when the modal was the entry point. On the standalone guest page, OAuth/OTP success simply navigates to `?redirect=` (or `/`) once the session becomes authenticated.

### Host sign-in

1. User enters their email (OTP) or clicks **Continue with Google** on `/for-hosts/login` or `/for-hosts/register`.
2. Either path lands a normal Supabase Auth session — `useAdminSession` treats any session as signed-in regardless of which method was used.
3. On success, **`useHostGoogleAuth`** (name unchanged, now also drives OTP) + **`resolvePostSignInPath`** routes to onboarding or the org dashboard.

Guards send unauthenticated hosts to **`hostLoginPath(currentPath)`**.

There is no password anywhere in this flow. What used to be `/for-hosts/forgot-password`, `/for-hosts/reset-password`, and `/for-hosts/verify-email` no longer exist — those pages only ever supported a password flow that was never real, and passwords aren't part of the model at all now (email OTP already proves email ownership per code entry, the same guarantee a password reset link would give).

---

## Host-facing knowledge

Hosts and guests can both sign in with a one-time code sent to their email, or with their Google account. There's no password to remember or reset for either, and no Facebook sign-in option.

**Common host questions**

- Q: How do I sign in to my dashboard?
  A: Use "Continue with Google," or enter your email to get a one-time sign-in code — either way, no password is needed.
- Q: I can't find a password option. Is that normal?
  A: Yes — signing in only works through a one-time email code or your Google account, by design.
- Q: Why does a guest get asked to sign in partway through booking, not at the start?
  A: Guests can browse dates and start filling out the form freely. They're only asked to verify their identity right before the booking is actually submitted — though they can also sign in any time from the "Sign In" link.
- Q: What sign-in options do guests have?
  A: A one-time code sent to their email, or Google. Facebook is not offered.

---

## Implementation map

| Concern                           | Path                                                                                                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest checkout modal + context    | `ui/src/features/guest/auth/components/GuestAuthModal.tsx`                                                                                                                                               |
|                                   | `ui/src/features/guest/auth/context/GuestAuthContext.tsx`                                                                                                                                                |
| Session / OTP / OAuth (shared)    | `ui/src/features/guest/auth/hooks/useGuestSession.ts`                                                                                                                                                    |
|                                   | `ui/src/features/guest/auth/hooks/useGuestAuthActions.ts` (used by both audiences)                                                                                                                       |
| OAuth resume (checkout modal)     | `ui/src/features/guest/auth/lib/guestAuthResume.ts`                                                                                                                                                      |
| Calendar / Reserve / Save gates   | `ui/src/features/guest/calendar/pages/CalendarPage.tsx`, `ui/src/features/guest/marketing/properties/hooks/usePropertyReserve.ts`, `ui/src/features/guest/marketing/properties/hooks/usePropertySave.ts` |
| Form gate                         | `ui/src/features/guest/form/components/GuestForm.tsx`                                                                                                                                                    |
| Unified auth page content         | `ui/src/features/guest/auth/components/AuthPageContent.tsx` (email OTP two-step + `OtpCodeInput.tsx` + `GoogleSignInButton`)                                                                             |
| Host standalone pages             | `ui/src/features/guest/auth/pages/HostAuthPages.tsx` (`HostLoginPage`, `HostRegisterPage`)                                                                                                               |
| Host OTP + OAuth + redirect hook  | `ui/src/features/guest/auth/hooks/useHostGoogleAuth.ts`                                                                                                                                                  |
| Guest standalone pages            | `ui/src/features/guest/auth/pages/GuestAuthPages.tsx` (`GuestLoginPage`, `GuestRegisterPage`)                                                                                                            |
| Guest OTP + OAuth + redirect hook | `ui/src/features/guest/auth/hooks/useGuestAuthPage.ts`                                                                                                                                                   |
| Auth page config                  | `ui/src/features/guest/auth/config/auth-page-config.ts` (`AUTH_PAGE_CONFIG.host` / `.guest`)                                                                                                             |
| Path helpers                      | `ui/src/features/guest/auth/lib/hostAuthPaths.ts`, `ui/src/features/guest/auth/lib/guestAuthPaths.ts`, `ui/src/features/guest/auth/lib/authRedirect.ts` (shared `safeRedirect`)                          |
| Nav mode/CTA helpers              | `ui/src/features/guest/auth/config/auth-navigation.ts` (`getAuthAudienceFromPath`, `getHostMarketingNavCta`, `getGuestLoginCta`), `ui/src/features/guest/auth/config/mode-switch.ts`                     |
| Marketing nav sign-in CTA         | `ui/src/features/guest/marketing/shared/components/MarketingNav.tsx`                                                                                                                                     |
| Auth routes                       | `ui/src/features/guest/auth/routes/index.tsx`                                                                                                                                                            |

---

## Env / Supabase

- **Google OAuth:** `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (host + guest)
- Email OTP must be enabled in the Supabase Auth dashboard for hosted projects (both audiences depend on it)
- Facebook OAuth was removed — `FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET` and the `[auth.external.facebook]` block in `supabase/config.toml` no longer exist. Not supported; do not reintroduce it.

---

## Related docs

- [For hosts](./for-hosts.md)
- [Calendar](./calendar.md)
- [Route index](./README.md)

---

## Pending / follow-ups

None currently open.
