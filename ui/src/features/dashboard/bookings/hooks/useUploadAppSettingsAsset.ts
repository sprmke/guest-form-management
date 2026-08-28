/**
 * useUploadAppSettingsAsset — upload operator assets from Settings.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AppSettingsDto } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { supabase } from '@/lib/supabase/client';

export type AppSettingsAssetType =
  | 'gcash_qr'
  | 'gaf_unit_owner_signature'
  | 'external_review_image'
  | 'external_review_stay_photo'
  | 'superhost_proof';

type UploadAppSettingsAssetResult = {
  url: string;
  bucket: string;
  path: string;
  column?: string;
};

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

type UploadArgs = {
  assetType: AppSettingsAssetType;
  file: File;
  reviewId?: string;
  photoIndex?: number;
};

export function useUploadAppSettingsAsset() {
  const qc = useQueryClient();
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: async ({
      assetType,
      file,
      reviewId,
      photoIndex,
    }: UploadArgs): Promise<UploadAppSettingsAssetResult> => {
      const jwt = await getAdminJwt();
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
      const storageName = `${assetType}${ext}`;

      const body = new FormData();
      body.append('assetType', assetType);
      body.append('file', file);
      body.append('fileName', storageName);
      if (reviewId) body.append('reviewId', reviewId);
      if (photoIndex != null) body.append('photoIndex', String(photoIndex));

      const res = await fetch(scopedFunctionsUrl('/upload-app-settings-asset', propertyId), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body,
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: UploadAppSettingsAssetResult;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json.data;
    },
    onSuccess: (data, variables) => {
      if (propertyId) {
        qc.setQueryData(['app-settings', propertyId], (current: AppSettingsDto | undefined) => {
          if (!current) return current;

          // Payment QR is staging-only until OTP save — do not mutate cached settings.
          if (variables.assetType === 'gcash_qr') {
            return current;
          }

          if (
            data.column === 'gaf_unit_owner_signature_url' ||
            variables.assetType === 'gaf_unit_owner_signature'
          ) {
            return {
              ...current,
              gafUnitOwnerSignatureUrl: data.url,
              fieldSources: {
                ...current.fieldSources,
                gafUnitOwnerSignatureUrl: 'db',
              },
            };
          }

          return current;
        });
      }
      if (variables.assetType === 'gcash_qr') return;
      void qc.invalidateQueries({ queryKey: ['app-settings', propertyId] });
      void qc.invalidateQueries({ queryKey: ['guest-payment-info'] });
    },
  });
}
