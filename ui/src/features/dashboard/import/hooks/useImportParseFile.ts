/**
 * useImportParseFile — upload CSV to import-parse-file edge function.
 */

import { useMutation } from '@tanstack/react-query';

import type { ImportParseResult } from '@/features/dashboard/import/types/importParse';
import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { supabase } from '@/lib/supabase/client';

async function getSessionJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again, then try uploading.');
  return token;
}

function friendlyParseError(raw: string | undefined, status: number): string {
  const message = (raw ?? '').trim();
  const lower = message.toLowerCase();
  if (lower.includes('bucket') || lower.includes('storage')) {
    return 'Upload storage is not ready. Ask your admin to apply the latest database migrations, then try again.';
  }
  if (lower.includes('too many') || (lower.includes('row') && lower.includes('limit'))) {
    return message || 'This file has too many rows. Split it and try again.';
  }
  if (lower.includes('csv') || lower.includes('parse')) {
    return message || 'We could not read that CSV. Check the file and try again.';
  }
  if (status === 401 || status === 403) {
    return 'You do not have permission to import for this property.';
  }
  if (status >= 500) {
    return 'Something went wrong on our side. Please try again in a moment.';
  }
  return message || `Upload failed (error ${status}). Please try again.`;
}

export function useImportParseFile() {
  const propertyId = usePropertyIdParam();

  return useMutation({
    mutationFn: async (file: File): Promise<ImportParseResult> => {
      if (!propertyId) throw new Error('Open this page from a property to import bookings.');

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
        data?: Partial<ImportParseResult> & Omit<ImportParseResult, 'fileName'>;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(friendlyParseError(json.error, res.status));
      }

      // Older deploys of import-parse-file omit fileName.
      return { ...json.data, fileName: json.data.fileName || file.name };
    },
  });
}
