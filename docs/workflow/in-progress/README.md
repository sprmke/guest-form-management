---
title: 'In progress'
status: active
tags: [workflow, in-progress]
updated: 2026-08-28
stage: in-progress
kind: reference
---

# In progress

Implementation **started** — plan not fully complete. Partial phases or v1 slices do **not** count as done; move to [`../done/`](../done/) only when the plan’s remaining scope is closed or explicitly deferred to backlog elsewhere.

| Doc                                                                                                    | Summary                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`host-verification-tiers.md`](./host-verification-tiers.md)                                           | Phases 1–2 shipped; Phase 3 partial — admin queue ✅; browse search boost deferred                                                                                                                                   |
| [`ci-cd-environments/`](./ci-cd-environments/README.md)                                                | **CI/CD + environments** — dual-track deploy, dev now / prod at release (Phases A–C shipped; Phase F in progress)                                                                                                    |
| [`booking-workflow-multi-tenancy.md`](./booking-workflow-multi-tenancy.md)                             | v1 configurable docs shipped; backlog — Gmail listener, payment automation, client mirror (see §5)                                                                                                                   |
| [`marketing-module-refinement.md`](./marketing-module-refinement.md)                                   | Marketing 5 — perf/thumbnail/playback + AI-gen/publish fixes shipped; Meta scheduling/confirmation + publish UX gaps remain                                                                                          |
| [`mobile-native-redesign.md`](./mobile-native-redesign.md)                                             | Native-feel mobile shell — dashboard phases shipped; guest marketing pending                                                                                                                                         |
| [`ai-usage-metering-credits-foundation.md`](./ai-usage-metering-credits-foundation.md)                 | Phases 1–3 shipped; Phase 4 (paid credit top-up via PayMongo) deferred                                                                                                                                               |
| [`parking-property-parity.md`](./parking-property-parity.md)                                           | v1 parity shipped (web chat, archive, blocks, email toggles, dashboard stats); **pending org-plan gating replacement**                                                                                               |
| [`parking-e2e-phase3-payment-pricing.md`](./parking-e2e-phase3-payment-pricing.md)                     | Phase 3 — PayMongo payment, gross/fee/net display, anti-spam, cancellation done; admin refund path deferred until real payments flow                                                                                 |
| [`parking-e2e-phase4-payout-admin-config.md`](./parking-e2e-phase4-payout-admin-config.md)             | Phase 4 — buildable subset (commission config, payout ledger, manual disbursement) shipped 2026-08-26; real PayMongo Platforms split-payout blocked on business/compliance action, not code                          |
| [`parking-e2e-phase5-endorsement-communication.md`](./parking-e2e-phase5-endorsement-communication.md) | Phase 5 — auto endorsement email, resend/retry, in-app copy, auto-accept toggle, guest↔host chat, contact reveal, admin escalation contact — shipped 2026-08-26; pending live PayMongo webhook + mobile verification |
| [`parking-e2e-phase8-direct-booking-link.md`](./parking-e2e-phase8-direct-booking-link.md)             | Phase 8 — shareable direct-booking link, half-commission channel, reusing the existing pinned-listing flow — shipped 2026-08-26, verified locally end-to-end; pending mobile pass + live PayMongo verification       |
| See [`../done/`](../done/) for completed work.                                                         |

Back to [workflow index](../README.md).
