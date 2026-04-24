---
name: admin-dashboard
description: Patterns for the new /bookings admin list and /bookings/:bookingId detail page (React Router 6 + Supabase Auth + TanStack Query). Use when building or extending admin-only UI.
---

# Admin dashboard skill

Implements the admin surface described in `docs/NEW FLOW.md` lines 67-76 and refined in `docs/NEW_FLOW_PLAN.md §3.1`.

## Required context

- `.cursor/rules/admin-auth.mdc` — auth model, allow list, route guards.
- `.cursor/rules/booking-workflow.mdc` — status machine, transitions.
- `.cursor/skills/frontend-design/SKILL.md` — aesthetics & density rules.
- `.cursor/skills/accessibility/SKILL.md` — a11y checklist.
- `.cursor/skills/bookings-table/SKILL.md` — table specifics.

## Folder layout

```
ui/src/features/admin/
  routes/index.tsx                 # exports adminRoutes array, merged in ui/src/routes/index.tsx
  pages/
    SignInPage.tsx                 # /sign-in
    BookingsListPage.tsx           # /bookings
    BookingDetailPage.tsx          # /bookings/:bookingId
  components/
    RequireAdmin.tsx               # session + allow-list guard
    BookingTable.tsx               # <BookingTable data={...} />
    BookingFilters.tsx             # search, status, date range, flags
    StatusBadge.tsx                # status → color dot + label
    WorkflowPanel.tsx              # right-hand rail on detail page
    ReviewPricingForm.tsx          # PENDING_REVIEW pricing inputs
    ParkingRequestForm.tsx         # PENDING_PARKING_REQUEST inputs
    SdRefundForm.tsx               # PENDING_SD_REFUND inputs
  hooks/
    useAdminSession.ts             # wraps supabase.auth + allow list check
    useBookings.ts                 # paginated TanStack Query
    useBooking.ts                  # single booking query
    useTransitionBooking.ts        # mutation → /transition-booking
  lib/
    workflow.ts                    # mirror of server statusMachine.ts (same enum + canTransition)
```

## Data fetching

- Introduce **TanStack Query v5** (`@tanstack/react-query`) now. Hook up a single `QueryClientProvider` in `ui/src/App.tsx`.
- All admin fetches go through hooks under `ui/src/features/admin/hooks/`. Do not `fetch()` in components.
- Cache keys:
  - `['bookings', { search, status, sort, page, limit }]`
  - `['booking', bookingId]`
- Invalidate `['bookings']` and `['booking', id]` after any transition mutation.

## List page — `/bookings`

### Layout

- Page header: title "Bookings", right-aligned primary action "New booking" (navigates to `/form`).
- Filter bar (sticky): search input, status multi-select, check-in date range picker, `has pets`, `has parking`, `is test`.
- Table: virtual/paged, **25 rows default**; footer offers **25 | 50 | 100** page sizes (`NEW_FLOW_PLAN.md` §6.1 **Q5.2**).
- Footer: pagination controls, result count.

### Columns (initial proposal — tune per feedback)

| Column         | Source                                       | Notes                          |
| -------------- | -------------------------------------------- | ------------------------------ |
| Status         | `status`                                     | `<StatusBadge>`                |
| Guest          | `guest_facebook_name` / `primary_guest_name` | Stacked, subtle secondary line |
| Dates          | `check_in_date` → `check_out_date`           | Short format, `n nights` muted |
| Pax            | `number_of_adults + number_of_children`      | Right-aligned                  |
| Parking / Pets | `need_parking`, `has_pets`                   | Small icon badges              |
| Amount         | `booking_rate` (nullable)                    | Muted `—` when unset           |
| Created        | `created_at`                                 | Relative time                  |
| Actions        | `...` menu                                   | View, Cancel                   |

See `.cursor/skills/bookings-table/SKILL.md` for column-def helpers.

### Bulk actions (list)

- Per **Q5.3**: enable **bulk** only for **low-risk** operations first (e.g. **export CSV** of selected rows). **Do not** ship unconstrained “bulk change status” without row-by-row confirmation UX.

### Default filter + sort

