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
    <BookingProgressFormsEdit
      booking={booking}
      onStateChange={onStateChange}
      onTouchedChange={onTouchedChange}
    />
  );
}
