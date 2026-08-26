/**
 * Phase 7 host-assist share link — points a guest who needs parking at the self-serve
 * marketplace flow (`/parkings`) instead of a host manually broadcasting/assigning parking.
 * Cloned from `useBookingStayGuideLink.ts`'s shape; simpler because there's no per-booking
 * token to mint — the guest links this stay to a marketplace booking themselves once signed
 * in (`list-linkable-property-bookings` resolves eligibility from their own identity, not a
 * URL parameter), so the link itself is just the marketplace's public browse root.
 */

import { useCallback } from 'react';

import { toast } from 'sonner';

import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

export type BookingParkingShareLink = {
  /** Empty when this booking never signaled parking interest. */
  url: string;
  open: () => void;
  copy: () => void;
};

export function useBookingParkingShareLink(
  booking: BookingRow | null | undefined
): BookingParkingShareLink {
  const url = booking?.need_parking === true ? `${window.location.origin}/parkings` : '';

  const open = useCallback(() => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  const copy = useCallback(() => {
    if (!url) return;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success('Parking link copied'))
      .catch(() => toast.error('Could not copy link'));
  }, [url]);

  return { url, open, copy };
}
