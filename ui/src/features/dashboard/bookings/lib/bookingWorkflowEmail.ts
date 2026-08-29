/** Kinds for `send-booking-workflow-email` — mirror `_shared/sendBookingWorkflowEmail.ts`. */

export const BOOKING_WORKFLOW_EMAIL_KINDS = [
  'gaf_request',
  'pet_request',
  'booking_acknowledgement',
  'ready_for_checkin',
  'parking_broadcast',
  'sd_refund_form_request',
] as const;

export type BookingWorkflowEmailKind = (typeof BOOKING_WORKFLOW_EMAIL_KINDS)[number];

export const BOOKING_WORKFLOW_EMAIL_LABELS: Record<BookingWorkflowEmailKind, string> = {
  gaf_request: 'GAF request',
  pet_request: 'Pet request',
  booking_acknowledgement: 'Booking acknowledgement',
  ready_for_checkin: 'Ready for check-in',
  parking_broadcast: 'Parking broadcast',
  sd_refund_form_request: 'Check-out Instructions',
};

export type BookingForManualWorkflowEmail = {
  status: string;
  has_pets?: boolean | string | null;
  need_parking?: boolean | string | null;
  gaf_request_pdf_url?: string | null;
  pet_request_pdf_url?: string | null;
};

function flagTrue(v: unknown): boolean {
  return v === true || v === 'true';
}

function hasUrl(v: unknown): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * Which manual workflow emails are eligible for this booking’s current status.
 * Shown on Free (escape hatch) and paid (resend) alike.
 */
export function eligibleManualWorkflowEmailKinds(
  booking: BookingForManualWorkflowEmail
): BookingWorkflowEmailKind[] {
  const status = booking.status;
  if (status === 'CANCELLED' || status === 'COMPLETED') return [];

  const kinds: BookingWorkflowEmailKind[] = [];

  const afterReview =
    status !== 'PENDING_REVIEW' &&
    (status === 'PENDING_DOCUMENTS' ||
      status === 'PENDING_GAF' ||
      status === 'PENDING_PARKING_REQUEST' ||
      status === 'PENDING_PET_REQUEST' ||
      status === 'READY_FOR_CHECKIN' ||
      status === 'READY_FOR_CHECKOUT' ||
      status === 'PENDING_SD_REFUND');

  if (afterReview) {
    if (hasUrl(booking.gaf_request_pdf_url)) kinds.push('gaf_request');
    if (flagTrue(booking.has_pets) && hasUrl(booking.pet_request_pdf_url)) {
      kinds.push('pet_request');
    }
    kinds.push('booking_acknowledgement');
    if (flagTrue(booking.need_parking)) kinds.push('parking_broadcast');
  }

  if (status === 'READY_FOR_CHECKIN') {
    kinds.push('ready_for_checkin');
    kinds.push('sd_refund_form_request');
  }

  if (status === 'READY_FOR_CHECKOUT') {
    kinds.push('sd_refund_form_request');
  }

  return kinds;
}
