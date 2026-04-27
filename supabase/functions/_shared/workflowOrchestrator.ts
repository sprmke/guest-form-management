/**
 * Workflow Orchestrator — single source of truth for booking transition side effects.
 *
 * ALL transitions (from UI, Gmail listener, or cron) must go through
 * `WorkflowOrchestrator.transition()`. Never call calendarService, sheetsService,
 * or emailService directly from a handler.
 *
 * Rules:  .cursor/rules/booking-workflow.mdc §3, §5 (side-effect matrix)
 * Plan:   docs/NEW_FLOW_PLAN.md §3.3
 */

import { DatabaseService } from './databaseService.ts';
import { CalendarService } from './calendarService.ts';
import { SheetsService } from './sheetsService.ts';
import {
  sendEmail,
  sendPetEmail,
  sendBookingAcknowledgement,
  sendReadyForCheckin,
  sendParkingBroadcast,
  sendSdRefundFormRequest,
} from './emailService.ts';
import {
  BookingStatus,
  canTransition,
  STATUS_HUMAN_LABEL,
} from './statusMachine.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Payload fields that may be required depending on the target status.
 * All are optional; validation of required fields is done per-transition below.
 */
export type TransitionPayload = {
  // Pricing (PENDING_REVIEW → PENDING_GAF)
  booking_rate?: number | null;
  down_payment?: number | null;
  security_deposit?: number | null;
  pet_fee?: number | null;

  // Parking (PENDING_PARKING_REQUEST → *)
  parking_rate_paid?: number | null;
  parking_owner_email?: string | null;
  parking_endorsement_url?: string | null;

  // SD Refund (PENDING_SD_REFUND → COMPLETED)
  sd_additional_expenses?: number[] | null;
  sd_additional_profits?: number[] | null;
  sd_refund_amount?: number | null;
  sd_refund_receipt_url?: string | null;

  // Guest SD form (PENDING_SD_REFUND_DETAILS → PENDING_SD_REFUND)
  sd_refund_guest_feedback?: string | null;
  sd_refund_method?: 'same_phone' | 'other_bank' | 'cash' | null;
  sd_refund_phone_confirmed?: boolean | null;
  sd_refund_bank?: 'GCash' | 'Maribank' | 'BDO' | 'BPI' | null;
  sd_refund_account_name?: string | null;
  sd_refund_account_number?: string | null;
  sd_refund_cash_pickup_note?: string | null;

  // Approved PDFs (set by Gmail listener in Phase 4; admin can also set manually)
  approved_gaf_pdf_url?: string | null;
  approved_pet_pdf_url?: string | null;
};

/**
 * Dev-control checkboxes from the admin panel.
 * All default to `true` (run everything) unless explicitly set to `false`.
 */
export type DevControlFlags = {
  saveToDatabase?: boolean;
  updateGoogleCalendar?: boolean;
  updateGoogleSheets?: boolean;
  sendGafRequestEmail?: boolean;
  sendParkingBroadcastEmail?: boolean;
  sendPetRequestEmail?: boolean;
  sendBookingAcknowledgementEmail?: boolean;
  sendReadyForCheckinEmail?: boolean;
  /** Email guest the /sd-form link when moving READY_FOR_CHECKIN → PENDING_SD_REFUND_DETAILS (cron + manual). */
  sendSdRefundFormEmail?: boolean;
};

