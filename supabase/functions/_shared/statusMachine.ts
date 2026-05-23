/**
 * Booking workflow state machine — server-side canonical source.
 *
 * Single source of truth for:
 *   • Status enum literals (must match CHECK constraint in DB migration)
 *   • Allowed transition graph (automation + normal admin clicks)
 *   • Admin-only "force advance" edges (manual override / automation catch-up)
 *   • Google Calendar colorId + summary label map
 *
 * Mirror: ui/src/features/admin/lib/workflow.ts (kept in sync manually).
 * Rule:   .cursor/rules/booking-workflow.mdc
 * Plan:   docs/NEW_FLOW_PLAN.md §1.3 + §1.4 + §6.1 Q1.3
 */

// ─── Status enum ─────────────────────────────────────────────────────────────

export const BOOKING_STATUSES = [
  'PENDING_REVIEW',
  'PENDING_DOCUMENTS',
  // Legacy in-flight statuses kept for backward compatibility during rollout.
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
  'READY_FOR_CHECKIN',
  'READY_FOR_CHECKOUT',
  'PENDING_SD_REFUND',
  'COMPLETED',
  'CANCELLED',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as ReadonlyArray<string>).includes(value);
}

/** Statuses at or after Ready for Check-in (parent Pending Documents is behind). */
export const POST_PENDING_DOCUMENTS_STATUSES: readonly BookingStatus[] = [
  'READY_FOR_CHECKIN',
  'READY_FOR_CHECKOUT',
  'PENDING_SD_REFUND',
  'COMPLETED',
] as const;

export function isPostPendingDocumentsStatus(status: string): boolean {
  return (POST_PENDING_DOCUMENTS_STATUSES as readonly string[]).includes(status);
}

/** Same-status manual parking document completion/clear at RFCI+ (no status revert). */
export function isLatePendingParkingDocumentTransition(
  from: BookingStatus,
  to: BookingStatus,
  payload: {
    document_completion_target?: string;
    document_completion_clear_target?: string;
  },
  manual: boolean,
): boolean {
  if (!manual || from !== to || !isPostPendingDocumentsStatus(from)) return false;
  const target =
    payload.document_completion_target ?? payload.document_completion_clear_target;
  return target === 'PENDING_PARKING_REQUEST';
}

/**
 * While status is in this set, guest or admin edits to workflow-sensitive booking
 * fields (or guest-doc uploads) reset `status` → `PENDING_REVIEW`.
 * Excludes: `PENDING_REVIEW`, SD refund stages, `COMPLETED`, `CANCELLED`.
 */
export const GUEST_FIELD_EDIT_REVERT_STATUSES = new Set<BookingStatus>([
  'PENDING_DOCUMENTS',
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
  'READY_FOR_CHECKIN',
]);

export function shouldRevertGuestFieldEditsToPendingReview(
  status: string | null | undefined,
): boolean {
  return !!status && isBookingStatus(status) && GUEST_FIELD_EDIT_REVERT_STATUSES.has(status);
}

/**
 * Columns cleared when guest-sensitive edits force `status` → `PENDING_REVIEW`
 * (admin `guest_submissions` patch, public `submit-form` update, or guest-doc
 * `upload-booking-asset`). Resets nested Pending Documents substeps, stale
 * request/approved PDF pointers, **admin parking settlement**, and **guest
 * balance settlement** — **not** pricing snapshot fields (`booking_rate`,
 * `down_payment`, `balance`, `security_deposit`, `pet_fee`,
 * `parking_rate_guest`, `guest_additional_fee`) so the Pending Review pricing
 * card stays as last submitted.
 *
 * Also merged at the **start** of `WorkflowOrchestrator` `PENDING_REVIEW →
 * PENDING_DOCUMENTS | PENDING_GAF` so leftover `*_completed_at` / PDF rows
 * cannot show substeps complete immediately after “Proceed to Pending
 * Documents” (pricing on the row is preserved unless the transition payload
 * overwrites it).
 *
 * Mirror: `ui/src/features/admin/lib/bookingStatus.ts#pendingDocumentsClearPatchForGuestEditRevert`.
 */
export function pendingDocumentsClearPatchForGuestEditRevert(): Record<
  string,
  null | false
