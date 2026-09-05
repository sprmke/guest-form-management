---
title: 'Planned work'
status: active
tags: [workflow, planned]
updated: 2026-09-02
stage: planned
kind: reference
---

# Planned work

Approved plans **not yet started**. Once implementation begins (even a partial slice), run `/workflow-start` → [`../in-progress/`](../in-progress/). See [`../done/`](../done/) for completed plans.

| Plan                                                                                                           | Status       | Summary                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`ai-assistant-settings-validators.md`](./ai-assistant-settings-validators.md)                                 | not started  | **Deferred** from attachment parity — shared validators + OTP-safe assistant writes for payment methods, email automations, doc requirements                                                                                         |
| [`ai-assistant-bulk-pricing-chat.md`](./ai-assistant-bulk-pricing-chat.md)                                     | not started  | **Deferred** — multi-date/range pricing from chat with diff preview before confirm                                                                                                                                                   |
| [`ai-assistant-parking-broadcast-chat.md`](./ai-assistant-parking-broadcast-chat.md)                           | not started  | **Deferred** — parking broadcast fan-out; distinct blast radius from claim/decline                                                                                                                                                   |
| [`ai-opportunities-roadmap.md`](./ai-opportunities-roadmap.md)                                                 | not started  | AI opportunity backlog across guest/host/admin/dev                                                                                                                                                                                   |
| [`super-admin-console-followups.md`](./super-admin-console-followups.md)                                       | not started  | Remaining Phase 6 backlog of the console overhaul: bookings oversight, financial reporting, users/identity admin, host broadcast, org danger zone, announcements unification — each security/product-sensitive, needs its own review |
| [`guest-trust-safety-reporting.md`](./guest-trust-safety-reporting.md)                                         | not started  | Signed-in guests report a property/host/org — Report dialog on listing/host/chat/stay, `/account/reports` tracker, `/admin/trust-safety` console, enforcement ladder + host appeals (8 phases)                                       |
| [`parking-e2e-later-phases.md`](./parking-e2e-later-phases.md)                                                 | tracking     | Parking E2E overview — Phases 0–5, 7–8 **done**; Phase 6 behavioral ranking **not started**; production gaps: [`parking-e2e-production-readiness.md`](./parking-e2e-production-readiness.md)                                         |
| [`parking-e2e-phase6-ranking-trust-safety.md`](./parking-e2e-phase6-ranking-trust-safety.md)                   | not started  | Behavioral ranking + trust/safety signals (response speed, incident history) — needs data accumulation period                                                                                                                        |
| [`parking-e2e-production-readiness.md`](./parking-e2e-production-readiness.md)                                 | tracking doc | Consolidated open questions, gaps, and remaining tasks across all parking phases before real users (live PayMongo, mobile QA, etc.)                                                                                                  |
| [`superhost-program.md`](./superhost-program.md)                                                               | in progress  | **Earned-only** Superhost — import track removed (2026-08-31); org badge stub shipped; metrics + cron + org Trust UI (~6–10 days)                                                                                                    |
| [`marketing-studio-mobile-and-dashboard-responsive.md`](./marketing-studio-mobile-and-dashboard-responsive.md) | not started  | Full mobile-editing parity for the 3 Marketing Studio editors (calendar / Polotno design / Remotion video) + touch pricing-calendar range-select + dashboard responsive polish (6 phases)                                            |
| [`guest-review-facebook-cta.md`](./guest-review-facebook-cta.md)                                               | not started  | Optional, non-blocking "leave a Facebook review" CTA after the in-app Kame review on `/sd-form` + `/guest-review`, shown only when a Facebook URL is configured — honor-system, no verification (4 phases + optional soft signal)    |

Moved to done: [`voucher-redemption.md`](../done/voucher-redemption.md) (guest wallet + apply on rebook — 2026-08-31), [`voucher-reveal-styles.md`](../done/voucher-reveal-styles.md) (host-selectable reel / wheel / flip voucher animation), [`ai-assistant-turn-progress-ux.md`](../done/ai-assistant-turn-progress-ux.md) (turn progress UX — activity timeline, SSE, task plans, cancel/regenerate), [`image-video-upload-optimization.md`](../done/image-video-upload-optimization.md) (**done** 2026-08-30 — Phases 0–3 + 5 shipped; `guest-documents` group held to ceiling-only pass-through pending OCR-regression run; Phase 4 deferred).

