import { useMutation } from '@tanstack/react-query';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type SubmitParkingBookingRequestInput = {
  parkingId: string;
  checkInDate: string;
  checkOutDate: string;
  vehicleType: 'car' | 'motorcycle';
  primaryGuestName: string;
  guestEmail: string;
  guestPhone?: string;
  unitNumber: string;
  carPlateNumber: string;
  carBrandModel: string;
  carColor: string;
  notes?: string;
};

export type SubmitParkingBookingRequestResult = {
  bookingId: string;
  status: string;
  expiresAt: string | null;
};

async function submitParkingBookingRequest(
  input: SubmitParkingBookingRequestInput
): Promise<SubmitParkingBookingRequestResult> {
  const res = await fetch(`${FUNCTIONS_URL}/submit-parking-booking-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: SubmitParkingBookingRequestResult;
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? 'Could not submit parking request');
  }
  return json.data;
}

export function useSubmitParkingBookingRequest() {
  return useMutation({ mutationFn: submitParkingBookingRequest });
}
