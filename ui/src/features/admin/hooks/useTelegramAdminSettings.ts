import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type AdminScenarioMeta = {
  id: string;
  label: string;
  trigger: string;
  type: 'event' | 'hourly';
};

export type TelegramAdminSettingsDto = {
  enabled: boolean;
  notifyOnNewBooking: boolean;
  notifyOnSdFormSubmitted: boolean;
  notifyOnBalanceReceiptUploaded: boolean;
  notifyPendingDocsHourly: boolean;
  notifyBalanceReceiptHourly: boolean;
  notifySdRefundPendingHourly: boolean;
  newBookingTemplate: string;
  pendingDocsTemplate: string;
  balanceReceiptTemplate: string;
  balanceReceiptUploadedTemplate: string;
  sdFormSubmittedTemplate: string;
  sdRefundPendingTemplate: string;
  hourlyUtcCronPreview: string;
  placeholdersReference: string[];
  scenarios: AdminScenarioMeta[];
};

export type TelegramAdminSettingsPatch = Partial<
  Pick<
    TelegramAdminSettingsDto,
    | 'enabled'
    | 'notifyOnNewBooking'
    | 'notifyOnSdFormSubmitted'
    | 'notifyOnBalanceReceiptUploaded'
    | 'notifyPendingDocsHourly'
    | 'notifyBalanceReceiptHourly'
    | 'notifySdRefundPendingHourly'
    | 'newBookingTemplate'
    | 'pendingDocsTemplate'
    | 'balanceReceiptTemplate'
    | 'balanceReceiptUploadedTemplate'
    | 'sdFormSubmittedTemplate'
    | 'sdRefundPendingTemplate'
  >
> & { resyncHourlyCron?: boolean };

export type AdminEnvVerifyDto = {
  credentials: {
    tokenConfigured: boolean;
    chatIdConfigured: boolean;
    normalizedChatId?: string;
    normalizeError?: string;
  };
  getMe: { ok: boolean; username?: string; error?: string };
  getChat: { ok: boolean; type?: string; title?: string; error?: string };
};

export type AdminDraftScenario =
  | 'new_booking'
  | 'pending_docs'
  | 'balance_receipt'
  | 'balance_receipt_uploaded'
  | 'sd_form_submitted'
  | 'sd_refund_pending';

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

export function useTelegramAdminSettings() {
  return useQuery({
    queryKey: ['telegram-admin-settings'],
    queryFn: async (): Promise<TelegramAdminSettingsDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-admin-settings`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: TelegramAdminSettingsDto;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Failed to load operations settings');
      }
      return json.data;
    },
  });
}

export type TelegramAdminTestAction =
  | 'verify_admin_telegram_env'
  | 'send_draft_preview';

export type TelegramAdminTestPayload = {
  action: TelegramAdminTestAction;
  text?: string;
  scenario?: AdminDraftScenario;
};

export function useTelegramAdminTestSend() {
  return useMutation({
    mutationFn: async (payload: TelegramAdminTestPayload) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-admin-settings`, {
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
        verify?: AdminEnvVerifyDto;
      };
      if (!res.ok || json.success === false) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      return json;
    },
  });
}

export type AdminCronSyncResult = {
  ok?: boolean;
  error?: string;
  cronExpr?: string;
};

export function useUpdateTelegramAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: TelegramAdminSettingsPatch,
    ): Promise<{
      data: TelegramAdminSettingsDto;
      cronSync?: AdminCronSyncResult;
    }> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-admin-settings`, {
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
        data?: TelegramAdminSettingsDto;
        cronSync?: AdminCronSyncResult;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Failed to save');
      }
      return { data: json.data, cronSync: json.cronSync };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['telegram-admin-settings'] });
    },
  });
}
