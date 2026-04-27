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
  PENDING_REVIEW:          ['PENDING_GAF', 'CANCELLED'],
  PENDING_GAF:             ['PENDING_PARKING_REQUEST', 'PENDING_PET_REQUEST', 'READY_FOR_CHECKIN', 'CANCELLED'],
  PENDING_PARKING_REQUEST: ['PENDING_PET_REQUEST', 'READY_FOR_CHECKIN', 'CANCELLED'],
  PENDING_PET_REQUEST:     ['READY_FOR_CHECKIN', 'CANCELLED'],
  READY_FOR_CHECKIN:       ['PENDING_SD_REFUND', 'CANCELLED'],
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
  PENDING_GAF:             ['READY_FOR_CHECKIN', 'PENDING_REVIEW'],
  PENDING_PARKING_REQUEST: ['PENDING_GAF'],
  PENDING_PET_REQUEST:     ['PENDING_PARKING_REQUEST', 'PENDING_GAF'],
  READY_FOR_CHECKIN:       ['PENDING_PET_REQUEST', 'PENDING_PARKING_REQUEST', 'PENDING_GAF', 'PENDING_REVIEW'],
  PENDING_SD_REFUND:       ['READY_FOR_CHECKIN'],
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
};

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
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
  'READY_FOR_CHECKIN',
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
  const filtered = PIPELINE_ORDER.filter((s) => {
    if (s === 'PENDING_PARKING_REQUEST') return !!booking.need_parking;
    if (s === 'PENDING_PET_REQUEST') return !!booking.has_pets;
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
  PENDING_GAF:             'Proceed to Pending GAF',
  PENDING_PARKING_REQUEST: 'Proceed to Pending Parking Request',
  PENDING_PET_REQUEST:     'Proceed to Pending Pet Request',
  READY_FOR_CHECKIN:       'Proceed to Ready for Check-in',
  PENDING_SD_REFUND:       'Mark as Pending SD Refund',
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
  | 'sd_refund'     // SdRefundForm (expenses, profits, refund amount, receipt upload)
  | null;

export const TRANSITION_SUB_FORM: Partial<Record<BookingStatus, SubFormKind>> = {
  PENDING_GAF:             'pricing',   // admin must enter rates before proceeding
  PENDING_PARKING_REQUEST: null,
  READY_FOR_CHECKIN:       'parking',   // from PENDING_PARKING_REQUEST → needs parking data
  COMPLETED:               'sd_refund',
};

export function requiredSubForm(from: string, to: BookingStatus): SubFormKind {
  if (from === 'PENDING_REVIEW' && to === 'PENDING_GAF') return 'pricing';
  if (from === 'PENDING_PARKING_REQUEST' && (to === 'PENDING_PET_REQUEST' || to === 'READY_FOR_CHECKIN')) return 'parking';
  if (from === 'PENDING_SD_REFUND' && to === 'COMPLETED') return 'sd_refund';
  return null;
}

// ─── Terminal status check ────────────────────────────────────────────────────

export const TERMINAL_STATUSES = new Set<string>(['COMPLETED', 'CANCELLED']);

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}
