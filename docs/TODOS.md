New booking flow — phase tracker (see `docs/planning/NEW_FLOW_PLAN.md` §5):

- ✅ **Phase 0 — Backup + additive schema.** Backup snapshot table (`guest_submissions_backup_20260501`), nullable workflow columns, approved-PDF URL columns, `processed_emails`, `gmail_listener_state`, 4 new storage buckets; **`20260501000010`** adds request PDF URL columns. No Edge/UI behavior change from SQL alone. **Apply order:** **`docs/operations/migration-runbook.md` §1** (`20260428120000_*` runs before the May 1 batch). Runbook: `docs/operations/migration-runbook.md`. (The `is_test_booking` column was added in `20260501000004` and **removed** in `20260608120000_drop_is_test_booking.sql`.)
- ✅ **Phase 1 — Admin auth + read-only `/bookings`.** Supabase Google OAuth sign-in at `/sign-in`, `RequireAdmin` route guard, `/bookings` list (search, status chips, has-pets/parking tri-state, 31/50/100 pagination). Reads `guest_submissions` directly via `@supabase/supabase-js` under the existing public RLS policy. Runbook §7 covers the one-time Google OAuth setup.
- ✅ **Phase 2 — Status enum widening + legacy row backfill + `get-booked-dates` treats non-`CANCELLED` as blocking.** Migration `20260502000000_widen_status_enum.sql` backfills `booked/canceled` rows to new enum, adds CHECK constraint + `DEFAULT 'PENDING_REVIEW'`. Created `_shared/statusMachine.ts` (server) + `ui/src/features/dashboard/bookings/lib/workflow.ts` (client mirror) with full transition graph, calendar meta, and sub-form requirements. Updated `get-booked-dates` and `databaseService.checkOverlappingBookings` to filter on `CANCELLED` only.
  - ✅ **Q5.1 deferred item shipped in Phase 3:** `/bookings` uses workflow priority sort; **completed** stays hidden by default (cancelled too); **Show completed bookings** sends `show_completed_bookings=true`. Active past check-ins (checkout, SD refund, etc.) stay visible without the toggle.
  - **Not in Phase 1–2:** `/bookings/:bookingId` detail + workflow panel — Phase 3.
