import { useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import { useGuestAuth } from '@/features/guest/auth/context/GuestAuthContext';
import { guestFormPath } from '@/features/guest/lib/guestPublicPaths';

import type { GuestNavState } from '@/layouts/guest/navState';
import { dateToString } from '@/utils/format/dates';

export type UsePropertyReserveOptions = {
  propertySlug: string;
  checkIn: Date | null;
  checkOut: Date | null;
  /** Called when Reserve is tapped without a complete date range. */
  onNeedDates?: () => void;
};

export function usePropertyReserve({
  propertySlug,
  checkIn,
  checkOut,
  onNeedDates,
}: UsePropertyReserveOptions) {
  const navigate = useNavigate();
  const { requireGuestAuth } = useGuestAuth();

  const reserve = useCallback(() => {
    const slug = propertySlug.trim();
    if (!slug) return;

    if (!checkIn || !checkOut) {
      onNeedDates?.();
      return;
    }

    const next = new URLSearchParams();
    next.set('checkInDate', dateToString(checkIn));
    next.set('checkOutDate', dateToString(checkOut));
    next.delete('bookingId');

    const target = guestFormPath(slug, next);
    const navState = { guestEnter: 'forward' } satisfies GuestNavState;

    requireGuestAuth(() => navigate(target, { state: navState }), {
      resume: { type: 'navigate', to: target, navState },
    });
  }, [propertySlug, checkIn, checkOut, onNeedDates, navigate, requireGuestAuth]);

  return { reserve, hasDates: Boolean(checkIn && checkOut) };
}
