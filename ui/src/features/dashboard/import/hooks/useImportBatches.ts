/**
 * useImportBatches — list import batches for the current property (history page).
 */

import { useQuery } from '@tanstack/react-query';

import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import type { ImportBatchListResult } from '@/features/dashboard/import/types/importBatch';
import { supabase } from '@/lib/supabase/client';

async function getSessionJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export const IMPORT_BATCHES_KEY = ['import-batches'] as const;

export function useImportBatches(page = 1, limit = 20) {
  const propertyId = usePropertyIdParam();

  return useQuery({
    queryKey: [...IMPORT_BATCHES_KEY, propertyId, page, limit] as const,
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<ImportBatchListResult> => {
      if (!propertyId) throw new Error('Property context is required');

      const jwt = await getSessionJwt();
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await fetch(
        `${scopedFunctionsUrl('/import-list-batches', propertyId)}&${params.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: ImportBatchListResult;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      return json.data;
    },
  });
}

/** Placeholder hook — revert wired in Task 6. */
export function useRevertImportBatch() {
  return { mutateAsync: async (_batchId: string) => { throw new Error('Revert not yet available'); }, isPending: false };
}
