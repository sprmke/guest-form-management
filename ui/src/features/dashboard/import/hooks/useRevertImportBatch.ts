/**
 * useRevertImportBatch — cancel imported guest_submissions by reverting a committed batch.
 * useRevertDryRun — read-only pre-check (no status changes) to surface warnings before confirm.
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

/** Dry-run response: counts and warnings only, no status changes. */
export type RevertDryRunResult = {
  batchId: string;
  dryRun: true;
  importedCount: number;
  movedCount: number;
  /** Total rows (any status) edited after the batch was committed. */
  modifiedCount: number;
  moved: RevertMovedRow[];
};

export type RevertImportBatchResult = {
  batchId: string;
  dryRun: false;
  status: string;
  cancelled: number;
  /** Rows that were moved out of IMPORTED before revert; not cancelled unless includeMoved=true. */
  moved: RevertMovedRow[];
  failed: Array<{ bookingId: string; reason: string }>;
};

export type RevertImportBatchInput = {
  batchId: string;
  dryRun?: boolean;
  /** Also cancel rows that were manually moved out of IMPORTED into the live workflow. */
  includeMoved?: boolean;
};

async function callRevert(
  propertyId: string,
  input: RevertImportBatchInput
): Promise<RevertDryRunResult | RevertImportBatchResult> {
  const jwt = await getSessionJwt();
  const res = await fetch(scopedFunctionsUrl('/import-revert', propertyId), {
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
    data?: RevertDryRunResult | RevertImportBatchResult;
  };

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }

  return json.data;
}

/** Mutation for the live revert (changes statuses). */
export function useRevertImportBatch() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: async (
      input: Omit<RevertImportBatchInput, 'dryRun'>
    ): Promise<RevertImportBatchResult> => {
      if (!propertyId) throw new Error('Property context is required');
      const result = await callRevert(propertyId, { ...input, dryRun: false });
      return result as RevertImportBatchResult;
    },
  });
}

/** Mutation for the dry-run pre-check (read-only, no status changes). */
export function useRevertDryRun() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: async (batchId: string): Promise<RevertDryRunResult> => {
      if (!propertyId) throw new Error('Property context is required');
      const result = await callRevert(propertyId, { batchId, dryRun: true });
      return result as RevertDryRunResult;
    },
  });
}
