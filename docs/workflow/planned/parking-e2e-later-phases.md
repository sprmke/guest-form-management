---
stage: planned
title: 'Parking E2E — Later phases (2a / 2b / 3 / 4) stubs'
status: planned
tags: [planning, planned-modules, parking]
updated: 2026-08-07
---

# Parking E2E — Phases 2a / 2b / 3 / 4 (stubs)

**Not implementation plans.** Placeholders so Phase 0/1 does not lose intake intent from `docs/workflow/intake/_to-plan.md`. Run `/superpowers-brainstorm` + `/superpowers-plan` per phase when Phase 1 ships.

Depends on: [Phase 0/1 overview](../done/parking-e2e-phase1-overview.md) complete.

---

## Phase 2a — Immediate / same-day matching

**Problem:** Pick the _best_ parking when many candidates exist; expire and rotate hosts.

**Open decisions (do not invent in Phase 1):**

| Topic        | Intake hint                                   | Notes                                                 |
| ------------ | --------------------------------------------- | ----------------------------------------------------- |
| Ranking      | Check-in/out fit, tower vs bay, dimension fit | Reuse `resolveVehicleFit` + structural `parking_type` |
| Re-broadcast | New round after 5–10 min if unclaimed         | Phase 1 intentionally single-round                    |
| TTL          | 15 min same-day / 1 hr advance                | Already in Phase 1; Phase 2a may add rounds           |
| No inventory | Refund + notify guest                         | Blocked on **parking payment e2e** intake item        |

**Exit:** Dedicated plan doc `parking-e2e-phase2a-matching.md` when ready.

---

## Phase 2b — Advance parking after property booking

**Problem:** Property stay needs parking; property host has none → auto-search parking in org (or later cross-org) for the same dates; notify parking hosts with same claim machinery.

**Depends on:** Phase 1 broadcast/claim + property workflow hook point (likely after property booking confirmed / `need_parking`).

**Open decisions:** Which property status triggers search; guest UX when parking is pending separately from stay; pricing bundling.

**Exit:** `parking-e2e-phase2b-property-linked.md`.

---

## Phase 3 — Listing / discovery UX

**Problem:** How guests find parking when hosts are slow or unresponsive.

| Option | Intake                        |
| ------ | ----------------------------- |
| A      | Keep current listing UI       |
| B      | Filter/search “available now” |

Also: messaging when hosts are unresponsive; possibly surface “request any” CTA that Phase 1 submit already supports via `organizationId`-only.

**Exit:** `parking-e2e-phase3-discovery-ux.md` (shape with `/impeccable shape` — Persuade vs Operate split for marketing list vs request flow).

---

## Phase 4 — On-site / physical ops

- Photograph tower vs bay examples for host guidance.
- Dynamic slot number edit/add.
- Measure dimensions + height clearance (feeds Phase 0 fields).

Mostly ops/runbook + light admin UI — not the same as booking workflow.

**Exit:** `parking-e2e-phase4-onsite-ops.md` or a short ops checklist under `docs/archive/operations/` if no product code.

---

## Sequencing after Phase 1

```
Phase 1 (request/accept/notify) ──▶ 2a (smarter match + rebroadcast)
                                 └─▶ 2b (property-linked) [can parallelize after 1]
Phase 3 can start design in parallel with 2a once listing pain is clear.
Phase 4 is independent ops work anytime after Phase 0 fields exist.
```
