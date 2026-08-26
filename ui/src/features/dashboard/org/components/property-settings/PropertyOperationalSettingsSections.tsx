import { useState } from 'react';

import { ClipboardList, Globe, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { BuildingFormsSettingsSection } from '@/features/dashboard/bookings/components/BuildingFormsSettingsSection';
import { PropertyIntegrationsPanel } from '@/features/dashboard/bookings/components/PropertyIntegrationsPanel';
import {
  operationalFormIsDirty,
  type AppSettingsDto,
  type AppSettingsFormValues,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import { useUploadAppSettingsAsset } from '@/features/dashboard/bookings/hooks/useUploadAppSettingsAsset';
import type { VoiceReceptionistFormValues } from '@/features/dashboard/bookings/hooks/useVoiceReceptionistSettings';
import { storedAppSettingsMediaUrl } from '@/features/dashboard/lib/storedMediaDisplay';
import { PropertyEmailAutomationsSection } from '@/features/dashboard/org/components/property-settings/PropertyEmailAutomationsSection';
import { PropertyPaymentMethodsSection } from '@/features/dashboard/org/components/property-settings/PropertyPaymentMethodsSection';
import { PropertySettingsSectionAlert } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { PropertyVoiceReceptionistSection } from '@/features/dashboard/org/components/property-settings/PropertyVoiceReceptionistSection';
import {
  setPaymentMethodQrUrl,
  syncLegacyPaymentFieldsFromMethods,
  type PropertyPaymentMethod,
} from '@/features/dashboard/org/lib/paymentMethods';
import type { PropertyAutomationToggleKey } from '@/features/dashboard/org/lib/propertyEmailAutomation';
import type { PropertySettingsSectionId } from '@/features/dashboard/org/lib/propertySettingsCompletion';
import { propertySettingsSectionBanner } from '@/features/dashboard/org/lib/propertySettingsFieldError';

import { friendlyToastError } from '@/lib/feedback/toastMessages';

type Props = {
  data: AppSettingsDto;
  draft: AppSettingsFormValues;
  residenceName: string;
  towerUnitLabel: string;
  disabled?: boolean;
  onChange: <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K]
  ) => void;
  onAutomationToggleChange: (key: PropertyAutomationToggleKey, value: boolean) => void;
  resolveFieldError: (fieldId: string) => string | null;
  markFieldInteracted: (fieldId: string) => void;
  sectionMessages?: Partial<Record<PropertySettingsSectionId, string>>;
  showVoiceReceptionist?: boolean;
  voiceReceptionist: {
    draft: VoiceReceptionistFormValues | null;
    propertyName?: string;
    availableVoices: readonly string[];
    isLoading: boolean;
    isError: boolean;
    errorMessage: string | null;
    onChange: <K extends keyof VoiceReceptionistFormValues>(
      key: K,
      value: VoiceReceptionistFormValues[K]
    ) => void;
  };
};

