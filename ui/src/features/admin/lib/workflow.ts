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
 * when cron / Gmail listener is late or skipped.
 * Mirrors MANUAL_OVERRIDE_GRAPH in statusMachine.ts.
 */
const MANUAL_OVERRIDE_GRAPH: Record<string, ReadonlyArray<BookingStatus>> = {
  PENDING_REVIEW:          [],
  PENDING_GAF:             ['READY_FOR_CHECKIN'],  // approved PDF uploaded manually
  PENDING_PARKING_REQUEST: [],
  PENDING_PET_REQUEST:     [],
  READY_FOR_CHECKIN:       ['PENDING_REVIEW'],     // guest fields edited after ready
  PENDING_SD_REFUND:       [],
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
