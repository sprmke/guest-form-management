import { useQuery } from '@tanstack/react-query';

import { useGuestPropertySlug } from '@/features/guest/hooks/useGuestPropertySlug';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type GuestPaymentMethod = {
  id: string;
  provider: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string | null;
  isPrimary: boolean;
};

export type GuestPaymentInfo = {
  gcashName: string;
  gcashNumber: string;
  gcashQrImageUrl: string;
  paymentProvider: string;
  paymentMethods: GuestPaymentMethod[];
  emailLogoUrl: string;
  brandColor: string;
  gafUnitOwner: string;
  gafTowerAndUnitNumber: string;
  gafGuestsOnsiteContactPerson: string;
  gafOwnerContactNumber: string;
};

export const DEFAULT_GUEST_PAYMENT_INFO: GuestPaymentInfo = {
  gcashName: '',
  gcashNumber: '',
  gcashQrImageUrl: '/images/kame-home-gcash-qr-payment.jpg',
  paymentProvider: 'GCash',
  paymentMethods: [],
  emailLogoUrl: '/images/logo.png',
  brandColor: '#24a88e',
  gafUnitOwner: '',
  gafTowerAndUnitNumber: '',
  gafGuestsOnsiteContactPerson: '',
  gafOwnerContactNumber: '',
};

function guestPaymentInfoUrl(propertySlug: string | null): string {
  const base = `${FUNCTIONS_URL}/get-guest-payment-info`;
  if (!propertySlug) return base;
  return `${base}?property=${encodeURIComponent(propertySlug)}`;
}

export function useGuestPaymentInfo() {
  const propertySlug = useGuestPropertySlug() || null;

  return useQuery({
    queryKey: ['guest-payment-info', propertySlug],
    queryFn: async (): Promise<GuestPaymentInfo> => {
      const res = await fetch(guestPaymentInfoUrl(propertySlug));
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
