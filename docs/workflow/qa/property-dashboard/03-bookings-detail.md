---
title: 'QA — Property Booking detail'
status: active
updated: 2026-08-29
---

# 03 — Bookings detail

Route: `/org/:orgSlug/property/:propertySlug/bookings/:bookingId`

## Looks good

- Workflow rail + edit tabs are the core “manage a stay” product — well documented in `bookings-detail.md` + `booking-workflow.mdc`.
- Permission leaves for stay/guests/parking/pets/pricing/workflow are wired (`BookingDetailPage`).
- AI summary panel: results visible after run; run gated by `aiValidations` (Pro+) — correct downgrade-safety pattern.
- Free / `automatedBookingFlow`: Automation Triggers exposes Send for GAF / pet / ack / ready / parking / SD; toast expands Triggers after plan skip; advance guide copy is plan-aware; Email Automations locks plan-gated toggles with TierBadge.

## Issues

| Sev | Issue                                                                                                  | Evidence                  |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| P2  | Cognitive load: Progress + Documents + Pricing + Automation Triggers is a lot for a first-time co-host | Host lens                 |
| P2  | No single “AI brief” summarizing what the host must do next in plain language on Free                  | Product gap vs AI promise |

## Improvements

- One sticky “Next step” banner derived from workflow stage (even without AI).

## Doc gaps

- Guide is detailed and largely accurate. Keep in sync when calendar-sync reservation ingest lands.

## Evidence

Code + route guide + plans matrix; Free manual-send suite shipped in `free-tier-manual-booking-workflow` (2026-08-29). Live list→detail not fully exercised every status in this pass (sample statuses present on list) — re-run Free E2E checklist in the plan when verifying locally with Resend.
