import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type ManilaReminderSlot = { hour: number; minute: number };

export type TelegramMarketingSettingsDto = {
  enabled: boolean;
  notifyOnNewBooking: boolean;
  notifyOnCancellation: boolean;
  urgencyDaysThreshold: number;
  newBookingDatesLimit: number;
  dailyReminderTimesManila: ManilaReminderSlot[];
  /** pg_cron daily expressions derived server-side (`minute hour * * *`, UTC). */
  dailyReminderUtcCronPreview: string[];
  dailyDefaultTemplate: string;
  dailyUrgencyTemplate: string;
  newBookingTemplate: string;
  cancellationTemplate: string;
  placeholdersReference: string[];
};

export type TelegramMarketingSettingsPatch = Partial<
  Pick<
    TelegramMarketingSettingsDto,
    | 'enabled'
    | 'notifyOnNewBooking'
    | 'notifyOnCancellation'
    | 'urgencyDaysThreshold'
    | 'newBookingDatesLimit'
    | 'dailyReminderTimesManila'
    | 'dailyDefaultTemplate'
    | 'dailyUrgencyTemplate'
    | 'newBookingTemplate'
    | 'cancellationTemplate'
  >
>;

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export function useTelegramMarketingSettings() {
  return useQuery({
    queryKey: ['telegram-marketing-settings'],
    queryFn: async (): Promise<TelegramMarketingSettingsDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-marketing-settings`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: TelegramMarketingSettingsDto;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Failed to load Telegram settings');
      }
      return json.data;
    },
  });
}

export type TelegramMarketingTestAction =
  | 'verify_telegram_env'
  | 'send_test_daily_reminder'
  | 'send_test_new_booking'
  | 'send_test_cancellation'
  | 'send_draft_preview';

export type TelegramEnvVerifyDto = {
  credentials: {
    tokenConfigured: boolean;
    chatIdRawLength: number;
    normalizedChatId?: string;
    normalizeError?: string;
    /** First codepoint of trimmed secret (before normalize). ASCII `-` = 45; U+2212 MINUS = 8722. */
    rawLeadingCodePoint?: number;
    normalizedStartsWithAsciiMinus?: boolean;
  };
  getMe: { ok: boolean; username?: string; error?: string };
  getChat: { ok: boolean; type?: string; title?: string; username?: string; error?: string };
};

export type TelegramMarketingTestPayload = {
  action: TelegramMarketingTestAction;
  text?: string;
  checkInYmd?: string;
  checkOutYmd?: string;
};

export function useTelegramMarketingTestSend() {
  return useMutation({
    mutationFn: async (payload: TelegramMarketingTestPayload) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-marketing-settings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        result?: unknown;
        usedDates?: { checkInYmd: string; checkOutYmd: string };
        sent?: boolean;
        messageCharCount?: number;
        verify?: TelegramEnvVerifyDto;
      };
      if (!res.ok || json.success === false) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      return json;
    },
  });
}

export type TelegramCronSyncResult = {
  ok?: boolean;
  error?: string;
  scheduled?: number;
  jobNamePrefix?: string;
};
export function useUpdateTelegramMarketingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: TelegramMarketingSettingsPatch,
    ): Promise<{
      data: TelegramMarketingSettingsDto;
      cronSync?: TelegramCronSyncResult;
    }> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-marketing-settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: TelegramMarketingSettingsDto;
        cronSync?: TelegramCronSyncResult;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Failed to save');
      }
      return { data: json.data, cronSync: json.cronSync };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['telegram-marketing-settings'] });
    },
  });
}
