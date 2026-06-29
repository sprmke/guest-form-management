/**
 * useUploadBookingAsset — mutation to upload/replace a booking document.
 *
 * Calls the `upload-booking-asset` edge function (multipart/form-data).
 * On success the edge function writes the new public URL to the DB column
 * and returns it; we then invalidate the booking cache so the UI refreshes.
 *
 * Supported assetTypes:
 *   Workflow:  parking_endorsement | parking_payment_receipt | approved_gaf | approved_pet | sd_refund_receipt
 *              | guest_balance_payment_receipt
 *   Guest docs: valid_id | payment_receipt (downpayment) | pet_vaccination | pet_image
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { BOOKING_QUERY_KEY } from './useBooking';
import { BOOKINGS_QUERY_KEY } from './useBookings';

export type GuestDocAssetType =
  | 'valid_id'
  | 'guest2_valid_id'
  | 'guest3_valid_id'
  | 'guest4_valid_id'
  | 'guest5_valid_id'
  | 'payment_receipt'
  | 'pet_vaccination'
  | 'pet_image';

export type WorkflowAssetType =
  | 'parking_endorsement'
  | 'parking_payment_receipt'
  | 'approved_gaf'
  | 'approved_pet'
  | 'sd_refund_receipt'
  | 'guest_balance_payment_receipt';

export type AssetType = GuestDocAssetType | WorkflowAssetType;

type UploadAssetResult = {
  url: string;
  bucket: string;
  path: string;
  column: string;
  receiptValidation?: {
    verdict: string;
    confidence: number | null;
    summary: string;
    has_amount: boolean;
    has_date: boolean;
    has_reference: boolean;
    aiModelError?: string;
  } | null;
};

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

type UploadArgs = {
  bookingId: string;
  assetType: AssetType;
  file: File;
};

export function useUploadBookingAsset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, assetType, file }: UploadArgs): Promise<UploadAssetResult> => {
      const jwt = await getAdminJwt();

      // Build a predictable, collision-free storage key:
      // <bookingId>/<assetType>.<originalExtension>
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
      const storageName = `${assetType}${ext}`;

      const body = new FormData();
      body.append('bookingId', bookingId);
      body.append('assetType', assetType);
      body.append('file', file);
      body.append('fileName', storageName);

      const res = await fetch(`${FUNCTIONS_URL}/upload-booking-asset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json.data as UploadAssetResult;
    },

    onSuccess: async (_, { bookingId }) => {
      // Refresh the booking detail so the new URL renders immediately
      await qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
      await qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}
