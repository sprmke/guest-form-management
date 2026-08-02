import type { DevControlFlags } from '@/features/dashboard/bookings/hooks/useTransitionBooking';
import type { BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import {
  DEFAULT_DOCUMENT_REQUIREMENTS,
  type DocumentRequirement,
} from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

const STORAGE_PREFIX = 'admin.workflowDevControls:v1:';

export type WorkflowDevControlDef = {
  key: keyof DevControlFlags;
  label: string;
  description: string;
};

const WORKFLOW_DEV_CONTROLS: WorkflowDevControlDef[] = [
  {
    key: 'saveToDatabase',
    label: 'Save to Database',
    description: 'Persist status and workflow fields',
  },
  {
    key: 'updateGoogleCalendar',
    label: 'Update Google Calendar',
    description: 'Update event color and title',
  },
  {
    key: 'updateGoogleSheets',
    label: 'Update Google Sheets',
    description: 'Update status and workflow columns',
  },
  {
    key: 'generatePdf',
    label: 'Generate GAF / pet request PDFs',
    description: 'Generate GAF/pet PDFs, attach to emails, save URLs when DB is on',
  },
  {
    key: 'sendGafRequestEmail',
    label: 'Send GAF Request Email',
    description: 'Email Azure North with GAF request',
  },
  {
    key: 'sendBookingAcknowledgementEmail',
    label: 'Send Acknowledgement Email',
    description: 'Email guest with booking confirmation',
  },
  {
    key: 'sendParkingBroadcastEmail',
    label: 'Send Parking Broadcast',
    description: 'BCC parking owners about this booking',
  },
  {
    key: 'sendPetRequestEmail',
    label: 'Send Pet Request Email',
    description: 'Email Azure North with pet request',
  },
  {
    key: 'sendReadyForCheckinEmail',
    label: 'Send Ready-for-Check-in Email',
    description: 'Notify guest they are cleared for check-in',
  },
  {
    key: 'sendSdRefundFormEmail',
    label: 'Send SD Refund Form Email',
    description: 'Email guest /sd-form link when moving to check-out',
  },
];

/** All workflow dev flags default to enabled (mirrors server `flag()` undefined → true). */
function defaultWorkflowDevControlFlags(): DevControlFlags {
  return WORKFLOW_DEV_CONTROLS.reduce<DevControlFlags>((acc, c) => ({ ...acc, [c.key]: true }), {});
}

function workflowDevControlsStorageKey(bookingId: string): string {
  return STORAGE_PREFIX + bookingId;
}

export function loadPersistedWorkflowDevControls(bookingId: string): DevControlFlags | null {
  try {
    const raw = sessionStorage.getItem(workflowDevControlsStorageKey(bookingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DevControlFlags;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistWorkflowDevControls(bookingId: string, flags: DevControlFlags): void {
  try {
    sessionStorage.setItem(workflowDevControlsStorageKey(bookingId), JSON.stringify(flags));
  } catch {
    /* private mode / quota */
  }
}

/** Merge session values onto all-true defaults so new flags stay checked after deploy. */
export function mergeWorkflowDevControlsWithDefaults(
  persisted: DevControlFlags | null
): DevControlFlags {
  const defaults = defaultWorkflowDevControlFlags();
  if (!persisted) return defaults;
  const merged = { ...defaults };
  for (const { key } of WORKFLOW_DEV_CONTROLS) {
    if (persisted[key] !== undefined) merged[key] = persisted[key];
  }
  return merged;
}

/**
 * Mirrors `workflowOrchestrator.ts#isReviewProceedAttempt` — the D2 direct
 * skip to READY_FOR_CHECKIN shares the same PENDING_REVIEW email/PDF bundle
 * as the PENDING_GAF / PENDING_DOCUMENTS targets (minus GAF/pet, gated below).
 */
function isReviewProceedAttempt(fromStatus: BookingStatus, toStatus: BookingStatus): boolean {
  return (
    fromStatus === 'PENDING_REVIEW' &&
    (toStatus === 'PENDING_GAF' ||
      toStatus === 'PENDING_DOCUMENTS' ||
      toStatus === 'READY_FOR_CHECKIN')
  );
}

/** Mirrors `isReviewToInitialDocs` — false for the D2 skip (empty requirements). */
function isReviewToInitialDocs(fromStatus: BookingStatus, toStatus: BookingStatus): boolean {
  return isReviewProceedAttempt(fromStatus, toStatus) && toStatus !== 'READY_FOR_CHECKIN';
}

function isForwardToReadyForCheckin(fromStatus: BookingStatus, toStatus: BookingStatus): boolean {
  return (
    toStatus === 'READY_FOR_CHECKIN' &&
    (fromStatus === 'PENDING_REVIEW' ||
      fromStatus === 'PENDING_DOCUMENTS' ||
      fromStatus === 'PENDING_GAF' ||
      fromStatus === 'PENDING_PARKING_REQUEST' ||
      fromStatus === 'PENDING_PET_REQUEST')
  );
}

/**
 * Which dev-control checkboxes apply to a specific admin transition.
 * Server still gates side effects; this only drives the confirm modal UI.
 * GAF/pet/PDF controls are additionally gated on the property's resolved
 * `documentRequirements` — a property without "gaf" (or "pet") never shows
 * that control, matching what the orchestrator will actually do.
 */
function isWorkflowDevControlRelevant(
  key: keyof DevControlFlags,
  fromStatus: BookingStatus,
  toStatus: BookingStatus,
  booking: BookingRow,
  documentRequirements: DocumentRequirement[]
): boolean {
  const hasRequirement = (id: string) => documentRequirements.some((req) => req.id === id);
  switch (key) {
    case 'saveToDatabase':
    case 'updateGoogleCalendar':
    case 'updateGoogleSheets':
      return true;
    case 'generatePdf':
      return (
        isReviewToInitialDocs(fromStatus, toStatus) &&
        (hasRequirement('gaf') || hasRequirement('pet'))
      );
    case 'sendGafRequestEmail':
      return isReviewToInitialDocs(fromStatus, toStatus) && hasRequirement('gaf');
    case 'sendBookingAcknowledgementEmail':
      return isReviewProceedAttempt(fromStatus, toStatus);
    case 'sendParkingBroadcastEmail':
      return isReviewProceedAttempt(fromStatus, toStatus) && !!booking.need_parking;
    case 'sendPetRequestEmail':
      return (
        isReviewToInitialDocs(fromStatus, toStatus) && !!booking.has_pets && hasRequirement('pet')
      );
    case 'sendReadyForCheckinEmail':
      return isForwardToReadyForCheckin(fromStatus, toStatus);
    case 'sendSdRefundFormEmail':
      return fromStatus === 'READY_FOR_CHECKIN' && toStatus === 'READY_FOR_CHECKOUT';
    default:
      return false;
  }
}

export function workflowDevControlsForTransition(
  fromStatus: BookingStatus,
  toStatus: BookingStatus,
  booking: BookingRow,
  documentRequirements: DocumentRequirement[] = DEFAULT_DOCUMENT_REQUIREMENTS
): WorkflowDevControlDef[] {
  return WORKFLOW_DEV_CONTROLS.filter((c) =>
    isWorkflowDevControlRelevant(c.key, fromStatus, toStatus, booking, documentRequirements)
  );
}

/** Cancel booking: integrations only (no outbound workflow emails). */
export function workflowDevControlsForCancel(): WorkflowDevControlDef[] {
  return WORKFLOW_DEV_CONTROLS.filter((c) =>
    ['saveToDatabase', 'updateGoogleCalendar', 'updateGoogleSheets'].includes(c.key)
  );
}
