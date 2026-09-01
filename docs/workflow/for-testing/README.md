---
title: 'For testing'
status: active
tags: [workflow, for-testing, qa]
updated: 2026-09-01
stage: for-testing
kind: reference
---

# For testing

Implementation **complete** — remaining work is **manual verification only** (QA checklists, staging walkthroughs, operator smoke tests). No open code tasks unless verification finds bugs.

| When to use                                    | Action                                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| QA passes, deferred items documented elsewhere | `/workflow-done <slug>` → [`../done/`](../done/)                                                                     |
| Verification finds required code work          | Move back to [`../in-progress/`](../in-progress/) via `/workflow-start` or manual move + update scratchpad to **🚧** |
| Product cancels                                | `/workflow-wont-do <slug>`                                                                                           |

**Scratchpad emoji:** **🧪** for-testing (between **🚧** in progress and **✅** done).

| Doc                                                                            | Summary                                                                | Verification                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`superhost-program.md`](./superhost-program.md)                               | Earned-only org Superhost — metrics, cron, Trust UI shipped            | [`../qa/property-dashboard/20-superhost.md`](../qa/property-dashboard/20-superhost.md)   |
| [`onboarding-verification-simplify.md`](./onboarding-verification-simplify.md) | Step 2 rights; Step 3 Valid ID + Facebook; listing proof split         | Plan § Verify + [`../../guides/routes/onboarding.md`](../../guides/routes/onboarding.md) |
| [`host-verification-tiers.md`](./host-verification-tiers.md)                   | Verified/Recommended tiers — Phases 1–2 + admin queue priority shipped | Plan § Phase 3 testing checklist (search boost **deferred** — not blocking)              |

Plans still in [`../in-progress/`](../in-progress/) have open implementation or product scope — do not move here until code work is closed.

Back to [workflow index](../README.md).
