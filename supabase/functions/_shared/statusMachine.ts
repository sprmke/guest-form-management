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
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
  'READY_FOR_CHECKIN',
  'PENDING_SD_REFUND',
  'COMPLETED',
  'CANCELLED',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as ReadonlyArray<string>).includes(value);
}

/** Terminal statuses — no further transitions are valid. */
export const TERMINAL_STATUSES = new Set<BookingStatus>(['COMPLETED', 'CANCELLED']);

// ─── Transition graph ─────────────────────────────────────────────────────────

/**
 * Strict workflow graph for automation + normal admin clicks.
 * Any call from workflowOrchestrator or the Gmail listener uses this.
 */
const TRANSITION_GRAPH: Record<BookingStatus, ReadonlyArray<BookingStatus>> = {
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
 * Admin-only exceptional edges that the UI workflow panel may surface.
 * These are NOT available to Gmail listener or cron — they exist to let a
 * human recover when automation is late or guest data changes.
 *
 * See: .cursor/rules/booking-workflow.mdc §2.2
 */
const MANUAL_OVERRIDE_GRAPH: Record<BookingStatus, ReadonlyArray<BookingStatus>> = {
  PENDING_REVIEW:          [],
  PENDING_GAF:             ['READY_FOR_CHECKIN'],   // approved PDF uploaded manually
  PENDING_PARKING_REQUEST: [],
  PENDING_PET_REQUEST:     [],
  READY_FOR_CHECKIN:       ['PENDING_REVIEW'],      // guest fields edited after ready
  PENDING_SD_REFUND:       [],
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
  PENDING_GAF:             { colorId: '5',  label: 'PENDING GAF' },
  PENDING_PARKING_REQUEST: { colorId: '5',  label: 'PENDING PARKING REQUEST' },
  PENDING_PET_REQUEST:     { colorId: '5',  label: 'PENDING PET REQUEST' },
  READY_FOR_CHECKIN:       { colorId: '10', label: 'READY FOR CHECK-IN' },
  PENDING_SD_REFUND:       { colorId: '6',  label: 'PENDING SD REFUND' },
  COMPLETED:               { colorId: '9',  label: 'COMPLETED' },
  CANCELLED:               { colorId: '3',  label: 'CANCELED' },
};

/**
 * Builds the Google Calendar event `summary` for a given booking.
 *
 * Format (non-test): `{STATUS LABEL} - {pax}pax {nights}night(s) - {guestFacebookName}`
 * Format (test):     `[TEST] {STATUS LABEL} - {pax}pax {nights}night(s) - {guestFacebookName}`
 *
 * @param status     Current booking status.
 * @param pax        Total number of guests (adults + children).
 * @param nights     Number of nights.
 * @param guestName  Guest's Facebook/display name.
 * @param isTest     Whether to prefix with [TEST].
 */
export function buildCalendarSummary(
  status: BookingStatus,
  pax: number,
  nights: number,
  guestName: string,
  isTest = false,
): string {
  const meta = STATUS_CALENDAR_META[status];
  const nightsText = `${nights}${nights === 1 ? 'night' : 'nights'}`;
  const core = `${meta.label} - ${pax}pax ${nightsText} - ${guestName}`;
  return isTest ? `[TEST] ${core}` : core;
}

// ─── Human labels (for admin UI display) ─────────────────────────────────────

export const STATUS_HUMAN_LABEL: Record<BookingStatus, string> = {
  PENDING_REVIEW:          'Pending Review',
  PENDING_GAF:             'Pending GAF',
  PENDING_PARKING_REQUEST: 'Pending Parking Request',
  PENDING_PET_REQUEST:     'Pending Pet Request',
  READY_FOR_CHECKIN:       'Ready for Check-in',
  PENDING_SD_REFUND:       'Pending SD Refund',
  COMPLETED:               'Completed',
  CANCELLED:               'Cancelled',
};