- **Sort:** `check_in_date` **ascending** (next stay on top; user can change) — **Q5.1**.
- **Default filter (“Active pipeline”):** hide **`COMPLETED`** stays that are **stale** — e.g. **`COMPLETED`** with **`check_in_date` strictly before today** (`Asia/Manila`) so finished past trips do not clutter the list. **Still show** past check-in rows that are **not** done (e.g. **`PENDING_SD_REFUND`**). Expose toggles like **Show completed** / date-range filters for audits.
- **`CANCELLED`:** do **not** assume default hide (not locked in plan); offer a **status** filter so the owner can include/exclude cancelled rows.

## Detail page — `/bookings/:bookingId`

### Layout

Two-column on ≥lg, single column on mobile:

- **Left (2/3)**: the existing `GuestForm.tsx` rendered in admin mode (dev controls visible). **Guest fields stay editable even after `READY_FOR_CHECKIN`** — but saving material changes from that status **must revert `status → PENDING_REVIEW`** (per `docs/NEW_FLOW_PLAN.md` §6.1 Q5.5). Dev-control checkboxes still gate every side effect on save.
- **Right (1/3, sticky)**: `WorkflowPanel`
  - Status badge + `status_updated_at`
  - Stage-specific sub-form:
    - PENDING_REVIEW → `ReviewPricingForm` (booking rate, down payment, **Guest Parking Rate** (`parking_rate_guest`) when parking, pet fee, **balance = rate − down payment**, SD tracked separately)
    - PENDING_PARKING_REQUEST → `ParkingRequestForm` (**Paid Parking Rate** (`parking_rate_paid`), parking owner email selected, endorsement image upload — labels per §6.1 **Q4.5**)
    - PENDING_SD_REFUND → `SdRefundForm` (**`sd_additional_expenses` / `sd_additional_profits`** as repeatable “+” rows → `NUMERIC[]` in DB, **`sd_refund_receipt_url`** file upload, **`sd_refund_amount`**)
  - List of **available transitions** (buttons) per the state machine.
  - **No v1 activity timeline** on the detail page (`NEW_FLOW_PLAN.md` §6.1 **Q5.4** / **Q1.6** — full history table deferred).

### WorkflowPanel rules

- Primary buttons: transitions from `canTransition(currentStatus, *)`.
- **Recovery / force buttons**: additional transitions from `canManualForceTransition(currentStatus, *, ctx)` — used when cron or Gmail listener should have advanced the booking but didn't. Same `transition-booking` mutation, `{ manual: true }` flag.
- **Manual automation hooks (`Q6.6`):** add secondary actions (toolbar or panel footer) such as **“Run Gmail poll now”** and **“Run SD refund cron now”** that invoke the same scheduled Edge functions with the **admin JWT** — schedules run on Supabase regardless of a sleeping laptop; these buttons cover stuck runs and dev debugging.
- Each button: label (`Proceed to PENDING GAF`), confirmation dialog with a summary of side effects.
- Destructive action `Cancel booking` is always visible when status ≠ CANCELLED, styled as danger.
- After success, invalidate queries and scroll to top of panel.

## Auth UX

- `SignInPage`:
  - Single "Sign in with Google" button.
  - After sign-in, check allow list client-side; if rejected, show generic copy (do not list allowed emails or mention "allow list") and offer sign-out / try another account.
- `RequireAdmin`:
  - Shows a minimal centered spinner while `useAdminSession()` is loading.
  - Redirects to `/sign-in?redirect=<current>` when unauthenticated.
  - Renders generic unauthorized UI + sign-out CTA when authenticated but not allow-listed (no allow-list disclosure).

## Error handling

- Use `sonner` toasts (already installed) for transition success/failure.
- On mutation failure, show the error message and offer **Retry**.
- Gmail-listener / cron-originated transitions are surfaced as auto-refresh of the detail page (invalidate on a 60s interval while on the page).

## Don'ts

- Don't duplicate status or transition logic between `ui/src/features/admin/lib/workflow.ts` and `_shared/statusMachine.ts` — keep them aligned; a mismatch is a bug.
- Don't fetch all bookings client-side for filtering. Server does filter/sort/pagination.
- Don't hide guest-field editing after `READY_FOR_CHECKIN` — instead show a **warning banner** that saving changes will revert workflow to `PENDING_REVIEW` (per Q5.5).
- Don't bypass `RequireAdmin` via a route-level `<Outlet />` without the guard.
