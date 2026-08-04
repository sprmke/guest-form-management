/**
 * useImportBatchRows — read preview rows from TanStack Query cache.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import type {
  ImportBatchRowPreview,
  ImportPreviewResult,
  ImportPreviewSummary,
} from '@/features/dashboard/import/types/importBatch';

export const IMPORT_PREVIEW_KEY = ['import-preview'] as const;

const EMPTY_SUMMARY: ImportPreviewSummary = {
  total: 0,
  valid: 0,
  error: 0,
  skipped: 0,
  warning: 0,
};

export function useImportBatchRows(batchId: string | null) {
  const propertyId = usePropertyIdParam();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...IMPORT_PREVIEW_KEY, propertyId, batchId] as const,
    enabled: Boolean(propertyId && batchId),
    queryFn: (): ImportPreviewResult | null => {
      if (!propertyId || !batchId) return null;
      return (
        queryClient.getQueryData<ImportPreviewResult>([
          ...IMPORT_PREVIEW_KEY,
          propertyId,
          batchId,
        ]) ?? null
      );
    },
    staleTime: Infinity,
  });

  const preview = query.data;
  const rows: ImportBatchRowPreview[] = preview?.rows ?? [];
  const summary = preview?.summary ?? EMPTY_SUMMARY;

  return {
    rows,
    summary,
    status: preview?.status ?? null,
    isReady: Boolean(preview?.rows.length),
    updatePreviewCache: (next: ImportPreviewResult) => {
      if (!propertyId || !batchId) return;
      queryClient.setQueryData([...IMPORT_PREVIEW_KEY, propertyId, batchId], next);
    },
    patchRow: (
      rowId: string,
      patch: Partial<ImportBatchRowPreview>,
      nextSummary?: ImportPreviewSummary
    ) => {
      if (!propertyId || !batchId || !preview) return;
      const updated: ImportPreviewResult = {
        ...preview,
        summary: nextSummary ?? preview.summary,
        rows: preview.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      };
      queryClient.setQueryData([...IMPORT_PREVIEW_KEY, propertyId, batchId], updated);
    },
    patchSummary: (nextSummary: ImportPreviewSummary) => {
      if (!propertyId || !batchId || !preview) return;
      queryClient.setQueryData([...IMPORT_PREVIEW_KEY, propertyId, batchId], {
        ...preview,
        summary: nextSummary,
      });
    },
  };
}