export function PropertyOperationalSettingsSections({
  data,
  draft,
  residenceName,
  towerUnitLabel,
  disabled = false,
  onChange,
  onAutomationToggleChange,
  resolveFieldError,
  markFieldInteracted,
  sectionMessages = {},
  showVoiceReceptionist = true,
  voiceReceptionist,
}: Props) {
  const uploadMut = useUploadAppSettingsAsset();
  const [qrUploadingMethodId, setQrUploadingMethodId] = useState<string | null>(null);

  const setPaymentMethods = (methods: PropertyPaymentMethod[]) => {
    const legacy = syncLegacyPaymentFieldsFromMethods(methods);
    onChange('paymentMethods', methods);
    onChange('paymentProvider', legacy.paymentProvider);
    onChange('gcashName', legacy.gcashName);
    onChange('gcashNumber', legacy.gcashNumber);
  };

  const handleMethodQrFile = async (methodId: string, file: File) => {
    markFieldInteracted(`payment-method-${methodId}-qr`);
    setQrUploadingMethodId(methodId);
    try {
      const uploaded = await uploadMut.mutateAsync({ assetType: 'gcash_qr', file });
      setPaymentMethods(setPaymentMethodQrUrl(draft.paymentMethods, methodId, uploaded.url));
    } catch (err) {
      toast.error(friendlyToastError(err, 'Upload failed'));
    } finally {
      setQrUploadingMethodId(null);
    }
  };

  return (
    <>
      <AdminSection
        id="payment"
        title="Payment"
        icon={Wallet}
        description="How guests pay down payment and balance."
      >
        <PropertyPaymentMethodsSection
          data={data}
          methods={draft.paymentMethods}
          disabled={disabled}
          resolveFieldError={resolveFieldError}
          markFieldInteracted={markFieldInteracted}
          onChange={setPaymentMethods}
          onMethodQrFile={(methodId, file) => void handleMethodQrFile(methodId, file)}
          qrUploadingMethodId={qrUploadingMethodId}
        />
      </AdminSection>

      <AdminSection
        id="building-forms"
        title="Building Forms"
        icon={ClipboardList}
        description="Owner and signature details for GAF and pet PDFs."
      >
        <BuildingFormsSettingsSection
          values={{
            gafUnitOwner: draft.gafUnitOwner,
            gafTowerAndUnitNumber: draft.gafTowerAndUnitNumber,
            gafGuestsOnsiteContactPerson: draft.gafGuestsOnsiteContactPerson,
            gafOwnerContactNumber: draft.gafOwnerContactNumber,
          }}
          towerUnitLabel={towerUnitLabel}
          signatureImageUrl={storedAppSettingsMediaUrl(
            data.gafUnitOwnerSignatureUrl,
            data.fieldSources?.gafUnitOwnerSignatureUrl
          )}
          disabled={disabled}
          onChange={(key, value) => {
            const fieldIds: Partial<Record<keyof AppSettingsFormValues, string>> = {
              gafUnitOwner: 'gaf-unit-owner',
              gafGuestsOnsiteContactPerson: 'gaf-onsite-contact',
              gafOwnerContactNumber: 'gaf-owner-phone',
            };
            const fieldId = fieldIds[key];
            if (fieldId) markFieldInteracted(fieldId);
            onChange(key, value);
          }}
          onSignatureInteracted={() => markFieldInteracted('gaf-owner-signature')}
          resolveFieldError={resolveFieldError}
        />
      </AdminSection>

      <PropertyEmailAutomationsSection
        draft={draft}
        residenceName={residenceName}
        disabled={disabled}
        resolveFieldError={resolveFieldError}
        markFieldInteracted={markFieldInteracted}
        onChange={onChange}
        onAutomationToggleChange={onAutomationToggleChange}
      />

      <AdminSection
        id="integrations"
        title="Integrations"
        icon={Globe}
        description="Telegram and connected service status."
      >
        {propertySettingsSectionBanner('integrations', sectionMessages) ? (
          <PropertySettingsSectionAlert
            message={propertySettingsSectionBanner('integrations', sectionMessages)!}
          />
        ) : null}
        <PropertyIntegrationsPanel
          status={data.propertyIntegrations}
          aiKeys={{
            primaryKeysConfigured: data.platformSecrets.geminiApiKeyConfigured,
            fallbackKeyConfigured: data.platformSecrets.groqApiKeyConfigured,
          }}
        />
      </AdminSection>

      {showVoiceReceptionist ? (
        <PropertyVoiceReceptionistSection
          draft={voiceReceptionist.draft}
          propertyName={voiceReceptionist.propertyName}
          availableVoices={voiceReceptionist.availableVoices}
          disabled={disabled}
          isLoading={voiceReceptionist.isLoading}
          isError={voiceReceptionist.isError}
          errorMessage={voiceReceptionist.errorMessage}
          onChange={voiceReceptionist.onChange}
        />
      ) : null}
    </>
  );
}

export function operationalSettingsDraftIsDirty(
  draft: AppSettingsFormValues,
  baseline: AppSettingsFormValues,
  inheritedBrandColor: string
): boolean {
  return operationalFormIsDirty(draft, baseline, inheritedBrandColor);
}
