/**
 * WorkflowPanel pipeline-navigation derived state — pure relocation from the
 * pre-decomposition `WorkflowPanel.tsx` (the ~15 inline booleans computed
 * around `pipeline`/`next`/`prev`). Calls the exact same `lib/workflow.ts`
 * exports the monolith called; no new transition rules.
 *
 * Coupling note: `selectedPendingDocCanMarkComplete` depends on the parking
 * sub-form draft (`parkingValues`) when the active pending-doc sub-step is
 * PENDING_PARKING_REQUEST — that's why this hook takes `parkingValues` from
 * `useWorkflowSubFormDrafts` as a parameter instead of being fully independent
 * of it.
 */

import { isParkingRequestDraftComplete } from '@/features/dashboard/bookings/components/ParkingRequestForm';
import {
  TERMINAL_STATUSES,
  type BookingStatus,
} from '@/features/dashboard/bookings/lib/bookingStatus';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  arePendingDocumentsComplete,
  bookingPipeline,
  canNavigatePendingParkingSubStep,
  defaultPendingDocSub,
  isLiveWorkflowView,
  isSubStatusCompleted,
  isSubStatusRequired,
  nextStep,
  previousStep,
  workflowContentForView,
  type PendingDocumentSubStatus,
  type ViewedWorkflowStep,
} from '@/features/dashboard/bookings/lib/workflow';
import type { ParkingRequestValues } from '@/features/dashboard/bookings/components/ParkingRequestForm';

export function useWorkflowActions(
  booking: BookingRow,
  status: BookingStatus,
  viewedStep: ViewedWorkflowStep,
  parkingValues: ParkingRequestValues | null
) {
  const isTerminal = TERMINAL_STATUSES.has(status);

  const activePendingDocSubStatus: PendingDocumentSubStatus =
    viewedStep.kind === 'pending-doc-sub' ? viewedStep.sub : defaultPendingDocSub(booking);

  // Pipeline navigation — the stepper + Proceed/Back buttons read from these.
  const pipeline = bookingPipeline(booking, status);
  const next = !isTerminal ? nextStep(booking, status) : null;
  const prev = !isTerminal ? previousStep(booking, status) : null;
  const inPendingDocuments = status === 'PENDING_DOCUMENTS';
  const pendingDocumentsComplete = arePendingDocumentsComplete(booking);
  const selectedPendingDocRequired = isSubStatusRequired(activePendingDocSubStatus, booking);
  const selectedPendingDocCompleted = isSubStatusCompleted(activePendingDocSubStatus, booking);
  const selectedPendingDocIsParking = activePendingDocSubStatus === 'PENDING_PARKING_REQUEST';
  const selectedPendingDocCanMarkComplete =
    selectedPendingDocRequired &&
    !selectedPendingDocCompleted &&
    (!selectedPendingDocIsParking || isParkingRequestDraftComplete(parkingValues));
  const selectedPendingDocCanMarkIncomplete =
    selectedPendingDocRequired && selectedPendingDocCompleted;
  const isLiveView = isLiveWorkflowView(viewedStep, status, booking);
  const contentReadOnly = !isLiveView || status === 'COMPLETED' || status === 'CANCELLED';
  const viewedContent = workflowContentForView(viewedStep, booking);
  const viewingPendingDocSub = viewedStep.kind === 'pending-doc-sub';

  const canShowLateParkingForm =
    isLiveView &&
    viewingPendingDocSub &&
    activePendingDocSubStatus === 'PENDING_PARKING_REQUEST' &&
    !inPendingDocuments &&
    canNavigatePendingParkingSubStep(booking, status);
  const showLateParkingActions = canShowLateParkingForm;

  const showProceedToReadyForCheckin = isLiveView && inPendingDocuments && viewingPendingDocSub;
  const livePipelineActions = isLiveView && viewedStep.kind === 'pipeline' && !inPendingDocuments;

  return {
    isTerminal,
    activePendingDocSubStatus,
    pipeline,
    next,
    prev,
    inPendingDocuments,
    pendingDocumentsComplete,
    selectedPendingDocRequired,
    selectedPendingDocCompleted,
    selectedPendingDocIsParking,
    selectedPendingDocCanMarkComplete,
    selectedPendingDocCanMarkIncomplete,
    isLiveView,
    contentReadOnly,
    viewedContent,
    viewingPendingDocSub,
    showLateParkingActions,
    showProceedToReadyForCheckin,
    livePipelineActions,
  };
}

export type WorkflowActions = ReturnType<typeof useWorkflowActions>;
