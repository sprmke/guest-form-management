import { useQuery } from '@tanstack/react-query';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type GuestPaymentInfo = {
  gcashName: string;
  gcashNumber: string;
};

export const DEFAULT_GUEST_PAYMENT_INFO: GuestPaymentInfo = {
  gcashName: 'Arianna Perez',
  gcashNumber: '0962 564 7541',
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
