import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { BOOKINGS_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBookings';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';

export type CreateParkingBookingInput = {
  parkingId: string;
  primaryGuestName: string;
  guestEmail: string;
  guestPhoneNumber: string;
  checkInDate: string;
  checkOutDate: string;
  carPlateNumber: string;
  carBrandModel?: string;
  carColor?: string;
};

function parkingScopedPath(fn: string, parkingId: string) {
  return `${fn}?parking_id=${encodeURIComponent(parkingId)}`;
}

export function useCreateParkingBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateParkingBookingInput) =>
      callEdgeFunction<BookingRow>(parkingScopedPath('create-parking-booking', input.parkingId), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      toast.success('Parking booking created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useTransitionParkingBooking(parkingId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { bookingId: string; toStatus: string }) => {
      if (!parkingId) throw new Error('Parking context required');
      return callEdgeFunction<BookingRow>(
        parkingScopedPath('transition-parking-booking', parkingId),
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      toast.success('Booking updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
