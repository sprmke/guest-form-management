# Guest Form — operator guide

Route: `/properties/:propertySlug/form` (legacy `/form?property=<slug>` redirects here)

> **Status:** Documented.

## Progress overview

| Section              | E2E save | Validation | Docs       | Notes                                     |
| -------------------- | -------- | ---------- | ---------- | ----------------------------------------- |
| Multi-step form      | ✅       | ✅ Zod     | Documented | 5 steps (4 for Airbnb)                    |
| Auth on submit       | ✅       | —          | Documented | Checkout modal; anonymous fill allowed    |
| Overlap / lock check | ✅       | Server     | Documented | Booking overlap + `GUEST_FORM_LOCKED`     |
| Dev controls         | ✅       | —          | Documented | Non-prod only; FormData flags             |
| Legacy URL strip     | ✅       | —          | Documented | `dev` / `testing` / flags / `from=airbnb` |

---

## Overview

The guest booking form, scoped to **`/properties/:propertySlug/form`**. Admin **New booking** on the property bookings list links here via `guestFormPath(propertySlug)`. Guests can also reopen an existing submission with **`?bookingId=`** (e.g. from the [Stays](./account/stays.md) tab) to edit it while it's still `PENDING_REVIEW`.

Legacy **`/form?property=<slug>`** redirects to the scoped route. Deprecated query keys (`dev`, `testing`, submit-form control flags, `from`) are stripped on load; `from=airbnb` migrates to `?source=airbnb`.

---

## Host-facing knowledge

The booking form walks a guest through their info, stay dates and guest list, optional paid parking, optional pets, and — for non-Airbnb bookings — a downpayment receipt upload. A guest can reopen their own submission to make changes only while it's still awaiting your review; once you've started processing it, they're told to contact you directly instead of editing it themselves.

**Common host questions**

- Q: A guest says they can no longer edit their booking form.
  A: Guests can only edit their own submission while it's still in the initial "awaiting review" stage. Once you've moved it forward, they're shown a message to contact you on Facebook or Airbnb for changes instead.
- Q: Why doesn't the Airbnb booking form ask for a payment receipt?
  A: Airbnb bookings skip the downpayment step entirely — Airbnb handles that payment on their platform, not through Kame Home.
- Q: A guest tried to book dates that are already taken — what do they see?
  A: An "already booked" message telling them those dates aren't available, so they can pick different ones.

---

## Steps

| #   | Step    | Content                                                                                                                             | Airbnb     |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Guest   | Facebook/Airbnb name, email, phone, address                                                                                         | ✅         |
| 2   | Stay    | Check-in/out dates + times, nationality, guest list (names/ages/valid ID), special requests, how they found us, surprise decor flag | ✅         |
| 3   | Parking | Optional paid parking (plate, brand/model, color, optional custom parking dates)                                                    | ✅         |
| 4   | Pets    | Optional pet details (name, type, breed, age, vaccination date, vaccination record + pet photo)                                     | ✅         |
| 5   | Payment | Downpayment breakdown (GCash/bank) + receipt upload                                                                                 | ❌ skipped |

Airbnb bookings (`?source=airbnb`, or a booking with `booking_source = 'Airbnb'`) get **4 steps** — Payment is omitted entirely and `paymentReceipt` is not required. See `.cursor/rules/booking-workflow.mdc` § Airbnb source behavior for the full list of Airbnb-specific differences downstream of submission.

Each step validates its own fields (via `getFieldsForGuestFormStep`) before **Next** advances; the guest cannot submit until the final step's validation passes.

---

## Fields

### Save path

1. Guest completes all steps → taps **Submit** on the last step.
2. If not already signed in, the **checkout auth modal** opens (`requireGuestAuth`) — the guest can fill the entire form anonymously; authentication is only required at submit time. On success, submission resumes automatically.
3. `GuestForm` builds `FormData` (files kept as files, everything else stringified) and POSTs to **`submit-form`** (property scope via `?property=<slug>` in the query string; side-effect flags via FormData in non-prod only — never in the URL).
4. `submit-form`:
   - Checks for overlapping bookings on the property for the given dates (skipped if the booking is unchanged).
   - If `bookingId` matches an existing row, compares incoming vs stored fields (`compareFormData`); no-op updates short-circuit straight to the success page.
   - Rejects with `GUEST_FORM_LOCKED` if the existing booking's status no longer allows guest self-edit (`canGuestPublicUpdateForm`).
   - Associates the submission with the signed-in guest's account (`guest_user_id`) when a valid session JWT is present.
   - Runs non-blocking AI validation on the downpayment receipt and each valid ID upload (logged, not submit-blocking).
   - Sends the **New Booking Request** notify email (to `EMAIL_REPLY_TO`, not the guest) when enabled and this is a genuine change.
   - Updates Google Calendar + Sheets when those flags are on.
