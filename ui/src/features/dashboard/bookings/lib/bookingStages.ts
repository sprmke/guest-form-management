/**
 * Booking pipeline stages for list summary cards, status legend, and kanban.
 * Maps canonical guest-form statuses to PMA-style stage groupings.
 */

import {
  AlertCircle,
  CalendarCheck,
  Car,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  History,
  Hourglass,
  LogOut,
  PawPrint,
  Wallet,
  XCircle,
} from 'lucide-react';

import { type BookingStatus, statusTone } from '@/features/dashboard/bookings/lib/bookingStatus';
import {
  DEFAULT_DOCUMENT_REQUIREMENTS,
  type DocumentRequirement,
} from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  applicableTransitions,
  canTransition,
  isSubStatusCompleted,
  isSubStatusRequired,
  type PendingDocumentSubStatus,
} from '@/features/dashboard/bookings/lib/workflow';
import { statusToneSurfaceClasses } from '@/lib/status-tone-colors';

import type { LucideIcon } from 'lucide-react';

export type BookingStage = 'all' | 'action_required' | 'pending_docs' | 'confirmed' | 'history';

export const BOOKING_STAGES: readonly BookingStage[] = [
  'all',
  'action_required',
  'pending_docs',
  'confirmed',
  'history',
] as const;

export function parseBookingStage(value: string | null): BookingStage {
  if (value && (BOOKING_STAGES as readonly string[]).includes(value)) {
    return value as BookingStage;
  }
  return 'all';
}

type StageMeta = {
  label: string;
  color: 'red' | 'amber' | 'green' | 'gray';
  icon: LucideIcon;
};

export const STAGE_META: Record<Exclude<BookingStage, 'all'>, StageMeta> = {
  action_required: {
    label: 'Action Required',
    color: 'red',
    icon: AlertCircle,
  },
  pending_docs: {
    label: 'Pending Docs',
    color: 'amber',
    icon: Hourglass,
  },
  confirmed: {
    label: 'Confirmed Stays',
    color: 'green',
    icon: CalendarCheck,
  },
  history: {
    label: 'History',
    color: 'gray',
    icon: History,
  },
};

/** Statuses included when a stage summary card is active. */
export const STAGE_STATUS_MAP: Record<Exclude<BookingStage, 'all'>, readonly BookingStatus[]> = {
  action_required: ['PENDING_REVIEW', 'READY_FOR_CHECKOUT', 'PENDING_SD_REFUND'],
  pending_docs: [
    'PENDING_DOCUMENTS',
    'PENDING_GAF',
    'PENDING_PARKING_REQUEST',
    'PENDING_PET_REQUEST',
  ],
  confirmed: ['READY_FOR_CHECKIN'],
  history: ['COMPLETED', 'CANCELLED', 'IMPORTED'],
};

export function getBookingStage(status: string): BookingStage {
  for (const stage of Object.keys(STAGE_STATUS_MAP) as Array<keyof typeof STAGE_STATUS_MAP>) {
    if ((STAGE_STATUS_MAP[stage] as readonly string[]).includes(status)) {
      return stage;
    }
  }
  return 'confirmed';
}

export function statusesForStage(stage: BookingStage): readonly string[] {
  if (stage === 'all') return [];
  return STAGE_STATUS_MAP[stage];
}

/** Intersect explicit status filters with an active stage filter. */
export function effectiveStatusFilter(
  stage: BookingStage,
  statusFilter: readonly string[]
): string[] {
  const stageStatuses = statusesForStage(stage);
  if (stage === 'all') return [...statusFilter];
  if (statusFilter.length === 0) return [...stageStatuses];
  const stageSet = new Set(stageStatuses);
  const intersected = statusFilter.filter((s) => stageSet.has(s));
  return intersected.length > 0 ? intersected : [...stageStatuses];
}

export type KanbanStatusConfig = {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  stage: Exclude<BookingStage, 'all'>;
};

function kanbanColors(status: BookingStatus) {
  return statusToneSurfaceClasses(statusTone(status));
}

