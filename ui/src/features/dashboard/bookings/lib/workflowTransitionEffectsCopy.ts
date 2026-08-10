import type { BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import {
  requirementApplies,
  type DocumentRequirement,
} from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  DEFAULT_PROPERTY_AUTOMATION_TOGGLES,
  type PropertyAutomationToggles,
} from '@/features/dashboard/org/lib/propertyEmailAutomation';

export type WorkflowTransitionEffectsInput = {
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  direction: 'forward' | 'back';
  booking: Pick<
    BookingRow,
    'has_pets' | 'need_parking' | 'security_deposit' | 'sd_refund_form_emailed_at'
  >;
  documentRequirements: DocumentRequirement[];
  automationToggles?: PropertyAutomationToggles;
};

function automation(input: WorkflowTransitionEffectsInput): PropertyAutomationToggles {
  return input.automationToggles ?? DEFAULT_PROPERTY_AUTOMATION_TOGGLES;
}

function applicableRequirements(
  requirements: DocumentRequirement[],
  booking: WorkflowTransitionEffectsInput['booking']
): DocumentRequirement[] {
  return requirements.filter((req) => requirementApplies(req, booking));
}

function hasDocWithTemplate(
  requirements: DocumentRequirement[],
  booking: WorkflowTransitionEffectsInput['booking'],
  templateId: 'gaf' | 'pet'
): boolean {
  return applicableRequirements(requirements, booking).some(
    (req) => req.pdfTemplateId === templateId || req.id === templateId
  );
}

function sdRefundEmailAlreadySent(booking: WorkflowTransitionEffectsInput['booking']): boolean {
  const raw = booking.sd_refund_form_emailed_at;
  return typeof raw === 'string' && raw.trim() !== '';
}

function securityDepositPositive(booking: WorkflowTransitionEffectsInput['booking']): boolean {
  return Number(booking.security_deposit ?? 0) > 0;
}

function pushIf(lines: string[], condition: boolean, line: string): void {
  if (condition) lines.push(line);
}

/** Short, host-facing bullets for what a workflow transition will do. */
export function workflowTransitionEffectLines(input: WorkflowTransitionEffectsInput): string[] {
  const { fromStatus, toStatus, direction, booking, documentRequirements } = input;
  const toggles = automation(input);

  if (direction === 'back') {
    return ['Moves the booking to previous status.', 'No emails will be sent.'];
  }

  const lines: string[] = ['Saves your changes and updates the booking status.'];
  const isReviewProceed =
    fromStatus === 'PENDING_REVIEW' &&
    (toStatus === 'PENDING_DOCUMENTS' ||
      toStatus === 'PENDING_GAF' ||
      toStatus === 'READY_FOR_CHECKIN');
  const isReviewToDocs =
    fromStatus === 'PENDING_REVIEW' &&
    (toStatus === 'PENDING_DOCUMENTS' || toStatus === 'PENDING_GAF');
  const gafDoc = hasDocWithTemplate(documentRequirements, booking, 'gaf');
  const petDoc = hasDocWithTemplate(documentRequirements, booking, 'pet');
  const hasParking = booking.need_parking === true;
  const hasPets = booking.has_pets === true;

  if (isReviewProceed) {
    pushIf(lines, isReviewToDocs && gafDoc, 'Creates the GAF request document.');
    pushIf(lines, isReviewToDocs && hasPets && petDoc, 'Creates the pet request document.');
    pushIf(
      lines,
      toggles.emailGafRequest && isReviewToDocs && gafDoc,
      'Emails management the GAF request.'
    );
    pushIf(lines, toggles.emailBookingAcknowledgement, 'Emails the guest a booking confirmation.');
    pushIf(
      lines,
      toggles.emailPetRequest && isReviewToDocs && hasPets && petDoc,
      'Emails management the pet request.'
    );
    pushIf(
      lines,
      toggles.emailParkingBroadcast && hasParking,
      'Emails parking owners about this stay.'
    );
  }

  const forwardToReadyForCheckin =
    toStatus === 'READY_FOR_CHECKIN' &&
    (fromStatus === 'PENDING_REVIEW' ||
      fromStatus === 'PENDING_DOCUMENTS' ||
      fromStatus === 'PENDING_GAF' ||
      fromStatus === 'PENDING_PARKING_REQUEST' ||
      fromStatus === 'PENDING_PET_REQUEST');

  if (forwardToReadyForCheckin) {
    pushIf(lines, toggles.emailReadyForCheckin, 'Emails the guest ready-for-check-in details.');
    lines.push('Prepares a stay guide link for the guest.');
  }

  if (fromStatus === 'READY_FOR_CHECKIN' && toStatus === 'READY_FOR_CHECKOUT') {
    lines.push('Records the guest balance you entered.');
    pushIf(
      lines,
      toggles.emailSdRefundCheckout &&
        securityDepositPositive(booking) &&
        !sdRefundEmailAlreadySent(booking),
      'Email guest the check-out and deposit refund form.'
    );
    pushIf(
      lines,
      securityDepositPositive(booking) && sdRefundEmailAlreadySent(booking),
      'Check-out email was already sent — it will not be sent again.'
    );
  }

  if (fromStatus === 'READY_FOR_CHECKOUT' && toStatus === 'PENDING_SD_REFUND') {
    lines.push('Saves the guest refund details from the form.');
  }

  if (toStatus === 'COMPLETED') {
    if (fromStatus === 'PENDING_SD_REFUND') {
      lines.push('Saves deposit refund details and closes the booking.');
    } else {
      lines.push('Closes the booking.');
    }
  }

  return lines;
}

export function workflowCancelEffectLines(): string[] {
  return [
    'Marks this booking as cancelled.',
    'Keeps all guest information on file.',
    'No emails will be sent.',
  ];
}
