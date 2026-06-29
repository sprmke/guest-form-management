import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

type CalendarEventDatesBackfillInput = {
  dryRun?: boolean;
  limit?: number;
  bookingId?: string;
  /** When true, only stays with check-out today or later (Manila). Default false includes completed stays. */
  futureStaysOnly?: boolean;
};

export type CalendarEventDatesBackfillPreviewItem = {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  newEndDateTime: string;
};

export type CalendarEventDatesBackfillSummary = {
  total: number;
  updated: number;
  created: number;
  skipped: number;
  deletedDuplicates: number;
  failed: number;
};

export type CalendarEventDatesBackfillResult = {
  success: boolean;
  dryRun?: boolean;
  count?: number;
  preview?: CalendarEventDatesBackfillPreviewItem[];
  summary?: CalendarEventDatesBackfillSummary;
  message?: string;
  filter?: {
    multiNightOnly: boolean;
    futureStaysOnly: boolean;
  };
};

export function useCalendarEventDatesBackfill() {
  return useMutation({
    mutationFn: async (
      input: CalendarEventDatesBackfillInput = {},
    ): Promise<CalendarEventDatesBackfillResult> => {
      const jwt = await getAdminJwt();
      const res = await fetch(
        `${FUNCTIONS_URL}/backfill-calendar-event-dates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify(input),
        },
      );

      const json = (await res.json()) as CalendarEventDatesBackfillResult & {
        error?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json;
    },
  });
}
