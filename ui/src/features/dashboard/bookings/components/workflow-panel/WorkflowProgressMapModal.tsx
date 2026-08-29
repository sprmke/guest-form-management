/**
 * Full progress map, on demand.
 *
 * The rail shows one stage at a time; this modal restores the whole pipeline —
 * including nested Pending Documents sub-steps, Auto/Manual, and a host guide
 * for what happens, what’s required, and when each step moves.
 */

import { BookingStepper } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingStepper';
import type { BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import type { DocumentRequirement } from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import type {
  PendingDocNestedKey,
  ViewedWorkflowStep,
} from '@/features/dashboard/bookings/lib/workflow';
import { WORKFLOW_ADVANCE_LEGEND } from '@/features/dashboard/bookings/lib/workflowAdvanceMode';

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRow;
  currentStatus: BookingStatus;
  documentRequirements: DocumentRequirement[];
  viewedStep: ViewedWorkflowStep;
  disabled?: boolean;
  onSelectStep: (step: BookingStatus) => void;
  onSelectSubStep: (sub: PendingDocNestedKey) => void;
  sdRefundEmailLeadMinutes?: number;
  automatedBookingFlow?: boolean;
};

export function WorkflowProgressMapModal({
  open,
  onOpenChange,
  booking,
  currentStatus,
  documentRequirements,
  viewedStep,
  disabled,
  onSelectStep,
  onSelectSubStep,
  sdRefundEmailLeadMinutes,
  automatedBookingFlow,
}: Props) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        sheetLayout="split"
        className="flex max-h-[min(92dvh,48rem)] w-full max-w-[min(calc(100vw-1.5rem),42rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <ResponsiveModalHeader className="border-separator shrink-0 border-b px-4 pb-3 pt-1 text-left sm:px-6 sm:pb-4">
          <ResponsiveModalTitle>Booking Workflow</ResponsiveModalTitle>
          <ResponsiveModalDescription>{WORKFLOW_ADVANCE_LEGEND}</ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <BookingStepper
            booking={booking}
            documentRequirements={documentRequirements}
            currentStatus={currentStatus}
            statusUpdatedAt={booking.status_updated_at}
            viewedStep={viewedStep}
            disabled={disabled}
            showAdvanceGuide
            sdRefundEmailLeadMinutes={sdRefundEmailLeadMinutes}
            automatedBookingFlow={automatedBookingFlow}
            onSelectStep={(step) => {
              onSelectStep(step);
              onOpenChange(false);
            }}
            onSelectSubStep={(sub) => {
              onSelectSubStep(sub);
              onOpenChange(false);
            }}
          />
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