- ✅ **Phase 3 — `transition-booking` endpoint + admin transition UI + new guest emails.**
  - Created `_shared/workflowOrchestrator.ts` — central side-effect fan-out for all transitions (DB, Calendar, Sheets, emails). All callers (UI, future cron, future Gmail listener) go through it.
  - Created `list-bookings` edge function — paginated, server-side check-in sort (normalises MM-DD-YYYY → YYYY-MM-DD for correct year-boundary ordering), status/date/pet/parking filters, stale-COMPLETED hide per Q5.1.
  - Created `transition-booking` edge function — validates transition via `statusMachine.canTransition`, delegates to orchestrator.
  - Created `upload-booking-asset` edge function — admin uploads parking endorsements, approved PDFs, and refund receipts to Supabase Storage.
  - Refactored `cancel-booking` to go through the orchestrator.
  - All admin functions set `verify_jwt = false` in `config.toml` (Kong's HS256 gate rejects newer ES256 tokens; `verifyAdminJwt` in the handler is the sole security boundary — it validates via `supabase.auth.getUser` + ADMIN_ALLOWED_EMAILS allow-list).
  - Added `sendBookingAcknowledgement`, `sendReadyForCheckin`, `sendParkingBroadcast` to `emailService.ts`; fixed CC on GAF/pet emails (guest no longer CC'd).
  - Updated `calendarService.ts` with `updateCalendarEventStatus` and status→colorId/summary map.
  - Frontend: `useBooking`, `useTransitionBooking`, `useCancelBooking` hooks; `WorkflowPanel`, `ReviewPricingForm`, `ParkingRequestForm`, `SdRefundForm` components; `/bookings/:bookingId` detail page (`BookingDetailPage`); route wired in admin routes.
  - `useBookings` now calls `list-bookings` edge function (PostgREST fallback on auth failure); default sort changed to `check_in_date:asc` per Q5.1.
  - Sort dropdown added to `BookingFilters`; `BookingTable` rows now link to `/bookings/:bookingId`.
- ✅ **Phase 3.1 — Bookings UX upgrade.**
  - **Date-range filter** ported from `property-management-app` (`week`/`month`/`year` presets + custom 2-month picker). `useDateNavigation` hook + `useSyncDateRangeWithQuery` keep state in URL `?from`/`?to`; styled with project tokens via `BookingDateRangeFilter`.
  - **View toggle** (`?view=table\|card\|calendar`) using an icon-only segmented control (`BookingViewToggle`). Built `BookingCardGrid` (responsive 1/2/3/4-col grid) and `BookingCalendarView` (month grid + selected-day detail, multi-booking days handled). Pagination is suppressed in calendar view since the date range scopes results.
  - **Avatars now render the guest's `valid_id_url`** when present, falling back to a single-color (sidebar-primary green) initial. New shared `GuestAvatar` component used by table, cards, and calendar detail.
  - **Larger flag icons** (Car / Dog) — pill shape with tinted background; consistent across table + cards + calendar.
  - **Whole-row click** on `BookingTable` (Enter/Space supported) plus whole-card click in `BookingCardGrid`; the trailing chevron is decorative-only and reveals on hover.
  - **Search broadened**: `q` now matches across primary guest, additional guests (`guest2_name`…`guest5_name`), email, phone, address, nationality, pet name/type/breed, plate/brand/color, and free-text notes (`guest_special_requests`, `find_us_details`). Mirrored in both the `list-bookings` edge function and `useBookings` PostgREST fallback. Placeholder text updated.
  - **WorkflowPanel pipeline stepper + Back navigation.** `WorkflowPanel` swapped its flat list of action buttons for a **vertical stepper** (`PipelineStepper`) that visualizes the booking's _applicable_ journey — completed steps render as emerald checkmarks, the current step gets a blue ring + "Since X ago" timestamp, upcoming steps are outlined dots, and parking / pet stages are filtered out when those flags are off. Actions collapsed to one primary "Proceed to {next}" CTA + one secondary "← Back to {previous}" recovery button + the existing "Cancel Booking", driven by new `bookingPipeline()` / `nextStep()` / `previousStep()` helpers in `workflow.ts`.
  - **Backward overrides** added to `MANUAL_OVERRIDE_GRAPH` on both server (`statusMachine.ts`) and client mirror (`workflow.ts`): every non-terminal status can now step back one stage when the admin needs to redo a step. The graph is permissive; the UI narrows to a single back-button per booking via the pipeline helpers.
  - **Email re-fire safety**: the workflow orchestrator sends ready-for-check-in only on forward transitions to `READY_FOR_CHECKIN` from `PENDING_DOCUMENTS` or legacy `PENDING_GAF` / `PENDING_PARKING_REQUEST` / `PENDING_PET_REQUEST` — not from e.g. `PENDING_SD_REFUND → READY_FOR_CHECKIN`. The dev control is relevant on those same pre-ready statuses.
- ✅ **Phase 4 — Gmail listener + SD refund cron.**
  - Created `gmail-listener` edge function — Gmail OAuth via `GMAIL_OAUTH_CLIENT_JSON` + `GMAIL_OAUTH_TOKEN_JSON` (set by `npm run gmail-auth`), incremental `users.history.list` polling, `APPROVED GAF.pdf` attachment download + Storage upload, booking correlation by date range + status, ambiguous multi-match recorded as `skipped` (Q6.5), idempotency via `processed_emails` table + `gmail_listener_state` history cursor, transitions through `workflowOrchestrator`.
  - Created `sd-refund-cron` edge function — scans `READY_FOR_CHECKIN` bookings using Manila check-out minus **`SD_REFUND_CRON_EMAIL_LEAD_MINUTES`** (default 2h): sends **Check-out & SD Refund** guest email without waiting on balance settlement; auto-transitions to **`READY_FOR_CHECKOUT`** only when settlement is complete (orchestrator), not directly to `PENDING_SD_REFUND`.
- ✅ **Phase 4b — Guest SD refund form (`READY_FOR_CHECKOUT`).**
  - Status `READY_FOR_CHECKOUT` + DB columns (`sd_refund_*`, form timestamps); cron + manual `READY_FOR_CHECKIN → READY_FOR_CHECKOUT` with **`sendSdRefundFormEmail`** dev control and `sendSdRefundFormRequest` template.
  - Public edge functions **`get-sd-form`** / **`submit-sd-form`**; admin **`send-sd-refund-form-email`** resend; UI **`/sd-form`** stepper (`ui/src/features/guest/sd-form/**`) and admin **`WorkflowPanel`** resend + dev checkbox.
  - After guest submit (or admin skip without `sd_refund_method`), booking moves to **`PENDING_SD_REFUND`** for settlement (`SdRefundForm` shows read-only guest refund block when present).
  - `supabase/config.toml` — schedule config is commented out (local CLI doesn't support `schedule` key); uncomment the `[functions.gmail-listener]` and `[functions.sd-refund-cron]` blocks only when deploying to Supabase Cloud.
  - Gmail OAuth: legacy `npm run gmail-auth` → `GMAIL_OAUTH_CLIENT_JSON` + `GMAIL_OAUTH_TOKEN_JSON`, **or** in-app **Connect Gmail** on **`/settings`** (stores encrypted refresh token in `gmail_mail_integration`; requires `GMAIL_API_WEB_CLIENT_JSON` + `GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY` — see `docs/PROJECT.md` §8 / §11).
- ✅ **Phase 5 — `submit-form` cleanup + removal of test-booking pipeline.**
  - ✅ `submit-form` no longer sends workflow emails; no `?testing=true`, no `is_test_booking`, no `cleanup-test-data`, no `[TEST]`/`TEST_` prefixes. Guest `/form` keeps optional **dev API toggles** when `!production` or `?dev=true` (save DB, storage, calendar, sheet) — no separate Test Submit.
  - ✅ Parent status `PENDING_DOCUMENTS` added for parallel document work. `WorkflowPanel` shows sub-status progress (`PENDING_GAF`, `PENDING_PARKING_REQUEST`, `PENDING_PET_REQUEST`) with "Mark as Complete" actions.
- ✅ **Calendar time + sync prevention** — `guest_submissions.check_*_time` stored as 24h `HH:mm` (migration `20260623120000_normalize_time_columns_to_24h.sql`); `formatTime` / `buildGoogleCalendarDateTime` parse AM/PM safely; workflow + edit-save calendar patches update all matched Google events.
- ✅ **Calendar occupied-night window** — multi-night Google Calendar events end **23:59 on the last occupied night** (not checkout morning), matching admin calendar availability; migration `20260709120000_backfill_calendar_event_dates.sql` + admin **`backfill-calendar-event-dates`** edge function for legacy events.

---

Todos

- ✅ In dev env, if we enable google calendar & sheets, let's add [TEST] on title to easily determine that it's a test booking
- ✅ I noticed that on prod, we have a lot of booked dates, we should filter it to not include past dates from today because all past dates are automatically disabled from the calendar. We should only get future book dates from today. It's better if we implement this filter from the API & DB call for faster performance instead of UI filtering
- ✅ Add a "Same as Facebook/Airbnb Name" checkbox beside Primary Guest - Name, and when they check it, we should get and pre-populate the same value of facebook name field to primary guest name and then we should disable the field
- ✅ When user try to submit or update the form. We should do a form data difference checking. And only proceed on updating the db, sending email, updating calendar, etc ONLY if we detect that there's a data changed from the form. If there's no difference, just redirect to success page
- ✅ Handle and send different email when we updated the form details. The email content would be something like this: "The GAF details has been updated. Please disregard the previous GAF Request email for the same dates for our unit". Please improve our text message
- ✅ On the success page, let's add a info box that has the "Next steps" text. We should say that "We now send your Guest Advise Form (GAF) to Azure and we just need to wait for the approved form. Please check your email about this after a day or two. If there's still no reply on approved GAF, please reach out to our Facebook page so that we can manually follow up and call Azure for it. Thank you chuchuchu.."
- ✅ In dev env ONLY, instead of relying on query parameter on what action should be done on API, can we display a card with multiple checkboxes if we will save the data on the db, save image assets on supabase storage, generate pdf, send email, update calendar or update google sheet. By the default, all of these are uncheck on DEV env
- ✅ In prod, let's add 'testing=true' query parameter to determine that this is a TEST booking submission
- ✅ When booking is more than 1 night, we should update the title of the email title to <CheckIn Date> - <CheckOut Date>
- ✅ On checkout date calendar, we don't have the highlight for multiple nights
- Update guest form to a stepper? And add preview for final booking screen.
- ✅ When we are on dev mode and testing=true is enabled, let's modify our content
  - Save to db: primary_guest_name. Prefix '[TEST]' ex. '[TEST] Rene Anne Tolentino'
  - Save images to supabase storage. Prefix '[TEST]' to our images
  - Generate PDF: Prefix '[TEST]' to primary guest name
  - Send email notification: Prefix '[TEST]' to email subject title. ex. '[TEST] Monaco 2604 - GAF Request (11-28-2025)'.
    - Let's also modify the email content to add: "This is just a test email, please ignore.' Please improve our message content
  - Update google calendar: Prefix '[TEST]' to calendar event title. ex. '[TEST] 2pax 2nights - Kyle Soriano'
  - Update google sheets: Prefix '[TEST]' to sheet 'Primary Guest Name' column. ex. '[TEST] Rene Anne Tolentino'
- ✅ Let's update the email title and content to use book range like <CheckIn Date> to <CheckOut Date> instead of just CheckInDate
- ✅ Let's use sprmkedev for google sheet and google calendar updates on dev env
- ✅ When we visit an existing booking and we are on dev/test mode, let's add a new button to cancel a booking which will cleanup and remove our data to different services
  - Update db status to 'canceled'
  - Update the google calendar event as canceled
  - Update google sheet entry to canceled
- ✅ Add URGENT label and icon on email for same day booking
- ✅ When guest encounter an error and the guest form failed to submit. It's very hassle if user will fill up the form again. I want us to implement a copy button on toast message when we encounter an error and display the toast message. When we click this button, the guest can copy all information so that they can paste it on our Facebook messenger.
  - ✅ Then, on our dev controls, there should be a button there called "Paste booking information from clipboard", and when we click it, it will autopopulate our form based on the booking information the guest copy pasted. And with this, we can easily resubmit the guest form without typing all information again.
  - ✅ Please think or plan or generate the best booking information structure that is user friendly but still be able to easily imported from our system
- ✅ Disable Send email notification on production even when testing=true is enabled
- ✅ Move generate new data to dev controls section above clean up button
- ✅ Add please check your email message under email address input
- ✅ Add &admin=true or &testing=true on View/Update Guest Form on Google calendar
- ✅ Use kamehome.spaces on calendar summary link
- ✅ Add "Cancel Booking" action on dev tools. When user clicks this, we should remove all information from database, assets from supabase storage, google calendars & sheets. Basically, cleanup all booking data that's related to it.
- ✅ We have this weird issue where if I select Jan 20 as check-in date, the Jan14, 15 and 17 which are already booked enabled which is very incorrect!
- ✅ Instead of doing all the data cleanup when we cancel a booking, is it possible keep all the data information from database, assets, google calendars and sheets, etc. Basically, keep all our data when canceling a booking, just open the booked dates from our booking calendar so that it will be selectable again to book, then update the google calendar to display "Canceled" (if you can make it red color for calendar event much better), also add a new column in google sheets for status "Booked" | "Canceled"
- ✅ Create separate email for pet information
- ✅ Add a new field for 'Has paid surprise setup/decorations' checkbox and create a new reminder for this (email or calendar?). Add a label note on this field — refine scope in `docs/planning/NEW_FLOW_PLAN.md` §6.2 **Q7.4** (placement/copy partial lock in §6.1).
- ✅ Create separate email for parking information
  - add a admin fields & button to trigger email sending of parking information
  - we should have dropdown of email so we can easily send the parking information to parking owner & azure
- ✅ Lets update the / root route to render the calendar page and create a new route called "/form" to render the guest form page. So that when user visit our sites, they are required to select dates first
- ✅ Cleanup test-booking pipeline (`?testing=true`, `is_test_booking`, admin test filters, `[TEST]` prefixes, `cleanup-test-data`) — use local/staging Supabase instead
- ✅ Improve the overall UI of our email templates which the same and consistent theme, font, shadows, spacing and colors. Make a research on popular and modern/stunning email templates to use as reference. Make it a very elegant, stunning, modern and eye-catching email templates that supports different browser/email platforms. Make sure we don't break anything and dynamic values should still populate. Just improve the overall email templates UI.
- ✅ Guest SD refund route **`/sd-form`** (UI stepper: Facebook review step → refund method: GCash same as on-file phone (number shown on the option card), other bank dropdown + name + account number, cash pickup with static policy copy only). Honesty-store purchase step skipped by design. **`READY_FOR_CHECKOUT`** status, cron → details, guest **`submit-sd-form`** → **`PENDING_SD_REFUND`** via orchestrator (no DB triggers).
- ✅ Improve and finalize update guest form flow
  - Only revert booking status to `PENDING_REVIEW` when updates come from:
    - Guest update from the public `/form` flow
    - Admin update from the `/bookings/:bookingId` detail form
  - AND ONLY IF one or more of the following fields changed:
    - Facebook / Airbnb Name
    - Primary Guest name
    - Email
    - Phone Number
    - Additional Guest Names
    - Check-in and Check-out Date
    - Check-in and Check-out Time
    - Parking Details
    - Pet Details
    - Downpayment receipt
    - Valid ID
    - Pet vaccination and pet photo
  - If updates do not include the listed fields, do **not** reset status to `PENDING_REVIEW`
  - Revert applies only while status is **pending documents** (`PENDING_DOCUMENTS` / `PENDING_GAF` / `PENDING_PARKING_REQUEST` / `PENDING_PET_REQUEST`) or **`READY_FOR_CHECKIN`** — not when already `PENDING_REVIEW`, in SD refund stages, `COMPLETED`, or `CANCELLED`
- ✅ Remove PDF generation process when guest submits the guest form: 2026-04-29T20:21:44.178173637Z [Info] Generate PDF: ✅
- ✅ Improve the mobile responsiveness and look of email templates on mobile
- ✅ Support 'Mark as incomplete' to sub booking status?
- ✅ Update SD refund form UI (stepper, no feedback field, Facebook-first then Continue, optional `guestFeedback` on API)
- ✅ **Next-stay Facebook-review voucher** — after the guest taps "Review us on Facebook" on `/sd-form`, swap the greeting for a slot-machine voucher reveal (`VoucherReveal`). New `claim-sd-voucher` edge function idempotently rolls a code from `VOUCHER_WIN_WEIGHTS` (`KAME-100`/`150`/`200` **2%**; `KAME-250`/`300`/`350` **~28%**; `KAME-400`/`450` **3%**; `KAME-500` **2%**; `KAME-1000` **1%**; **`KAME-STAY` free staycation** **0.5%**) and persists `next_stay_voucher_code` / `_amount` / `_awarded_at` on `guest_submissions`. Admin Pricing card surfaces the voucher when status = `COMPLETED`. Migration: `20260606120000_next_stay_voucher.sql`.
- ✅ Display QR or gcash link (gcash://send?mobile=09625412941&amount=500&note=test) on Pending SD Refund step for admin to easily do the SD payment
- ✅ Update ready for check-in email to add generated Gcash QR or link for the total balance payment upon check-in
- ✅ Update booking flow when guest is coming from Airbnb.
  - ✅ Public guest form: `?source=airbnb` switches all "Facebook" labels/text to "Airbnb". Source saved to DB (`booking_source` column), Google Calendar description, and Google Sheets (new AL/BA column).
  - ✅ Booking Detail page: `booking_source` shown in Other Information card with color-coded badge (blue=Facebook, orange=Airbnb). Airbnb bookings default Down Payment = 0, Security Deposit = 0 in the Review Pricing form.
- ✅ **Surprise decor** — `guest_requests_surprise_decor` + `surprise_decor_staff_acknowledged` (migration **`20260610120000_surprise_decor.sql`**). Public form: checkbox + Airbnb/Facebook info (above special requests). Other Information card + Review pricing staff confirmation below total balance; **Proceed to Pending Documents** disabled until confirmed when decor is requested. Admin edit form + workflow-sensitive revert parity.
- Rethink and plan how to mange parking request
- ✅ Add total profits and expenses on booking detail pricing section
- ✅ **Property Pricing page (`/pricing`) E2E** — migration `20260910130000_property_pricing.sql` (`app_settings` rate/fee columns + `property_pricing_date_overrides`); edge function **`property-pricing`**; UI save/load; **`ReviewPricingForm`** + booking edit use saved defaults + date overrides (Fri–Sun weekend rule). Guide: **`docs/guides/routes/org/property/pricing.md`**.
- ✅ **Finance dashboard (`/finance`)** — Overview KPIs, Stays ledger (period basis check-in / check-out / completed), **Transactions** CRUD (`finance_line_items`), PDF export (client-side; `finance-export` CSV edge function retained for scripts). Shared formulas in `bookingFinance.ts` (UI + edge). Admin nav **Finance** replaces Reports placeholder.
- ✅ **Maintenance dashboard (`/maintenance`)** — Overview KPIs, **Reminders** CRUD (`maintenance_items`), Telegram settings for **Kame Home - Maintenance** group, PDF export. No income/expense/stays.
- Only mark sub booking status to incomplete, when specific edited fields needs approval for specific document
- ✅ Automatic run cron job functions (specify here) after page refresh
- ✅ If booking date is already past on the date today and the booking status is still either PENDING_REVIEW, PENDING_DOCS and READY_FOR_CHECKIN, display a modal warning that says that the booking date is already passed every time we click the "Proceed to.." button. If they confirm, proceed to next step, if cancel, do not proceed.
- ✅ Automate booking flow for cleaners/staff as well
  - ✅ Telegram notification to staff/cleaner group — daily booking summary at configurable time (default 8:00 AM Manila) via `telegram-staff-cron` + `pg_cron`
  - ✅ Each booking contains check-in/out dates+times, pax, primary guest name+phone, decor/pet status, special requests, total guest balance, booking link
  - ✅ Includes next 3 days booking summary
  - ✅ Configurable template with `{{placeholder}}` tokens on `/staff` admin page (`TelegramStaffSettingsCard`)
  - ✅ Enable/disable toggle + time picker + test sends
  - ✅ Instant same-day check-in alert to staff group when guest submits at or after the daily summary time (one-time per booking)
  - Notification for guest check-out
    ✅ IMPROVED PAY PARKING FLOW
- ✅ Public **`/bookings/:bookingId/parking`** (`PayParkingPage`) — booking summary + vehicle fields; **`get-pay-parking`** / **`submit-pay-parking`**
- ✅ **`/bookings/:bookingId`** header **Add pay parking** / **View pay parking** + **`PayParkingModal`** (rate, copy URL, enter details)
- # ✅ Submit runs **`sendParkingBroadcast`** (same as workflow parking broadcast)

PAY PARKING -> PARKING OWNERS -> OUR GUESTS

- Improve public guest form
- ✅ **`app_settings` + Admin → Settings** — email routing, automation knobs, guest URLs (DB per property; platform secrets stay in Supabase Edge env). **Parking rate default** is edited on **Pricing** only (`property-pricing` → `default_parking_rate_guest`).
- Add ability to multi-select when doing broadcast email on update and add? parking
- Notification for guest check-out

- Display carousel on the top background that auto slides to show different unit pictures/amenities
- ✅ **AI payment receipt validation** — Gemini Flash vision on downpayment receipt (`submit-form`), balance receipt (`upload-booking-asset`), and parking payment receipt (`ParkingRequestForm` / `parking_payment_receipt`); results in New Booking Request email, admin Telegram templates, and admin UI. Invalid balance and parking receipts block workflow transitions.
- Use AI to analyze and validate other guest uploaded assets (valid ID, pet docs, etc.)
- Persist dev query parameters on booking summary and booking detail pages on route change (optional polish)
- Combine GAF request and pet request in one email when sending to Azure
- Optimize and reduce size of image before uploading to supabase storage
- Improve email template house rules
- ✅ **Property Templates → workflow sends:** `emailService.ts` reads **`property_template_contents`** for the seven **email** keys via **`propertyTemplateEmail.ts`** (WYSIWYG body + send shell). Dynamic sections (tables, payment, CTAs) use **`{{placeholders}}`** filled by **`propertyTemplateEmailSections.ts`**; preview uses the same renderer as send.
- **Property Templates → standard sections (pending):** Use **`house-rules`**, **`check-in-instructions`**, **`check-out-instructions`**, **`parking-reminders`** in guest-facing emails or links (e.g. inject house rules into ready-for-check-in when Gmail size allows). Standard keys are editable in admin today but not consumed at send time.
- **Property Templates → custom templates (pending):** Define send targets or guest-facing use for `custom-{uuid}` rows.
- Review edit booking info form
- [x] **Remove legacy booking statuses from Bookings.** Dropped **`booked`** and **`canceled`** from list/filters/kanban/sort/Telegram/calendar paths; removed `LEGACY_BOOKING_STATUSES` / `AnyBookingStatus`. Migration `20260714120000_backfill_legacy_booking_statuses.sql` backfills any stragglers.

- ✅ **Auto-advance PENDING_DOCUMENTS → READY_FOR_CHECKIN** when all required sub-steps (GAF, parking if needed, pet if needed) are complete — `workflowOrchestrator.ts` recursive transition on `document_completion_target` (gmail-listener, parking form, reconciliation).
- Update google calendar summary info with new guest form and processes
- Review and improve form UI validation on workflow status forms
- Review bucket policy to check public buckets and convert them to private?
- On Booking detail page, we need to reuse our check-in and check-out date calendar components to see which dates are booked and available
- ✅ Add additional rate on Pending Review form (early check-in, late check-out, surprise decor, etc)
- [x] Remove the ability for guest to update the guest form AFTER booking is reviewed by admin and not on PENDING_REVIEW status anymore
- Remove dev=true query parameter on google calendar event to prevent any issues
- ? Only display Sensitive edit warning on edit booking detail page
- We should add label for additional fee and update the ready for check-in email what's the additional fee is about
- Update Review process to deduct P50-P100 pesos on SD?
- Add settings page on dashboard to customized form values: Discount vouchers, etc → see **Platform & guest experience roadmap → Vouchers**
- Update Check-in Details email to add check-in instructions
- ✅ Add Gcash number and name to Check-in email
- Update public guest form to allow selection of date without check-out date for day tour bookings and minimum of 12pm as check-in time and subject for approval message
- Cleanup isDevMode. This is unnecessary since we have admin dashboard now
- Update booking confirmed UI and display the complete booking details
- Improve Other information section UI / cols
- Update saved reply or auto-reply form link to include the full name of recipient to query parameter of our guest form link, then parse it and pre-populate facebook name if we get a valid FB name
- Update additional guests and ask if adult or child (below 3 years old) per field
- ✅ Support slack and telegram notifications for important booking events
- New booking requests — instant on submit + hourly while Pending Review (Operations Telegram)
- ✅ If we received a same day booking, notify on Staff telegram group — instant alert at/after daily summary time on guest submit (`notifyTelegramStaffSameDayCheckIn`)
- ✅ Make the QR code image configurable via settings using image uploader. Update public guest form and check-in email to use this uploaded QR image
- ✅ Improve SD form to include chance to win free staycation if you leave a review (`KAME-STAY` at **0.5%** via `VOUCHER_WIN_WEIGHTS`; `VoucherReveal` copy + slot reel)
- Support same-day check-in
- Add password or faceid when accessing settings page? → see **Platform & guest experience roadmap → Settings security**
- ✅ Update GAF details to be configurable via settings — **Admin → Settings → GAF Details** with live PDF preview; guest submit + `submit-form` use resolved values
- Improve light theme colors
  Multi-tenancy — phase tracker (see `docs/PROJECT.md` multi-tenancy section):

- ✅ **Phase 1a — DB + org/property CRUD.** Migration `20260629180000_multi_tenancy_foundation.sql`; `organizations` / `properties`; `property_id` on bookings + settings tables; RLS owner-only; edge functions `create/list/update-organization`, `create/list/update-property`; `orgAuth.ts` + `verifyAdminJwt` org-owner path.
- ✅ **Phase 1b — Routing + UI shell.** Nested admin routes `/org/:orgSlug/property/:propertySlug/...`; org switchers; onboarding; legacy flat-route redirects; `RequireOrgContext` / `PropertyAdminShell`.
- ✅ **Phase 1c — Property scoping.** `resolveAdminPropertyId` / `resolvePublicPropertyId`; admin list/dashboard/finance/maintenance/app-settings/telegram endpoints + UI hooks send `property_id`; `transition-booking` verifies booking property; public `get-booked-dates` + `submit-form` accept `?property=` slug (default Monaco 2604).
- ✅ **Phase 1d — Remaining admin + guest scoping.** `cancel-booking`, `sync-booking-integrations`, `upload-booking-asset`, `upload-app-settings-asset`, `finance-export`, `validate-booking-receipts`, `send-sd-refund-form-email`; per-property Gmail OAuth (`20260629210000_gmail_oauth_per_property.sql`); guest calendar/form pass `?property=` to `get-booked-dates` + `submit-form`; admin UI hooks send `property_id` on manual triggers and uploads.
- ✅ **Phase 1e — Cron + listener per property.** `gmail-listener` per-property OAuth + history cursor; `sd-refund-cron` per-booking settings; telegram crons iterate properties with scoped bookings/line items; booking asset storage paths prefixed with `property_id`.
- ✅ **Phase 1f — Property-scoped integrations (shipped).** Per-property encrypted Telegram bot token + chat id on each `telegram_*_settings` row (**DB-only** — no env fallback); `google_calendar_id` / `google_spreadsheet_id` on `app_settings`; operator settings in `app_settings` resolve from DB only; legacy `GMAIL_OAUTH_TOKEN_JSON` env path removed; **`emailService.ts`** resolves routing/GCash/branding from `booking.property_id`; `create-property` seeds all settings rows; marketing/staff crons use 5-min dispatch + per-property Manila schedule matching (migration `20260629160000_property_scoped_integration_credentials.sql`); Calendar/Sheets/Gmail/Telegram resolve from property DB. Admin UI: all five Telegram pages expose bot token + chat id fields; Settings → Integrations shows **per-property** status (Property / Missing) + **Platform (shared env)** section (Resend, service account, Gmail OAuth app, Gemini/Groq). Migration `20260702190000_service_role_grants_gmail_maintenance_finance.sql` fixes Edge `service_role` grants.
- ✅ **Phase 2g — Connect Google (shipped).** Single OAuth flow requests Gmail + Calendar + Sheets scopes (`GOOGLE_CONNECT_OAUTH_SCOPES` in `gmailMailOAuthAccess.ts`). On connect, **`propertyGoogleOAuthProvision.ts`** auto-creates calendar (`Kame Home — {property}`) + spreadsheet (Bookings tab + header row A–BA) when IDs are missing; persists to `app_settings`. **`propertyGoogleApiAuth.ts`** uses per-property user OAuth for Calendar/Sheets API calls when connected; service account remains legacy fallback. Settings → Integrations: **Connect Google** only (no manual Calendar/Sheet ID fields). **`propertyGoogleIntegrationSeed.ts`** (2g.4): when **`create-property`** adds a property to an org that already has Google connected on a sibling, copies the encrypted refresh token and auto-provisions calendar + sheet for the new property.
- ✅ **Phase 2h — Multi-tenant operator UX (shipped).** Property dashboard **Needs attention** strip includes **Connect Google** when Gmail/Calendar/Sheet are not ready (links to Settings). Org **Properties** list exposes per-property **Guest calendar** link + copy (`PropertyGuestLinkButton` + `guestPublicPaths.ts`). Onboarding and **Add property** land on **Settings** (not dashboard) so Connect Google is the next step.

**Multi-tenancy — team module (shipped — property scope v1):**

- [x] Property team UI shell (`/org/.../property/.../team`) — mock data, PMA port
- [x] Property role model finalized — `MANAGER` \| `STAFF` \| `VIEWER` (see team route guide)
- [x] RBAC contract + `propertyTeamPermissions.ts` + team route guide
- [x] DB migration — `property_members`, `property_custom_roles`, `property_invitations`
- [x] `verifyPropertyAccess` in `orgAuth.ts` (owner / platform admin / active member)
- [x] Team edge functions (`property-team-members`, `property-team-invitations`, `property-team-custom-roles`, `accept-property-invite`)
- [x] Wire Team UI to API (`usePropertyTeam`)
- [x] Property team invite email (Resend) + `/accept-invite` page
- [x] Enforce permissions on property-scoped admin edge functions + sidebar/route guards
- [x] Org-level team UI + API (`/org/:orgSlug/team`, `organization_members`, `organization_invitations`)

**Property team module (v1) is shipped.** **Org team v1** is shipped (Owner + Admin; org settings PATCH remains owner-only). Pre-ship hardening (accept-invite compile fix, invite email rollback, resend rollback, orgId fallback, reactivate preset, last-manager guard, self-action blocks) applied.

**Still out of scope (org-level team follow-ups):**

- Per-org permission matrix beyond **Owner + Admin** (no granular org roles yet)
- Org settings / danger zone for org ADMIN (server still owner-only for PATCH)
- [x] Org + property route guards + sidebar nav filtered by **`org-access`** / **`property-access`**

**Multi-tenancy — optional hardening (real backlog when prioritized):**

- Tighten Postgres RLS on `guest_submissions` / settings tables beyond edge-function ownership checks (today: broad public read/write on guest rows from legacy migration; admin scoping is server-side)
- Require `?property=` on all public guest URLs (remove Monaco 2604 default in `propertyScope.ts` when every property has a slug link)
- Google Cloud: Calendar + Sheets APIs enabled on OAuth consent screen for the Web client
- Optional: calendar/spreadsheet picker instead of auto-create on Connect Google

---

- ✅ Fix issue where google calendar is taking up more than 1 date for multiple nights booking. Meaning, if we have 2nights, it should only take 2 calendar dates instead of 3
- Add quick edit on bookings page
- Support free booking (payment related steps/action not required, etc)
- Triple check security measures on our app
- ✅ **AI validation multi-provider fallback** — multi-key Gemini rotation (`GEMINI_API_KEYS`, comma-separated from different Google Cloud projects) + Groq Llama 4 Scout fallback (`GROQ_API_KEY`). Round-robin across Gemini keys; 429/5xx on one key skips to next; when all Gemini keys exhausted, falls back to Groq free tier. Same prompts + JSON schema across both providers.
- ✅ Implement AI validations to valid id
- ✅ When the booking is from Airbnb, we need to hide the payment step and review other flows
  - ✅ Guest form: Payment step (step 5) hidden for Airbnb — form is 4 steps. `paymentReceipt` optional in schema, `findUs` auto-defaults to "Airbnb".
  - ✅ Server `submit-form`: allows missing payment receipt for Airbnb, skips downpayment receipt AI validation.
  - ✅ Admin `BookingEditForm`: Downpayment receipt row hidden in Documents section for Airbnb bookings.
  - ✅ Ready-for-check-in email: Payment breakdown + GCash QR section hidden when total balance due is 0 (source-agnostic).
  - ✅ SD refund flow: skipped entirely when `security_deposit=0` — `READY_FOR_CHECKOUT` goes directly to `COMPLETED` (no SD form email, no guest SD form step). `sd-refund-cron` also skips SD=0 bookings for check-out email.
  - ✅ Guest balance settlement: Airbnb excludes booking rate / DP / SD from total guest balance (pet + additional fees only); receipt not required when total is ₱0; AI validation only when fee total > ₱0.
- Validate the receipt amount based on the type. Meaning, validate down payment receipt and it should match the 1500 min amount. Apply for others.
- Improve valid id validation to match the primary guest name, facebook name or additional guest names.
- ✅ When we encounter any issues related to gmail needs to reconnect, automatically display a modal with reconnect Gmail button (`GmailReconnectProvider` + `GmailReconnectModal`; status probe via `google-mail-oauth-status`; Gmail poll/backfill/transition errors open the modal).
- Instead of having 2 separate sections for GAF and Pet Details, we can use tab for the preview and use one form
- For Airbnb bookings, we can still ask for reviews without SD refund → see **Platform & guest experience roadmap → Guest reviews**

Multi-users/multi-tenant todos:

- ✅ **Guest Inbox (org-level) — Phase 0–5 shipped.** Route `/org/:orgSlug/inbox`; Meta OAuth (Facebook Messenger DMs); quick replies; AI suggest + optional auto-send. TikTok/Airbnb UI coming soon. **Full roadmap:** `docs/guides/routes/org/inbox.md` § Roadmap.
- [x] Guest Inbox — DM thread ID canonicalization + legacy migration on sync/webhook
- [x] Guest Inbox — thread list + message history pagination (infinite scroll / load earlier)
- [x] Guest Inbox — Meta backfill Graph pagination + `meta_backfill_*` state columns
- [x] Guest Inbox — incremental scroll sync (`meta-inbox-backfill` light + DB-only `social-inbox-threads`)
- [x] Guest Inbox — server-side search (loaded DB rows only) + empty state when `metaHasMore`
- [x] Guest Inbox — webhook preserves `participant_name`; Graph profile lookup for new threads
- [x] Guest Inbox — webhook subscribe failure surfaced on Channels row
- [x] Guest Inbox — attachment preview (inline) + friendly Meta send errors
- [x] Guest Inbox — automation platform toggles limited to Facebook + Instagram
- [x] Guest Inbox — Realtime RLS scoped to org owner / org ADMIN (`20260912120000_inbox_rls_permissions.sql`)
- [ ] **Operator E2E** — follow `docs/operations/inbox-e2e-runbook.md` (Channels **Setup URLs**, Connect, Sync, webhook, reply) — manual Meta app + tunnel setup
- [x] Guest Inbox — Facebook Page picker when OAuth returns multiple Pages
- [x] Guest Inbox — Channels setup panel (webhook/OAuth URLs, sync backfill, OAuth error messages)
- [ ] Guest Inbox — Meta App Review submission (production Advanced Access)

**Guest Inbox v2 — see `docs/guides/routes/org/inbox.md` § Roadmap for detail**

- [ ] Guest Inbox — **Instagram DMs** — blocked on Meta App Review / Advanced Access (skip until verified)
- [ ] Guest Inbox — **background full sync** — persist all conversations to DB (cron/chunked backfill); refresh = DB only
- [ ] Guest Inbox — **full search** — after full sync, search entire inbox (remove scroll-only limitation)
- [x] Guest Inbox — **fix Pending filter infinite loader** when few filtered rows + `metaHasMore`
- [ ] Guest Inbox — **connect/disconnect audit** — no hangs, races, or partial cleanup (partial: OAuth state cleared on reconnect)
- [ ] Guest Inbox — **outbound media** — send photos/videos (Meta limits)
- [x] Guest Inbox — **media lightbox** — image/video preview modal in conversation
- [ ] Guest Inbox — **FB + IG comments** — list, view, reply in thread UI (webhook handlers exist)
- [x] Guest Inbox — **default 10 quick replies** — Airbnb/booking FAQ seed templates
- [ ] Guest Inbox — **quick reply attachments** — images/videos per template
- [x] Guest Inbox — **automation suggest-first** — AI fills composer; auto-send opt-in only
- [ ] Guest Inbox — **AI booking/property context** — scoped read-only tools; block finance/guest PII leaks
- [ ] Guest Inbox — **AI property showcase images** in suggestions
- [ ] Guest Inbox — **booking ↔ thread link** — booking detail open chat; inbox link/view booking; badges
- [ ] Guest Inbox — **conversation intelligence** — summary, high-potential / follow-up flags + actions
- [ ] Guest Inbox — **scheduled broadcast** — weekly/scheduled Meta messages
- [x] Guest Inbox — **desktop notifications** — browser notify when tab hidden (system sound where supported)
- [ ] Guest Inbox — property-level channel overrides
- [ ] Guest Inbox — Airbnb Homes API partnership

**Marketing Content Studio — see `docs/guides/routes/org/property/marketing.md`**

- [x] Backend — `marketing_templates` + `marketing_publications` (migration `20260917120000_marketing_studio.sql`)
- [x] Edge — `marketing-templates` CRUD + `publish-to-meta` (FB photo, IG post/story/reel video) + `generate-marketing-caption`
- [x] Meta OAuth — all inbox + publishing scopes on connect; setup guide in **`docs/operations/meta-app-review.md`**
- [x] Content Studio UI — Calendar builder, Polotno design editor, **Remotion scene-based video editor** (multi-scene, transitions, 9:16/1:1/16:9), publish dialog + history on `/org/.../property/.../marketing`
- [x] Video editor — **saved templates** sidebar (dedicated Saved section, load `designJson.project`, **Update** on saved row)
- [x] Video editor — **drag text slots** on preview (fixed slots per scene layout; `%` positions in `textLayout`)
- [x] Video editor — **background music** (preset tracks + URL + volume; Remotion `Audio`; export includes audio when set)
- [ ] IG scheduled publish cron (rows stuck `pending` with future `scheduled_at`)
- [ ] Guest Inbox — TikTok Business Messaging API

---

## Platform & guest experience roadmap

### Guest reviews (SD refund + public property page)

- [x] **SD refund review step — in-app instead of Facebook redirect.** `/sd-form` step 1: star rating, Airbnb-style feedback pills (positive/constructive by score), optional text, photo upload (up to 3 images). `submit-guest-review` + `guest_reviews.feedback_tags`; public property page shows tags on Kame reviews.
- [x] **Airbnb bookings — reviews without SD refund.** `/properties/:slug/guest-review?bookingId=` — same in-app review + voucher flow when `security_deposit = 0` (after check-out, Manila). `get-guest-review` + extended `submit-guest-review` / `claim-sd-voucher` eligibility.

### External reviews, Superhost, and moderation

- [ ] **Property settings — external review proof.** Extend **Socials** (or adjacent settings) so owners/admins can submit up to **5** external reviews each with text, image, and proof (URL and/or screenshot). Support Facebook and Airbnb review screenshots for **Superhost / Superhost-equivalent** verification. Store verification URL where applicable.
- [ ] **Superhost flag.** Platform can flag a host as Superhost (or equivalent) based on verified external reviews; surface badge on public property page.
- [ ] **Public property page — unified Reviews section.** Render reviews from **Facebook**, **Airbnb**, and **Kame** (in-app guest reviews). External entries show only after platform approval.
- [ ] **Super admin — review moderation.** Super admin can **approve**, **reject**, or verify submitted external reviews and Superhost claims before they appear publicly.

### Super admin & platform governance

- [ ] **Super admin role.** New platform role to manage **developments** and **organizations**; **approve/reject** new org and property listing requests before they go live.

### Settings security

- [ ] **Org/property PIN or password.** Optional PIN/password per org or property to gate sensitive settings areas — e.g. **payment**, **team management**, **templates**, and similar high-risk sections (extends existing “password on settings page” idea).

### Vouchers

- [ ] **Property settings — voucher configuration.** Admin UI to configure voucher **prices**, **rewards**, **winning percentages**, and related knobs (today: env/`VOUCHER_WIN_WEIGHTS` + SD form slot machine only).

### Property & org settings

- [x] **Contact info → team management (property + org).** Removed **Contact info** from property settings **Basic** and org settings **Basic**. **Team → Contact** on members (`display_name`, `contact_phone` on `property_members` / `organization_members`; owner self-edit on org team). `guestContactInfo` + public property host name resolve from team MANAGER → org owner (legacy settings fallback).
- [x] **Multiple payment methods.** Property settings **Payment**: add/edit/remove methods with one **primary**; `app_settings.payment_methods` JSONB + legacy column sync. Guest form payment step lists all methods; `get-guest-payment-info` returns `paymentMethods`.
- [x] **Parking rate source of truth.** Removed **default parking rate** from property settings → **Email automations**; **Pricing** page (`property-pricing`) is the sole admin editor for `default_parking_rate_guest`. Reads unchanged (`app_settings`, pay-parking, Review pricing, emails).
- [x] **Building forms defaults from team.** Property settings → **Building forms**: default **unit owner**, **on-site contact person**, and **contact no** from team MANAGER or org owner when GAF fields are not yet saved to DB (editable override after prefill).
- [ ] **Photos & videos — limits + room tags.** Property media: allow up to **10 images** and **1 video**. Support **tags** or **place/location** labels per asset (e.g. kitchen, living room, bathroom) for gallery filtering on public property pages.

### Onboarding

- [ ] **Org + property onboarding flow.** Guided, user-friendly wizard when creating a new org and property. Reuse existing settings sections and other key UI blocks (integrations, pricing, templates, team, etc.) inside onboarding steps with dedicated onboarding chrome/wrapper.

### Guest ↔ host communication

- [ ] **Public property page — guest chat.** Support chat between guest (from public property page) and property admin/owner. Consider overlap with Guest Inbox; define whether this is a lightweight on-page thread or routes into inbox.

### Help & support (per org)

- [ ] **Org help & support hub.** Per-org area for documentation/FAQs, feedback and bug reports, and email support contact — surfaced to org members from the dashboard.

### Notifications & observability

- [ ] **Real-time in-app notifications.** Push/toast/badge updates for key actions (bookings, inbox, team invites, review submissions, listing approvals, etc.) — beyond today’s Guest Inbox desktop notifications.
- [ ] **Sentry.** Integrate Sentry for client and edge/server error logging in production.

---

## Project improvements (tooling & DX)

**Status: shipped** (Jul 2026). Full audit + rename log: **`docs/reference/naming-audit.md`**. Verify: `bun run check:filenames`.

Backlog for codebase quality, agent tooling, and local dev speed.

### A. Cursor / AI agent tooling (lean, token-aware)

**Goal:** Match useful patterns from **property-management-app** (PMA) without importing Next.js / tRPC / Drizzle rules.

- [x] **Index** — `.cursor/rules/README.md` (always-on vs conditional rules, skills, hooks, token budget)
- [x] **`docs-first` skill** — `.cursor/skills/docs-first/SKILL.md` (GFM doc paths)
- [x] **Stack terminology hook** — `.cursor/hooks/check-stack-terminology.sh` + wired in `hooks.json`
- [x] **Naming rule** — `.cursor/rules/naming-conventions.mdc` ([bulletproof-react](https://github.com/alan2207/bulletproof-react) aligned)
- [x] **PMA parity audit** — ported GFM-relevant rules/skills (see `.cursor/rules/README.md` § PMA parity map):
  - [x] Rules: `tech-stack`, `components`, `state-management`, `forms`, `security`, `public-ui`, `supabase-platform`, `accessibility`
  - [x] Skills: `supabase-stack`, `supabase-auth`, `tanstack-query`, `forms`, `emails`, `tanstack-table`, `multi-tenancy`, `integrations`, `component-generator`, `performance`
  - [x] Agent: `test-runner`
  - [x] Ensure `.claude/skills/` mirrors `.cursor/skills/` (see `.claude/skills/README.md` sync command)
  - [x] **Skipped:** `thinking-framework`, Drizzle, tRPC, Next.js, React Email monorepo, AWS S3, Zustand
- [x] **Agent onboarding** — `docs/PROJECT.md` §2 points agents at `.cursor/rules/README.md`

**Explicitly skip for GFM:** Next App Router, Drizzle, tRPC, React 19 RSC, Bun monorepo turbo patterns from PMA.

### B. File & directory naming consistency

**Standard (canonical):** `.cursor/rules/naming-conventions.mdc`

| Kind                          | Convention                        | Notes                                      |
| ----------------------------- | --------------------------------- | ------------------------------------------ |
| React components / pages      | `PascalCase.tsx`                  | e.g. `BookingTable.tsx`, `FinancePage.tsx` |
| Hooks                         | `usePascalCase.ts`                | e.g. `useBookings.ts`                      |
| lib / utils / schemas / types | `camelCase.ts`                    | e.g. `bookingStatus.ts`                    |
| Feature folders               | `kebab-case` if multi-word        | `guest-form`, `pay-parking`                |
| shadcn UI                     | keep `kebab-case.tsx`             | `dropdown-menu.tsx` — do not rename        |
| Edge functions                | `kebab-case/` folder + `index.ts` | existing pattern                           |

**Current drift (fix incrementally when touching files):**

- [x] Renamed **`bookingEditLayout.tsx`** → `BookingEditLayout.tsx`, **`telegramTemplateDialogContext.tsx`** → `TelegramTemplateDialogContext.tsx`
- [x] Renamed **`utils/booking-display.ts`** → `bookingDisplay.ts` (21 importers)
- [x] **Filename audit** — `docs/reference/naming-audit.md` + `scripts/dev/check-ui-filename-conventions.sh` (`bun run check:filenames`, CI)
- [x] Align **`.claude/skills/`** mirror — synced from `.cursor/skills/`
- [x] ESLint **`unicorn/filename-case`** (warn) for `features/**/components`, `hooks`, `lib`
- [x] Document intentional exceptions in `naming-conventions.mdc`

**Do not** mass-rename without updating imports and logging in **`docs/reference/naming-audit.md`**.

### C. Bun package manager + local dev without Docker (optional)

**Goal:** Faster installs and scripts; reduce RAM use when full local Supabase is not needed.

- [x] **`bunfig.toml`** + root scripts use `bun` / `bunx` (Supabase CLI still via `bunx supabase@latest`)
- [x] **`./dev.sh --ui-only`** / `SKIP_SUPABASE=1` — Vite only against remote Supabase (`ui/.env.development`)
- [x] **`bun install`** at root — **`bun.lock`** at repo root (remove **`package-lock.json`** / duplicate **`ui/bun.lock`** when committing)
- [x] Update **`docs/operations/`** runbooks: `npm run` → `bun run` where applicable
- [x] **CI** — `.github/workflows/ci.yml` (Bun: type-check, lint, build)
- [x] **Docker / RAM** — documented in `docs/PROJECT.md` §2 (ui-only, stop stack, Docker resources)

**Acceptance:** `bun run type-check`, `bun run lint`, `bun run build`, and `./dev.sh` (full) still work; `./dev.sh --ui-only` works with remote env.

### D. Docs & scripts organization

- [x] **`docs/README.md`** — master doc index
- [x] **`docs/operations/`** — migration, deployment, cron, inbox E2E, Meta App Review runbooks
- [x] **`docs/planning/`** — `NEW_FLOW_PLAN.md`, `NEW_FLOW.md` (renamed from `NEW FLOW.md`)
- [x] **`scripts/README.md`** — script index by category
- [x] **Scripts subfolders** — `dev/`, `data/`, `deploy/`, `integrations/`, `preview/`
- [x] **Root `README.md`** — quick start + links
- [x] **Removed stale root backups** — `supabase_backup_*.sql` / `*.dump` (May 2025; use `~/Backups/` per runbooks)
- [x] **Cleaned `supabase/snippets/`** — removed one-off booking SQL; renamed local cron helpers
- [x] Finish **`npm run` → `bun run`** wording in `docs/operations/migration-runbook.md` (partial)

### E. Feature folder architecture (guest vs dashboard)

**Goal:** [bulletproof-react](https://github.com/alan2207/bulletproof-react) + PMA-style context split. Map: **`docs/reference/project-structure.md`**.

- [x] **`features/guest/`** — `calendar/`, `form/`, `sd-form/`, `pay-parking/` + `guest/routes`
- [x] **`features/guest/marketing/`** — PMA public UI port Phase 1 (pages + routes + mock data; see **`docs/guides/routes/properties.md`**)
- [x] **`features/dashboard/`** — `bookings/`, `org/`, `property/`, `finance/`, `maintenance/`, `inbox/`, `pricing/`, `team/` + `dashboard/routes`
- [x] **Shared `components/`** — `branding/`, `navigation/` (moved loose root components)
- [x] **Import migration** — all `ui/src` + docs + rules + supabase mirror comments updated
- [x] **`.cursor/rules/architecture.mdc`** + **`docs/reference/project-structure.md`**
- [x] **Shared `lib/` + `utils/`** — categorized subfolders; domain files moved to features
- [ ] **Split `dashboard/bookings/`** — extract `auth/`, `notifications/`, `templates/`, `settings/` from bookings hub (incremental)

### F. PMA guest marketing UI (public site)

**Goal:** Match **property-management-app** guest marketing UX in GFM (Vite + React Router). Skill: **`.cursor/skills/public-ui/SKILL.md`**.

**Phase 1 — shipped (Jul 2026):**

- [x] Port `features/marketing/**` components into `ui/src/features/guest/marketing/`
- [x] Vite adapters: `MarketingImage`, `MarketingThemeToggle`, mode-transition CSS, `Link to=`
- [x] Marketing pages + routes (`/`, `/for-hosts`, `/properties/*`, `/developments/*`, `/terms`, `/privacy`)
- [x] Move operational calendar to **`/calendar`**; `/?property=` → `/calendar?property=`
- [x] Route guides: `index-landing`, `properties`, `developments`, `for-hosts`, `legal`; update `calendar.md`
- [x] `bun run build` passes

**Phase 2 — backlog:**

- [ ] Public catalog API (properties, developments, media from DB)
- [x] Public property **detail** API — `get-public-property` + `usePublicPropertyDetail` (mock fallback; see **`docs/reference/public-property-catalog.md`**)
- [x] Guest **stay guide** — token-gated `/properties/:slug/stay-guide` from standard property templates + RFCI email CTA; link auto-issued on **READY_FOR_CHECKIN** transition, admin copy on booking detail; date-change window refresh (`get-guest-stay-guide`, `issue-guest-stay-guide-token`, migration `20260916120000_guest_stay_guide_token.sql`). Guide: **`docs/guides/routes/stay-guide.md`**.
- [ ] Wire `BookingCard` Reserve → operational `/form`
- [ ] Property marketing calendar → `get-booked-dates`
- [ ] `PublicFormRenderer` → real submission endpoint
- [x] Guest auth routes — host Google OAuth + onboarding routing; `/sign-in` legacy redirect
- [x] Removed legacy **`SignInPage`**
- [ ] Wire guest email/password + Facebook (guest audience only)
- [ ] `/about`, `/contact` pages (footer stubs today)
- [ ] Optional: `scripts/dev/port-pma-public-ui.sh` re-sync helper from PMA repo
