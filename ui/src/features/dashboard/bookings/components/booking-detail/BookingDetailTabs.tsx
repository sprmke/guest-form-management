import type { BookingViewTab } from '@/features/dashboard/bookings/lib/resolveBookingViewTab';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { SegmentedControl } from '@/components/ui/sliding-tabs';

export type { BookingViewTab };

type Props = {
  value: BookingViewTab;
  onChange: (tab: BookingViewTab) => void;
  booking: BookingRow;
};

/** Thin wrapper around `SegmentedControl` for the view-mode section tabs. */
export function BookingDetailTabs({ value, onChange, booking }: Props) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      size="compact"
      aria-label="Booking detail sections"
      className="max-w-full"
      options={[
        { value: 'overview', label: 'Overview' },
        { value: 'guests', label: 'Guests' },
        ...(booking.need_parking ? [{ value: 'parking' as const, label: 'Parking' }] : []),
        ...(booking.has_pets ? [{ value: 'pets' as const, label: 'Pets' }] : []),
        ...(booking.status !== 'PENDING_REVIEW'
          ? [{ value: 'pricing' as const, label: 'Pricing' }]
          : []),
        { value: 'files', label: 'Files' },
      ]}
    />
  );
}
