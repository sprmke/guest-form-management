import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  AlertTriangle,
  Globe,
  Home,
  Image as ImageIcon,
  Info,
  MapPin,
  Save,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAdminBrandColorPreview } from '@/features/dashboard/bookings/components/AdminBrandTheme';
import {
  AdminSection,
  AdminSectionNavLayout,
  type AdminSectionNavItem,
} from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { PropertyIntegrationsPanel } from '@/features/dashboard/bookings/components/PropertyIntegrationsPanel';
import type { AppSettingsDto } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { PropertyLocationPicker } from '@/features/dashboard/org/components/property-settings/PropertyLocationPicker';
import { PropertyPaymentMethodsSection } from '@/features/dashboard/org/components/property-settings/PropertyPaymentMethodsSection';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { useParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { BrandColorField } from '@/features/dashboard/org/components/settings/BrandColorField';
import { useOrgBrandColor } from '@/features/dashboard/org/hooks/useOrgBrandColor';
import { useParkingSlotConflict } from '@/features/dashboard/org/hooks/useParkingSlotConflict';
import {
  AZURE_NORTH_PARKING_TOWERS,
  DEFAULT_PARKING_LEVEL,
  DEFAULT_PARKING_RESIDENCE_NAME,
  getParkingLevelsForTower,
  getParkingResidenceNames,
  PARKING_TYPES,
  type ParkingType,
} from '@/features/dashboard/org/lib/parkingResidences';
import {
  formatParkingCode,
  formatParkingDisplayName,
  isValidParkingSlotNumber,
  sanitizeParkingSlotNumber,
} from '@/features/dashboard/org/lib/parkingSlotDisplay';
import {
  syncLegacyPaymentFieldsFromMethods,
  type PropertyPaymentMethod,
} from '@/features/dashboard/org/lib/paymentMethods';
import { applyResidenceLocationDefaultsToDraft } from '@/features/dashboard/org/lib/propertyLocation';
import {
  orgParkingsPath,
  parkingNotificationsPath,
  parkingSectionPath,
} from '@/features/dashboard/org/lib/tenantPaths';
import { ParkingDetailsSection } from '@/features/dashboard/parking/components/ParkingDetailsSection';
import { ParkingFeaturesSection } from '@/features/dashboard/parking/components/ParkingFeaturesSection';
import { ParkingMediaUpload } from '@/features/dashboard/parking/components/ParkingMediaUpload';
import {
  useParkingSettings,
  useUpdateParkingSettings,
} from '@/features/dashboard/parking/hooks/useParkingSettings';
import {
  useDeleteParking,
  useUpdateParking,
} from '@/features/dashboard/parking/hooks/useUpdateParking';
import { useUploadParkingSettingsAsset } from '@/features/dashboard/parking/hooks/useUploadParkingSettingsAsset';
import {
  parkingFeaturesDraftFromSettings,
  parkingFeaturesDraftIsDirty,
  parkingFeaturesSettingsPatch,
} from '@/features/dashboard/parking/lib/parkingFeaturesConstants';
import {
  parkingCoverImageFromSettings,
  parkingDetailsDraftFromSettings,
  parkingDetailsDraftIsDirty,
  parkingDetailsSettingsPatch,
  parkingLocationDraftFromSettings,
  parkingLocationDraftIsDirty,
  parkingLocationSettingsPatch,
  parkingOperationalDraftFromSettings,
  parkingOperationalDraftIsDirty,
  parkingProfileDraftFromParking,
  parkingProfileDraftIsDirty,
  parkingProfileSettingsPatch,
  parkingSlugPreview,
  PARKING_DESCRIPTION_MAX,
  type ParkingOperationalDraft,
  type ParkingProfileDraft,
} from '@/features/dashboard/parking/lib/parkingSettingsForm';

import { AvailabilityCheckInput } from '@/components/AvailabilityCheckInput';
import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { MobileHeroActionButton } from '@/components/mobile/MobileHeroActionButton';
import { AppSettingsCardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { resolveAsyncAvailabilityState } from '@/lib/availabilityCheckState';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

const SECTIONS: AdminSectionNavItem[] = [
  { id: 'basic', label: 'Basic Information', icon: Info },
  { id: 'media', label: 'Photos', icon: ImageIcon },
  { id: 'details', label: 'Parking Details', icon: Home },
  { id: 'features', label: 'Amenities', icon: Sparkles },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'payment', label: 'Payment', icon: Wallet },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

function parkingPaymentSettingsDto(
  settings: NonNullable<ReturnType<typeof useParkingSettings>['data']>
): AppSettingsDto {
  const gcashQrImageUrl = settings.gcashQrImageUrl?.trim() ?? '';
  return {
    gcashQrImageUrl,
    fieldSources: {
      gcashQrImageUrl: gcashQrImageUrl ? 'db' : 'default',
    },
  } as AppSettingsDto;
}

export function ParkingSettingsCard() {
  const navigate = useNavigate();
  const { parking, orgSlug, parkingSlug } = useParkingContext();
  const inheritedBrandColor = useOrgBrandColor();
  const { setBrandColorPreview } = useAdminBrandColorPreview();
  const { data: settings, isLoading: settingsLoading } = useParkingSettings();
  const updateParking = useUpdateParking(orgSlug);
  const deleteParking = useDeleteParking(orgSlug);
  const updateSettings = useUpdateParkingSettings();
  const uploadQr = useUploadParkingSettingsAsset();

  const [profileBaseline, setProfileBaseline] = useState(() =>
    parkingProfileDraftFromParking(parking, inheritedBrandColor)
  );
  const [profileDraft, setProfileDraft] = useState(profileBaseline);
  const [coverImage, setCoverImage] = useState(() =>
    parkingCoverImageFromSettings(parking.settings)
  );
  const [operationalBaseline, setOperationalBaseline] = useState<ParkingOperationalDraft | null>(
    null
  );
  const [operationalDraft, setOperationalDraft] = useState<ParkingOperationalDraft | null>(null);
  const [featuresBaseline, setFeaturesBaseline] = useState(() =>
    parkingFeaturesDraftFromSettings(parking.settings)
  );
  const [featuresDraft, setFeaturesDraft] = useState(featuresBaseline);
  const [newCustomFeatureInput, setNewCustomFeatureInput] = useState('');
  const [locationBaseline, setLocationBaseline] = useState(() =>
    parkingLocationDraftFromSettings(parking.settings, parking.residenceName)
  );
  const [locationDraft, setLocationDraft] = useState(locationBaseline);
  const [detailsBaseline, setDetailsBaseline] = useState(() =>
    parkingDetailsDraftFromSettings(parking.settings)
  );
  const [detailsDraft, setDetailsDraft] = useState(detailsBaseline);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const profileDirtyRef = useRef(false);
  const operationalDirtyRef = useRef(false);
  const featuresDirtyRef = useRef(false);
  const locationDirtyRef = useRef(false);
  const detailsDirtyRef = useRef(false);

  const displayName = useMemo(
    () => formatParkingDisplayName(profileDraft.tower, profileDraft.level, profileDraft.slotNumber),
    [profileDraft.tower, profileDraft.level, profileDraft.slotNumber]
  );
  const baselineDisplayName = useMemo(
    () =>
      formatParkingDisplayName(
        profileBaseline.tower,
        profileBaseline.level,
        profileBaseline.slotNumber
      ),
    [profileBaseline.tower, profileBaseline.level, profileBaseline.slotNumber]
  );
  const parkingCode = useMemo(
    () => formatParkingCode(profileDraft.tower, profileDraft.level, profileDraft.slotNumber),
    [profileDraft.tower, profileDraft.level, profileDraft.slotNumber]
  );

  const parkingSlugPrefix =
    typeof window !== 'undefined' ? `${window.location.origin}/parkings/` : '/parkings/';

  const slugPreview = parkingSlugPreview(displayName, parking.slug, baselineDisplayName);
  const residenceOptions = getParkingResidenceNames();

  useEffect(() => {
    return () => setBrandColorPreview(null);
  }, [setBrandColorPreview]);

  useEffect(() => {
    if (profileDirtyRef.current) return;
    const next = parkingProfileDraftFromParking(parking, inheritedBrandColor);
    setProfileDraft(next);
    setProfileBaseline(next);
    const nextCover = parkingCoverImageFromSettings(parking.settings);
    setCoverImage(nextCover);
  }, [
    parking.id,
    parking.updatedAt,
    parking.settings,
    parking.tower,
    parking.level,
    parking.slotLabel,
    parking.parkingType,
    parking.residenceName,
    inheritedBrandColor,
  ]);

  useEffect(() => {
    if (featuresDirtyRef.current) return;
    const next = parkingFeaturesDraftFromSettings(parking.settings);
    setFeaturesDraft(next);
    setFeaturesBaseline(next);
  }, [parking.id, parking.updatedAt, parking.settings]);

  useEffect(() => {
    if (locationDirtyRef.current) return;
    const next = parkingLocationDraftFromSettings(parking.settings, parking.residenceName);
    setLocationDraft(next);
    setLocationBaseline(next);
  }, [parking.id, parking.updatedAt, parking.settings, parking.residenceName]);

  useEffect(() => {
    if (detailsDirtyRef.current) return;
    const next = parkingDetailsDraftFromSettings(parking.settings);
    setDetailsDraft(next);
    setDetailsBaseline(next);
  }, [parking.id, parking.updatedAt, parking.settings]);

  useEffect(() => {
    if (!settings) return;
    if (operationalDirtyRef.current) return;
    const values = parkingOperationalDraftFromSettings(settings);
    setOperationalDraft(values);
    setOperationalBaseline(values);
  }, [settings]);

  const profileDirty = parkingProfileDraftIsDirty(
    profileDraft,
    profileBaseline,
    inheritedBrandColor
  );
  profileDirtyRef.current = profileDirty;
  const operationalDirty =
    operationalDraft && operationalBaseline
      ? parkingOperationalDraftIsDirty(operationalDraft, operationalBaseline)
      : false;
  operationalDirtyRef.current = operationalDirty;
  const featuresDirty = parkingFeaturesDraftIsDirty(featuresDraft, featuresBaseline);
  featuresDirtyRef.current = featuresDirty;
  const locationDirty = parkingLocationDraftIsDirty(locationDraft, locationBaseline);
  locationDirtyRef.current = locationDirty;
  const detailsDirty = parkingDetailsDraftIsDirty(detailsDraft, detailsBaseline);
  detailsDirtyRef.current = detailsDirty;
  const isDirty =
    profileDirty || operationalDirty || featuresDirty || locationDirty || detailsDirty;

  const slotIdentityChanged =
    profileDraft.tower !== profileBaseline.tower ||
    profileDraft.level !== profileBaseline.level ||
    profileDraft.slotNumber !== profileBaseline.slotNumber ||
    profileDraft.residenceName.trim() !== profileBaseline.residenceName.trim();
  const slotReady =
    slotIdentityChanged &&
    Boolean(profileDraft.tower) &&
    Boolean(profileDraft.level) &&
    isValidParkingSlotNumber(profileDraft.slotNumber);
  const residenceNameForConflict =
    profileDraft.residenceName.trim() || DEFAULT_PARKING_RESIDENCE_NAME;
  const {
    conflict: slotConflict,
    hasDuplicate: slotDuplicate,
    isChecking: slotChecking,
  } = useParkingSlotConflict(
    profileDraft.tower,
    profileDraft.level,
    profileDraft.slotNumber,
    residenceNameForConflict,
    parking.id
  );
  const slotBlocked = slotReady && slotDuplicate;
  const slotAvailabilityState = resolveAsyncAvailabilityState({
    ready: slotReady,
    isChecking: slotChecking,
    hasConflict: slotDuplicate,
  });
  const slotBlockMessage = slotBlocked
    ? `Slot taken${slotConflict?.orgName ? ` — ${slotConflict.orgName}` : ''}`
    : null;

  const busy =
    settingsLoading ||
    updateParking.isPending ||
    updateSettings.isPending ||
    deleteParking.isPending ||
    uploadQr.isPending;
  const saveDisabled = busy || slotBlocked || (slotReady && slotChecking);

  const setProfileField = <K extends keyof ParkingProfileDraft>(
    key: K,
    value: ParkingProfileDraft[K]
  ) => {
    setProfileDraft((current) => ({ ...current, [key]: value }));
  };

  const setPaymentMethods = (methods: PropertyPaymentMethod[]) => {
    const legacy = syncLegacyPaymentFieldsFromMethods(methods);
    setOperationalDraft((current) =>
      current
        ? {
            ...current,
            paymentMethods: methods,
            paymentProvider: legacy.paymentProvider,
            gcashName: legacy.gcashName,
            gcashNumber: legacy.gcashNumber,
          }
        : current
    );
  };

  const handleSave = async () => {
    if (!operationalDraft || !operationalBaseline) return;
    if (slotBlocked || (slotReady && slotChecking)) return;

    if (!isDirty) {
      toast.message('No changes to save');
      return;
    }

    try {
      let savedSomething = false;
      let nextParkingSlug = parkingSlug;

      if (profileDirty) {
        const settingsPatch = parkingProfileSettingsPatch(profileDraft, inheritedBrandColor);
        const baselineSettingsPatch = parkingProfileSettingsPatch(
          profileBaseline,
          inheritedBrandColor
        );
        const settingsDirty =
          settingsPatch.description !== baselineSettingsPatch.description ||
          settingsPatch.brandColor !== baselineSettingsPatch.brandColor;
        const slotFieldsDirty =
          profileDraft.tower !== profileBaseline.tower ||
          profileDraft.level !== profileBaseline.level ||
          profileDraft.slotNumber !== profileBaseline.slotNumber ||
          profileDraft.parkingType !== profileBaseline.parkingType ||
          profileDraft.residenceName.trim() !== profileBaseline.residenceName.trim();

        const payload: { parkingId: string } & Record<string, unknown> = {
          parkingId: parking.id,
        };
        if (slotFieldsDirty) {
          payload.name = displayName;
          payload.tower = profileDraft.tower;
          payload.level = profileDraft.level;
          payload.slotLabel = profileDraft.slotNumber.trim();
          payload.parkingType = profileDraft.parkingType;
          payload.residenceName =
            profileDraft.residenceName.trim() || DEFAULT_PARKING_RESIDENCE_NAME;
        }
        if (settingsDirty) {
          payload.settings = settingsPatch;
        }

        const result = await updateParking.mutateAsync(payload);
        setProfileBaseline(profileDraft);
        savedSomething = true;
        nextParkingSlug = result.parking.slug;
      }

      if (operationalDirty) {
        await updateSettings.mutateAsync({
          paymentMethods: operationalDraft.paymentMethods,
          paymentProvider: operationalDraft.paymentProvider,
          gcashName: operationalDraft.gcashName.trim() || null,
          gcashNumber: operationalDraft.gcashNumber.trim() || null,
        });
        setOperationalBaseline(operationalDraft);
        savedSomething = true;
      }

      if (featuresDirty || locationDirty || detailsDirty) {
        await updateParking.mutateAsync({
          parkingId: parking.id,
          settings: {
            ...(featuresDirty ? parkingFeaturesSettingsPatch(featuresDraft) : {}),
            ...(locationDirty ? parkingLocationSettingsPatch(locationDraft) : {}),
            ...(detailsDirty ? parkingDetailsSettingsPatch(detailsDraft) : {}),
          },
        });
        if (featuresDirty) setFeaturesBaseline(featuresDraft);
        if (locationDirty) setLocationBaseline(locationDraft);
        if (detailsDirty) setDetailsBaseline(detailsDraft);
        savedSomething = true;
      }

      if (savedSomething) {
        toast.success('Settings saved');
        if (nextParkingSlug !== parkingSlug) {
          navigate(parkingSectionPath(orgSlug, nextParkingSlug, 'settings'), { replace: true });
        }
      }
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save settings'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteParking.mutateAsync(parking.id);
      toast.success('Parking deleted');
      navigate(orgParkingsPath(orgSlug));
    } catch (error) {
      toast.error(friendlyToastError(error, 'Delete failed'));
    }
  };

  if (settingsLoading || !settings || !operationalDraft) {
    return <AppSettingsCardSkeleton />;
  }

  return (
    <AdminMobilePage
      title="Settings"
      subtitle="Manage your parking slot's details, photos, and configurations."
      titleId="parking-settings-heading"
      className="flex min-h-0 flex-1 flex-col"
      heroTrailing={
        isDirty ? (
          <MobileHeroActionButton
            aria-label={busy ? 'Saving' : 'Save changes'}
            disabled={saveDisabled}
            onClick={() => void handleSave()}
          >
            <Save className="size-5" aria-hidden />
          </MobileHeroActionButton>
        ) : undefined
      }
      desktopActions={
        isDirty ? (
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveDisabled}
            className="min-h-[44px] gap-1.5"
          >
            <Save className="size-4" aria-hidden />
            {busy ? 'Saving...' : 'Save Changes'}
          </Button>
        ) : undefined
      }
    >
      <AdminSectionNavLayout
        className="min-h-0 flex-1"
        sections={SECTIONS}
        footer={
          isDirty ? (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2 animate-pulse rounded-full bg-amber-500" />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Unsaved changes
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saveDisabled}
                  className="min-h-[44px] w-full sm:w-auto"
                  size="sm"
                >
                  {busy ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          ) : null
        }
      >
        <AdminSection
          id="basic"
          title="Basic Information"
          icon={Info}
          description="Update this parking slot's fundamental details."
        >
          <SettingsField id="parking-code" label="Code">
            <Input
              id="parking-code"
              value={parkingCode}
              readOnly
              aria-readonly="true"
              placeholder="—"
              className="bg-muted/40 text-muted-foreground h-10 cursor-default font-mono tabular-nums"
            />
          </SettingsField>

          <SettingsField id="parking-slug" label="URL Slug">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-muted-foreground truncate text-sm">{parkingSlugPrefix}</span>
              <Input
                id="parking-slug"
                value={slugPreview}
                readOnly
                disabled={busy}
                placeholder="parking-slug"
                className="bg-muted/40 max-w-xs"
                autoComplete="off"
                spellCheck={false}
                aria-readonly="true"
              />
            </div>
          </SettingsField>

          <BrandColorField
            id="parking-brand-color"
            value={profileDraft.brandColor}
            resolvedColor={inheritedBrandColor}
            resetValue={inheritedBrandColor}
            disabled={busy}
            hint="Tints this parking slot's admin pages, guest listing, and accents."
            onChange={(value) => {
              setProfileField('brandColor', value);
              setBrandColorPreview(value.trim() || inheritedBrandColor);
            }}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5">
            <SettingsField id="settings-parking-type" label="Parking type">
              <Select
                value={profileDraft.parkingType}
                onValueChange={(value) => setProfileField('parkingType', value as ParkingType)}
                disabled={busy}
              >
                <SelectTrigger id="settings-parking-type" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARKING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>

            <SettingsField id="settings-residence" label="Residence">
              <Select
                value={profileDraft.residenceName.trim() || residenceOptions[0]}
                onValueChange={(value) => {
                  setProfileField('residenceName', value);
                  const locationDefaults = applyResidenceLocationDefaultsToDraft(
                    value,
                    locationDraft
                  );
                  if (Object.keys(locationDefaults).length > 0) {
                    setLocationDraft((current) => ({ ...current, ...locationDefaults }));
                  }
                }}
                disabled={busy}
              >
                <SelectTrigger id="settings-residence" className="h-10">
                  <SelectValue placeholder="Select residence" />
                </SelectTrigger>
                <SelectContent>
                  {residenceOptions.map((residence) => (
                    <SelectItem key={residence} value={residence}>
                      {residence}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>

            <SettingsField id="settings-tower" label="Tower">
              <Select
                value={profileDraft.tower}
                onValueChange={(value) => {
                  setProfileField('tower', value);
                  const levels = getParkingLevelsForTower(value);
                  if (profileDraft.level && !levels.includes(profileDraft.level)) {
                    setProfileField('level', DEFAULT_PARKING_LEVEL);
                  }
                }}
                disabled={busy}
              >
                <SelectTrigger id="settings-tower" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AZURE_NORTH_PARKING_TOWERS.map((tower) => (
                    <SelectItem key={tower} value={tower}>
                      {tower}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>

            <SettingsField id="settings-level" label="Level">
              <Select
                value={profileDraft.level}
                onValueChange={(value) => setProfileField('level', value)}
                disabled={busy}
              >
                <SelectTrigger id="settings-level" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getParkingLevelsForTower(profileDraft.tower).map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>
          </div>

          <SettingsField id="settings-slot" label="Slot number" error={slotBlockMessage}>
            <AvailabilityCheckInput
              id="settings-slot"
              inputMode="numeric"
              autoComplete="off"
              value={profileDraft.slotNumber}
              onChange={(event) =>
                setProfileField('slotNumber', sanitizeParkingSlotNumber(event.target.value))
              }
              maxLength={4}
              disabled={busy}
              aria-invalid={Boolean(slotBlockMessage)}
              className={cn('h-10 tabular-nums', slotBlockMessage && 'border-destructive')}
              checkState={slotAvailabilityState}
            />
          </SettingsField>

          <SettingsField id="parking-description" label="Description">
            <Textarea
              id="parking-description"
              value={profileDraft.description}
              onChange={(event) => setProfileField('description', event.target.value)}
              disabled={busy}
              rows={6}
              maxLength={PARKING_DESCRIPTION_MAX}
              className="min-h-[140px] resize-y"
            />
            <p className="text-muted-foreground mt-1.5 text-xs tabular-nums">
              {profileDraft.description.length}/{PARKING_DESCRIPTION_MAX} characters
            </p>
          </SettingsField>
        </AdminSection>

        <AdminSection
          id="media"
          title="Photos"
          icon={ImageIcon}
          description="Upload one cover photo for this parking slot."
        >
          <ParkingMediaUpload
            coverImage={coverImage}
            onCoverChange={setCoverImage}
            disabled={busy}
          />
        </AdminSection>

        <ParkingDetailsSection draft={detailsDraft} onChange={setDetailsDraft} disabled={busy} />

        <ParkingFeaturesSection
          draft={featuresDraft}
          onChange={setFeaturesDraft}
          disabled={busy}
          newCustomInput={newCustomFeatureInput}
          onNewCustomInputChange={setNewCustomFeatureInput}
        />

        <AdminSection
          id="location"
          title="Location"
          icon={MapPin}
          description="Provide accurate location details to help guests find this parking slot."
        >
          <PropertyLocationPicker
            disabled={busy}
            value={locationDraft}
            onChange={(patch) => setLocationDraft((current) => ({ ...current, ...patch }))}
          />
        </AdminSection>

        <AdminSection id="payment" title="Payment" icon={Wallet}>
          <PropertyPaymentMethodsSection
            data={parkingPaymentSettingsDto(settings)}
            methods={operationalDraft.paymentMethods}
            disabled={busy}
            resolveFieldError={() => null}
            markFieldInteracted={() => {}}
            onChange={setPaymentMethods}
            onPrimaryQrFile={(file) => {
              void uploadQr
                .mutateAsync(file)
                .then(() => {
                  toast.success('Payment QR updated');
                })
                .catch((err) => {
                  toast.error(friendlyToastError(err, 'Upload failed'));
                });
            }}
            qrUploadBusy={uploadQr.isPending}
          />
        </AdminSection>

        <AdminSection
          id="integrations"
          title="Integrations"
          icon={Globe}
          description="Connect this parking slot to external platforms and services."
        >
          {settings.parkingIntegrations ? (
            <PropertyIntegrationsPanel
              status={settings.parkingIntegrations}
              aiKeys={{
                primaryKeysConfigured: settings.platformSecrets?.geminiApiKeyConfigured ?? false,
                fallbackKeyConfigured: settings.platformSecrets?.groqApiKeyConfigured ?? false,
              }}
              telegramLayout="parking"
              notificationsPath={(module) =>
                parkingNotificationsPath(
                  orgSlug,
                  parking.slug,
                  module === 'finance' ? 'finance' : undefined
                )
              }
            />
          ) : null}
        </AdminSection>

        <AdminSection
          id="danger"
          title="Danger Zone"
          icon={AlertTriangle}
          description="Irreversible actions that permanently affect this parking slot."
          className="border-destructive/50"
        >
          <div className="border-destructive/50 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-destructive text-sm font-medium">Delete parking</p>
              <p className="text-muted-foreground text-sm">
                Permanently removes this parking slot and its settings. This cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || deleteParking.isPending}
              className="min-h-[44px] shrink-0"
              onClick={() => setDeleteOpen(true)}
            >
              {deleteParking.isPending ? 'Deleting…' : 'Delete parking'}
            </Button>
          </div>

          <ResponsiveModal open={deleteOpen} onOpenChange={setDeleteOpen}>
            <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
              <ResponsiveModalHeader>
                <ResponsiveModalTitle>Delete {displayName || parking.name}?</ResponsiveModalTitle>
                <ResponsiveModalDescription>
                  This parking slot and its settings will be permanently removed. This cannot be
                  undone.
                </ResponsiveModalDescription>
              </ResponsiveModalHeader>
              <ResponsiveModalFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] w-full sm:w-auto"
                  disabled={deleteParking.isPending}
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="min-h-[44px] w-full sm:w-auto"
                  disabled={deleteParking.isPending}
                  onClick={() => void handleDelete()}
                >
                  {deleteParking.isPending ? 'Deleting…' : 'Delete parking'}
                </Button>
              </ResponsiveModalFooter>
            </ResponsiveModalContent>
          </ResponsiveModal>
        </AdminSection>
      </AdminSectionNavLayout>
    </AdminMobilePage>
  );
}
