/**
 * Full progress map, on demand.
 *
 * The rail shows one stage at a time; this modal restores the whole pipeline —
 * including nested Pending Documents sub-steps and per-step timing — for the
 * moments a host needs the overview rather than the current task. It renders the
 * same `BookingStepper` the rail used to keep permanently expanded, so there is
 * exactly one implementation of step order and completion.
 */

import { BookingStepper } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingStepper';
import type { BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import type { DocumentRequirement } from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import type {
  PendingDocNestedKey,
  ViewedWorkflowStep,
} from '@/features/dashboard/bookings/lib/workflow';

import {
  ResponsiveModal,
  ResponsiveModalContent,
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
}: Props) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Progress</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <div className="pt-1">
          <BookingStepper
            booking={booking}
            documentRequirements={documentRequirements}
            currentStatus={currentStatus}
            statusUpdatedAt={booking.status_updated_at}
            viewedStep={viewedStep}
            disabled={disabled}
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
