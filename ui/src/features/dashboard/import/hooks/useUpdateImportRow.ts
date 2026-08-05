/**
 * useUpdateImportRow — persist row skip/include via import-update-row.
 */

import { useMutation } from '@tanstack/react-query';

import { useImportBatchRows } from '@/features/dashboard/import/hooks/useImportBatchRows';
import type {
  ImportPreviewSummary,
  ImportValidationError,
} from '@/features/dashboard/import/types/importBatch';
import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { supabase } from '@/lib/supabase/client';

async function getSessionJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

type UpdateRowInput = {
  batchId: string;
  rowId: string;
  validationStatus: 'skipped' | 'valid';
};

type UpdateRowResult = {
  batchId: string;
  rowId: string;
  validationStatus: 'valid' | 'error' | 'skipped';
  validationErrors: ImportValidationError[];
  summary: ImportPreviewSummary;
};

export function useUpdateImportRow(batchId: string | null) {
  const propertyId = usePropertyIdParam();
  const { patchRow, patchSummary } = useImportBatchRows(batchId);

  return useMutation({
    mutationFn: async (input: UpdateRowInput): Promise<UpdateRowResult> => {
      if (!propertyId) throw new Error('Property context is required');

      const jwt = await getSessionJwt();
      const res = await fetch(scopedFunctionsUrl('/import-update-row', propertyId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: UpdateRowResult;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      return json.data;
    },
    onSuccess: (data) => {
      patchRow(
        data.rowId,
        {
          validationStatus: data.validationStatus,
          validationErrors: data.validationErrors,
        },
        data.summary
      );
      patchSummary(data.summary);
    },
  });
}
