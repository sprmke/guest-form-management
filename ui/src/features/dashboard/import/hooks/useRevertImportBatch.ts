/**
 * useRevertImportBatch — cancel imported guest_submissions by reverting a committed batch.
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

export type RevertMovedRow = {
  bookingId: string;
  status: string;
  modifiedSinceImport: boolean;
};

export type RevertImportBatchResult = {
  batchId: string;
  status: string;
  cancelled: number;
  /** Rows that were moved out of IMPORTED before revert; not cancelled unless includeMoved=true. */
  moved: RevertMovedRow[];
  failed: Array<{ bookingId: string; reason: string }>;
};

export type RevertImportBatchInput = {
  batchId: string;
  /** Also cancel rows that were manually moved out of IMPORTED into the live workflow. */
  includeMoved?: boolean;
};

export function useRevertImportBatch() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: async ({
      batchId,
      includeMoved = false,
    }: RevertImportBatchInput): Promise<RevertImportBatchResult> => {
      if (!propertyId) throw new Error('Property context is required');

      const jwt = await getSessionJwt();
      const res = await fetch(scopedFunctionsUrl('/import-revert', propertyId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchId, includeMoved }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: RevertImportBatchResult;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      return json.data;
    },
  });
}