> {
  return {
    gaf_completed_at: null,
    parking_completed_at: null,
    pet_completed_at: null,
    gaf_manual_incomplete: false,
    pet_manual_incomplete: false,
    approved_gaf_pdf_url: null,
    approved_pet_pdf_url: null,
    gaf_request_pdf_url: null,
    pet_request_pdf_url: null,
    parking_rate_paid: null,
    parking_owner: null,
    parking_owner_email: null,
    parking_endorsement_url: null,
    guest_balance_paid_amount: null,
    guest_balance_payment_receipt_url: null,
    surprise_decor_staff_acknowledged: false,
  };
}

/** Terminal statuses — no further transitions are valid. */
export const TERMINAL_STATUSES = new Set<BookingStatus>(['COMPLETED', 'CANCELLED']);

// ─── Transition graph ─────────────────────────────────────────────────────────

/**
 * Strict workflow graph for automation + normal admin clicks.
 * Any call from workflowOrchestrator or the Gmail listener uses this.
 */
const TRANSITION_GRAPH: Record<BookingStatus, ReadonlyArray<BookingStatus>> = {
  PENDING_REVIEW:          ['PENDING_DOCUMENTS', 'CANCELLED'],
  PENDING_DOCUMENTS:       ['PENDING_DOCUMENTS', 'READY_FOR_CHECKIN', 'CANCELLED'],
  // Legacy edges (existing rows may still be here):
  PENDING_GAF:             ['PENDING_DOCUMENTS', 'READY_FOR_CHECKIN', 'CANCELLED'],
  PENDING_PARKING_REQUEST: ['PENDING_DOCUMENTS', 'READY_FOR_CHECKIN', 'CANCELLED'],
  PENDING_PET_REQUEST:     ['PENDING_DOCUMENTS', 'READY_FOR_CHECKIN', 'CANCELLED'],
  READY_FOR_CHECKIN:       ['READY_FOR_CHECKOUT', 'CANCELLED'],
  READY_FOR_CHECKOUT: ['PENDING_SD_REFUND', 'CANCELLED'],
  PENDING_SD_REFUND:       ['COMPLETED', 'CANCELLED'],
  COMPLETED:               [],
  CANCELLED:               [],
};

/**
 * Admin-only exceptional edges that the UI workflow panel may surface.
 * These are NOT available to Gmail listener or cron — they exist to let a
 * human recover when automation is late, guest data changes, or the admin
 * needs to step the booking back one stage to redo a step.
 *
 * Forward overrides are listed first (force-advance), backward overrides
 * second (recovery / "oops, went too far"). The UI applies guest-data-aware
 * filtering on top via `isTransitionApplicable` so admins only see the back-
 * step that actually matches the booking's pipeline.
 *
 * See: .cursor/rules/booking-workflow.mdc §2.2
 */
const MANUAL_OVERRIDE_GRAPH: Record<BookingStatus, ReadonlyArray<BookingStatus>> = {
  PENDING_REVIEW:          [],
  PENDING_DOCUMENTS:       ['PENDING_REVIEW'],
  PENDING_GAF:             ['PENDING_DOCUMENTS', 'PENDING_REVIEW'],
  PENDING_PARKING_REQUEST: ['PENDING_DOCUMENTS', 'PENDING_REVIEW'],
  PENDING_PET_REQUEST:     ['PENDING_DOCUMENTS', 'PENDING_REVIEW'],
  READY_FOR_CHECKIN:       [
    'PENDING_DOCUMENTS',
    'PENDING_PET_REQUEST',
    'PENDING_PARKING_REQUEST',
    'PENDING_GAF',
    'PENDING_REVIEW',
    'PENDING_SD_REFUND',
  ],
  READY_FOR_CHECKOUT: ['READY_FOR_CHECKIN'],
  PENDING_SD_REFUND:       ['READY_FOR_CHECKOUT'],
  COMPLETED:               [],
  CANCELLED:               [],
};

export type TransitionContext = {
  /** True when the transition is triggered by an admin action (not cron / listener). */
  manual: boolean;
};

/**
 * Returns true when the `from → to` transition is valid for the given context.
 * This is the primary guard — call it before writing any side effects.
 */
export function canTransition(from: BookingStatus, to: BookingStatus, ctx: TransitionContext): boolean {
  const primary = TRANSITION_GRAPH[from] ?? [];
  if (primary.includes(to)) return true;

  if (ctx.manual) {
    const overrides = MANUAL_OVERRIDE_GRAPH[from] ?? [];
    if (overrides.includes(to)) return true;
  }

  return false;
}

/**
 * Returns all statuses reachable from `from` for the given context.
 * Useful for building the workflow panel's "available transitions" dropdown.
 */
