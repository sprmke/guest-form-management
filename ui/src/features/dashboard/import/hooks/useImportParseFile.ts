/**
 * useImportParseFile — upload CSV to import-parse-file edge function.
 */

import { useMutation } from '@tanstack/react-query';

import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import type { ImportParseResult } from '@/features/dashboard/import/types/importParse';

import { supabase } from '@/lib/supabase/client';

async function getSessionJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export function useImportParseFile() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: async (file: File): Promise<ImportParseResult> => {
      if (!propertyId) throw new Error('Property context is required');

      const jwt = await getSessionJwt();
      const body = new FormData();
      body.append('file', file);
      body.append('fileName', file.name);

      const res = await fetch(scopedFunctionsUrl('/import-parse-file', propertyId), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body,
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: ImportParseResult;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      return json.data;
    },
  });
}
