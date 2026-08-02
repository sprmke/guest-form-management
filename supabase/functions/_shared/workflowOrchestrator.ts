/**
 * Workflow Orchestrator — single source of truth for booking transition side effects.
 *
 * ALL transitions (from UI, Gmail listener, or cron) must go through
 * `WorkflowOrchestrator.transition()`. Never call calendarService, sheetsService,
 * or emailService directly from a handler.
 *
 * Rules:  .cursor/rules/booking-workflow.mdc §3, §5 (side-effect matrix)
 * Plan:   docs/planning/NEW_FLOW_PLAN.md §3.3
 */

import { DatabaseService } from './databaseService.ts';
import { ensureGuestStayGuideToken } from './guestStayGuide.ts';
import {
  checkGuestBalanceSettlement,
  computeTotalGuestBalanceFromBooking,
  guestBalancePaymentReceiptRequired,
} from './totalGuestBalance.ts';
import { receiptVerdictBlocksAdminTransition } from './receiptValidationService.ts';
import { CalendarService } from './calendarService.ts';
import { SheetsService } from './sheetsService.ts';
import { generatePDF, generatePetPDF } from './pdfService.ts';
import { UploadService } from './uploadService.ts';
import { bookingAssetStorageKey } from './bookingStoragePaths.ts';
import {
  sendEmail,
  sendPetEmail,
  sendBookingAcknowledgement,
  sendReadyForCheckin,
  sendParkingBroadcast,
  sendSdRefundFormRequest,
} from './emailService.ts';
import {
  propertyAutomationEnabled,
  type PropertyAutomationToggleKey,
} from './propertyAutomationToggles.ts';
import {
  BookingStatus,
  canTransition,
  getPendingDocumentsNestedCompletion,
  isLatePendingParkingDocumentTransition,
  isPostPendingDocumentsStatus,
  pendingDocumentsClearPatchForGuestEditRevert,
  readDocumentCompletions,
  STATUS_HUMAN_LABEL,
  type DocumentCompletionsMap,
} from './statusMachine.ts';
import {
  DEFAULT_DOCUMENT_REQUIREMENTS,
  resolveDocumentRequirements,
  type DocumentRequirement,
  type DocumentRequirementCompletion,
} from './documentRequirements.ts';
import {
  DEFAULT_PROPERTY_SYNC_TOGGLES,
  resolvePropertySyncToggles,
} from './propertySyncToggles.ts';
import type { SdRefundBank } from './sdRefundBank.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Payload fields that may be required depending on the target status.
 * All are optional; validation of required fields is done per-transition below.
 */
export type TransitionPayload = {
  // Pricing (PENDING_REVIEW → PENDING_GAF | PENDING_DOCUMENTS)
  booking_rate?: number | null;
  down_payment?: number | null;
  security_deposit?: number | null;
  pet_fee?: number | null;
  parking_rate_guest?: number | null;
  guest_additional_fee?: number | null;
  /** Required on PENDING_REVIEW → initial docs when `guest_requests_surprise_decor` is true. */
  surprise_decor_staff_acknowledged?: boolean;

  // Parking (PENDING_PARKING_REQUEST → *)
  parking_rate_paid?: number | null;
  parking_owner_email?: string | null;
  /** Owner or agent display name (who parking was obtained from). */
  parking_owner?: string | null;
  parking_endorsement_url?: string | null;
  /** Default true — parking fee bundled in downpayment receipt. */
  parking_fee_included_in_downpayment?: boolean | null;
  /** Required when parking_fee_included_in_downpayment is false. */
  parking_payment_receipt_url?: string | null;

  // SD Refund (PENDING_SD_REFUND → COMPLETED)
  sd_additional_expenses?: number[] | null;
  sd_additional_profits?: number[] | null;
  sd_additional_expense_items?: Array<{ label: string; amount: number }> | null;
  sd_additional_profit_items?: Array<{ label: string; amount: number }> | null;
  sd_refund_amount?: number | null;
  sd_refund_receipt_url?: string | null;

  /** READY_FOR_CHECKIN → READY_FOR_CHECKOUT: paid must equal computed total guest balance + receipt. */
  guest_balance_paid_amount?: number | null;
  guest_balance_payment_receipt_url?: string | null;

  // Guest SD form (READY_FOR_CHECKOUT → PENDING_SD_REFUND)
  sd_refund_guest_feedback?: string | null;
  sd_refund_method?: 'same_phone' | 'other_bank' | 'cash' | null;
  sd_refund_phone_confirmed?: boolean | null;
  sd_refund_bank?: SdRefundBank | null;
  sd_refund_account_name?: string | null;
  sd_refund_account_number?: string | null;

  // Approved PDFs (set by Gmail listener in Phase 4; admin can also set manually)
  approved_gaf_pdf_url?: string | null;
  approved_pet_pdf_url?: string | null;

  /**
   * PENDING_DOCUMENTS → PENDING_DOCUMENTS: admin marks a sub-step complete (no status change).
   * Accepts legacy literals (`PENDING_GAF` → `gaf`, `PENDING_PET_REQUEST` → `pet`,
   * `PENDING_PARKING_REQUEST` special-cased) or a bare requirement id (e.g. `"gaf"`).
   */
  document_completion_target?:
    'PENDING_GAF' | 'PENDING_PARKING_REQUEST' | 'PENDING_PET_REQUEST' | string;
  /**
   * PENDING_DOCUMENTS → PENDING_DOCUMENTS: admin marks a sub-step incomplete again (manual only).
   * GAF/pet keep approved PDF URLs but are treated as incomplete until Gmail or admin completes again.
   */
  document_completion_clear_target?:
    'PENDING_GAF' | 'PENDING_PARKING_REQUEST' | 'PENDING_PET_REQUEST' | string;
};

