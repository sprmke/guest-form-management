/**
 * Booking workflow — client-side mirror of statusMachine.ts.
 *
 * Keeps the transition graph and calendar meta in sync with the server so
 * the admin UI can drive the WorkflowPanel without an extra round-trip.
 *
 * ⚠️  When you change statusMachine.ts on the server, update this file too.
 *     Rule: .cursor/rules/booking-workflow.mdc §1 ("single source of truth").
 *     Plan: docs/NEW_FLOW_PLAN.md §1.3 + §1.4 + §6.1 Q1.3
 */

import type { BookingStatus } from '@/features/admin/lib/bookingStatus';

// ─── Allowed transitions ──────────────────────────────────────────────────────

/**
 * Primary workflow graph (automation + normal admin clicks).
 * Mirrors TRANSITION_GRAPH in statusMachine.ts.
 */
const TRANSITION_GRAPH: Record<string, ReadonlyArray<BookingStatus>> = {
  PENDING_REVIEW:          ['PENDING_DOCUMENTS', 'CANCELLED'],
  PENDING_DOCUMENTS:       ['PENDING_DOCUMENTS', 'READY_FOR_CHECKIN', 'CANCELLED'],
  // Legacy compatibility for already-in-flight rows:
  PENDING_GAF:             ['PENDING_DOCUMENTS', 'READY_FOR_CHECKIN', 'CANCELLED'],
  PENDING_PARKING_REQUEST: ['PENDING_DOCUMENTS', 'READY_FOR_CHECKIN', 'CANCELLED'],
  PENDING_PET_REQUEST:     ['PENDING_DOCUMENTS', 'READY_FOR_CHECKIN', 'CANCELLED'],
  READY_FOR_CHECKIN:       ['READY_FOR_CHECKOUT', 'CANCELLED'],
  READY_FOR_CHECKOUT: ['PENDING_SD_REFUND', 'COMPLETED', 'CANCELLED'],
  PENDING_SD_REFUND:       ['COMPLETED', 'CANCELLED'],
  COMPLETED:               [],
  CANCELLED:               [],
};

/**
 * Admin-only override edges — exposed in the WorkflowPanel for manual recovery
 * when cron / Gmail listener is late or skipped, or when the admin needs to
 * step the booking back one stage to redo a step.
 *
 * Mirrors MANUAL_OVERRIDE_GRAPH in statusMachine.ts.
 */