export type TransitionResult = {
  success: boolean;
  booking: any;
  sideEffects: {
    calendar: boolean;
    sheet: boolean;
    emails: string[];
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flag(flags: DevControlFlags, key: keyof DevControlFlags): boolean {
  const val = flags[key];
  return val === undefined ? true : val;
}

/** True when running in a Supabase cloud deployment (not local dev). */
function isProduction(): boolean {
  return !!Deno.env.get('DENO_DEPLOYMENT_ID');
}

/**
 * Whether to suppress external blasts (email/calendar/sheet) for test bookings.
 * Per Q3.4: test bookings in production NEVER send outbound email or write external services.
 */
function shouldSuppressExternals(isTestBooking: boolean): boolean {
  return isTestBooking && isProduction();
}

function computeBalance(bookingRate?: number | null, downPayment?: number | null): number | null {
  if (bookingRate == null || downPayment == null) return null;
  return bookingRate - downPayment;
}

function buildPaxNights(booking: any): { pax: number; nights: number } {
  const pax = (booking.number_of_adults || 1) + (booking.number_of_children || 0);
  const nights = booking.number_of_nights || 1;
  return { pax, nights };
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class WorkflowOrchestrator {
  /**
   * Execute a booking status transition with all its side effects.
   *
   * @param bookingId   UUID of the booking to transition.
   * @param toStatus    Target status (validated against canTransition).
   * @param payload     Sub-form data for this transition step.
   * @param devControls Admin checkbox overrides (all default true when omitted).
   * @param manual      Whether this is a manual admin transition (enables override edges).
   */
  static async transition(
    bookingId: string,
    toStatus: BookingStatus,
    payload: TransitionPayload = {},
    devControls: DevControlFlags = {},
    manual = true,
  ): Promise<TransitionResult> {
    console.log(`[orchestrator] Transitioning booking ${bookingId} → ${toStatus} (manual=${manual})`);

    // 1. Fetch booking
    const booking = await DatabaseService.getBookingById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const fromStatus = booking.status as BookingStatus;
    const isTestBooking = booking.is_test_booking === true;
    const suppress = shouldSuppressExternals(isTestBooking);

    // 2. Validate transition
    if (!canTransition(fromStatus, toStatus, { manual })) {
      throw new Error(
        `Transition ${fromStatus} → ${toStatus} is not allowed (manual=${manual})`,
      );
    }

    // 3. Compute derived fields
    const balance =
      toStatus === 'PENDING_GAF'
        ? computeBalance(payload.booking_rate, payload.down_payment)
        : null;

    // 4. Build workflow fields to persist in DB
    const workflowFields: Record<string, unknown> = {};

    if (toStatus === 'PENDING_GAF') {
      if (payload.booking_rate != null) workflowFields.booking_rate = payload.booking_rate;
      if (payload.down_payment != null) workflowFields.down_payment = payload.down_payment;
      if (balance != null) workflowFields.balance = balance;
      if (payload.security_deposit != null) workflowFields.security_deposit = payload.security_deposit;
      if (payload.pet_fee != null && booking.has_pets) workflowFields.pet_fee = payload.pet_fee;
    }

    if (toStatus === 'PENDING_PARKING_REQUEST' || toStatus === 'PENDING_PET_REQUEST' || toStatus === 'READY_FOR_CHECKIN') {
      if (payload.approved_gaf_pdf_url) workflowFields.approved_gaf_pdf_url = payload.approved_gaf_pdf_url;
    }

    if (fromStatus === 'PENDING_PARKING_REQUEST') {
      if (payload.parking_rate_paid != null) workflowFields.parking_rate_paid = payload.parking_rate_paid;
      if (payload.parking_owner_email) workflowFields.parking_owner_email = payload.parking_owner_email;
      if (payload.parking_endorsement_url) workflowFields.parking_endorsement_url = payload.parking_endorsement_url;
    }

    if (toStatus === 'READY_FOR_CHECKIN' && fromStatus === 'PENDING_PET_REQUEST') {
      if (payload.approved_pet_pdf_url) workflowFields.approved_pet_pdf_url = payload.approved_pet_pdf_url;
    }

    // Guest /sd-form submit includes sd_refund_method; admin "skip details" advance omits it.
    if (
      fromStatus === 'PENDING_SD_REFUND_DETAILS' &&
      toStatus === 'PENDING_SD_REFUND' &&
      payload.sd_refund_method != null
    ) {
      workflowFields.sd_refund_guest_feedback = payload.sd_refund_guest_feedback ?? null;
      workflowFields.sd_refund_method = payload.sd_refund_method;
      workflowFields.sd_refund_phone_confirmed = payload.sd_refund_phone_confirmed ?? null;
      workflowFields.sd_refund_bank = payload.sd_refund_bank ?? null;
      workflowFields.sd_refund_account_name = payload.sd_refund_account_name ?? null;
      workflowFields.sd_refund_account_number = payload.sd_refund_account_number ?? null;
      workflowFields.sd_refund_cash_pickup_note = payload.sd_refund_cash_pickup_note ?? null;
      workflowFields.sd_refund_form_submitted_at = new Date().toISOString();
    }

    if (toStatus === 'COMPLETED') {
      if (payload.sd_additional_expenses != null) workflowFields.sd_additional_expenses = payload.sd_additional_expenses;
      if (payload.sd_additional_profits != null) workflowFields.sd_additional_profits = payload.sd_additional_profits;
      if (payload.sd_refund_amount != null) workflowFields.sd_refund_amount = payload.sd_refund_amount;
      if (payload.sd_refund_receipt_url) workflowFields.sd_refund_receipt_url = payload.sd_refund_receipt_url;
      workflowFields.settled_at = new Date().toISOString();
    }

    // 5. Persist workflow fields + update status
    if (flag(devControls, 'saveToDatabase')) {
      if (Object.keys(workflowFields).length > 0) {
        await DatabaseService.setWorkflowFields(bookingId, workflowFields);
      }
      await DatabaseService.updateBookingStatus(bookingId, toStatus);
    }

    // Re-fetch to get latest row (needed for email content)
    const updatedBooking = await DatabaseService.getBookingById(bookingId) ?? { ...booking, ...workflowFields, status: toStatus };
    const { pax, nights } = buildPaxNights(updatedBooking);
    const guestName = updatedBooking.guest_facebook_name as string;

    // 6. Google Calendar update
    let calendarOk = true;
    if (flag(devControls, 'updateGoogleCalendar') && !suppress) {
      try {
        const result = await CalendarService.updateCalendarEventStatus(
          bookingId,
          toStatus,
          pax,
          nights,
          guestName,
          isTestBooking,
          updatedBooking,
        );
        calendarOk = result.success;
      } catch (err) {
        console.error('[orchestrator] Calendar update failed (non-fatal):', err);
        calendarOk = false;
      }
    } else {
      console.log(`[orchestrator] Calendar update skipped (flag=${flag(devControls, 'updateGoogleCalendar')}, suppress=${suppress})`);
    }

    // 7. Google Sheets update
    let sheetOk = true;
    if (flag(devControls, 'updateGoogleSheets') && !suppress) {
      try {
        const result = await SheetsService.updateSheetWorkflowStatus(
          bookingId,
          STATUS_HUMAN_LABEL[toStatus],
          {
            booking_rate: updatedBooking.booking_rate,
            down_payment: updatedBooking.down_payment,
            balance: updatedBooking.balance,
            security_deposit: updatedBooking.security_deposit,
            parking_rate_guest: updatedBooking.parking_rate_guest,
            parking_rate_paid: updatedBooking.parking_rate_paid,
            pet_fee: updatedBooking.pet_fee,
            approved_gaf_pdf_url: updatedBooking.approved_gaf_pdf_url,
            approved_pet_pdf_url: updatedBooking.approved_pet_pdf_url,
            sd_refund_amount: updatedBooking.sd_refund_amount,
            sd_refund_receipt_url: updatedBooking.sd_refund_receipt_url,
            status_updated_at: updatedBooking.status_updated_at,
          },
          updatedBooking,
        );
        sheetOk = result.success;
      } catch (err) {
        console.error('[orchestrator] Sheet update failed (non-fatal):', err);
        sheetOk = false;
      }
    }

    // 8. Emails — based on side-effect matrix in booking-workflow.mdc §3
    const emailsSent: string[] = [];

    if (!suppress) {
      // PENDING_REVIEW → PENDING_GAF:
      // - GAF request to Azure
      // - Booking acknowledgement to guest
      // - Pet request to Azure (if pets)
      // - Parking broadcast (if parking)
      if (fromStatus === 'PENDING_REVIEW' && toStatus === 'PENDING_GAF') {
        const formData = buildGuestFormData(updatedBooking);

        if (flag(devControls, 'sendGafRequestEmail')) {
          try {
            await sendEmail(formData, null, isTestBooking, false);
            emailsSent.push('gaf_request');
          } catch (err) {
            console.error('[orchestrator] GAF request email failed:', err);
          }
        }

        if (flag(devControls, 'sendBookingAcknowledgementEmail')) {
          try {
            await sendBookingAcknowledgement(updatedBooking, isTestBooking);
            emailsSent.push('booking_acknowledgement');
          } catch (err) {
            console.error('[orchestrator] Booking acknowledgement email failed:', err);
          }
        }

        if (updatedBooking.has_pets && flag(devControls, 'sendPetRequestEmail')) {
          try {
            await sendPetEmail(
              formData,
              null,
              updatedBooking.pet_image_url,
              updatedBooking.pet_vaccination_url,
              isTestBooking,
              false,
            );
            emailsSent.push('pet_request');
          } catch (err) {
            console.error('[orchestrator] Pet request email failed:', err);
          }
        }

        if (updatedBooking.need_parking && flag(devControls, 'sendParkingBroadcastEmail')) {
          try {
            await sendParkingBroadcast(updatedBooking, isTestBooking);
            emailsSent.push('parking_broadcast');
          } catch (err) {
            console.error('[orchestrator] Parking broadcast email failed:', err);
          }
        }
      }

      // forward → READY_FOR_CHECKIN: send ready-for-check-in to guest.
      // Gated on `fromStatus` so a backward "oops, step back" transition
      // (e.g. PENDING_SD_REFUND → READY_FOR_CHECKIN) never re-fires the
      // ready-for-checkin email even if the dev control is checked.
      const isForwardToReady =
        fromStatus === 'PENDING_GAF' ||
        fromStatus === 'PENDING_PARKING_REQUEST' ||
        fromStatus === 'PENDING_PET_REQUEST';
      if (toStatus === 'READY_FOR_CHECKIN' && isForwardToReady && flag(devControls, 'sendReadyForCheckinEmail')) {
        try {
          await sendReadyForCheckin(updatedBooking, isTestBooking);
          emailsSent.push('ready_for_checkin');
        } catch (err) {
          console.error('[orchestrator] Ready-for-check-in email failed:', err);
        }
      }

      // READY_FOR_CHECKIN → PENDING_SD_REFUND_DETAILS: SD refund form link (cron).
      // Gated on fromStatus so PENDING_SD_REFUND_DETAILS → READY_FOR_CHECKIN never re-sends.
      if (
        fromStatus === 'READY_FOR_CHECKIN' &&
        toStatus === 'PENDING_SD_REFUND_DETAILS' &&
        flag(devControls, 'sendSdRefundFormEmail')
      ) {
        try {
          await sendSdRefundFormRequest(updatedBooking, isTestBooking);
          emailsSent.push('sd_refund_form_request');
          if (flag(devControls, 'saveToDatabase')) {
            await DatabaseService.setWorkflowFields(bookingId, {
              sd_refund_form_emailed_at: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('[orchestrator] SD refund form request email failed:', err);
        }
      }
    } else {
      console.log('[orchestrator] All email sends suppressed (test booking in production)');
    }

    console.log(`[orchestrator] Transition complete: ${fromStatus} → ${toStatus}`, {
      calendarOk,
      sheetOk,
      emailsSent,
    });

    return {
      success: true,
      booking: updatedBooking,
      sideEffects: {
        calendar: calendarOk,
        sheet: sheetOk,
        emails: emailsSent,
      },
    };
  }
}

// ─── Helper: build GuestFormData shape for legacy email functions ─────────────

function buildGuestFormData(booking: any): any {
  return {
    guestFacebookName: booking.guest_facebook_name,
    primaryGuestName: booking.primary_guest_name,
    guestEmail: booking.guest_email,
    guestPhoneNumber: booking.guest_phone_number,
    guestAddress: booking.guest_address,
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    checkInTime: booking.check_in_time,
    checkOutTime: booking.check_out_time,
    nationality: booking.nationality,
    numberOfAdults: booking.number_of_adults,
    numberOfChildren: booking.number_of_children,
    numberOfNights: booking.number_of_nights,
    guest2Name: booking.guest2_name,
    guest3Name: booking.guest3_name,
    guest4Name: booking.guest4_name,
    guest5Name: booking.guest5_name,
    guestSpecialRequests: booking.guest_special_requests,
    findUs: booking.find_us,
    findUsDetails: booking.find_us_details,
    needParking: booking.need_parking,
    carPlateNumber: booking.car_plate_number,
    carBrandModel: booking.car_brand_model,
    carColor: booking.car_color,
    hasPets: booking.has_pets,
    petName: booking.pet_name,
    petType: booking.pet_type,
    petBreed: booking.pet_breed,
    petAge: booking.pet_age,
    petVaccinationDate: booking.pet_vaccination_date,
    petVaccinationUrl: booking.pet_vaccination_url,
    petImageUrl: booking.pet_image_url,
    paymentReceiptUrl: booking.payment_receipt_url,
    validIdUrl: booking.valid_id_url,
    unitOwner: booking.unit_owner,
    towerAndUnitNumber: booking.tower_and_unit_number,
    ownerOnsiteContactPerson: booking.owner_onsite_contact_person,
    ownerContactNumber: booking.owner_contact_number,
  };
}
