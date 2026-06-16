import { useQuery } from '@tanstack/react-query';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

import { DEFAULT_GAF_DETAILS } from '@/lib/gafDefaults';

export type GuestPaymentInfo = {
  gcashName: string;
  gcashNumber: string;
  gcashQrImageUrl: string;
  gafUnitOwner: string;
  gafTowerAndUnitNumber: string;
  gafGuestsOnsiteContactPerson: string;
  gafOwnerContactNumber: string;
};

export const DEFAULT_GUEST_PAYMENT_INFO: GuestPaymentInfo = {
  gcashName: 'Arianna Perez',
  gcashNumber: '0962 564 7541',
  gcashQrImageUrl: '/images/kame-home-gcash-qr-payment.jpg',
  ...DEFAULT_GAF_DETAILS,
};

export function useGuestPaymentInfo() {
  return useQuery({
    queryKey: ['guest-payment-info'],
    queryFn: async (): Promise<GuestPaymentInfo> => {
      const res = await fetch(`${FUNCTIONS_URL}/get-guest-payment-info`);
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: GuestPaymentInfo;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Failed to load payment info');
      }
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: DEFAULT_GUEST_PAYMENT_INFO,
  });
}
