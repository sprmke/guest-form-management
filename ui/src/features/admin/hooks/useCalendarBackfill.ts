import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';

export type CalendarBackfillInput = {
  dryRun?: boolean;
  limit?: number;
  onlyCompleted?: boolean;
  bookingIds?: string[];
  delayMs?: number;
};

export type CalendarBackfillRow = {
  bookingId: string;
  status: string;
  guestName: string;
  checkInTime: string;
  action: string;
  error?: string;
  beforeSummary?: string;
  beforeStart?: string;
  plannedSummary?: string;
};

export type CalendarBackfillResult = {
  success: boolean;
  dryRun: boolean;
  scanned: number;
  summary: {
    patched?: number;
    created?: number;
    notFound?: number;
    failed?: number;
    wouldPatch?: number;
  };
  results: CalendarBackfillRow[];
};

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export function useCalendarBackfill() {
  return useMutation({
    mutationFn: async (input: CalendarBackfillInput): Promise<CalendarBackfillResult> => {
      if (!FUNCTIONS_URL.trim()) {
        throw new Error('VITE_SUPABASE_URL is not configured');
      }

      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/calendar-backfill-from-db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(input),
      });

      const json = (await res.json().catch(() => ({}))) as CalendarBackfillResult & {
        error?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      return json;
    },
  });
}
