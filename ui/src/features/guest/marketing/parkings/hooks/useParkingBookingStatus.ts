import { useQuery } from '@tanstack/react-query';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type ParkingBookingStatusValue =
  | 'PENDING_HOST_ACCEPTANCE'
  | 'PENDING_REVIEW'
  | 'READY_FOR_CHECKIN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_HOST_AVAILABLE';

export type ParkingBookingStatus = {
  status: ParkingBookingStatusValue;
  checkInDate: string;
  checkOutDate: string;
  expiresAt: string | null;
  parkingLabel: string | null;
  endorsementNote: string | null;
  organizationName: string | null;
};

const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'COMPLETED',
  'CANCELLED',
  'NO_HOST_AVAILABLE',
]);

async function fetchParkingBookingStatus(bookingId: string): Promise<ParkingBookingStatus> {
  const res = await fetch(
    `${FUNCTIONS_URL}/get-parking-booking-status?bookingId=${encodeURIComponent(bookingId)}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  const json = (await res.json()) as {
    success?: boolean;
    data?: ParkingBookingStatus;
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Request not found');
  }
  return json.data;
}

/** Polls every 4s while status is non-terminal — no Realtime subscription in v1. */
export function useParkingBookingStatus(bookingId: string) {
  return useQuery({
    queryKey: ['parking-booking-status', bookingId],
    queryFn: () => fetchParkingBookingStatus(bookingId),
    enabled: Boolean(bookingId),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_STATUSES.has(status)) return false;
      return 4000;
    },
  });
}
