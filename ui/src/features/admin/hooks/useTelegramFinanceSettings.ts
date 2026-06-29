import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type FinanceTimeSlot = { hour: number; minute: number };

export type TelegramFinanceSettingsDto = {
  enabled: boolean;
  defaultReminderTemplate: string;
  dailyCheckTimeManila: FinanceTimeSlot;
  dailyCheckUtcCronPreview: string;
  placeholdersReference: string[];
};

type TelegramFinanceSettingsPatch = Partial<
  Pick<
    TelegramFinanceSettingsDto,
    "enabled" | "defaultReminderTemplate" | "dailyCheckTimeManila"
  >
>;

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No active session — please sign in");
  return token;
}

export function useTelegramFinanceSettings() {
  return useQuery({
    queryKey: ["telegram-finance-settings"],
    queryFn: async (): Promise<TelegramFinanceSettingsDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-finance-settings`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: TelegramFinanceSettingsDto;
      };
      if (!json.success || !json.data) {
        throw new Error(
          json.error ?? "Failed to load finance Telegram settings",
        );
      }
      return json.data;
    },
  });
}

export function useUpdateTelegramFinanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TelegramFinanceSettingsPatch) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-finance-settings`, {
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
        data?: TelegramFinanceSettingsDto;
        cronSync?: { ok?: boolean; error?: string };
      };
      if (!json.success || !json.data) {
        throw new Error(
          json.error ?? "Failed to save finance Telegram settings",
        );
      }
      return { data: json.data, cronSync: json.cronSync };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["telegram-finance-settings"] });
    },
  });
}

type TelegramFinanceTestAction =
  | "verify_finance_telegram_env"
  | "send_test_due_reminders"
  | "send_draft_preview";

export function useTelegramFinanceTestSend() {
  return useMutation({
    mutationFn: async (input: {
      action: TelegramFinanceTestAction;
      text?: string;
    }) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/telegram-finance-settings`, {
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
