# For hosts — operator guide

Route: `/for-hosts`

> **Status:** Documented — **Phase 1 (UI only)**. PMA marketing page; CTAs point to GFM admin sign-in.

## Progress overview

| Section      | E2E save | Validation | Docs       | Notes                               |
| ------------ | -------- | ---------- | ---------- | ----------------------------------- |
| Hero + tour  | —        | —          | Documented | 54-second interactive product tour  |
| How it works | —        | —          | Documented | Four-step host onboarding           |
| Host reviews | —        | —          | Documented | Mock host quote carousel            |
| Host CTAs    | —        | —          | Documented | → `/for-hosts/login` (Google OAuth) |

---

## Overview

Host acquisition landing (PMA `(marketing)/for-hosts`). The page opens with the platform value proposition and an in-browser, video-like dashboard tour, then capability stats, host onboarding steps, host reviews, and the free-trial CTA.

The 54-second tour uses Remotion Player and nine interactive chapters: dashboard overview, booking workflow, Guest Inbox, finance, pricing, Marketing Studio, maintenance, Telegram alerts, and AI assistance. Chapters auto-advance and loop; hosts can pause, restart, or jump directly to a module. Hover and keyboard focus pause playback. `prefers-reduced-motion` disables autoplay and shows a static tour frame.

**Narration:** each chapter has a pre-generated Edge TTS MP3 under `ui/public/marketing/for-hosts/narration/{chapterId}.mp3`, played via Remotion `<Audio>` inside that chapter’s `Sequence`. Narration starts **muted** (browser autoplay policy) and an unmute control sits next to pause/play. Muting is passed into the composition as `inputProps.narrationMuted` rather than `Player.initiallyMuted` — a Player that mounts muted and unmutes later crashes Remotion's shared audio tags (fixed upstream in 4.0.498; the composition-level flag also keeps the audio pool stable). Audio follows the transport: pausing pauses narration, seeking a chapter restarts that chapter’s line. Visible chapter title/description and `aria-live` still carry the meaning without relying on voice. Regenerate assets with `bun scripts/marketing/generate-host-tour-narration.ts` (requires `edge-tts` on PATH).

Host-mode navigation replaces the explore links with **Features**, **How It Works**, and **Reviews** anchors. Anchor targets use smooth scrolling unless reduced motion is enabled. `/for-hosts` is currently the only host-mode route in `MarketingLayoutShell`; future host marketing routes must not assume these page-local anchors exist.

**CTA difference from PMA:** When signed out, host marketing shows solid **Explore** (mode switch) + outlined **Sign In** → **`/for-hosts/login`**. When signed in, **Explore** + avatar menu (**Dashboard** → last org dashboard or **`/dashboard`**, log out). Explore marketing keeps **Become a host?** + guest avatar when signed in.

**Mode switch:** One global curtain (`ModeSwitchTransitionProvider` in `App.tsx`) covers every explore ↔ host crossing so the overlay survives layout remounts:

- Explore → host: marketing nav **Become a host?**, footer **Become a Host**
- Host → explore: admin account menu **Explore / Host** switcher, marketing logo on `/for-hosts`, host-auth mobile logo

The curtain closes over 500 ms, holds the Kame Homes wordmark for 350 ms, then reopens over 500 ms. Brand color comes from the listing **`brandColor`** on property/parking pages, scoped admin/property CSS vars on dashboard pages, otherwise default Kame teal.

---

## Implementation map

| Concern                | Path                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Page                   | `ui/src/features/guest/marketing/pages/ForHostsPage.tsx`                                                           |
| Host landing sections  | `ui/src/features/guest/marketing/for-hosts/components/**`                                                          |
| Tour timeline + copy   | `ui/src/features/guest/marketing/for-hosts/data/hostTourChapters.ts`                                               |
| Tour narration lines   | `ui/src/features/guest/marketing/for-hosts/data/hostTourNarration.ts`                                              |
| Narration MP3 assets   | `ui/public/marketing/for-hosts/narration/*.mp3`                                                                    |
| Narration generator    | `scripts/marketing/generate-host-tour-narration.ts` (`edge-tts`)                                                   |
| Host reviews data      | `ui/src/features/guest/marketing/for-hosts/data/hostTestimonials.ts`                                               |
| Host anchor navigation | `MarketingNav.tsx` host branch + `for-hosts/lib/scrollToSection.ts`                                                |
| Mode transition        | Global `ModeSwitchTransitionProvider` in `ui/src/App.tsx` + `ModeSwitchTransitionContext.tsx` + `ui/src/index.css` |
| Host account menu      | `HostAccountMenu` (Dashboard avatar); pill CTA **Explore**                                                         |
| Triggers               | `MarketingNav`, `MarketingFooter`, `ModeSwitcher` (admin account menu), `AuthLayout` mobile logo                   |
| Routes                 | `ui/src/features/guest/marketing/routes/index.tsx`                                                                 |

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
