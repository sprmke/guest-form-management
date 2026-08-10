import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

export type BookingViewTab = 'overview' | 'guests' | 'parking' | 'pets' | 'pricing' | 'files';

/** Clamp tab when conditional sections disappear (e.g. parking cleared). */
export function resolveBookingViewTab(tab: BookingViewTab, booking: BookingRow): BookingViewTab {
  if (tab === 'parking' && !booking.need_parking) return 'overview';
  if (tab === 'pets' && !booking.has_pets) return 'overview';
  if (tab === 'pricing' && booking.status === 'PENDING_REVIEW') return 'overview';
  return tab;
}