export const KANBAN_STATUS_CONFIG: Record<BookingStatus, KanbanStatusConfig> = {
  PENDING_REVIEW: {
    label: 'Pending Review',
    shortLabel: 'Review',
    icon: ClipboardCheck,
    ...kanbanColors('PENDING_REVIEW'),
    stage: 'action_required',
  },
  PENDING_DOCUMENTS: {
    label: 'Pending Documents',
    shortLabel: 'Docs',
    icon: FileText,
    ...kanbanColors('PENDING_DOCUMENTS'),
    stage: 'pending_docs',
  },
  PENDING_GAF: {
    label: 'Pending GAF',
    shortLabel: 'GAF',
    icon: FileText,
    ...kanbanColors('PENDING_GAF'),
    stage: 'pending_docs',
  },
  PENDING_PARKING_REQUEST: {
    label: 'Pending Parking',
    shortLabel: 'Parking',
    icon: Car,
    ...kanbanColors('PENDING_PARKING_REQUEST'),
    stage: 'pending_docs',
  },
  PENDING_PET_REQUEST: {
    label: 'Pending Pet',
    shortLabel: 'Pet',
    icon: PawPrint,
    ...kanbanColors('PENDING_PET_REQUEST'),
    stage: 'pending_docs',
  },
  READY_FOR_CHECKIN: {
    label: 'Ready for Check-in',
    shortLabel: 'Ready',
    icon: CalendarCheck,
    ...kanbanColors('READY_FOR_CHECKIN'),
    stage: 'confirmed',
  },
  READY_FOR_CHECKOUT: {
    label: 'Ready for Check-out',
    shortLabel: 'Check-out',
    icon: LogOut,
    ...kanbanColors('READY_FOR_CHECKOUT'),
    stage: 'action_required',
  },
  PENDING_SD_REFUND: {
    label: 'Pending SD Refund',
    shortLabel: 'SD Refund',
    icon: Wallet,
    ...kanbanColors('PENDING_SD_REFUND'),
    stage: 'action_required',
  },
  COMPLETED: {
    label: 'Completed',
    shortLabel: 'Done',
    icon: CheckCircle2,
    ...kanbanColors('COMPLETED'),
    stage: 'history',
  },
  CANCELLED: {
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    icon: XCircle,
    ...kanbanColors('CANCELLED'),
    stage: 'history',
  },
  IMPORTED: {
    label: 'Imported',
    shortLabel: 'Imported',
    icon: History,
    ...kanbanColors('IMPORTED'),
    stage: 'history',
  },
};

/** Kanban columns in workflow order (excludes cancelled and parent PENDING_DOCUMENTS). */
export const KANBAN_COLUMNS: readonly BookingStatus[] = [
  'PENDING_REVIEW',
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
  'READY_FOR_CHECKIN',
  'READY_FOR_CHECKOUT',
  'PENDING_SD_REFUND',
  'COMPLETED',
] as const;

/**
 * `PENDING_DOCUMENTS` is a parent status — place the card in the first
 * incomplete nested step (GAF → parking → pet), matching calendar summary logic.
 *
 * `requirements` defaults to `DEFAULT_DOCUMENT_REQUIREMENTS` (Azure parity) —
 * pass the property's resolved list when available so an empty or custom
 * override doesn't show GAF/pet as a required (thus incomplete) step.
 */
export function kanbanColumnForBooking(
  booking: Pick<
    BookingRow,
    | 'status'
    | 'need_parking'
    | 'has_pets'
    | 'gaf_completed_at'
    | 'gaf_manual_incomplete'
    | 'approved_gaf_pdf_url'
    | 'parking_completed_at'
    | 'pet_completed_at'
    | 'pet_manual_incomplete'
    | 'approved_pet_pdf_url'
  >,
  requirements: DocumentRequirement[] = DEFAULT_DOCUMENT_REQUIREMENTS
): BookingStatus | null {
  const status = String(booking.status);

  if (status === 'PENDING_DOCUMENTS') {
    if (!isSubStatusCompleted('PENDING_GAF', booking, requirements)) return 'PENDING_GAF';
    if (!isSubStatusCompleted('PENDING_PARKING_REQUEST', booking, requirements)) {
      return 'PENDING_PARKING_REQUEST';
    }
    if (!isSubStatusCompleted('PENDING_PET_REQUEST', booking, requirements)) {
      return 'PENDING_PET_REQUEST';
    }
    // Nested docs complete — parent not yet advanced to ready.
    return 'READY_FOR_CHECKIN';
  }

  if ((KANBAN_COLUMNS as readonly string[]).includes(status)) {
    return status as BookingStatus;
  }
  if (status === 'CANCELLED' || status === 'IMPORTED') return null;
  return null;
}

/** @deprecated Use `kanbanColumnForBooking` — status alone cannot place PENDING_DOCUMENTS. */
export function kanbanColumnForStatus(status: string): BookingStatus | null {
  if ((KANBAN_COLUMNS as readonly string[]).includes(status)) {
    return status as BookingStatus;
  }
  if (status === 'CANCELLED') return 'CANCELLED';
  return null;
}

const KANBAN_DOC_SUB_COLUMNS: readonly PendingDocumentSubStatus[] = [
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
] as const;

function isKanbanDocSubColumn(status: BookingStatus): status is PendingDocumentSubStatus {
  return (KANBAN_DOC_SUB_COLUMNS as readonly BookingStatus[]).includes(status);
}

function kanbanDocSubColumnIndex(status: PendingDocumentSubStatus): number {
  return KANBAN_DOC_SUB_COLUMNS.indexOf(status);
}

