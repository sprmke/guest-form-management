// Single source of truth for the booking status enum, human labels, and color tokens.
// Mirrors `supabase/functions/_shared/statusMachine.ts` (to be authored in Phase 2).
// If you change the enum here, change it there too. See `.cursor/rules/booking-workflow.mdc`.

export const BOOKING_STATUSES = [
  'PENDING_REVIEW',
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
  'READY_FOR_CHECKIN',
  'PENDING_SD_REFUND_DETAILS',
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
  PENDING_GAF: 'Pending GAF',
  PENDING_PARKING_REQUEST: 'Pending Parking Request',
  PENDING_PET_REQUEST: 'Pending Pet Request',
  READY_FOR_CHECKIN: 'Ready for Check-in',
  PENDING_SD_REFUND_DETAILS: 'Pending SD Refund Details',
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
  PENDING_GAF: 'yellow',
  PENDING_PARKING_REQUEST: 'yellow',
  PENDING_PET_REQUEST: 'yellow',
  READY_FOR_CHECKIN: 'green',
  PENDING_SD_REFUND_DETAILS: 'amber',
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

export function statusLabel(value: string): string {
  return STATUS_LABELS[value as AnyBookingStatus] ?? value;
}

export function statusTone(value: string): StatusTone {
  return STATUS_TONE[value as AnyBookingStatus] ?? 'neutral';
}
