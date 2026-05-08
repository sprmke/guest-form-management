// Single source of truth for the booking status enum, human labels, and color tokens.
// Mirrors `supabase/functions/_shared/statusMachine.ts` (to be authored in Phase 2).
// If you change the enum here, change it there too. See `.cursor/rules/booking-workflow.mdc`.

export const BOOKING_STATUSES = [
  'PENDING_REVIEW',
  'PENDING_DOCUMENTS',
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

/**
 * Legacy values that still exist in production until the Phase 2 migration.
 * Code that filters or groups by status MUST handle these alongside the new enum.
 */
export const LEGACY_BOOKING_STATUSES = ['booked', 'canceled'] as const;
export type LegacyBookingStatus = (typeof LEGACY_BOOKING_STATUSES)[number];

export type AnyBookingStatus = BookingStatus | LegacyBookingStatus;

/** Human labels for display (matches calendar summary conventions in `NEW_FLOW_PLAN.md §1.4`). */
export const STATUS_LABELS: Record<AnyBookingStatus, string> = {
  PENDING_REVIEW: 'Pending Review',
  PENDING_DOCUMENTS: 'Pending Documents',
  PENDING_GAF: 'Pending GAF Request',
  PENDING_PARKING_REQUEST: 'Pending Parking Request',
  PENDING_PET_REQUEST: 'Pending Pet Request',
  READY_FOR_CHECKIN: 'Ready for Check-in',
  READY_FOR_CHECKOUT: 'Ready for Check-out',
  PENDING_SD_REFUND: 'Pending SD Refund',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  booked: 'Booked (legacy)',
  canceled: 'Cancelled (legacy)',
};

/**
 * Tailwind-friendly color intent for each status. We keep the mapping aligned with the
 * Google Calendar colorId intent (red/yellow/green/orange/blue/purple). Concrete HSL
 * values resolve to the project's design tokens — no hardcoded hexes.
 */
export type StatusTone =
  | 'red'
  | 'yellow'
  | 'green'
  | 'amber'
  | 'orange'
  | 'blue'
  | 'purple'
  | 'neutral';

export const STATUS_TONE: Record<AnyBookingStatus, StatusTone> = {
  PENDING_REVIEW: 'red',
  PENDING_DOCUMENTS: 'yellow',
  PENDING_GAF: 'yellow',
  PENDING_PARKING_REQUEST: 'yellow',
  PENDING_PET_REQUEST: 'yellow',
  READY_FOR_CHECKIN: 'green',
  READY_FOR_CHECKOUT: 'amber',
  PENDING_SD_REFUND: 'orange',
  COMPLETED: 'blue',
  CANCELLED: 'purple',
  booked: 'green',
  canceled: 'purple',
};

/** Terminal statuses — no further transitions are valid. */
export const TERMINAL_STATUSES: ReadonlySet<AnyBookingStatus> = new Set([
  'COMPLETED',
  'CANCELLED',
  'canceled',
]);

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as ReadonlyArray<string>).includes(value);
}

/**
 * Guest/admin edits to workflow-sensitive fields (or guest-doc uploads) reset
 * `status` → `PENDING_REVIEW` only in these stages. Mirrors
 * `supabase/functions/_shared/statusMachine.ts#GUEST_FIELD_EDIT_REVERT_STATUSES`.
 */
export const GUEST_FIELD_EDIT_REVERT_STATUSES = [
  'PENDING_DOCUMENTS',
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
  'READY_FOR_CHECKIN',
] as const satisfies readonly BookingStatus[];

export function shouldRevertGuestFieldEditsToPendingReview(
  status: string | null | undefined,
): boolean {
  return !!status && (GUEST_FIELD_EDIT_REVERT_STATUSES as readonly string[]).includes(status);
}

/**
 * Clears nested Pending Documents state, request/approved PDF URLs, admin
 * parking settlement, and guest balance settlement when sensitive guest edits
 * revert the row to `PENDING_REVIEW`. Does **not** clear pricing snapshot
 * fields — same column set as server.
 *
 * Mirror: `supabase/functions/_shared/statusMachine.ts#pendingDocumentsClearPatchForGuestEditRevert`.
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

export function statusLabel(value: string): string {
  return STATUS_LABELS[value as AnyBookingStatus] ?? value;
}

export function statusTone(value: string): StatusTone {
  return STATUS_TONE[value as AnyBookingStatus] ?? 'neutral';
}
