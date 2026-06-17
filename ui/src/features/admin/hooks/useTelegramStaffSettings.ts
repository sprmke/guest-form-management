import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type StaffTimeSlot = { hour: number; minute: number };

export type StaffScenarioMeta = {
  id: string;
  label: string;
  trigger: string;
  type: 'scheduled' | 'event';
};

export type TelegramStaffSettingsDto = {
  enabled: boolean;
  notifyOnSameDayCheckin: boolean;
  dailySummaryTemplate: string;
  sameDayCheckinTemplate: string;
  dailySummaryTimeManila: StaffTimeSlot;
  dailySummaryUtcCronPreview: string;
  placeholdersReference: string[];
  scenarios: StaffScenarioMeta[];
};

export type TelegramStaffSettingsPatch = Partial<
  Pick<
    TelegramStaffSettingsDto,
    | 'enabled'
    | 'notifyOnSameDayCheckin'
    | 'dailySummaryTemplate'
    | 'sameDayCheckinTemplate'
    | 'dailySummaryTimeManila'
  >
>;

export type StaffDraftScenario = 'daily_summary' | 'same_day_checkin';

export type StaffEnvVerifyDto = {
  credentials: {
    tokenConfigured: boolean;
    chatIdConfigured: boolean;
    normalizedChatId?: string;
    normalizeError?: string;
  };
  getMe: { ok: boolean; username?: string; error?: string };
  getChat: { ok: boolean; type?: string; title?: string; error?: string };
};

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export function useTelegramStaffSettings() {
  return useQuery({
    queryKey: ['telegram-staff-settings'],
    queryFn: async (): Promise<TelegramStaffSettingsDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-staff-settings`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: TelegramStaffSettingsDto;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Failed to load staff settings');
      }
      return json.data;
    },
  });
}

export type TelegramStaffTestAction =
  | 'verify_staff_telegram_env'
  | 'send_draft_preview';

export type TelegramStaffTestPayload = {
  action: TelegramStaffTestAction;
  text?: string;
  scenario?: StaffDraftScenario;
};

export function useTelegramStaffTestSend() {
  return useMutation({
    mutationFn: async (payload: TelegramStaffTestPayload) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-staff-settings`, {
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
        sent?: boolean;
        messageCharCount?: number;
        previewGuestName?: string;
        todayBookingCount?: number;
        verify?: StaffEnvVerifyDto;
      };
      if (!res.ok || json.success === false) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      return json;
    },
  });
}

export type StaffCronSyncResult = {
  ok?: boolean;
  error?: string;
  cronExpr?: string;
};

export function useUpdateTelegramStaffSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: TelegramStaffSettingsPatch,
    ): Promise<{
      data: TelegramStaffSettingsDto;
      cronSync?: StaffCronSyncResult;
    }> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-staff-settings`, {
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
        data?: TelegramStaffSettingsDto;
        cronSync?: StaffCronSyncResult;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Failed to save');
      }
      return { data: json.data, cronSync: json.cronSync };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['telegram-staff-settings'] });
    },
  });
}
