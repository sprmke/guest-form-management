/**
 * useUploadBookingAsset — mutation to upload/replace a booking document.
 *
 * Calls the `upload-booking-asset` edge function (multipart/form-data).
 * On success the edge function writes the new public URL to the DB column
 * and returns it; we then invalidate the booking cache so the UI refreshes.
 *
 * Supported assetTypes:
 *   Workflow:  parking_endorsement | approved_gaf | approved_pet | sd_refund_receipt
 *   Guest docs: valid_id | payment_receipt | pet_vaccination | pet_image
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { BOOKING_QUERY_KEY } from './useBooking';
import { BOOKINGS_QUERY_KEY } from './useBookings';

export type GuestDocAssetType =
  | 'valid_id'
  | 'payment_receipt'
  | 'pet_vaccination'
  | 'pet_image';

export type WorkflowAssetType =
  | 'parking_endorsement'
  | 'approved_gaf'
  | 'approved_pet'
  | 'sd_refund_receipt';

export type AssetType = GuestDocAssetType | WorkflowAssetType;

export type UploadAssetResult = {
  url: string;
  bucket: string;
  path: string;
  column: string;
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

    onSuccess: (_, { bookingId }) => {
      // Refresh the booking detail so the new URL renders immediately
      void qc.invalidateQueries({ queryKey: BOOKING_QUERY_KEY(bookingId) });
      void qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}
