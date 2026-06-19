import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type MaintenanceTimeSlot = { hour: number; minute: number };

export type TelegramMaintenanceSettingsDto = {
  enabled: boolean;
  defaultReminderTemplate: string;
  dailyCheckTimeManila: MaintenanceTimeSlot;
  dailyCheckUtcCronPreview: string;
  placeholdersReference: string[];
};

export type TelegramMaintenanceSettingsPatch = Partial<
  Pick<
    TelegramMaintenanceSettingsDto,
    "enabled" | "defaultReminderTemplate" | "dailyCheckTimeManila"
  >
>;

export type MaintenanceEnvVerifyDto = {
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
  if (!token) throw new Error("No active session — please sign in");
  return token;
}

export function useTelegramMaintenanceSettings() {
  return useQuery({
    queryKey: ["telegram-maintenance-settings"],
    queryFn: async (): Promise<TelegramMaintenanceSettingsDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-maintenance-settings`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: TelegramMaintenanceSettingsDto;
      };
      if (!json.success || !json.data) {
        throw new Error(
          json.error ?? "Failed to load maintenance Telegram settings",
        );
      }
      return json.data;
    },
  });
}

export function useUpdateTelegramMaintenanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TelegramMaintenanceSettingsPatch) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-maintenance-settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: TelegramMaintenanceSettingsDto;
        cronSync?: { ok?: boolean; error?: string };
      };
      if (!json.success || !json.data) {
        throw new Error(
          json.error ?? "Failed to save maintenance Telegram settings",
        );
      }
      return { data: json.data, cronSync: json.cronSync };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["telegram-maintenance-settings"] });
    },
  });
}

export type TelegramMaintenanceTestAction =
  | "verify_maintenance_telegram_env"
  | "send_test_due_reminders"
  | "send_draft_preview";

export function useTelegramMaintenanceTestSend() {
  return useMutation({
    mutationFn: async (input: {
      action: TelegramMaintenanceTestAction;
      text?: string;
    }) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-maintenance-settings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok && !json.success) {
        throw new Error(String(json.error ?? "Test send failed"));
      }
      return json;
    },
  });
}
