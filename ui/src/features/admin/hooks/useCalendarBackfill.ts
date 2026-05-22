import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';

export function useCalendarBackfill() {
  return useMutation({
    mutationFn: async (input: {
      dryRun?: boolean;
      onlyCompleted?: boolean;
      bookingIds?: string[];
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const jwt = session.session?.access_token;
      if (!jwt) throw new Error('Not signed in');

      const res = await fetch(`${FUNCTIONS_URL}/calendar-backfill-from-db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json as {
        dryRun: boolean;
        summary: {
          scanned: number;
          needsRepair?: number;
          alreadyOk?: number;
          notFound?: number;
          synced?: number;
          skippedOk?: number;
          failed?: number;
        };
      };
    },
  });
}
