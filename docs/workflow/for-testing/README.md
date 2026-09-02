---
title: 'For testing'
status: active
tags: [workflow, for-testing, qa]
updated: 2026-09-02
stage: for-testing
kind: reference
---

# For testing

Implementation **complete** — remaining work is **manual verification only** (QA checklists, staging walkthroughs, operator smoke tests). No open code tasks unless verification finds bugs.

**Run the batch:** [`QA-BATCH.md`](./QA-BATCH.md) — recommended order + smoke paths for all five modules.

| When to use                                    | Action                                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| QA passes, deferred items documented elsewhere | `/workflow-done <slug>` → [`../done/`](../done/)                                                                     |
| Verification finds required code work          | Move back to [`../in-progress/`](../in-progress/) via `/workflow-start` or manual move + update scratchpad to **🚧** |
| Product cancels                                | `/workflow-wont-do <slug>`                                                                                           |

**Scratchpad emoji:** **🧪** for-testing (between **🚧** in progress and **✅** done).

| Doc                                                                                                    | Summary                                                                                                                                                                                                                                                                                                                 | Verification                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`superhost-program.md`](./superhost-program.md)                                                       | Earned-only org Superhost — metrics, cron, Trust UI shipped                                                                                                                                                                                                                                                             | [`../qa/property-dashboard/20-superhost.md`](../qa/property-dashboard/20-superhost.md)                                                           |
| [`onboarding-verification-simplify.md`](./onboarding-verification-simplify.md)                         | Step 2 rights; Step 3 Valid ID + Facebook; listing proof split                                                                                                                                                                                                                                                          | Plan § Verify + [`../../guides/routes/onboarding.md`](../../guides/routes/onboarding.md)                                                         |
| [`host-verification-tiers.md`](./host-verification-tiers.md)                                           | Verified/Recommended tiers — Phases 1–2 + admin queue priority shipped                                                                                                                                                                                                                                                  | Plan § Phase 3 testing checklist (search boost **deferred** — not blocking)                                                                      |
| [`pwa-installable-offline-push.md`](./pwa-installable-offline-push.md)                                 | Installable PWA + Workbox SW + kill-switch, cross-platform Web Push wired to the Notification Center, offline read + offline write/sync. All code + docs done; green on type-check/lint/build.                                                                                                                          | Plan § "FOR TESTING" — pending deploy config table + full manual QA guide (local + real-device push/offline/update/Lighthouse) in the doc itself |
| [`ai-assistant-attachment-actions-and-coverage.md`](./ai-assistant-attachment-actions-and-coverage.md) | **99 tools** — attachment parity shipped; 3 deferrals → [`../planned/`](../planned/).                                                                                                                                                                                                                                   | Manual §11–13 + `assistantToolCatalog.test.ts` (9 tests green)                                                                                   |
| [`captcha-anti-spam-hardening.md`](./captcha-anti-spam-hardening.md)                                   | Cloudflare Turnstile (invisible) on Supabase Auth OTP + the 6 anon write endpoints; durable DB rate limiter + honeypot/timing heuristics; rate limits on team-invite/chat/upload/support-ticket. All 6 phases coded + docs; `bun run test:edge` green (29 anti-spam / 108 total). **Inert until keys are provisioned.** | Plan § "FOR TESTING — configuration + step-by-step" — Cloudflare key setup + the 12-step pass/fail-key walk in the doc itself                    |

Plans still in [`../in-progress/`](../in-progress/) have open implementation or product scope — do not move here until code work is closed.

Back to [workflow index](../README.md).