const MANUAL_OVERRIDE_GRAPH: Record<string, ReadonlyArray<BookingStatus>> = {
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

export type WorkflowContext = {
  /** Whether the transition is triggered by an admin (vs cron / automation). */
  manual: boolean;
};

/**
 * Returns true when the `from → to` transition is valid for the given context.
 * The server validates again — this is for optimistic UI feedback.
 */
export function canTransition(from: string, to: BookingStatus, ctx: WorkflowContext): boolean {
  const primary = TRANSITION_GRAPH[from] ?? [];
  if (primary.includes(to)) return true;

  if (ctx.manual) {
    const overrides = MANUAL_OVERRIDE_GRAPH[from] ?? [];
    if (overrides.includes(to)) return true;
  }

  return false;
}

/**
 * Returns all statuses the admin may transition to from `from`.
 * Used to build the WorkflowPanel's action buttons / dropdown.
 */
export function availableTransitions(from: string, ctx: WorkflowContext): BookingStatus[] {
  const primary = [...(TRANSITION_GRAPH[from] ?? [])] as BookingStatus[];
  if (ctx.manual) {
    for (const s of MANUAL_OVERRIDE_GRAPH[from] ?? []) {
      if (!primary.includes(s)) primary.push(s);
    }
  }
  return primary;
}

// ─── Booking-data-aware filtering ────────────────────────────────────────────
//
// The state machine knows which transitions are *graph-legal*, but the UI
// should only surface the ones that actually apply to this booking's guest
// data. e.g. don't offer "Pending Parking Request" when the guest didn't ask
// for parking. The natural order matches the side-effect matrix:
//   PENDING_GAF → PENDING_PARKING_REQUEST → PENDING_PET_REQUEST → READY_FOR_CHECKIN
// so when parking AND pets both apply, parking is surfaced first; the pet step
// only appears once parking has been handled.
//
// Rule: .cursor/rules/booking-workflow.mdc §2.1 (graph) + §3 (side-effect order)

type ApplicabilityFlags = {
  need_parking?: boolean | null;
  has_pets?: boolean | null;
  approved_gaf_pdf_url?: string | null;
  parking_endorsement_url?: string | null;
  approved_pet_pdf_url?: string | null;
  gaf_completed_at?: string | null;
  parking_completed_at?: string | null;
  pet_completed_at?: string | null;
  gaf_manual_incomplete?: boolean | null;
  pet_manual_incomplete?: boolean | null;
  security_deposit?: number | string | null;
};

export type PendingDocumentSubStatus =
  | 'PENDING_GAF'
  | 'PENDING_PARKING_REQUEST'
  | 'PENDING_PET_REQUEST';

export function isSubStatusRequired(
  subStatus: PendingDocumentSubStatus,
  booking: ApplicabilityFlags,
): boolean {
  if (subStatus === 'PENDING_PARKING_REQUEST') return !!booking.need_parking;
  if (subStatus === 'PENDING_PET_REQUEST') return !!booking.has_pets;
  return true;
}

function flagTrue(v: unknown): boolean {
  return v === true || v === 'true';
}

/** Statuses at or after Ready for Check-in (parent Pending Documents is behind). */
export const POST_PENDING_DOCUMENTS_STATUSES: readonly BookingStatus[] = [
  'READY_FOR_CHECKIN',
  'READY_FOR_CHECKOUT',
  'PENDING_SD_REFUND',
  'COMPLETED',
] as const;

export function isPostPendingDocumentsStatus(
  status: string,
): status is BookingStatus {
  return (POST_PENDING_DOCUMENTS_STATUSES as readonly string[]).includes(status);
}

/**
 * Pending Parking Request stays clickable in the stepper when parking is still
 * incomplete — including after pay parking is added at Ready for Check-in+.
 * Completed parking substeps are not navigatable (handled by callers).
 */
export function canNavigatePendingParkingSubStep(
  booking: ApplicabilityFlags,
  currentStatus: string,
): boolean {
  if (!isSubStatusRequired('PENDING_PARKING_REQUEST', booking)) return false;
  if (isSubStatusCompleted('PENDING_PARKING_REQUEST', booking)) return false;
  if (currentStatus === 'PENDING_DOCUMENTS') return true;
  return isPostPendingDocumentsStatus(currentStatus);
}

export function isSubStatusCompleted(
  subStatus: PendingDocumentSubStatus,
  booking: ApplicabilityFlags,
): boolean {
  if (!isSubStatusRequired(subStatus, booking)) return true;
  if (subStatus === 'PENDING_GAF') {
    if (flagTrue(booking.gaf_manual_incomplete)) return false;
    return !!booking.gaf_completed_at || !!booking.approved_gaf_pdf_url;
  }
  if (subStatus === 'PENDING_PARKING_REQUEST') {
    // Endorsement upload only fills `parking_endorsement_url`; admin must still
    // click "Mark as Complete" so `transition-booking` sets `parking_completed_at`.
    return !!booking.parking_completed_at;
  }
  if (flagTrue(booking.pet_manual_incomplete)) return false;
  return !!booking.pet_completed_at || !!booking.approved_pet_pdf_url;
}

/**
 * Pipeline stepper nested rows under **Pending Documents**: when the booking is
 * back in **PENDING_REVIEW** (e.g. sensitive-field revert), substeps must not
 * show green "complete" from a prior cycle — DB may still hold old completion
 * URLs until the next admin transition, and the UX should match "fresh review".
 */
export function isSubStatusCompletedInStepper(
  booking: ApplicabilityFlags & { status?: string | null },
  subStatus: PendingDocumentSubStatus,
): boolean {
  if (!isSubStatusRequired(subStatus, booking)) return true;
  if (booking.status === 'PENDING_REVIEW') return false;
  return isSubStatusCompleted(subStatus, booking);
}

export function arePendingDocumentsComplete(booking: ApplicabilityFlags): boolean {
  return (
    isSubStatusCompleted('PENDING_GAF', booking) &&
    isSubStatusCompleted('PENDING_PARKING_REQUEST', booking) &&
    isSubStatusCompleted('PENDING_PET_REQUEST', booking)
  );
}

/**
 * Whether an automatic `gmail-listener` poll on page load could still apply
 * inbox approvals (GAF / pet). Parking is admin-only — not Gmail-driven.
 */
export function bookingNeedsGmailListenerPoll(
  booking: ApplicabilityFlags,
): boolean {
  if (!isSubStatusCompleted('PENDING_GAF', booking)) return true;
  if (
    isSubStatusRequired('PENDING_PET_REQUEST', booking) &&
    !isSubStatusCompleted('PENDING_PET_REQUEST', booking)
  ) {
    return true;
  }
  return false;
}

/**
 * Whether a graph-legal transition should actually be shown for this booking.
 * Filters out steps that don't apply based on guest data:
 *   - Hides parking step when `need_parking` is false.
 *   - Hides pet step when `has_pets` is false.
 *   - Hides "skip to Ready for Check-in" when sub-stages still apply.
 */
export function isTransitionApplicable(
  from: string,
  to: BookingStatus,
  booking: ApplicabilityFlags,
): boolean {
  const needsParking = !!booking.need_parking;
  const hasPets = !!booking.has_pets;

  if (from === 'PENDING_GAF') {
    if (to === 'PENDING_PARKING_REQUEST') return needsParking;
    // Parking must be handled before pet when both apply.
    if (to === 'PENDING_PET_REQUEST') return hasPets && !needsParking;
    // Skip-to-ready only when no sub-stages remain.
    if (to === 'READY_FOR_CHECKIN') return !needsParking && !hasPets;
  }

  if (from === 'PENDING_PARKING_REQUEST') {
    if (to === 'PENDING_PET_REQUEST') return hasPets;
    if (to === 'READY_FOR_CHECKIN') return !hasPets;
  }

  return true;
}

/**
 * Convenience wrapper that combines `availableTransitions` + applicability.
 * Always excludes CANCELLED — cancel is rendered separately in the UI.
 */
export function applicableTransitions(
  from: string,
  ctx: WorkflowContext,
  booking: ApplicabilityFlags,
): BookingStatus[] {
  return availableTransitions(from, ctx)
    .filter((to) => to !== 'CANCELLED')
    .filter((to) => isTransitionApplicable(from, to, booking));
}

// ─── Pipeline helpers (booking-aware stepper) ────────────────────────────────
//
// `bookingPipeline(booking)` returns the *ordered* list of statuses this
// booking will walk through, hiding parking / pet stages that don't apply.
// `nextStep` and `previousStep` give the immediately adjacent step so the
// WorkflowPanel can render explicit "Proceed →" and "← Back" buttons. CANCELLED
// is intentionally excluded — cancel is a side path, not a pipeline step.

/** Canonical order of all non-terminal pipeline statuses (excluding CANCELLED). */
export const PIPELINE_ORDER: readonly BookingStatus[] = [
  'PENDING_REVIEW',
  'PENDING_DOCUMENTS',
  'READY_FOR_CHECKIN',
  'READY_FOR_CHECKOUT',
  'PENDING_SD_REFUND',
  'COMPLETED',
] as const;

/**
 * Returns the steps that apply to this booking, in order.
 *
 * Conditional steps are filtered:
 *   - PENDING_PARKING_REQUEST is included only when `need_parking`.
 *   - PENDING_PET_REQUEST     is included only when `has_pets`.
 *
 * `currentStatus` is included as a defensive measure: if a booking somehow
 * sits at a status that the booking flags say shouldn't apply (data drift),
 * we still surface it so the stepper has a valid "current" position.
 */
export function bookingPipeline(
  booking: ApplicabilityFlags,
  currentStatus?: BookingStatus,
): BookingStatus[] {
  const sdIsZero = booking.security_deposit != null && Number(booking.security_deposit) === 0;
  const filtered = PIPELINE_ORDER.filter((s) => {
    if (s === 'PENDING_PARKING_REQUEST') return !!booking.need_parking;
    if (s === 'PENDING_PET_REQUEST') return !!booking.has_pets;
    if (s === 'PENDING_SD_REFUND') return !sdIsZero;
    return true;
  });

  if (
    currentStatus &&
    currentStatus !== 'CANCELLED' &&
    !filtered.includes(currentStatus)
  ) {
    const targetIdx = PIPELINE_ORDER.indexOf(currentStatus);
    let insertAt = filtered.length;
    for (let i = 0; i < filtered.length; i++) {
      if (PIPELINE_ORDER.indexOf(filtered[i]) > targetIdx) {
        insertAt = i;
        break;
      }
    }
    filtered.splice(insertAt, 0, currentStatus);
  }

  return filtered;
}

/** Immediately previous step in the booking's pipeline, or null at the start. */
export function previousStep(
  booking: ApplicabilityFlags,
  currentStatus: BookingStatus,
): BookingStatus | null {
  const pipeline = bookingPipeline(booking, currentStatus);
  const idx = pipeline.indexOf(currentStatus);
  if (idx <= 0) return null;
  return pipeline[idx - 1];
}

/** Immediately next step in the booking's pipeline, or null at the end. */
export function nextStep(
  booking: ApplicabilityFlags,
  currentStatus: BookingStatus,
): BookingStatus | null {
  const pipeline = bookingPipeline(booking, currentStatus);
  const idx = pipeline.indexOf(currentStatus);
  if (idx < 0 || idx >= pipeline.length - 1) return null;
  return pipeline[idx + 1];
}

/**
 * Direction of a transition relative to this booking's pipeline.
 * Used in the UI to label buttons ("Proceed to" vs "Back to") and decide
 * whether sub-form gating applies.
 */
export type TransitionDirection = 'forward' | 'backward' | 'lateral';

export function transitionDirection(
  from: BookingStatus,
  to: BookingStatus,
  booking: ApplicabilityFlags,
): TransitionDirection {
  const pipeline = bookingPipeline(booking, from);
  const fromIdx = pipeline.indexOf(from);
  const toIdx = pipeline.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return 'lateral';
  if (toIdx > fromIdx) return 'forward';
  if (toIdx < fromIdx) return 'backward';
  return 'lateral';
}

// ─── Human-readable action labels for transition buttons ─────────────────────

const TRANSITION_ACTION_LABEL: Partial<Record<BookingStatus, string>> = {
  PENDING_DOCUMENTS:       'Proceed to Pending Documents',
  PENDING_GAF:             'Mark as Complete - Pending GAF',
  PENDING_PARKING_REQUEST: 'Proceed to Pending Parking Request',
  PENDING_PET_REQUEST:     'Proceed to Pending Pet Request',
  READY_FOR_CHECKIN:       'Proceed to Ready for Check-in',
  READY_FOR_CHECKOUT: 'Proceed to Ready for Check-out',
  PENDING_SD_REFUND:       'Proceed to Pending SD Refund',
  COMPLETED:               'Complete Booking',
  PENDING_REVIEW:          'Revert to Pending Review',
  CANCELLED:               'Cancel Booking',
};

export function transitionActionLabel(to: BookingStatus): string {
  return TRANSITION_ACTION_LABEL[to] ?? `Move to ${to}`;
}

// ─── Sub-form requirement per target status ───────────────────────────────────
// Each transition may require additional input from the admin before it can fire.
// Phase 3 will render these sub-forms in the WorkflowPanel.

export type SubFormKind =
  | 'pricing'       // ReviewPricingForm (booking rate, down payment, SD, pet fee)
  | 'parking'       // ParkingRequestForm (parking rates, endorsement upload)
  | 'guest_balance' // GuestBalanceSettlementForm (paid = total guest balance + receipt)
  | 'sd_refund'     // SdRefundForm (expenses, profits, refund amount, receipt upload)
  | null;

export const TRANSITION_SUB_FORM: Partial<Record<BookingStatus, SubFormKind>> = {
  PENDING_DOCUMENTS:       'pricing',   // admin must enter rates before proceeding
  PENDING_PARKING_REQUEST: null,
  READY_FOR_CHECKIN:       null,        // use requiredSubForm(from, to) — RFCI → READY_FOR_CHECKOUT uses guest_balance
  COMPLETED:               null,
};

export function requiredSubForm(from: string, to: BookingStatus): SubFormKind {
  if (from === 'PENDING_REVIEW' && to === 'PENDING_DOCUMENTS') return 'pricing';
  if (from === 'PENDING_PARKING_REQUEST' && (to === 'PENDING_PET_REQUEST' || to === 'READY_FOR_CHECKIN')) return 'parking';
  if (from === 'READY_FOR_CHECKIN' && to === 'READY_FOR_CHECKOUT') return 'guest_balance';
  if (from === 'PENDING_SD_REFUND' && to === 'COMPLETED') return 'sd_refund';
  return null;
}

// ─── Progress stepper — read-only preview ─────────────────────────────────────

export type WorkflowViewContent =
  | SubFormKind
  | 'sd_guest_info'
  | 'doc_sub_status';

export type ViewedWorkflowStep =
  | { kind: 'pipeline'; status: BookingStatus }
  | { kind: 'pending-doc-sub'; sub: PendingDocumentSubStatus };

/** First applicable nested doc sub-step for Pending Documents preview. */
export function defaultPendingDocSub(
  booking: ApplicabilityFlags,
): PendingDocumentSubStatus {
  const order: PendingDocumentSubStatus[] = [
    'PENDING_GAF',
    'PENDING_PARKING_REQUEST',
    'PENDING_PET_REQUEST',
  ];
  for (const sub of order) {
    if (isSubStatusRequired(sub, booking)) return sub;
  }
  return 'PENDING_GAF';
}

export function initialViewedWorkflowStep(
  status: BookingStatus,
  booking: ApplicabilityFlags,
): ViewedWorkflowStep {
  if (status === 'PENDING_DOCUMENTS') {
    return { kind: 'pending-doc-sub', sub: defaultPendingDocSub(booking) };
  }
  return { kind: 'pipeline', status };
}

/** Which sub-form / info card to render for a stepper selection. */
export function workflowContentForView(
  viewed: ViewedWorkflowStep,
  booking: ApplicabilityFlags,
): WorkflowViewContent | null {
  if (viewed.kind === 'pending-doc-sub') {
    if (!isSubStatusRequired(viewed.sub, booking)) return null;
    if (viewed.sub === 'PENDING_PARKING_REQUEST') return 'parking';
    return 'doc_sub_status';
  }

  switch (viewed.status) {
    case 'PENDING_REVIEW':
    case 'PENDING_DOCUMENTS':
      return 'pricing';
    case 'READY_FOR_CHECKIN':
      return 'guest_balance';
    case 'READY_FOR_CHECKOUT':
      return 'sd_guest_info';
    case 'PENDING_SD_REFUND':
      return 'sd_refund';
    case 'COMPLETED':
      return null;
    default:
      return null;
  }
}

/** True when the panel shows the live editable workflow for the booking's current status. */
export function isLiveWorkflowView(
  viewed: ViewedWorkflowStep,
  currentStatus: BookingStatus,
  booking: ApplicabilityFlags,
): boolean {
  if (currentStatus === 'CANCELLED' || currentStatus === 'COMPLETED') {
    return viewed.kind === 'pipeline' && viewed.status === currentStatus;
  }
  if (viewed.kind === 'pending-doc-sub') {
    if (currentStatus === 'PENDING_DOCUMENTS') return true;
    return (
      viewed.sub === 'PENDING_PARKING_REQUEST' &&
      canNavigatePendingParkingSubStep(booking, currentStatus)
    );
  }
  return viewed.status === currentStatus;
}

// ─── Workflow Details edit form (BookingEditForm) ─────────────────────────────

/** Sub-forms shown under Edit booking → Workflow Details. */
export type ProgressEditFormKind =
  | 'pricing'
  | 'parking'
  | 'guest_balance'
  | 'sd_refund_guest'
  | 'sd_settlement';

/** Pipeline stage when each Workflow Details form first becomes editable. */
export const PROGRESS_EDIT_FORM_UNLOCK: Record<
  ProgressEditFormKind,
  BookingStatus
> = {
  pricing: 'PENDING_REVIEW',
  parking: 'PENDING_DOCUMENTS',
  guest_balance: 'READY_FOR_CHECKIN',
  sd_refund_guest: 'READY_FOR_CHECKOUT',
  sd_settlement: 'PENDING_SD_REFUND',
};

/** Map legacy / nested statuses onto the main pipeline for ordering. */
function progressEditStatusRank(status: string): number {
  if (status === 'CANCELLED' || status === 'canceled') return -1;
  const direct = PIPELINE_ORDER.indexOf(status as BookingStatus);
  if (direct >= 0) return direct;
  if (
    status === 'PENDING_GAF' ||
    status === 'PENDING_PARKING_REQUEST' ||
    status === 'PENDING_PET_REQUEST'
  ) {
    return PIPELINE_ORDER.indexOf('PENDING_DOCUMENTS');
  }
  if (status === 'booked') return PIPELINE_ORDER.indexOf('READY_FOR_CHECKIN');
  return -1;
}

/** True when the booking has reached the pipeline stage for this Workflow Details form. */
export function isProgressEditFormEnabled(
  booking: ApplicabilityFlags & { status?: string | null },
  form: ProgressEditFormKind,
): boolean {
  const status = (booking.status ?? '').trim();
  if (!status || status === 'CANCELLED' || status === 'canceled') return false;

  const currentRank = progressEditStatusRank(status);
  const unlockRank = progressEditStatusRank(
    PROGRESS_EDIT_FORM_UNLOCK[form],
  );
  if (currentRank < 0 || unlockRank < 0) return false;
  return currentRank >= unlockRank;
}

// ─── Terminal status check ────────────────────────────────────────────────────

export const TERMINAL_STATUSES = new Set<string>(['COMPLETED', 'CANCELLED']);

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}