export function availableTransitions(from: BookingStatus, ctx: TransitionContext): BookingStatus[] {
  const primary = [...(TRANSITION_GRAPH[from] ?? [])];
  if (ctx.manual) {
    for (const s of MANUAL_OVERRIDE_GRAPH[from] ?? []) {
      if (!primary.includes(s)) primary.push(s);
    }
  }
  return primary;
}

// ─── Calendar color + summary label map ──────────────────────────────────────
// colorId values are Google Calendar API integers.
// Summary label is the first segment of the event title (no brackets in production).
// See: docs/NEW_FLOW_PLAN.md §1.4, .cursor/rules/booking-workflow.mdc §4

export type CalendarStatusMeta = {
  /** Google Calendar API colorId. */
  colorId: string;
  /** First segment of the calendar event summary (e.g. "PENDING REVIEW"). */
  label: string;
};

export const STATUS_CALENDAR_META: Record<BookingStatus, CalendarStatusMeta> = {
  PENDING_REVIEW:          { colorId: '11', label: 'PENDING REVIEW' },
  PENDING_DOCUMENTS:       { colorId: '5',  label: 'PENDING DOCUMENTS' },
  PENDING_GAF:             { colorId: '5',  label: 'PENDING GAF' },
  PENDING_PARKING_REQUEST: { colorId: '5',  label: 'PENDING PARKING REQUEST' },
  PENDING_PET_REQUEST:     { colorId: '5',  label: 'PENDING PET REQUEST' },
  READY_FOR_CHECKIN:       { colorId: '10', label: 'READY FOR CHECK-IN' },
  READY_FOR_CHECKOUT: { colorId: '6', label: 'READY FOR CHECK-OUT' },
  PENDING_SD_REFUND:       { colorId: '6',  label: 'PENDING SD REFUND' },
  COMPLETED:               { colorId: '9',  label: 'COMPLETED' },
  CANCELLED:               { colorId: '3',  label: 'CANCELED' },
};

/** DB fields used to derive nested “what is still pending” under PENDING_DOCUMENTS (calendar). */
export type PendingDocumentsCalendarBooking = {
  need_parking?: boolean | null | string;
  has_pets?: boolean | null | string;
  /**
   * When true, Google Calendar `summary` gets a leading 🎉 (see `buildCalendarSummary`).
   * `has_pets` / `need_parking` add 🐶 / 🚗 in the same prefix when applicable.
   */
  guest_requests_surprise_decor?: boolean | null | string;
  gaf_completed_at?: string | null;
  parking_completed_at?: string | null;
  pet_completed_at?: string | null;
  approved_gaf_pdf_url?: string | null;
  approved_pet_pdf_url?: string | null;
  parking_endorsement_url?: string | null;
  /** Admin marked GAF sub-step incomplete; Gmail approval or "mark complete" clears this. */
  gaf_manual_incomplete?: boolean | null | string;
  pet_manual_incomplete?: boolean | null | string;
};

function bookingFlagTrue(v: unknown): boolean {
  return v === true || v === 'true';
}

/**
 * Completion flags for GAF / parking / pet while the parent row is still PENDING_DOCUMENTS.
 * Parking is "done" only when `parking_completed_at` is set (not merely `parking_endorsement_url`).
 */
export function getPendingDocumentsNestedCompletion(booking: PendingDocumentsCalendarBooking): {
  needParking: boolean;
  hasPets: boolean;
  gafDone: boolean;
  parkingDone: boolean;
  petDone: boolean;
} {
  const needParking = bookingFlagTrue(booking.need_parking);
  const hasPets = bookingFlagTrue(booking.has_pets);
  const gafManualIncomplete = bookingFlagTrue(booking.gaf_manual_incomplete);
  const petManualIncomplete = bookingFlagTrue(booking.pet_manual_incomplete);
  const gafDone =
    !gafManualIncomplete &&
    (!!booking.gaf_completed_at || !!booking.approved_gaf_pdf_url);
  // Parking: URL alone does not clear the nested step — only `parking_completed_at`
  // (admin "Mark as Complete — Pending Parking Request" / same-field transition).
  const parkingDone =
    !needParking ||
    !!booking.parking_completed_at;
  const petDone =
    !hasPets ||
    (!petManualIncomplete &&
      (!!booking.pet_completed_at || !!booking.approved_pet_pdf_url));
  return { needParking, hasPets, gafDone, parkingDone, petDone };
}