Moved to done: [`ai-assistant-attachment-actions-and-coverage.md`](../done/ai-assistant-attachment-actions-and-coverage.md) (**99 tools** — attachment apply + parity + §11–13 Live pass; 3 deferrals → planned rows above).

Moved to for-testing: [`captcha-anti-spam-hardening.md`](../for-testing/captcha-anti-spam-hardening.md) (all 6 phases coded + docs + edge tests green — Turnstile on auth OTP + anon writes, durable rate limiter, honeypot/timing, team-invite/chat/upload limits; env-flag gated, inert until Cloudflare keys are provisioned).

Moved to for-testing: [`smart-pricing-ai.md`](../for-testing/smart-pricing-ai.md) (**Phases 0–3 shipped** 2026-09-04 — full Smart Pricing: engine + rate-merge + `SmartPricingDialog` + preview/apply + autopilot cron + AI pass; Phase 4 deferred; manual QA pending).

Moved to in-progress: [`onboarding-verification-simplify.md`](../for-testing/onboarding-verification-simplify.md) (**for testing** — manual QA pending), [`airbnb-calendar-sync.md`](../done/airbnb-calendar-sync.md) (**done** 2026-08-30 — Phase 1 + 2 shipped; staging browser walk-through pending), [`stay-guide-showcase-templates.md`](../done/stay-guide-showcase-templates.md) (**done** 2026-09-01), [`org-granular-team-permissions.md`](../in-progress/org-granular-team-permissions.md), [`ai-usage-metering-credits-foundation.md`](../done/ai-usage-metering-credits-foundation.md) (Phases 1–3 **done**; Phase 4 paid top-up deferred), [`ci-cd-environments/`](../in-progress/ci-cd-environments/README.md), [`booking-workflow-multi-tenancy.md`](../in-progress/booking-workflow-multi-tenancy.md), [`marketing-module-refinement.md`](../in-progress/marketing-module-refinement.md), [`mobile-native-redesign.md`](../in-progress/mobile-native-redesign.md), [`host-verification-tiers.md`](../in-progress/host-verification-tiers.md), [`parking-property-parity.md`](../in-progress/parking-property-parity.md), [`super-admin-console-overhaul.md`](../in-progress/super-admin-console-overhaul.md) (Phases 0–5 shipped — grouped nav, shared page/settings scaffold, Overview dashboard, `/admin/orgs` index + per-org hub; Phase 6 module backlog + Phase 7 responsive QA remain).

Moved to done (recent): [`property-guest-rewards-vouchers.md`](../done/property-guest-rewards-vouchers.md), [`parking-e2e-phase3-payment-pricing.md`](../done/parking-e2e-phase3-payment-pricing.md), [`parking-e2e-phase4-payout-admin-config.md`](../done/parking-e2e-phase4-payout-admin-config.md), [`parking-e2e-phase5-endorsement-communication.md`](../done/parking-e2e-phase5-endorsement-communication.md), [`parking-e2e-phase8-direct-booking-link.md`](../done/parking-e2e-phase8-direct-booking-link.md), [`parking-e2e-phase2-match-engine.md`](../done/parking-e2e-phase2-match-engine.md), [`parking-e2e-phase7-property-booking-migration.md`](../done/parking-e2e-phase7-property-booking-migration.md), [`parking-pay-parking-marketplace-connect.md`](../done/parking-pay-parking-marketplace-connect.md), [`parking-owner-owned-default.md`](../done/parking-owner-owned-default.md), [`sensitive-settings-email-otp.md`](../done/sensitive-settings-email-otp.md).

**Won't do:** [`google-oauth-verification.md`](../wont-do/google-oauth-verification.md) · [`property-public-pages-shell-redesign.md`](../wont-do/property-public-pages-shell-redesign.md).

**In progress:** [`../in-progress/README.md`](../in-progress/README.md) · **Done:** [`../done/README.md`](../done/README.md).

## Naming

`<kebab-case-slug>.md` — **no date prefix**. Use frontmatter `updated:` for timestamps.

Back to [workflow index](../README.md).
