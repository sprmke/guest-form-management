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
- Table: virtual/paged, 25 rows per page default.
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

### Default filter

- Hide `COMPLETED` and `CANCELLED` by default (toggleable).
- Sort: upcoming check-in ascending.

## Detail page — `/bookings/:bookingId`

### Layout

Two-column on ≥lg, single column on mobile:

- **Left (2/3)**: the existing `GuestForm.tsx` rendered in admin mode (dev controls visible, all fields editable per Q5.5 pending answer).
- **Right (1/3, sticky)**: `WorkflowPanel`
  - Status badge + `status_updated_at`
  - Stage-specific sub-form:
    - PENDING_REVIEW → `ReviewPricingForm` (booking rate, down payment, parking rate to guest, pet fee, balance auto-computed)
    - PENDING_PARKING_REQUEST → `ParkingRequestForm` (parking rate paid, parking owner email selected, endorsement image upload)
    - PENDING_SD_REFUND → `SdRefundForm` (additional expenses +, additional profits +, no-damages checkbox, refund amount)
  - List of **available transitions** (buttons) per the state machine.
  - History/activity log (if Q1.6 is answered yes to audit table).

### WorkflowPanel rules

- Only show transitions returned by `canTransition(currentStatus, *)`.
- Each button: label (`Proceed to PENDING GAF`), confirmation dialog with a summary of side effects.
- Destructive action `Cancel booking` is always visible when status ≠ CANCELLED, styled as danger.
- After success, invalidate queries and scroll to top of panel.

## Auth UX

- `SignInPage`:
  - Single "Sign in with Google" button.
  - After sign-in, check allow list client-side; if rejected, sign out and show "This email is not authorized to access the admin dashboard." with a "Try another account" button.
- `RequireAdmin`:
  - Shows a minimal centered spinner while `useAdminSession()` is loading.
  - Redirects to `/sign-in?redirect=<current>` when unauthenticated.
  - Renders `<Unauthorized />` + sign-out CTA when authenticated but not allow-listed.

## Error handling

- Use `sonner` toasts (already installed) for transition success/failure.
- On mutation failure, show the error message and offer **Retry**.
- Gmail-listener / cron-originated transitions are surfaced as auto-refresh of the detail page (invalidate on a 60s interval while on the page).

## Don'ts

- Don't duplicate status or transition logic between `ui/src/features/admin/lib/workflow.ts` and `_shared/statusMachine.ts` — keep them aligned; a mismatch is a bug.
- Don't fetch all bookings client-side for filtering. Server does filter/sort/pagination.
- Don't show editing affordances for fields that should be frozen post-review (pending Q5.5 decision) — add a "locked" indicator and disable.
- Don't bypass `RequireAdmin` via a route-level `<Outlet />` without the guard.
