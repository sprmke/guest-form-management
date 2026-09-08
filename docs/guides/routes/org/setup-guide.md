---
title: 'Setup Guide — operator guide'
status: active
tags: [guides, routes, org, onboarding]
updated: 2026-09-07
---

# Setup Guide — operator guide

Route: overlay on `/org/:orgSlug/...` (not a standalone URL)

> **Status:** Documented — post-onboarding Setup Guide overlay + Recommended reward step.

## Progress overview

| Section                        | E2E save | Validation                        | Docs | Notes                                |
| ------------------------------ | -------- | --------------------------------- | ---- | ------------------------------------ |
| Overlay / stepper              | Done     | Same as home settings             | Done | Accordion listings; **Finish setup** |
| Org / property / parking steps | Done     | Home-page validators              | Done | Controllers embedded via hosts       |
| Recommended reward step        | Done     | Existing verification + offer API | Done | Optional; gate bypass when eligible  |
| Persistence                    | Done     | RPC patch keys                    | Done | `settings.setupGuide` meta only      |

---

## Overview

After `/onboarding`, owners land on the listing dashboard with a **Setup Guide** overlay. It walks through the same settings they would edit under Org / Property / Parking settings — same save paths and validation. Progress is derived from live settings completion, not a separate checklist store. Meta only (`dismissedAt`, `completedAt`, `lastStepId`, skipped/reviewed steps, version) is stored on the org.

**Step order:** Organization (Welcome, brand) → Verification (go-live + Get Recommended) → each property/parking block → Finish (team, done).

**UI:** Desktop split rail collapses each listing to one row (`done/total`); click to open or close. Fewer than 5 listings start expanded; 5+ start collapsed except the active listing. Section dividers separate Organization, Verification, Listings, and Finish. Live `app-settings` / `parking-settings` fetch runs only for the focused listing while the guide is open (other listings reuse cache or stay pending). Mobile keeps a compact header.

**Plans / Team RBAC:** N/A for new keys — the guide only embeds existing settings surfaces. The Recommended reward is configured by super admin; grants are org subscriptions (`source=reward`).

---

## Host-facing knowledge

The Setup Guide is a one-time walkthrough that helps new hosts finish the basics (brand, verification, Recommended, then each listing, then team). You can close it and reopen from **Finish setup**. Expand a listing in the rail to configure it. The Recommended step is optional; when a campaign is on, completing Recommended verification can unlock a free Pro period.

**Common host questions**

- Q: Do I have to finish every step?
  A: Required steps block the “all done” state; Recommended and some extras are optional.
- Q: If I close the guide, do I lose progress?
  A: No — saved settings stay saved. The guide remembers where you left off.
- Q: When do I get the free Pro month?
  A: Only when the platform has the reward campaign on, and only after the trigger (submit or approval) the campaign uses.

---

## Persistence

### Save path

1. UI → **setup-guide-state** (GET/PATCH)
2. RPC `set_org_setup_guide_state` patches only `organizations.settings.setupGuide`

### Behavior

- Any active org member may update guide meta (no org.settings.basic:edit required).
- Auto-open once for the org owner after onboarding; afterward reopen from the sidebar **Finish setup** entry (no dashboard banner).

---

## Recommended reward step

### Behavior

- Embeds the same Recommended verification upload/submit flow as Get Verified.
- When `get-host-reward-offer` says eligible, Free hosts bypass the Pro `recommendedBadgeEligible` gate (server + client).
- Grant runs from `submit-org-verification` and/or `approve-org-verification` depending on `host_reward_trigger`.
- Expiry: billing cron sweeps `status=trialing` + `source=reward` past `current_period_end`.

### API reference

| Action              | Endpoint                                       |
| ------------------- | ---------------------------------------------- |
| Guide meta          | GET/PATCH `setup-guide-state`                  |
| Reward offer        | GET/POST `get-host-reward-offer`               |
| Submit Recommended  | POST `submit-org-verification` `tier:enhanced` |
| Approve Recommended | POST `approve-org-verification`                |

---

## Implementation map

| Concern                 | Path                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| Module                  | `ui/src/features/dashboard/setup-guide/`                                  |
| Overlay / sidebar entry | `SetupGuideOverlay.tsx`, `SetupGuideSidebarEntry.tsx`                     |
| Step bodies             | `SetupGuideStepBody.tsx`, `SetupGuideSettingsHost.tsx`                    |
| Offer hook              | `hooks/useHostRewardOffer.ts`                                             |
| Edge                    | `setup-guide-state`, `get-host-reward-offer`, `hostVerificationReward.ts` |
| Migration               | `20261306140000_host_verification_reward.sql`                             |

---
