import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import {
  automationTogglesEqual,
  DEFAULT_PROPERTY_AUTOMATION_TOGGLES,
  type PropertyAutomationToggles,
} from '@/features/dashboard/org/lib/propertyEmailAutomation';
import type { AppSettingsPatchBody } from '@/features/dashboard/org/lib/propertySettingsSave';
import {
  normalizePaymentMethodsDraft,
  paymentMethodsEqual,
  syncLegacyPaymentFieldsFromMethods,
  type PropertyPaymentMethod,
} from '@/features/dashboard/org/lib/paymentMethods';
import {
  externalReviewsEqual,
  normalizeExternalReviewsDraft,
  type PropertyExternalReview,
  type SuperhostStatus,
} from '@/features/dashboard/org/lib/propertyExternalReviews';

import { propertyBrandColorFormValue, propertyBrandColorsEquivalent } from '@/lib/theme/brandColor';
import { supabase } from '@/lib/supabase/client';

export type AppSettingsFieldSource = 'db' | 'default';

export type IntegrationFieldSource = 'db' | 'none';

export type IntegrationFieldStatus = {
  configured: boolean;
  source: IntegrationFieldSource;
};

export type PropertyTelegramCredentialsStatus = {
  tokenConfigured: boolean;
  chatIdConfigured: boolean;
  tokenSource: IntegrationFieldSource;
  chatIdSource: IntegrationFieldSource;
  secretsEncryptionConfigured: boolean;
  /** Decrypted values — returned by per-module settings GET/PATCH only. */
  botToken?: string | null;
  chatId?: string | null;
};

export type PropertyGmailIntegrationStatus = {
  connected: boolean;
  source: 'db' | 'none';
  googleAccountEmail: string | null;
};

export type PropertyIntegrationStatus = {
  googleCalendar: IntegrationFieldStatus;
  googleSpreadsheet: IntegrationFieldStatus;
  gmail: PropertyGmailIntegrationStatus;
  telegram: {
    marketing: PropertyTelegramCredentialsStatus;
    staff: PropertyTelegramCredentialsStatus;
    admin: PropertyTelegramCredentialsStatus;
    finance: PropertyTelegramCredentialsStatus;
    maintenance: PropertyTelegramCredentialsStatus;
    chat?: PropertyTelegramCredentialsStatus;
  };
};

export type PlatformSecretsStatus = {
  resendApiKeyConfigured: boolean;
  googleServiceAccountConfigured: boolean;
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
  brandColorStored: string;
  inheritedBrandColor?: string;
  resolvedBrandColor: string;
  facebookPageUrl: string;
  airbnbUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  defaultParkingRateGuest: number;
  gcashName: string;
  gcashNumber: string;
  gcashQrImageUrl: string;
  paymentProvider: string;
  paymentMethods: PropertyPaymentMethod[];
  gafUnitOwner: string;
  gafTowerAndUnitNumber: string;
  gafGuestsOnsiteContactPerson: string;
  gafOwnerContactNumber: string;
  gafUnitOwnerSignatureUrl: string;
  automationToggles: PropertyAutomationToggles;
  updatedAt: string | null;
  fieldSources: Record<
    | 'emailTo'
    | 'emailReplyTo'
    | 'parkingOwnerEmails'
    | 'sdRefundCronEmailLeadMinutes'
    | 'sdRefundCronMaxCheckoutAgeDays'
    | 'publicGuestAppOrigin'
    | 'facebookReviewsUrl'
    | 'emailLogoUrl'
    | 'brandColorStored'
    | 'facebookPageUrl'
    | 'airbnbUrl'
    | 'instagramUrl'
    | 'tiktokUrl'
    | 'defaultParkingRateGuest'
    | 'gcashName'
    | 'gcashNumber'
    | 'gcashQrImageUrl'
    | 'paymentProvider'
    | 'gafUnitOwner'
    | 'gafTowerAndUnitNumber'
    | 'gafGuestsOnsiteContactPerson'
    | 'gafOwnerContactNumber'
    | 'gafUnitOwnerSignatureUrl',
    AppSettingsFieldSource
  >;
  propertyIntegrations: PropertyIntegrationStatus;
  platformSecrets: PlatformSecretsStatus;
  externalReviews: PropertyExternalReview[];
  superhostVerificationUrl: string;
  superhostProofImageUrl: string;
  superhostStatus: SuperhostStatus;
};

export type AppSettingsFormValues = {
  emailTo: string;
  emailReplyTo: string;
  parkingOwnerEmails: string;
  sdRefundCronEmailLeadHours: number;
  sdRefundCronMaxCheckoutAgeDays: number;
  defaultParkingRateGuest: number;
  automationToggles: PropertyAutomationToggles;
  paymentMethods: PropertyPaymentMethod[];
  paymentProvider: string;
  gcashName: string;
  gcashNumber: string;
  gafUnitOwner: string;
  gafTowerAndUnitNumber: string;
  gafGuestsOnsiteContactPerson: string;
  gafOwnerContactNumber: string;
  brandColor: string;
  facebookPageUrl: string;
  airbnbUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  externalReviews: PropertyExternalReview[];
  superhostVerificationUrl: string;
};

function sdRefundLeadMinutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function appSettingsToFormValues(data: AppSettingsDto): AppSettingsFormValues {
  return {
    emailTo: data.emailTo,
    emailReplyTo: data.emailReplyTo,
    parkingOwnerEmails: data.parkingOwnerEmails.join(', '),
    sdRefundCronEmailLeadHours: sdRefundLeadMinutesToHours(data.sdRefundCronEmailLeadMinutes),
    sdRefundCronMaxCheckoutAgeDays: data.sdRefundCronMaxCheckoutAgeDays,
    defaultParkingRateGuest: data.defaultParkingRateGuest,
    automationToggles: {
      ...(data.automationToggles ?? DEFAULT_PROPERTY_AUTOMATION_TOGGLES),
    },
    paymentMethods: normalizePaymentMethodsDraft(data.paymentMethods, {
      paymentProvider: data.paymentProvider,
      gcashName: data.gcashName,
      gcashNumber: data.gcashNumber,
      gcashQrImageUrl: data.gcashQrImageUrl,
    }),
    ...syncLegacyPaymentFieldsFromMethods(
      normalizePaymentMethodsDraft(data.paymentMethods, {
        paymentProvider: data.paymentProvider,
        gcashName: data.gcashName,
        gcashNumber: data.gcashNumber,
        gcashQrImageUrl: data.gcashQrImageUrl,
      })
    ),
    gafUnitOwner: data.gafUnitOwner,
    gafTowerAndUnitNumber: data.gafTowerAndUnitNumber,
    gafGuestsOnsiteContactPerson: data.gafGuestsOnsiteContactPerson,
    gafOwnerContactNumber: data.gafOwnerContactNumber,
    brandColor: propertyBrandColorFormValue(
      data.brandColorStored,
      data.inheritedBrandColor ?? data.resolvedBrandColor
    ),
    facebookPageUrl: data.facebookPageUrl,
    airbnbUrl: data.airbnbUrl,
    instagramUrl: data.instagramUrl,
    tiktokUrl: data.tiktokUrl,
    externalReviews: normalizeExternalReviewsDraft(data.externalReviews),
    superhostVerificationUrl: data.superhostVerificationUrl,
  };
}

async function getAdminJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No active session — please sign in');
  return token;
}

function appSettingsUrl(propertyId: string | null): string {
  return scopedFunctionsUrl('/app-settings', propertyId);
}

export function useAppSettings() {
  const propertyId = usePropertyIdParam();
  return useQuery({
    queryKey: ['app-settings', propertyId],
    queryFn: async (): Promise<AppSettingsDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(appSettingsUrl(propertyId), {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: AppSettingsDto;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Failed to load app settings');
      }
      return json.data;
    },
    enabled: Boolean(propertyId),
  });
}

export function useUpdateAppSettings() {
  const qc = useQueryClient();
  const propertyId = usePropertyIdParam();
  return useMutation({
    mutationFn: async (patch: AppSettingsPatchBody): Promise<AppSettingsDto> => {
      const jwt = await getAdminJwt();
      const res = await fetch(appSettingsUrl(propertyId), {
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
        data?: AppSettingsDto;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `Save failed (${res.status})`);
      }
      return json.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['app-settings', propertyId], data);
      qc.invalidateQueries({ queryKey: ['guest-payment-info'] });
    },
  });
}

export function operationalFormIsDirty(
  draft: AppSettingsFormValues,
  baseline: AppSettingsFormValues,
  inheritedBrandColor: string
): boolean {
  return (
    draft.emailReplyTo.trim() !== baseline.emailReplyTo.trim() ||
    draft.parkingOwnerEmails.trim() !== baseline.parkingOwnerEmails.trim() ||
    draft.sdRefundCronEmailLeadHours !== baseline.sdRefundCronEmailLeadHours ||
    draft.sdRefundCronMaxCheckoutAgeDays !== baseline.sdRefundCronMaxCheckoutAgeDays ||
    !automationTogglesEqual(draft.automationToggles, baseline.automationToggles) ||
    !paymentMethodsEqual(draft.paymentMethods, baseline.paymentMethods) ||
    draft.gafUnitOwner.trim() !== baseline.gafUnitOwner.trim() ||
    draft.gafTowerAndUnitNumber.trim() !== baseline.gafTowerAndUnitNumber.trim() ||
    draft.gafGuestsOnsiteContactPerson.trim() !== baseline.gafGuestsOnsiteContactPerson.trim() ||
    draft.gafOwnerContactNumber.trim() !== baseline.gafOwnerContactNumber.trim() ||
    !propertyBrandColorsEquivalent(draft.brandColor, baseline.brandColor, inheritedBrandColor) ||
    draft.facebookPageUrl.trim() !== baseline.facebookPageUrl.trim() ||
    draft.airbnbUrl.trim() !== baseline.airbnbUrl.trim() ||
    draft.instagramUrl.trim() !== baseline.instagramUrl.trim() ||
    draft.tiktokUrl.trim() !== baseline.tiktokUrl.trim() ||
    !externalReviewsEqual(draft.externalReviews, baseline.externalReviews) ||
    draft.superhostVerificationUrl.trim() !== baseline.superhostVerificationUrl.trim()
  );
}

export type AppSettingsImageField =
  'gcashQrImageUrl' | 'gafUnitOwnerSignatureUrl' | 'superhostProofImageUrl';

export function useClearAppSettingsImage() {
  const qc = useQueryClient();
  const propertyId = usePropertyIdParam();
  return useMutation({
    mutationFn: async (field: AppSettingsImageField) => {
      const jwt = await getAdminJwt();
      const res = await fetch(appSettingsUrl(propertyId), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: '' }),
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
      qc.setQueryData(['app-settings', propertyId], data);
      if (field === 'gcashQrImageUrl') {
        qc.invalidateQueries({ queryKey: ['guest-payment-info'] });
      }
    },
  });
}
