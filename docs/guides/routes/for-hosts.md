---
title: 'For hosts — operator guide'
status: active
tags: [guides, routes]
updated: 2026-08-02
---

# For hosts — operator guide

Route: `/for-hosts` · `/for-hosts/pricing`

> **Status:** Documented — **Phase 1 (UI only)**. PMA marketing page; CTAs point to GFM admin sign-in.

## Progress overview

| Section      | E2E save | Validation | Docs       | Notes                                                      |
| ------------ | -------- | ---------- | ---------- | ---------------------------------------------------------- |
| Hero + tour  | —        | —          | Documented | 54-second interactive product tour                         |
| How it works | —        | —          | Documented | Four-step host onboarding                                  |
| Host reviews | —        | —          | Documented | Mock host quote carousel                                   |
| Host pricing | —        | —          | Documented | `/for-hosts/pricing` starter plan + closing CTA on landing |
| Host CTAs    | —        | —          | Documented | → `/for-hosts/login` (Google OAuth)                        |

---

## Overview

Host acquisition landing (PMA `(marketing)/for-hosts`). The page opens with the platform value proposition and an in-browser, video-like dashboard tour, then capability stats, host onboarding steps, and host reviews.

**Pricing** lives on **`/for-hosts/pricing`** — same hero pattern as other public footer pages, with the free Starter plan (one property) and sign-up CTA. Footer **Pricing** and host-mode nav **Pricing** link there. Legacy **`/for-hosts#pricing`** redirects to the pricing page.

The 54-second tour uses Remotion Player and nine interactive chapters: dashboard overview, booking workflow, Guest Inbox, finance, pricing, Marketing Studio, maintenance, Telegram alerts, and AI assistance. Chapters auto-advance and loop; hosts can pause, restart, or jump directly to a module. Hover and keyboard focus pause playback. `prefers-reduced-motion` disables autoplay and shows a static tour frame.

**Narration:** each chapter has a pre-generated Edge TTS MP3 under `ui/public/marketing/for-hosts/narration/{chapterId}.mp3`, played via Remotion `<Audio>` inside that chapter's `Sequence`. Narration starts **muted** (browser autoplay policy) and an unmute control sits next to pause/play. Muting is passed into the composition as `inputProps.narrationMuted` rather than `Player.initiallyMuted` — a Player that mounts muted and unmutes later crashes Remotion's shared audio tags (fixed upstream in 4.0.498; the composition-level flag also keeps the audio pool stable). Audio follows the transport: pausing pauses narration, seeking a chapter restarts that chapter's line. Visible chapter title/description and `aria-live` still carry the meaning without relying on voice. Regenerate assets with `bun scripts/marketing/generate-host-tour-narration.ts` (requires `edge-tts` on PATH).

Host-mode navigation replaces the explore links with **Features**, **How It Works**, **Reviews** (anchors on `/for-hosts`; from other host marketing routes they link back to `/for-hosts#…`), and **Pricing** → **`/for-hosts/pricing`**. Anchor targets use smooth scrolling unless reduced motion is enabled. Host marketing routes under **`/for-hosts/*`** share host-mode chrome but only the landing page defines the Features / How It Works / Reviews sections.

**CTA difference from PMA:** When signed out, host marketing shows solid **Explore** (mode switch) + outlined **Sign In** → **`/for-hosts/login`**. When signed in, **Explore** + avatar menu (**Dashboard** → last org dashboard or **`/dashboard`**, log out). Explore marketing keeps **Become a host?** + guest avatar when signed in.

**Mode switch:** One global curtain (`ModeSwitchTransitionProvider` in `App.tsx`) covers every explore ↔ host crossing so the overlay survives layout remounts:

- Explore → host: marketing nav **Become a host?**, footer **Become a Host**
- Footer **Pricing** → **`/for-hosts/pricing`**
- Host → explore: admin account menu **Explore / Host** switcher, marketing logo on `/for-hosts`, host-auth mobile logo

The curtain closes over 500 ms, holds the Kame Homes wordmark for 350 ms, then reopens over 500 ms. Brand color comes from the listing **`brandColor`** on property/parking pages, scoped admin/property CSS vars on dashboard pages, otherwise default Kame teal.

---

## Host-facing knowledge

This is the marketing page that introduces the platform to property owners before they sign up — it walks through what the dashboard can do without requiring an account.

**Common host questions**

- Q: Can I try the dashboard without signing up?
  A: You can watch the interactive tour on this page to see how everything works, but you'll need to sign in with Google to access your own dashboard.
- Q: Why is the narration muted when the tour starts?
  A: Browsers block sound from auto-playing — tap the unmute button next to the play controls to hear the narration.
- Q: I'm signed in as a guest, how do I get to my host dashboard?
  A: Use "Become a host?" to switch into host mode, then sign in or go straight to your dashboard from the account menu.

---

## Implementation map

| Concern                | Path                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                   | `ui/src/features/guest/marketing/pages/ForHostsPage.tsx`                                                                                                          |
| Pricing page           | `ui/src/features/guest/marketing/pages/ForHostsPricingPage.tsx`                                                                                                   |
| Starter plan card      | `ui/src/features/guest/marketing/for-hosts/components/HostPricingStarterCard.tsx`                                                                                 |
| Landing closing CTA    | `ui/src/features/guest/marketing/for-hosts/components/HostClosingCta.tsx`                                                                                         |
| Shared public sections | `ui/src/features/guest/marketing/shared/components/MarketingPublic*.tsx` (hero, content, section heading, icon card, callout, FAQ)                                |
| Host landing sections  | `ui/src/features/guest/marketing/for-hosts/components/**`                                                                                                         |
| Tour timeline + copy   | `ui/src/features/guest/marketing/for-hosts/data/hostTourChapters.ts`                                                                                              |
| Tour narration lines   | `ui/src/features/guest/marketing/for-hosts/data/hostTourNarration.ts`                                                                                             |
| Narration MP3 assets   | `ui/public/marketing/for-hosts/narration/*.mp3`                                                                                                                   |
| Narration generator    | `scripts/marketing/generate-host-tour-narration.ts` (`edge-tts`)                                                                                                  |
| Host reviews data      | `ui/src/features/guest/marketing/for-hosts/data/hostTestimonials.ts`                                                                                              |
| Host anchor navigation | `ui/src/features/guest/marketing/shared/components/MarketingNav.tsx` host branch + `ui/src/features/guest/marketing/for-hosts/lib/scrollToSection.ts`             |
| Mode transition        | Global `ModeSwitchTransitionProvider` in `ui/src/App.tsx` + `ui/src/features/guest/marketing/shared/context/ModeSwitchTransitionContext.tsx` + `ui/src/index.css` |
| Host account menu      | `HostAccountMenu` (Dashboard avatar); pill CTA **Explore**                                                                                                        |
| Triggers               | `MarketingNav`, `MarketingFooter`, `ModeSwitcher` (admin account menu), `AuthLayout` mobile logo                                                                  |
| Routes                 | `ui/src/features/guest/marketing/routes/index.tsx`                                                                                                                |

---

## Related docs

- [Sign-in (legacy redirect)](./sign-in.md)
- [Host auth](./auth.md)
- [Onboarding](./onboarding.md)
- [Route index](./README.md)

---

## Pending / follow-ups

- [ ] Optional public host signup / waitlist if product adds `/register`
- [ ] Replace static copy with CMS or org-specific marketing settings