function isInKanbanDocPipeline(status: string): boolean {
  return (
    status === 'PENDING_DOCUMENTS' ||
    status === 'PENDING_GAF' ||
    status === 'PENDING_PARKING_REQUEST' ||
    status === 'PENDING_PET_REQUEST'
  );
}

/** All required doc sub-steps before `target` must be complete. */
function kanbanDocStepsBeforeTargetComplete(
  booking: Pick<
    BookingRow,
    | 'need_parking'
    | 'has_pets'
    | 'gaf_completed_at'
    | 'gaf_manual_incomplete'
    | 'approved_gaf_pdf_url'
    | 'parking_completed_at'
    | 'pet_completed_at'
    | 'pet_manual_incomplete'
    | 'approved_pet_pdf_url'
  >,
  target: BookingStatus,
  requirements: DocumentRequirement[]
): boolean {
  if (!isKanbanDocSubColumn(target)) return false;
  const targetIdx = kanbanDocSubColumnIndex(target);
  for (let i = 0; i < targetIdx; i++) {
    const step = KANBAN_DOC_SUB_COLUMNS[i];
    if (
      isSubStatusRequired(step, booking, requirements) &&
      !isSubStatusCompleted(step, booking, requirements)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * `requirements` defaults to `DEFAULT_DOCUMENT_REQUIREMENTS` (Azure parity) —
 * pass the property's resolved list when available (see `kanbanColumnForBooking`).
 */
export function canKanbanDropTo(
  booking: BookingRow,
  targetStatus: BookingStatus,
  requirements: DocumentRequirement[] = DEFAULT_DOCUMENT_REQUIREMENTS
): boolean {
  const from = String(booking.status);
  const currentColumn = kanbanColumnForBooking(booking, requirements);
  if (currentColumn === targetStatus) return false;

  if (applicableTransitions(from, { manual: true }, booking).includes(targetStatus)) {
    return true;
  }
  if (canTransition(from, targetStatus, { manual: true })) {
    return true;
  }

  // No PENDING_DOCUMENTS column — map doc sub-columns to workflow paths.
  if (!isKanbanDocSubColumn(targetStatus)) {
    return false;
  }

  if (!kanbanDocStepsBeforeTargetComplete(booking, targetStatus, requirements)) {
    return false;
  }

  // Pending Review → first doc column after Proceed to Pending Documents.
  if (from === 'PENDING_REVIEW') {
    if (!canTransition(from, 'PENDING_DOCUMENTS', { manual: true })) return false;
    const landing = kanbanColumnForBooking(
      {
        ...booking,
        status: 'PENDING_DOCUMENTS',
      },
      requirements
    );
    return landing === targetStatus;
  }

  // Within the doc pipeline: forward to a later sub-column (opens workflow modal).
  if (isInKanbanDocPipeline(from)) {
    const currentIdx =
      currentColumn != null && isKanbanDocSubColumn(currentColumn)
        ? kanbanDocSubColumnIndex(currentColumn)
        : -1;
    const targetIdx = kanbanDocSubColumnIndex(targetStatus);
    if (currentIdx < 0 || targetIdx <= currentIdx) return false;
    if (!isSubStatusRequired(targetStatus, booking, requirements)) return false;
    return !isSubStatusCompleted(targetStatus, booking, requirements);
  }

  return false;
}

/** Legend rows — mirrors PMA layout with guest-form statuses. */
export const STATUS_LEGEND_GROUPS: ReadonlyArray<{
  stage: Exclude<BookingStage, 'all'>;
  statuses: readonly BookingStatus[];
}> = [
  {
    stage: 'action_required',
    statuses: ['PENDING_REVIEW', 'READY_FOR_CHECKOUT', 'PENDING_SD_REFUND'],
  },
  {
    stage: 'pending_docs',
    statuses: [
      'PENDING_DOCUMENTS',
      'PENDING_GAF',
      'PENDING_PARKING_REQUEST',
      'PENDING_PET_REQUEST',
    ],
  },
  {
    stage: 'confirmed',
    statuses: ['READY_FOR_CHECKIN'],
  },
  {
    stage: 'history',
    statuses: ['COMPLETED', 'CANCELLED'],
  },
];

export function shortStatusLabel(status: BookingStatus): string {
  return KANBAN_STATUS_CONFIG[status]?.shortLabel ?? status;
}

export function countBookingsByStage(
  rows: readonly { status: BookingStatus | string }[]
): Record<Exclude<BookingStage, 'all'>, number> {
  const counts = {
    action_required: 0,
    pending_docs: 0,
    confirmed: 0,
    history: 0,
  };
  for (const row of rows) {
    const stage = getBookingStage(String(row.status));
    if (stage !== 'all') counts[stage] += 1;
  }
  return counts;
}
