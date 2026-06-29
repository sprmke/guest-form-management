import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type AppSettingsFieldSource = "db" | "env" | "default";

export type AppSettingsSecretsStatus = {
  resendApiKeyConfigured: boolean;
  googleServiceAccountConfigured: boolean;
  googleCalendarIdConfigured: boolean;
  googleSpreadsheetIdConfigured: boolean;
  telegramBotTokenConfigured: boolean;
  telegramChatIdConfigured: boolean;
  telegramStaffChatIdConfigured: boolean;
  telegramAdminChatIdConfigured: boolean;
  telegramFinanceChatIdConfigured: boolean;
  telegramMaintenanceChatIdConfigured: boolean;
  gmailEncryptionKeyConfigured: boolean;
  gmailWebClientConfigured: boolean;
  geminiApiKeyConfigured: boolean;
  groqApiKeyConfigured: boolean;
};

export type AppSettingsDto = {
  emailTo: string;
  emailReplyTo: string;
  parkingOwnerEmails: string[];
  sdRefundCronEmailLeadMinutes: number;
  sdRefundCronMaxCheckoutAgeDays: number;
  publicGuestAppOrigin: string;
  facebookReviewsUrl: string;
  emailLogoUrl: string;
  defaultParkingRateGuest: number;
  gcashName: string;
  gcashNumber: string;
  gcashQrImageUrl: string;
  gafUnitOwner: string;
  gafTowerAndUnitNumber: string;
  gafGuestsOnsiteContactPerson: string;
  gafOwnerContactNumber: string;
  gafUnitOwnerSignatureUrl: string;
  updatedAt: string | null;
  fieldSources: Record<
    | "emailTo"
    | "emailReplyTo"
    | "parkingOwnerEmails"
    | "sdRefundCronEmailLeadMinutes"
    | "sdRefundCronMaxCheckoutAgeDays"
    | "publicGuestAppOrigin"
    | "facebookReviewsUrl"
    | "emailLogoUrl"
    | "defaultParkingRateGuest"
    | "gcashName"
    | "gcashNumber"
    | "gcashQrImageUrl"
    | "gafUnitOwner"
    | "gafTowerAndUnitNumber"
    | "gafGuestsOnsiteContactPerson"
    | "gafOwnerContactNumber"
    | "gafUnitOwnerSignatureUrl",
    AppSettingsFieldSource
  >;
  secretsStatus: AppSettingsSecretsStatus;
};

export type AppSettingsFormValues = {
  emailTo: string;
  emailReplyTo: string;
  parkingOwnerEmails: string;
  sdRefundCronEmailLeadHours: number;
  sdRefundCronMaxCheckoutAgeDays: number;
  publicGuestAppOrigin: string;
  facebookReviewsUrl: string;
  defaultParkingRateGuest: number;
  gcashName: string;
  gcashNumber: string;
  gafUnitOwner: string;
  gafTowerAndUnitNumber: string;
  gafGuestsOnsiteContactPerson: string;
  gafOwnerContactNumber: string;
};

/** DB/env store minutes; Settings UI uses hours (max 168 h = 10080 min). */
export const SD_REFUND_CRON_EMAIL_LEAD_MAX_HOURS = 168;

function sdRefundLeadMinutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function appSettingsToFormValues(
  data: AppSettingsDto,
): AppSettingsFormValues {
  return {
    emailTo: data.emailTo,
    emailReplyTo: data.emailReplyTo,
    parkingOwnerEmails: data.parkingOwnerEmails.join(", "),
    sdRefundCronEmailLeadHours: sdRefundLeadMinutesToHours(
      data.sdRefundCronEmailLeadMinutes,
    ),
    sdRefundCronMaxCheckoutAgeDays: data.sdRefundCronMaxCheckoutAgeDays,
    publicGuestAppOrigin: data.publicGuestAppOrigin,
    facebookReviewsUrl: data.facebookReviewsUrl,
    defaultParkingRateGuest: data.defaultParkingRateGuest,
    gcashName: data.gcashName,
    gcashNumber: data.gcashNumber,
    gafUnitOwner: data.gafUnitOwner,
    gafTowerAndUnitNumber: data.gafTowerAndUnitNumber,
    gafGuestsOnsiteContactPerson: data.gafGuestsOnsiteContactPerson,
    gafOwnerContactNumber: data.gafOwnerContactNumber,
  };
}

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No active session — please sign in");
  return token;
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<AppSettingsDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/app-settings`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: AppSettingsDto;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? "Failed to load app settings");
      }
      return json.data;
    },
  });
}

export function useUpdateAppSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: AppSettingsFormValues) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/app-settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailTo: values.emailTo,
          emailReplyTo: values.emailReplyTo,
          parkingOwnerEmails: values.parkingOwnerEmails,
          sdRefundCronEmailLeadHours: values.sdRefundCronEmailLeadHours,
          sdRefundCronMaxCheckoutAgeDays: values.sdRefundCronMaxCheckoutAgeDays,
          publicGuestAppOrigin: values.publicGuestAppOrigin,
          facebookReviewsUrl: values.facebookReviewsUrl,
          defaultParkingRateGuest: values.defaultParkingRateGuest,
          gcashName: values.gcashName,
          gcashNumber: values.gcashNumber,
          gafUnitOwner: values.gafUnitOwner,
          gafTowerAndUnitNumber: values.gafTowerAndUnitNumber,
          gafGuestsOnsiteContactPerson: values.gafGuestsOnsiteContactPerson,
          gafOwnerContactNumber: values.gafOwnerContactNumber,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: AppSettingsDto;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `Save failed (${res.status})`);
      }
      return json.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["app-settings"], data);
      qc.invalidateQueries({ queryKey: ["guest-payment-info"] });
    },
  });
}

export type AppSettingsImageField =
  | "gcashQrImageUrl"
  | "emailLogoUrl"
  | "gafUnitOwnerSignatureUrl";

export function useClearAppSettingsImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (field: AppSettingsImageField) => {
      const jwt = await getAdminJwt();
      const res = await fetch(`${FUNCTIONS_URL}/app-settings`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: "" }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: AppSettingsDto;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `Reset failed (${res.status})`);
      }
      return json.data;
    },
    onSuccess: (data, field) => {
      qc.setQueryData(["app-settings"], data);
      if (field === "gcashQrImageUrl") {
        qc.invalidateQueries({ queryKey: ["guest-payment-info"] });
      }
    },
  });
}