5. On success, guest is redirected to `/properties/:slug/success?bookingId=`.

### Behavior / edge cases

- **Booking overlap:** blocked with a dedicated `BOOKING_OVERLAP` toast telling the guest to screenshot and contact the host.
- **Locked booking:** once a submission has moved past `PENDING_REVIEW`, guest edits are rejected server-side (`GUEST_FORM_LOCKED`) and the form disables all fields with a banner.
- **No workflow email/PDF here:** `submit-form` never sends GAF/acknowledgement/pet/parking email or generates PDFs — those only happen on admin workflow transitions (see `.cursor/rules/booking-workflow.mdc`). The only email `submit-form` can send is the internal **New Booking Request** notify.
- **Same-page reopen for edits:** loading `?bookingId=` pre-fills every field (including re-fetching uploaded images as `File` objects for preview) via **`get-form`**.
- **Booked-dates check:** on mount, fetches the property's occupied date ranges via `get-booked-dates` to disable those days in the date pickers.

---

## Developer controls (non-production only)

Shown on the last step, never gated by `?dev=true`. Checkboxes (all on by default): save to database, save images to storage, send email (New Booking Request only), update Google Calendar, update Google Sheets. Also includes **Paste Booking Info from Clipboard** and **Generate New Data** (new submissions) and **Cancel This Booking** (existing submissions). Production always runs the full happy path regardless of client input.

---

## API reference

| Action                    | Endpoint                     |
| ------------------------- | ---------------------------- |
| Submit / update booking   | `POST submit-form`           |
| Load existing submission  | `GET get-form/:bookingId`    |
| Booked date ranges        | `GET get-booked-dates`       |
| Payment / branding info   | `GET get-guest-payment-info` |
| Cancel booking (dev only) | `POST cancel-booking`        |

---

## Implementation map

| Concern               | Path                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Page                  | `ui/src/features/guest/form/components/GuestForm.tsx`                                             |
| Schema                | `ui/src/features/guest/form/schemas/guestFormSchema.ts`                                           |
| Steps config          | `ui/src/features/guest/form/lib/guestFormSteps.ts`                                                |
| Strip legacy URL keys | `ui/src/features/guest/form/lib/bookingSourceFromSearchParams.ts`                                 |
| Payment info hook     | `ui/src/features/guest/form/hooks/useGuestPaymentInfo.ts`                                         |
| Routes (wired)        | `ui/src/features/guest/property/routes/index.tsx` (`propertyGuestRoutes`, `legacyGuestRedirects`) |
| Paths                 | `ui/src/features/guest/lib/guestPublicPaths.ts`                                                   |
| Auth-on-submit        | `ui/src/features/guest/auth/context/GuestAuthContext.tsx`                                         |
| Submit                | `supabase/functions/submit-form/index.ts`                                                         |
| Form data fetch       | `supabase/functions/get-form/index.ts`                                                            |
| Shared services       | `supabase/functions/_shared/{databaseService,receiptValidationService,statusMachine}.ts`          |

---

## Related docs

- [Route index](./README.md)
- [Calendar](./calendar.md)
- [Success](./success.md)
- [`docs/PROJECT.md`](../PROJECT.md)
- `.cursor/rules/booking-workflow.mdc` — Airbnb source behavior, guest-field revert rules
- `.cursor/rules/admin-auth.mdc` §4 — guest form dev controls contract

---

## Pending / follow-ups

- [ ] `ui/src/features/guest/form/routes/index.tsx` (`guestFormRoutes`) is an **orphaned** route module — not imported by the app router. The routes actually served come from `ui/src/features/guest/property/routes/index.tsx`.
