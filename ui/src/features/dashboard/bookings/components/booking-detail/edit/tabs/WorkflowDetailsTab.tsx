import { ListChecks } from 'lucide-react';

import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import { BookingProgressFormsEdit } from '@/features/dashboard/bookings/components/BookingProgressFormsEdit';
import type { ProgressFormEditState } from '@/features/dashboard/bookings/lib/bookingProgressEditPayload';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

type Props = {
  booking: BookingRow;
  onStateChange: (state: ProgressFormEditState) => void;
  onTouchedChange: (touched: boolean) => void;
};

export function WorkflowDetailsTab({ booking, onStateChange, onTouchedChange }: Props) {
  return (
    <BookingDetailCard title="Workflow" icon={ListChecks} tone="edit">
      <BookingProgressFormsEdit
        booking={booking}
        onStateChange={onStateChange}
        onTouchedChange={onTouchedChange}
      />
    </BookingDetailCard>
  );
}
