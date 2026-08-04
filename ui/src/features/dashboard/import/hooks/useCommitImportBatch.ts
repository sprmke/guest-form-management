/**
 * useCommitImportBatch — commit a previewed import batch into guest_submissions.
 */

import { useMutation } from '@tanstack/react-query';

import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { supabase } from '@/lib/supabase/client';

async function getSessionJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export type CommitImportBatchResult = {
  batchId: string;
  status: string;
  inserted: number;
  skipped: number;
  failed: Array<{ rowIndex: number; reason: string }>;
};

export function useCommitImportBatch() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: async (batchId: string): Promise<CommitImportBatchResult> => {
      if (!propertyId) throw new Error('Property context is required');

      const jwt = await getSessionJwt();
      const res = await fetch(scopedFunctionsUrl('/import-commit', propertyId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchId }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: CommitImportBatchResult;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      return json.data;
    },
  });
}
