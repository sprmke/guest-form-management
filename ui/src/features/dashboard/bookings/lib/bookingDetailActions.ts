import { Car, Copy, CreditCard, ExternalLink, PawPrint } from 'lucide-react';

import { hasPayParkingAvailed } from '@/features/guest/pay-parking/lib/payParkingHelpers';

import type { BookingEditTabId } from '@/features/dashboard/bookings/components/booking-detail/edit/BookingEditTabs';
import type { BookingStayGuideLink } from '@/features/dashboard/bookings/hooks/useBookingStayGuideLink';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import type { LucideIcon } from 'lucide-react';

export type BookingDetailAction = {
  key: string;
  label: string;
  Icon: LucideIcon;
  onSelect: () => void;
  /** Consecutive actions sharing a group render together; a change draws a divider. */
  group: 'edit' | 'guest-links';
};

type Args = {
  booking: BookingRow;
  onEdit: (tab?: BookingEditTabId) => void;
  onPayParking: () => void;
  stayGuide: BookingStayGuideLink;
};

/**
 * Secondary host actions for view mode — shown behind one overflow trigger so
 * "Edit booking" stays the only primary action on the page.
 * Workflow transitions belong to the Progress rail, not here.
 */
export function buildBookingDetailActions({
  booking,
  onEdit,
  onPayParking,
  stayGuide,
}: Args): BookingDetailAction[] {
  const actions: BookingDetailAction[] = [
    {
      key: 'parking',
      label: booking.need_parking === true ? 'Edit parking' : 'Add parking',
      Icon: Car,
      onSelect: () => onEdit('parking'),
      group: 'edit',
    },
    {
      key: 'pets',
      label: booking.has_pets === true ? 'Edit pets' : 'Add pets',
      Icon: PawPrint,
      onSelect: () => onEdit('pets'),
      group: 'edit',
    },
    {
      key: 'pay-parking',
      label: hasPayParkingAvailed(booking) ? 'Open pay parking' : 'Add pay parking',
      Icon: CreditCard,
      onSelect: onPayParking,
      group: 'edit',
    },
  ];

  // Only once the token exists — a menu row that silently does nothing while the
  // link is still being minted is worse than no row.
  if (stayGuide.url) {
    actions.push(
      {
        key: 'stay-guide-open',
        label: 'Open stay guide',
        Icon: ExternalLink,
        onSelect: stayGuide.open,
        group: 'guest-links',
      },
      {
        key: 'stay-guide-copy',
        label: 'Copy stay guide link',
        Icon: Copy,
        onSelect: stayGuide.copy,
        group: 'guest-links',
      }
    );
  }

  return actions;
}