/**
 * First segment of the Google Calendar `summary` when `status === PENDING_DOCUMENTS`.
 * Lists every incomplete required sub-step in order (GAF → PARKING → PET), e.g.
 * `PENDING_GAF_PARKING_PET_DOCS`, `PENDING_PARKING_DOCS`. When nothing is left,
 * falls back to `PENDING DOCUMENTS` (parent not yet advanced to ready).
 */
export function buildPendingDocumentsCalendarSummaryPrefix(
  booking: PendingDocumentsCalendarBooking,
): string {
  const { needParking, hasPets, gafDone, parkingDone, petDone } =
    getPendingDocumentsNestedCompletion(booking);
  const segments: string[] = [];
  if (!gafDone) segments.push('GAF');
  if (needParking && !parkingDone) segments.push('PARKING');
  if (hasPets && !petDone) segments.push('PET');
  if (segments.length === 0) return STATUS_CALENDAR_META.PENDING_DOCUMENTS.label;
  return `PENDING_${segments.join('_')}_DOCS`;
}

/**
 * Leading emoji prefix for Google Calendar `summary` (at-a-glance in month view).
 * Order: surprise decor → pets → parking. Each flag is independent.
 */
function buildCalendarSummaryIconPrefix(booking: PendingDocumentsCalendarBooking): string {
  const icons: string[] = [];
  if (bookingFlagTrue(booking.guest_requests_surprise_decor)) icons.push('🎉');
  if (bookingFlagTrue(booking.has_pets)) icons.push('🐶');
  if (bookingFlagTrue(booking.need_parking)) icons.push('🚗');
  if (icons.length === 0) return '';
  return `${icons.join(' ')} `;
}

/**
 * Builds the Google Calendar event `summary` for a given booking.
 *
 * Format: `{STATUS LABEL} - {pax}pax {nights}night(s) - {guestFacebookName}`
 *
 * Optional leading icons when `booking` is passed: **`🎉`** if surprise decor,
 * **`🐶`** if `has_pets`, **`🚗`** if `need_parking` (space-separated, then the core title).
 *
 * When `status === PENDING_DOCUMENTS'` and `booking` is passed, the first segment is
 * built from outstanding document sub-steps (see `buildPendingDocumentsCalendarSummaryPrefix`).
 */
export function buildCalendarSummary(
  status: BookingStatus,
  pax: number,
  nights: number,
  guestName: string,
  booking?: PendingDocumentsCalendarBooking | null,
): string {
  const label =
    status === 'PENDING_DOCUMENTS' && booking != null
      ? buildPendingDocumentsCalendarSummaryPrefix(booking)
      : STATUS_CALENDAR_META[status].label;
  const nightsText = `${nights}${nights === 1 ? 'night' : 'nights'}`;
  const core = `${label} - ${pax}pax ${nightsText} - ${guestName}`;
  if (booking != null) {
    const iconPrefix = buildCalendarSummaryIconPrefix(booking);
    if (!!iconPrefix.trim()) return `${iconPrefix}| ${core}`;
  }
  return core;
}

/**
 * For calendar titles, PENDING_DOCUMENTS should display the currently pending
 * nested stage so operations can immediately see what is still blocked.
 */
export function resolveCalendarSummaryStatus(
  status: BookingStatus,
  booking?: PendingDocumentsCalendarBooking | null,
): BookingStatus {
  if (status !== 'PENDING_DOCUMENTS' || !booking) return status;

  const { needParking, hasPets, gafDone, parkingDone, petDone } =
    getPendingDocumentsNestedCompletion(booking);

  if (!gafDone) return 'PENDING_GAF';
  if (!parkingDone) return 'PENDING_PARKING_REQUEST';
  if (!petDone) return 'PENDING_PET_REQUEST';

  // Fallback if all nested steps are already complete but parent status has
  // not yet been advanced to READY_FOR_CHECKIN.
  return 'PENDING_DOCUMENTS';
}

// ─── Human labels (for admin UI display) ─────────────────────────────────────

export const STATUS_HUMAN_LABEL: Record<BookingStatus, string> = {
  PENDING_REVIEW:          'Pending Review',
  PENDING_DOCUMENTS:       'Pending Documents',
  PENDING_GAF:             'Pending GAF',
  PENDING_PARKING_REQUEST: 'Pending Parking Request',
  PENDING_PET_REQUEST:     'Pending Pet Request',
  READY_FOR_CHECKIN:       'Ready for Check-in',
  READY_FOR_CHECKOUT: 'Ready for Check-out',
  PENDING_SD_REFUND:       'Pending SD Refund',
  COMPLETED:               'Completed',
  CANCELLED:               'Cancelled',
};
