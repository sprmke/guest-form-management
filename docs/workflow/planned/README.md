---
title: 'Planned work'
status: active
tags: [workflow, planned]
updated: 2026-08-30
stage: planned
kind: reference
---

# Planned work

Approved plans **not yet started**. Once implementation begins (even a partial slice), run `/workflow-start` → [`../in-progress/`](../in-progress/). See [`../done/`](../done/) for completed plans.

| Plan                                                                                         | Status       | Summary                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ai-opportunities-roadmap.md`](./ai-opportunities-roadmap.md)                               | not started  | AI opportunity backlog across guest/host/admin/dev                                                                                                                                           |
| [`parking-e2e-later-phases.md`](./parking-e2e-later-phases.md)                               | tracking     | Parking E2E overview — Phases 0–5, 7–8 **done**; Phase 6 behavioral ranking **not started**; production gaps: [`parking-e2e-production-readiness.md`](./parking-e2e-production-readiness.md) |
| [`parking-e2e-phase6-ranking-trust-safety.md`](./parking-e2e-phase6-ranking-trust-safety.md) | not started  | Behavioral ranking + trust/safety signals (response speed, incident history) — needs data accumulation period                                                                                |
| [`parking-e2e-production-readiness.md`](./parking-e2e-production-readiness.md)               | tracking doc | Consolidated open questions, gaps, and remaining tasks across all parking phases before real users (live PayMongo, mobile QA, etc.)                                                          |
| [`superhost-program.md`](./superhost-program.md)                                             | not started  | **Detailed plan** — dual-track Superhost (imported moderation + earned Kame criteria): data model, API spec, UI spec, crons, QA checklist, 5 phases (~8–13 days)                             |

Moved to done: [`voucher-reveal-styles.md`](../done/voucher-reveal-styles.md) (host-selectable reel / wheel / flip voucher animation).

Moved to done: [`ai-assistant-turn-progress-ux.md`](../done/ai-assistant-turn-progress-ux.md) (turn progress UX — activity timeline, SSE, task plans, cancel/regenerate).

Moved to done: [`image-video-upload-optimization.md`](../done/image-video-upload-optimization.md) (**done** 2026-08-30 — Phases 0–3 + 5 shipped; `guest-documents` group held to ceiling-only pass-through pending OCR-regression run; Phase 4 deferred).

Moved to in-progress: [`airbnb-calendar-sync.md`](../done/airbnb-calendar-sync.md) (**done** 2026-08-30 — Phase 1 + 2 shipped; staging browser walk-through pending), [`stay-guide-showcase-templates.md`](../in-progress/stay-guide-showcase-templates.md), [`org-granular-team-permissions.md`](../in-progress/org-granular-team-permissions.md), [`ai-usage-metering-credits-foundation.md`](../done/ai-usage-metering-credits-foundation.md) (Phases 1–3 **done**; Phase 4 paid top-up deferred), [`ci-cd-environments/`](../in-progress/ci-cd-environments/README.md), [`booking-workflow-multi-tenancy.md`](../in-progress/booking-workflow-multi-tenancy.md), [`marketing-module-refinement.md`](../in-progress/marketing-module-refinement.md), [`mobile-native-redesign.md`](../in-progress/mobile-native-redesign.md), [`host-verification-tiers.md`](../in-progress/host-verification-tiers.md), [`parking-property-parity.md`](../in-progress/parking-property-parity.md).

Moved to done (recent): [`property-guest-rewards-vouchers.md`](../done/property-guest-rewards-vouchers.md), [`parking-e2e-phase3-payment-pricing.md`](../done/parking-e2e-phase3-payment-pricing.md), [`parking-e2e-phase4-payout-admin-config.md`](../done/parking-e2e-phase4-payout-admin-config.md), [`parking-e2e-phase5-endorsement-communication.md`](../done/parking-e2e-phase5-endorsement-communication.md), [`parking-e2e-phase8-direct-booking-link.md`](../done/parking-e2e-phase8-direct-booking-link.md), [`parking-e2e-phase2-match-engine.md`](../done/parking-e2e-phase2-match-engine.md), [`parking-e2e-phase7-property-booking-migration.md`](../done/parking-e2e-phase7-property-booking-migration.md), [`parking-pay-parking-marketplace-connect.md`](../done/parking-pay-parking-marketplace-connect.md), [`parking-owner-owned-default.md`](../done/parking-owner-owned-default.md), [`sensitive-settings-email-otp.md`](../done/sensitive-settings-email-otp.md).

**Won't do:** [`google-oauth-verification.md`](../wont-do/google-oauth-verification.md) · [`property-public-pages-shell-redesign.md`](../wont-do/property-public-pages-shell-redesign.md).

**In progress:** [`../in-progress/README.md`](../in-progress/README.md) · **Done:** [`../done/README.md`](../done/README.md).

## Naming

`<kebab-case-slug>.md` — **no date prefix**. Use frontmatter `updated:` for timestamps.

Back to [workflow index](../README.md).
