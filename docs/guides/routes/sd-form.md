# SD Refund Form — operator guide

Route: `/sd-form?bookingId=` (legacy) · `/properties/:propertySlug/sd-form?bookingId=`

> **Status:** Documented (guest flow)

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                       |
| -------------- | -------- | ---------- | ---------- | --------------------------- |
| Stepper (3)    | —        | —          | Documented | Review → Surprise → Refund  |
| Guest review   | Yes      | Yes        | Documented | Step 1                      |
| Voucher raffle | Yes      | Server     | Documented | Step 2 · `claim-sd-voucher` |
| Refund payout  | Yes      | Yes        | Documented | Step 3 · `submit-sd-form`   |

---

## Overview

Three-step guest stepper (`SdFormPage`):

| Step | Label          | Content                                                                                             |
| ---- | -------------- | --------------------------------------------------------------------------------------------------- |
| 1    | Leave a Review | In-app star rating, feedback pills, optional photos (`submit-guest-review`)                         |
| 2    | Claim surprise | Balance wait (if early check-out email), then **voucher slot reveal** (`claim-sd-voucher`)          |
| 3    | Refund details | GCash / bank / cash pickup → `submit-sd-form` → workflow `READY_FOR_CHECKOUT` → `PENDING_SD_REFUND` |

Returning guests with an existing review or voucher skip to **step 2**.

**API:** `get-sd-form` (read), `submit-guest-review`, `claim-sd-voucher`, `submit-sd-form`. See `booking-workflow.mdc` for status gates.

---

## Implementation map

| Concern | Path                                                               |
| ------- | ------------------------------------------------------------------ |
| Page    | `ui/src/features/guest/sd-form/pages/SdFormPage.tsx`               |
| Review  | `ui/src/features/guest/sd-form/components/SdFormReviewSection.tsx` |
| Voucher | `ui/src/features/guest/sd-form/components/VoucherReveal.tsx`       |
| Routes  | `ui/src/features/guest/sd-form/routes/index.tsx`                   |

---

## Related docs

- [Route index](../README.md)
- [`docs/PROJECT.md`](../../PROJECT.md)
- `.cursor/rules/booking-workflow.mdc`
