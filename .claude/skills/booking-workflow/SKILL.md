---
name: booking-workflow
description: Operational guide for implementing the new booking lifecycle (state machine, transitions, side effects, migrations). Use whenever a task touches booking status, admin transitions, the workflow orchestrator, Gmail approvals, or the SD refund cron.
---

# Booking workflow skill

This skill is the **playbook** for the redesign. The **rules of engagement** live in `.cursor/rules/booking-workflow.mdc` — read that first, then come back here for how-to steps.

## Required reading before you start

1. `docs/NEW_FLOW_PLAN.md` — plan, open questions, phased rollout.
2. `docs/NEW FLOW.md` — original product spec.
3. `.cursor/rules/booking-workflow.mdc` — canonical status/transition/color map.
4. `.cursor/rules/admin-auth.mdc` — who can transition and how.
5. `.cursor/rules/supabase-edge-functions.mdc` — function conventions.

If the task touches the **surprise-setup** checkbox semantics, check **`NEW_FLOW_PLAN.md` §6.2** (**Q7.4**) — if copy/behavior is still ambiguous, **ask the user** before shipping. **Parking field labels** are locked: **Guest Parking Rate** / **Paid Parking Rate** (§6.1 **Q4.5**).

**Already decided** — full table in `NEW_FLOW_PLAN.md` §6.1 (includes **Q1.3** `TEXT`+`CHECK` for status, **Q1.4/Q1.6** money + audit shape, **Q2.3/Q2.4** amount surfaces + currency format, **Q3.x** PDF + dev-controls scope + test blast radius, **Q4.2/Q4.4/Q4.5** parking comms + manual endorsement + **Guest Parking Rate** / **Paid Parking Rate** labels, **Q5.x** `/bookings` UX, **Q6.x** Gmail inbox + multi-match + failure/manual triggers, **Q7.x** calendar blocking, legacy links, observability, ship-first tests — do not re-litigate).

## Phased implementation

Do not skip phases. Ship each as a separate PR that is independently deployable.

### Phase 0 — Backup + additive migration

- Migration: `supabase/migrations/2026…_backup_guest_submissions.sql` → `CREATE TABLE guest_submissions_backup_<ts> AS SELECT * FROM guest_submissions`.
- Migration: add nullable columns from `NEW_FLOW_PLAN.md §2` (booking rate, down payment, balance, parking rates ×2, pet fee, approved PDF URLs, SD expense/profit **`NUMERIC[]`**, SD refund receipt URL, SD refund amount, `is_test_booking`, `status_updated_at`).
- Do **not** change behavior yet. Deploy, verify, only then move to Phase 1.

### Phase 1 — Admin auth + empty `/bookings`

- Add `@supabase/supabase-js` + `@tanstack/react-query` to `ui/package.json`.
- Create `ui/src/lib/supabaseClient.ts` (singleton).
- Create `ui/src/features/admin/` with `RequireAdmin`, `SignInPage`, `BookingsListPage` (read-only).
- `list-bookings` edge function returns existing rows paginated; no transitions yet.
- Wire routes in `ui/src/routes/index.tsx`.

### Phase 2 — State machine (read path)

- Migration: implement **`status` as `TEXT` + `CHECK`** (allowed literals per `.cursor/rules/booking-workflow.mdc`) — **§6.1 Q1.3**. Backfill legacy `booked` rows per **§6.1 Q1.1** — check-in **before today (Asia/Manila)** → `COMPLETED`; **today or future** → `PENDING_REVIEW`; `canceled` → `CANCELLED`.
- Create `_shared/statusMachine.ts` with the enum + `canTransition(from, to)` **and** `canManualForceTransition(from, to, ctx)` (small explicit allow-list for admin recovery — see `.cursor/rules/booking-workflow.mdc` §2.2).
- Update `get-booked-dates` to block on `status != 'CANCELLED'`.
- Render `StatusBadge` in the list.

### Phase 3 — Transitions (manual, no email listener)