/**
 * Dev-control checkboxes from the admin panel.
 * All default to `true` (run everything) unless explicitly set to `false`.
 */
export type DevControlFlags = {
  saveToDatabase?: boolean;
  /** Filled GAF (+ pet request PDF if pets) generate + optional Storage upload on PENDING_REVIEW → initial docs. */
  generatePdf?: boolean;
  updateGoogleCalendar?: boolean;
  updateGoogleSheets?: boolean;
  sendGafRequestEmail?: boolean;
  sendParkingBroadcastEmail?: boolean;
  sendPetRequestEmail?: boolean;
  sendBookingAcknowledgementEmail?: boolean;
  sendReadyForCheckinEmail?: boolean;
  /** Email guest the /sd-form link when moving READY_FOR_CHECKIN → READY_FOR_CHECKOUT (cron + manual). */
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

function computeBalance(bookingRate?: number | null, downPayment?: number | null): number | null {
  if (bookingRate == null || downPayment == null) return null;
  return bookingRate - downPayment;
}

function buildPaxNights(booking: any): { pax: number; nights: number } {
  const pax = (booking.number_of_adults || 1) + (booking.number_of_children || 0);
  const nights = booking.number_of_nights || 1;
  return { pax, nights };
}

/**
 * `document_completion_target` / `document_completion_clear_target` accept the legacy
 * `PENDING_GAF` / `PENDING_PET_REQUEST` literals or a bare requirement id (e.g. `"gaf"`).
 * Parking stays special-cased on `PENDING_PARKING_REQUEST` (not a `documentRequirements` id).
 */
const LEGACY_DOC_TARGET_TO_REQUIREMENT_ID: Record<string, string> = {
  PENDING_GAF: 'gaf',
  PENDING_PET_REQUEST: 'pet',
};

function docTargetMatchesRequirement(target: string | undefined, requirementId: string): boolean {
  if (!target) return false;
  const normalized = LEGACY_DOC_TARGET_TO_REQUIREMENT_ID[target] ?? target;
  return normalized === requirementId;
}

function assertParkingPaymentReceiptIfRequired(
  payload: TransitionPayload,
  booking?: Record<string, unknown>
): void {
  const included = payload.parking_fee_included_in_downpayment !== false;
  if (included) return;
  const receipt =
    typeof payload.parking_payment_receipt_url === 'string'
      ? payload.parking_payment_receipt_url.trim()
      : '';
  if (!receipt) {
    throw new Error('Upload a parking payment receipt before completing parking');
  }
  if (booking && receiptVerdictBlocksAdminTransition(booking.parking_receipt_ai_verdict)) {
    throw new Error(
      'Parking payment receipt failed AI validation. Upload a valid payment screenshot before completing parking.'
    );
  }
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
    manual = true
  ): Promise<TransitionResult> {
    console.log(
      `[orchestrator] Transitioning booking ${bookingId} → ${toStatus} (manual=${manual})`
    );

    // 1. Fetch booking
    const booking = await DatabaseService.getBookingById(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const fromStatus = booking.status as BookingStatus;
    const propertyId =
      typeof booking.property_id === 'string' ? booking.property_id.trim() || null : null;

    // First step after review: either legacy PENDING_GAF or parent PENDING_DOCUMENTS,
    // or (D2) a direct skip to READY_FOR_CHECKIN — all share the same pricing capture
    // and outbound "document request" email bundle (minus GAF/pet when skipped/absent).
    const isReviewProceedAttempt =
      fromStatus === 'PENDING_REVIEW' &&
      (toStatus === 'PENDING_GAF' ||
        toStatus === 'PENDING_DOCUMENTS' ||
        toStatus === 'READY_FOR_CHECKIN');

    // D2: empty configurable document requirements → rewrite the target straight to
    // READY_FOR_CHECKIN so old clients (still sending PENDING_DOCUMENTS) keep working.
    let documentRequirements: DocumentRequirement[] = DEFAULT_DOCUMENT_REQUIREMENTS;
    if (isReviewProceedAttempt) {
      documentRequirements = propertyId
        ? await resolveDocumentRequirements(propertyId)
        : DEFAULT_DOCUMENT_REQUIREMENTS;
      if (documentRequirements.length === 0 && toStatus !== 'READY_FOR_CHECKIN') {
        console.log(
          `[orchestrator] Empty document requirements for property ${propertyId ?? 'unknown'} — rewriting ${toStatus} → READY_FOR_CHECKIN`
        );
        toStatus = 'READY_FOR_CHECKIN';
      }
    }
    const requirementIds = new Set(documentRequirements.map((req) => req.id));
    const gafRequirementPresent = requirementIds.has('gaf');
    const petRequirementPresent = requirementIds.has('pet');

    // 2. Validate transition (late parking doc actions stay on current status at RFCI+)
    const isLateParkingDocAction = isLatePendingParkingDocumentTransition(
      fromStatus,
      toStatus,
      payload,
      manual
    );
    if (!isLateParkingDocAction && !canTransition(fromStatus, toStatus, { manual })) {
      throw new Error(`Transition ${fromStatus} → ${toStatus} is not allowed (manual=${manual})`);
    }

    // Whether GAF/pet PDF + email side effects should run — false when the
    // requirements list is empty (D2 skip) or the admin skipped straight to
    // READY_FOR_CHECKIN with a non-empty list (explicit override).
    const isReviewToInitialDocs = isReviewProceedAttempt && toStatus !== 'READY_FOR_CHECKIN';

    const wantsSurpriseDecor =
      booking.guest_requests_surprise_decor === true ||
      booking.guest_requests_surprise_decor === 'true';

    if (
      isReviewProceedAttempt &&
      wantsSurpriseDecor &&
      !payload.surprise_decor_staff_acknowledged
    ) {
      throw new Error(
        'Confirm with staff that this guest’s surprise decor (theme and agreed price) is coordinated before proceeding.'
      );
    }

    // 3. Compute derived fields
    const balance = isReviewProceedAttempt
      ? computeBalance(payload.booking_rate, payload.down_payment)
      : null;

    // 4. Build workflow fields to persist in DB
    const workflowFields: Record<string, unknown> = {};

    if (isReviewProceedAttempt) {
      // Strip any stale workflow data from a prior cycle so nested substeps and
      // pricing/parking forms do not read as “complete” before admins re-enter them.
      Object.assign(workflowFields, pendingDocumentsClearPatchForGuestEditRevert());
      if (payload.booking_rate != null) workflowFields.booking_rate = payload.booking_rate;
      if (payload.down_payment != null) workflowFields.down_payment = payload.down_payment;
      if (balance != null) workflowFields.balance = balance;
      if (payload.security_deposit != null)
        workflowFields.security_deposit = payload.security_deposit;
      if (payload.pet_fee != null && bookingFlagTrue(booking.has_pets)) {
        workflowFields.pet_fee = payload.pet_fee;
      } else if (!bookingFlagTrue(booking.has_pets)) {
        workflowFields.pet_fee = null;
      }
      if (payload.parking_rate_guest != null && bookingFlagTrue(booking.need_parking)) {
        workflowFields.parking_rate_guest = payload.parking_rate_guest;
      } else if (!bookingFlagTrue(booking.need_parking)) {
        workflowFields.parking_rate_guest = null;
      }
      if (payload.guest_additional_fee != null) {
        workflowFields.guest_additional_fee = payload.guest_additional_fee;
      }
      if (wantsSurpriseDecor && payload.surprise_decor_staff_acknowledged) {
        workflowFields.surprise_decor_staff_acknowledged = true;
      }
    }

    // D1: dual-write completion state — JSONB map is the forward-looking source of
    // truth, named gaf_*/pet_* columns stay in sync during cutover. Base off the
    // dual-read map (which already falls back to named columns) so a merge here
    // never drops an entry that only exists in one representation.
    const completionsMap: DocumentCompletionsMap = readDocumentCompletions(
      booking as Parameters<typeof readDocumentCompletions>[0]
    );
    let completionsChanged = false;
    function patchCompletion(id: string, patch: Partial<DocumentRequirementCompletion>): void {
      const prev: DocumentRequirementCompletion = completionsMap[id] ?? {
        completedAt: null,
        approvedPdfUrl: null,
        manualIncomplete: false,
      };
      completionsMap[id] = { ...prev, ...patch };
      completionsChanged = true;
    }

    if (isReviewProceedAttempt) {
      // Mirror pendingDocumentsClearPatchForGuestEditRevert()'s named-column reset in
      // the JSONB map so dual-read doesn't show a substep "done" from a prior cycle.
      patchCompletion('gaf', { completedAt: null, approvedPdfUrl: null, manualIncomplete: false });
      patchCompletion('pet', { completedAt: null, approvedPdfUrl: null, manualIncomplete: false });
    }

    // Approved GAF: Gmail listener uses PENDING_DOCUMENTS → PENDING_DOCUMENTS; forward
    // transitions (→ parking / pet / ready) also carry the URL from the prior step.
    if (payload.approved_gaf_pdf_url) {
      if (
        toStatus === 'PENDING_DOCUMENTS' ||
        toStatus === 'PENDING_PARKING_REQUEST' ||
        toStatus === 'PENDING_PET_REQUEST' ||
        toStatus === 'READY_FOR_CHECKIN'
      ) {
        workflowFields.approved_gaf_pdf_url = payload.approved_gaf_pdf_url;
        workflowFields.gaf_manual_incomplete = false;
        patchCompletion('gaf', {
          approvedPdfUrl: payload.approved_gaf_pdf_url,
          manualIncomplete: false,
        });
      }
    }

    // Approved pet PDF: same listener pattern on PENDING_DOCUMENTS, or pet → ready.
    if (payload.approved_pet_pdf_url) {
      if (
        toStatus === 'PENDING_DOCUMENTS' ||
        (toStatus === 'READY_FOR_CHECKIN' && fromStatus === 'PENDING_PET_REQUEST')
      ) {
        workflowFields.approved_pet_pdf_url = payload.approved_pet_pdf_url;
        workflowFields.pet_manual_incomplete = false;
        patchCompletion('pet', {
          approvedPdfUrl: payload.approved_pet_pdf_url,
          manualIncomplete: false,
        });
      }
    }

    const docClear = payload.document_completion_clear_target;
    const docComplete = payload.document_completion_target;
    if (docClear && docComplete) {
      throw new Error(
        'document_completion_target and document_completion_clear_target cannot both be set'
      );
    }
    if (docClear) {
      const isLateParkingClear =
        manual &&
        fromStatus === toStatus &&
        isPostPendingDocumentsStatus(fromStatus) &&
        docClear === 'PENDING_PARKING_REQUEST';
      if (
        !isLateParkingClear &&
        (!manual || fromStatus !== 'PENDING_DOCUMENTS' || toStatus !== 'PENDING_DOCUMENTS')
      ) {
        throw new Error(
          'document_completion_clear_target requires manual=true and PENDING_DOCUMENTS → PENDING_DOCUMENTS'
        );
      }
    }

    // Admin "Mark … as incomplete" under Pending Documents (manual only).
    if (manual && docClear) {
      const lateParkingClear =
        fromStatus === toStatus &&
        isPostPendingDocumentsStatus(fromStatus) &&
        docClear === 'PENDING_PARKING_REQUEST';

      if (fromStatus === 'PENDING_DOCUMENTS' && toStatus === 'PENDING_DOCUMENTS') {
        if (docTargetMatchesRequirement(docClear, 'gaf')) {
          workflowFields.gaf_completed_at = null;
          workflowFields.gaf_manual_incomplete = true;
          patchCompletion('gaf', { completedAt: null, manualIncomplete: true });
        } else if (docClear === 'PENDING_PARKING_REQUEST') {
          workflowFields.parking_completed_at = null;
        } else if (docTargetMatchesRequirement(docClear, 'pet')) {
          workflowFields.pet_completed_at = null;
          workflowFields.pet_manual_incomplete = true;
          patchCompletion('pet', { completedAt: null, manualIncomplete: true });
        }
      } else if (lateParkingClear) {
        workflowFields.parking_completed_at = null;
      }
    }

    // Admin "Mark … as complete" under Pending Documents (no PDF): persist *_completed_at.
    // Parking may also be completed late at RFCI+ without changing parent status.
    if (docComplete) {
      const now = new Date().toISOString();
      const lateParkingComplete =
        manual &&
        fromStatus === toStatus &&
        isPostPendingDocumentsStatus(fromStatus) &&
        docComplete === 'PENDING_PARKING_REQUEST';

      if (docComplete === 'PENDING_PARKING_REQUEST' && manual) {
        assertParkingPaymentReceiptIfRequired(payload, booking as Record<string, unknown>);
      }

      if (fromStatus === 'PENDING_DOCUMENTS' && toStatus === 'PENDING_DOCUMENTS') {
        if (docTargetMatchesRequirement(docComplete, 'gaf')) {
          workflowFields.gaf_completed_at = now;
          workflowFields.gaf_manual_incomplete = false;
          patchCompletion('gaf', { completedAt: now, manualIncomplete: false });
        } else if (docComplete === 'PENDING_PARKING_REQUEST') {
          workflowFields.parking_completed_at = now;
        } else if (docTargetMatchesRequirement(docComplete, 'pet')) {
          workflowFields.pet_completed_at = now;
          workflowFields.pet_manual_incomplete = false;
          patchCompletion('pet', { completedAt: now, manualIncomplete: false });
        }
      } else if (lateParkingComplete) {
        workflowFields.parking_completed_at = now;
      }
    }

    if (
      fromStatus === 'PENDING_PARKING_REQUEST' ||
      (docComplete === 'PENDING_PARKING_REQUEST' && manual)
    ) {
      if (fromStatus === 'PENDING_PARKING_REQUEST') {
        assertParkingPaymentReceiptIfRequired(payload, booking as Record<string, unknown>);
      }
      if (payload.parking_rate_paid != null)
        workflowFields.parking_rate_paid = payload.parking_rate_paid;
      if (payload.parking_owner_email)
        workflowFields.parking_owner_email = payload.parking_owner_email;
      if (payload.parking_owner !== undefined) {
        const po = typeof payload.parking_owner === 'string' ? payload.parking_owner.trim() : '';
        workflowFields.parking_owner = po || null;
      }
      if (payload.parking_endorsement_url) {
        workflowFields.parking_endorsement_url = payload.parking_endorsement_url;
      }
      if (payload.parking_fee_included_in_downpayment !== undefined) {
        workflowFields.parking_fee_included_in_downpayment =
          payload.parking_fee_included_in_downpayment !== false;
        if (payload.parking_fee_included_in_downpayment !== false) {
          workflowFields.parking_payment_receipt_url = null;
          workflowFields.parking_receipt_ai_verdict = null;
          workflowFields.parking_receipt_ai_summary = null;
        }
      }
      if (payload.parking_payment_receipt_url !== undefined) {
        const receipt =
          typeof payload.parking_payment_receipt_url === 'string'
            ? payload.parking_payment_receipt_url.trim()
            : '';
        workflowFields.parking_payment_receipt_url = receipt || null;
      }
    }

    // Guest /sd-form submit includes sd_refund_method; admin "skip details" advance omits it.
    if (
      fromStatus === 'READY_FOR_CHECKOUT' &&
      toStatus === 'PENDING_SD_REFUND' &&
      payload.sd_refund_method != null
    ) {
      workflowFields.sd_refund_guest_feedback = payload.sd_refund_guest_feedback ?? null;
      workflowFields.sd_refund_method = payload.sd_refund_method;
      workflowFields.sd_refund_phone_confirmed = payload.sd_refund_phone_confirmed ?? null;
      workflowFields.sd_refund_bank = payload.sd_refund_bank ?? null;
      workflowFields.sd_refund_account_name = payload.sd_refund_account_name ?? null;
      workflowFields.sd_refund_account_number = payload.sd_refund_account_number ?? null;
      workflowFields.sd_refund_form_submitted_at = new Date().toISOString();
    }

    if (toStatus === 'COMPLETED') {
      if (payload.sd_additional_expenses != null)
        workflowFields.sd_additional_expenses = payload.sd_additional_expenses;
      if (payload.sd_additional_profits != null)
        workflowFields.sd_additional_profits = payload.sd_additional_profits;
      if (payload.sd_additional_expense_items != null) {
        workflowFields.sd_additional_expense_items = payload.sd_additional_expense_items;
      }
      if (payload.sd_additional_profit_items != null) {
        workflowFields.sd_additional_profit_items = payload.sd_additional_profit_items;
      }
      if (payload.sd_refund_amount != null)
        workflowFields.sd_refund_amount = payload.sd_refund_amount;
      if (payload.sd_refund_receipt_url)
        workflowFields.sd_refund_receipt_url = payload.sd_refund_receipt_url;
      workflowFields.settled_at = new Date().toISOString();
    }

    // READY_FOR_CHECKIN → READY_FOR_CHECKOUT: paid = total; receipt required only when total > 0.
    if (fromStatus === 'READY_FOR_CHECKIN' && toStatus === 'READY_FOR_CHECKOUT') {
      const settlement = checkGuestBalanceSettlement(booking as Record<string, unknown>, {
        paidAmount: payload.guest_balance_paid_amount,
        receiptUrl: payload.guest_balance_payment_receipt_url,
      });
      if (!settlement.ok) {
        const messages: Record<string, string> = {
          missing_total_guest_balance:
            'Total guest balance cannot be computed. Complete pricing (booking rate and related fields) before this step.',
          missing_guest_balance_paid_amount: 'guest_balance_paid_amount is required',
          invalid_guest_balance_paid_amount:
            'guest_balance_paid_amount must be a valid non-negative number',
          guest_balance_paid_exceeds_balance: 'Amount paid cannot exceed total guest balance',
          guest_balance_not_fully_paid:
            'Amount paid must equal total guest balance before advancing to ready for check-out',
          missing_guest_balance_payment_receipt: 'guest_balance_payment_receipt_url is required',
        };
        throw new Error(messages[settlement.reason] ?? settlement.reason);
      }
      workflowFields.guest_balance_paid_amount = settlement.paidAmount;
      workflowFields.guest_balance_payment_receipt_url = settlement.receiptUrl;

      const totalDue = computeTotalGuestBalanceFromBooking(booking as Record<string, unknown>);
      if (
        totalDue !== null &&
        guestBalancePaymentReceiptRequired(totalDue) &&
        settlement.receiptUrl &&
        receiptVerdictBlocksAdminTransition(booking.balance_receipt_ai_verdict)
      ) {
        throw new Error(
          'Balance payment receipt failed AI validation. Upload a valid payment screenshot before advancing.'
        );
      }
    }

    if (completionsChanged) {
      workflowFields.document_requirement_completions = completionsMap;
    }

    // 5. Persist workflow fields + update status
    if (flag(devControls, 'saveToDatabase')) {
      if (Object.keys(workflowFields).length > 0) {
        await DatabaseService.setWorkflowFields(bookingId, workflowFields);
      }
      if (fromStatus !== toStatus) {
        await DatabaseService.updateBookingStatus(bookingId, toStatus);
      }
    }

    // Re-fetch to get latest row (needed for email content)
    const persistedStatus = fromStatus !== toStatus ? toStatus : fromStatus;
    let updatedBooking = (await DatabaseService.getBookingById(bookingId)) ?? {
      ...booking,
      status: persistedStatus,
    };

    // ── Auto-advance: PENDING_DOCUMENTS → READY_FOR_CHECKIN ──────────────────
    // When a sub-step is marked complete (document_completion_target) and every
    // required sub-step (GAF + parking if needed + pet if needed) is now done,
    // immediately advance to READY_FOR_CHECKIN instead of leaving the booking
    // stranded in PENDING_DOCUMENTS waiting for a manual "Proceed" click.
    // This fires for every caller (gmail-listener, admin parking form,
    // reconciliation) since they all route through the orchestrator.
    if (
      fromStatus === 'PENDING_DOCUMENTS' &&
      toStatus === 'PENDING_DOCUMENTS' &&
      docComplete &&
      flag(devControls, 'saveToDatabase')
    ) {
      const autoAdvanceRequirements = propertyId
        ? await resolveDocumentRequirements(propertyId)
        : DEFAULT_DOCUMENT_REQUIREMENTS;
      const { allConfigurableDocsDone, parkingDone } = getPendingDocumentsNestedCompletion(
        updatedBooking as Parameters<typeof getPendingDocumentsNestedCompletion>[0],
        autoAdvanceRequirements
      );
      if (allConfigurableDocsDone && parkingDone) {
        console.log(
          `[orchestrator] All document sub-steps complete for ${bookingId} — auto-advancing to READY_FOR_CHECKIN`
        );
        try {
          // Recursive call: re-uses same calendar/sheet flags but always sends
          // the ready-for-check-in email (automated behaviour, not a manual click).
          return await WorkflowOrchestrator.transition(
            bookingId,
            'READY_FOR_CHECKIN',
            {},
            { ...devControls, sendReadyForCheckinEmail: true },
            false // automated — not a manual admin click
          );
        } catch (err) {
          // Non-fatal: log and fall through so the caller still gets a valid
          // PENDING_DOCUMENTS result. Admin can advance manually.
          console.error(
            '[orchestrator] Auto-advance to READY_FOR_CHECKIN failed (non-fatal):',
            err
          );
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const { pax, nights } = buildPaxNights(updatedBooking);
    const guestName = updatedBooking.guest_facebook_name as string;

    let gafPdfBuffer: Uint8Array | null = null;
    let petPdfBuffer: Uint8Array | null = null;

    // Property-level Calendar/Sheets master switches — an additional gate on top of
    // the per-request DevControlFlags (both must allow for the sync to run).
    const syncToggles = propertyId
      ? await resolvePropertySyncToggles(propertyId)
      : DEFAULT_PROPERTY_SYNC_TOGGLES;

    // 6. Google Calendar update
    let calendarOk = true;
    const calendarEnabled = flag(devControls, 'updateGoogleCalendar') && syncToggles.syncCalendar;
    if (calendarEnabled) {
      try {
        const result = await CalendarService.updateCalendarEventStatus(
          bookingId,
          toStatus,
          pax,
          nights,
          guestName,
          updatedBooking
        );
        calendarOk = result.success;
      } catch (err) {
        console.error('[orchestrator] Calendar update failed (non-fatal):', err);
        calendarOk = false;
      }
    } else {
      console.log(
        `[orchestrator] Calendar update skipped (flag=${flag(devControls, 'updateGoogleCalendar')}, syncCalendar=${syncToggles.syncCalendar})`
      );
    }

    // 7. Google Sheets update
    let sheetOk = true;
    const sheetsEnabled = flag(devControls, 'updateGoogleSheets') && syncToggles.syncSheets;
    if (sheetsEnabled) {
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
            guest_additional_fee: updatedBooking.guest_additional_fee,
            guest_balance_paid_amount: updatedBooking.guest_balance_paid_amount,
            guest_balance_payment_receipt_url: updatedBooking.guest_balance_payment_receipt_url,
            status_updated_at: updatedBooking.status_updated_at,
          },
          updatedBooking
        );
        sheetOk = result.success;
      } catch (err) {
        console.error('[orchestrator] Sheet update failed (non-fatal):', err);
        sheetOk = false;
      }
    } else {
      console.log(
        `[orchestrator] Sheet update skipped (flag=${flag(devControls, 'updateGoogleSheets')}, syncSheets=${syncToggles.syncSheets})`
      );
    }

    // 7b. Filled GAF / pet request PDFs (for Azure emails + optional Storage) — same transition as §3 PENDING_REVIEW → docs
    // Skipped entirely when requirements are empty (D2) or the admin skipped straight
    // to READY_FOR_CHECKIN; gated per-requirement so a property without "gaf" (or "pet")
    // never gets that PDF even when the other one is configured.
    if (isReviewToInitialDocs && flag(devControls, 'generatePdf')) {
      const fd = buildGuestFormData(updatedBooking);
      if (gafRequirementPresent) {
        try {
          gafPdfBuffer = await generatePDF(fd, propertyId);
        } catch (err) {
          console.error('[orchestrator] GAF PDF generation failed:', err);
        }
      }
      if (updatedBooking.has_pets && petRequirementPresent) {
        try {
          petPdfBuffer = await generatePetPDF(fd, propertyId);
        } catch (err) {
          console.error('[orchestrator] Pet request PDF generation failed:', err);
        }
      }
      if (flag(devControls, 'saveToDatabase')) {
        try {
          const pdfFields: Record<string, unknown> = {};
          const pdfPropertyId = String(updatedBooking.property_id ?? '').trim() || undefined;
          if (gafPdfBuffer) {
            pdfFields.gaf_request_pdf_url = await UploadService.uploadPdfBytes(
              'approved-gafs',
              bookingAssetStorageKey(pdfPropertyId, bookingId, 'gaf-request.pdf'),
              gafPdfBuffer
            );
          }
          if (petPdfBuffer) {
            pdfFields.pet_request_pdf_url = await UploadService.uploadPdfBytes(
              'approved-pet-forms',
              bookingAssetStorageKey(pdfPropertyId, bookingId, 'pet-request.pdf'),
              petPdfBuffer
            );
          }
          if (Object.keys(pdfFields).length > 0) {
            await DatabaseService.setWorkflowFields(bookingId, pdfFields);
            Object.assign(updatedBooking, pdfFields);
          }
        } catch (err) {
          console.error('[orchestrator] Request PDF upload failed:', err);
        }
      }
    }

    // 8. Emails — based on side-effect matrix in booking-workflow.mdc §3
    const emailsSent: string[] = [];

    const propertyEmailAllowed = async (key: PropertyAutomationToggleKey): Promise<boolean> =>
      propertyAutomationEnabled(propertyId, key);

    // PENDING_REVIEW → PENDING_GAF | PENDING_DOCUMENTS | READY_FOR_CHECKIN (D2 skip), same bundle:
    // - GAF request to Azure (only when "gaf" is in the resolved requirements)
    // - Booking acknowledgement to guest (always)
    // - Pet request to Azure (only when has_pets AND "pet" is in the resolved requirements)
    // - Parking broadcast (if parking) — parking stays outside documentRequirements
    if (isReviewProceedAttempt) {
      const formData = buildGuestFormData(updatedBooking);

      if (
        isReviewToInitialDocs &&
        gafRequirementPresent &&
        flag(devControls, 'sendGafRequestEmail') &&
        (await propertyEmailAllowed('emailGafRequest'))
      ) {
        try {
          await sendEmail(formData, gafPdfBuffer, false, updatedBooking);
          emailsSent.push('gaf_request');
        } catch (err) {
          console.error('[orchestrator] GAF request email failed:', err);
        }
      } else if (
        isReviewToInitialDocs &&
        gafRequirementPresent &&
        flag(devControls, 'sendGafRequestEmail')
      ) {
        console.log('[orchestrator] GAF request email skipped (org automation off)');
      }

      if (
        flag(devControls, 'sendBookingAcknowledgementEmail') &&
        (await propertyEmailAllowed('emailBookingAcknowledgement'))
      ) {
        try {
          await sendBookingAcknowledgement(updatedBooking);
          emailsSent.push('booking_acknowledgement');
        } catch (err) {
          console.error('[orchestrator] Booking acknowledgement email failed:', err);
        }
      } else if (flag(devControls, 'sendBookingAcknowledgementEmail')) {
        console.log('[orchestrator] Booking acknowledgement email skipped (org automation off)');
      }

      if (
        isReviewToInitialDocs &&
        updatedBooking.has_pets &&
        petRequirementPresent &&
        flag(devControls, 'sendPetRequestEmail') &&
        (await propertyEmailAllowed('emailPetRequest'))
      ) {
        try {
          await sendPetEmail(
            formData,
            petPdfBuffer,
            updatedBooking.pet_image_url,
            updatedBooking.pet_vaccination_url,
            false,
            updatedBooking.property_id
          );
          emailsSent.push('pet_request');
        } catch (err) {
          console.error('[orchestrator] Pet request email failed:', err);
        }
      } else if (
        isReviewToInitialDocs &&
        updatedBooking.has_pets &&
        petRequirementPresent &&
        flag(devControls, 'sendPetRequestEmail')
      ) {
        console.log('[orchestrator] Pet request email skipped (org automation off)');
      }

      if (
        updatedBooking.need_parking &&
        flag(devControls, 'sendParkingBroadcastEmail') &&
        (await propertyEmailAllowed('emailParkingBroadcast'))
      ) {
        try {
          await sendParkingBroadcast(updatedBooking);
          emailsSent.push('parking_broadcast');
        } catch (err) {
          console.error('[orchestrator] Parking broadcast email failed:', err);
        }
      } else if (updatedBooking.need_parking && flag(devControls, 'sendParkingBroadcastEmail')) {
        console.log('[orchestrator] Parking broadcast email skipped (org automation off)');
      }
    }

    // Issue stay-guide token whenever booking reaches READY_FOR_CHECKIN.
    if (toStatus === 'READY_FOR_CHECKIN') {
      try {
        await ensureGuestStayGuideToken(updatedBooking);
        const refreshed = await DatabaseService.getBookingById(bookingId);
        if (refreshed) updatedBooking = refreshed;
      } catch (err) {
        console.error('[orchestrator] Stay guide token failed (non-fatal):', err);
      }
    }

    // forward → READY_FOR_CHECKIN: send ready-for-check-in to guest.
    // PENDING_REVIEW is included for the D2 empty-requirements skip (and explicit
    // admin skip) — the only way that specific edge fires.
    const isForwardToReady =
      fromStatus === 'PENDING_REVIEW' ||
      fromStatus === 'PENDING_DOCUMENTS' ||
      fromStatus === 'PENDING_GAF' ||
      fromStatus === 'PENDING_PARKING_REQUEST' ||
      fromStatus === 'PENDING_PET_REQUEST';
    if (
      toStatus === 'READY_FOR_CHECKIN' &&
      isForwardToReady &&
      flag(devControls, 'sendReadyForCheckinEmail') &&
      (await propertyEmailAllowed('emailReadyForCheckin'))
    ) {
      try {
        await sendReadyForCheckin(updatedBooking);
        emailsSent.push('ready_for_checkin');
      } catch (err) {
        console.error('[orchestrator] Ready-for-check-in email failed:', err);
      }
    } else if (
      toStatus === 'READY_FOR_CHECKIN' &&
      isForwardToReady &&
      flag(devControls, 'sendReadyForCheckinEmail')
    ) {
      console.log('[orchestrator] Ready-for-check-in email skipped (org automation off)');
    }

    const sdAmount = Number(updatedBooking.security_deposit ?? 0);
    if (
      fromStatus === 'READY_FOR_CHECKIN' &&
      toStatus === 'READY_FOR_CHECKOUT' &&
      flag(devControls, 'sendSdRefundFormEmail') &&
      sdAmount > 0 &&
      (await propertyEmailAllowed('emailSdRefundCheckout'))
    ) {
      const emailedRaw = (updatedBooking as { sd_refund_form_emailed_at?: string | null })
        .sd_refund_form_emailed_at;
      const alreadyEmailed = typeof emailedRaw === 'string' && emailedRaw.trim() !== '';
      if (alreadyEmailed) {
        console.log('[orchestrator] SD refund form email skipped (already sent for this stay)');
      } else {
        try {
          await sendSdRefundFormRequest(updatedBooking);
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
    } else if (
      fromStatus === 'READY_FOR_CHECKIN' &&
      toStatus === 'READY_FOR_CHECKOUT' &&
      flag(devControls, 'sendSdRefundFormEmail') &&
      sdAmount > 0
    ) {
      console.log('[orchestrator] SD refund form email skipped (org automation off)');
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
    primaryGuestAge: booking.primary_guest_age,
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
    guest2Age: booking.guest2_age,
    guest3Name: booking.guest3_name,
    guest3Age: booking.guest3_age,
    guest4Name: booking.guest4_name,
    guest4Age: booking.guest4_age,
    guest5Name: booking.guest5_name,
    guest5Age: booking.guest5_age,
    guestSpecialRequests: booking.guest_special_requests,
    findUs: booking.find_us,
    findUsDetails: booking.find_us_details,
    bookingSource: booking.booking_source || 'Facebook',
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
    guest2ValidIdUrl: booking.guest2_valid_id_url,
    guest3ValidIdUrl: booking.guest3_valid_id_url,
    guest4ValidIdUrl: booking.guest4_valid_id_url,
    guest5ValidIdUrl: booking.guest5_valid_id_url,
    unitOwner: booking.unit_owner,
    towerAndUnitNumber: booking.tower_and_unit_number,
    ownerOnsiteContactPerson: booking.owner_onsite_contact_person,
    ownerContactNumber: booking.owner_contact_number,
  };
}

function bookingFlagTrue(v: unknown): boolean {
  return v === true || v === 'true';
}
