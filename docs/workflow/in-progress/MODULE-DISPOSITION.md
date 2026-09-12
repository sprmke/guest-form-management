---
title: 'In-progress module disposition'
status: active
tags: [workflow, in-progress]
updated: 2026-09-12
stage: in-progress
kind: reference
---

# In-progress module disposition

Snapshot of every open module — what is **testing-only**, what is **real code**, and what **closes** vs **stays open**. Updated when workflow stage changes.

---

## For testing now (implementation complete)

All five modules: [`../for-testing/QA-BATCH.md`](../for-testing/QA-BATCH.md)

| Module                           | Stage       | Close after                       |
| -------------------------------- | ----------- | --------------------------------- |
| Superhost program                | for-testing | QA batch #1                       |
| Onboarding verification simplify | for-testing | QA batch #2                       |
| Host verification tiers          | for-testing | QA batch #3                       |
| CAPTCHA & anti-spam              | for-testing | QA batch #4 (+ Turnstile keys)    |
| PWA install / offline / push     | for-testing | QA batch #5 (+ dev deploy config) |
| Cost / abuse / security          | for-testing | Operator P0 + V-1–V-5             |

---

## In progress — disposition

| Module                                           | Verdict                                                         | Remaining work                                                                                                                                         | Recommended action                                                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **marketing-module-refinement**                  | Bug-fix slice **done**                                          | Meta gaps: FB Stories/video, IG scheduling cron, `scheduledAt` UI, permalink, retry, Reels picker                                                      | **Close** after deferring Meta gaps → new [`../planned/`](../planned/) item **or** keep open if shipping Meta UX next           |
| **parking-property-parity**                      | v1 **shipped**                                                  | Replace `PARKING_INTERIM_UNGATED_FEATURES` with org-native entitlements (`resolveOrgEntitlements` on `getActiveOrgSubscription`); QA checklist in plan | **Stay in-progress** — one focused code pass (~1–2 days) then for-testing                                                       |
| **org-granular-team-permissions**                | Phases 1–4 **shipped** (incl. AI assistant org-tool leaf audit) | Phase 5 QA matrix                                                                                                                                      | **Stay in-progress** until QA                                                                                                   |
| **mobile-native-redesign**                       | Dashboard **shipped**                                           | Phases 1–2: guest booking flow + guest portal/marketing bottom nav; Phase 5 docs                                                                       | **Stay in-progress** — large surface; not a QA-only close                                                                       |
| **ai-assistant-attachment-actions-and-coverage** | Phases 1–7 **shipped** (~99 tools)                              | §11–13 Live pass complete; 3 deferred follow-ups (settings validators, bulk pricing, parking broadcast)                                                | **Done** — [`../done/ai-assistant-attachment-actions-and-coverage.md`](../done/ai-assistant-attachment-actions-and-coverage.md) |
| **ci-cd-environments/**                          | Repo Phases A–C **shipped**                                     | Phase A operator checklist; Phase B mt-prod cutover at release                                                                                         | **Stay in-progress** — operator/release work, not agent QA                                                                      |
| **production-readiness-audit-and-remediation**   | C1–C3 + H1–H6 + self-review harden **shipped**                  | Operator P0 / V-1–V-5 / pentest; sibling plans own H7–H10                                                                                              | **for-testing** — code closed; operator launch gates remain                                                                     |

**Super admin console** — Phases 0–7 **done** ([`../done/super-admin-console-overhaul.md`](../done/super-admin-console-overhaul.md)). Remaining 6 modules in [`../planned/super-admin-console-followups.md`](../planned/super-admin-console-followups.md).

---

## Planned (related, not in-progress)

| Doc                                                                                                                                | Notes                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`../planned/parking-e2e-phase6-ranking-trust-safety.md`](../planned/parking-e2e-phase6-ranking-trust-safety.md)                   | Parking E2E Phase 6                                     |
| [`../planned/parking-e2e-production-readiness.md`](../planned/parking-e2e-production-readiness.md)                                 | Parking prod checklist                                  |
| [`../planned/marketing-studio-mobile-and-dashboard-responsive.md`](../planned/marketing-studio-mobile-and-dashboard-responsive.md) | Marketing mobile (separate from Meta publish gaps)      |
| [`../for-testing/production-readiness-audit-and-remediation.md`](../for-testing/production-readiness-audit-and-remediation.md)     | Develop-track audit ledger + C1–C3 / H1–H6 remediations |

---

## Suggested session order (if clearing the board)

1. **Run QA batch** — five for-testing modules → done (fastest wins)
2. **Marketing** — decide defer Meta gaps → done, or implement scheduling UX
3. **Parking parity** — org entitlements code pass → for-testing → done
4. **Org team permissions** — Phase 4 + QA → done
5. **Mobile / AI attachments / CI/CD** — continue as active development tracks

Back to [in-progress index](./README.md)