- Create `_shared/workflowOrchestrator.ts#transition(bookingId, toStatus, payload)`.
- Create `transition-booking` edge function (admin).
- Build `/bookings/:bookingId` detail page: reuse `GuestForm.tsx` (dev-mode on) + a right-side `WorkflowPanel` component that shows available transitions for the current status.
- Stage-specific sub-forms: `ReviewPricingForm` (PENDING_REVIEW), `ParkingRequestForm` (PENDING_PARKING_REQUEST), `SdRefundForm` (PENDING_SD_REFUND).
- Wire the new emails (booking acknowledgement, ready-for-check-in, parking broadcast).
- Update `calendarService.ts` to use the status → colorId map.
- Widen `sheetsService.ts` to include all new columns.

### Phase 4 — Gmail listener + cron

- See the `gmail-listener` skill for the full pattern.
- Cron: `sd-refund-cron` scans every 5 min for `READY_FOR_CHECKIN` with `check_out_date + check_out_time + 15min ≤ now(Asia/Manila)` and calls `transition-booking` → `PENDING_SD_REFUND`.

### Phase 5 — Submit-form cleanup

- Remove email, calendar, sheet side effects from `submit-form/index.ts`. Always DB + storage + PDF.
- Default `status = 'PENDING_REVIEW'`. **Testing behavior stays the same as today** — the only UX change is: use **Test Submit** instead of `?testing=true`, and persist `is_test_booking = true` on the row for easier querying. Server may still accept legacy `?testing=true` briefly while old links exist; `is_test_booking` should mirror that flag.
- Delete `?dev=true` / `?testing=true` **from the public UI URL bar** (no more query-param driven test mode), but keep the underlying `isTestingMode` plumbing in edge functions until fully migrated.
- Add a separate **Test Submit** button in `GuestForm.tsx`.

### Phase 6 — Prod backfill

- One-shot admin edge function or Deno script that resyncs every non-cancelled booking’s calendar title/color and sheet row per the new mapping.
- Write results to a log; run during low-traffic window.

## Implementation rules (please follow)

- **Single source of truth for status/color/prefix** — in `_shared/statusMachine.ts`. Mirror to `ui/src/features/admin/lib/workflow.ts` via a shared JSON file or duplicated literal with a lint test.
- **All transitions go through the orchestrator.** UI → `transition-booking` → orchestrator. Gmail listener → orchestrator. Cron → orchestrator. Never call `calendarService` / `sheetsService` / `sendEmail` directly from a handler.
- **Never CC the guest** on GAF or pet request emails.
- **Pricing math** lives in one helper (`_shared/pricing.ts`): **`balance = booking_rate - down_payment`**. SD (`security_deposit`, default ₱1500) and parking/pet line items are **not** in balance — they are separate fields shown in breakdown UIs/emails. UI must import the same helper (or call a tiny `compute-pricing` edge function) — no duplicated math.
- **Test bookings in production**: orchestrator must force `sendEmail = false` when `is_test_booking && DENO_DEPLOYMENT_ID`.
- **Update the docs** in the same change (`PROJECT.md`, `TODOS.md`, and flip the relevant question/phase in `NEW_FLOW_PLAN.md`).

## Testing checklist for a transition PR

- [ ] DB status moves as expected (with `status_updated_at`).
- [ ] Calendar event exists with correct `colorId` + title prefix.
- [ ] Sheet row has the new column values.
- [ ] Expected email(s) sent, none of the forbidden ones (e.g. no guest CC on GAF).
- [ ] Test booking in prod does not send email.
- [ ] Idempotent: running the transition twice does not duplicate emails or calendar events.
- [ ] `get-booked-dates` still blocks this booking (unless CANCELLED).
- [ ] Admin allow-list rejects non-allow-listed users.

## Common pitfalls (seen in current code)

- Calendar `colorId: 2` is **hardcoded** in `calendarService.ts#createEventData`. Replace with the map. Don’t forget updating `cancel-booking` which sets `colorId: 11`.
- `compareFormData` in `_shared/utils.ts` is a hand-maintained list. **Add the new pricing + parking + SD fields** or updates will silently no-op.
- The `submissionData.id` return chain from `DatabaseService.processFormData` is used by calendar/sheet services; don’t break that while moving side effects out of the submit handler.
