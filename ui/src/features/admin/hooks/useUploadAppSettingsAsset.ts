/**
 * useUploadAppSettingsAsset — upload operator assets from Settings.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export type AppSettingsAssetType = 'gcash_qr' | 'team_logo' | 'gaf_unit_owner_signature';

export type UploadAppSettingsAssetResult = {
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
  assetType: AppSettingsAssetType;
  file: File;
};

export function useUploadAppSettingsAsset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetType,
      file,
    }: UploadArgs): Promise<UploadAppSettingsAssetResult> => {
      const jwt = await getAdminJwt();
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
      const storageName = `${assetType}${ext}`;

      const body = new FormData();
      body.append('assetType', assetType);
      body.append('file', file);
      body.append('fileName', storageName);

      const res = await fetch(`${FUNCTIONS_URL}/upload-app-settings-asset`, {
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
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['app-settings'] });
      await qc.invalidateQueries({ queryKey: ['guest-payment-info'] });
    },
  });
}
