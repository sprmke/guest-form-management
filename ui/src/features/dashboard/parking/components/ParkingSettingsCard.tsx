import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  AlertTriangle,
  Globe,
  Home,
  Image as ImageIcon,
  Info,
  Mail,
  MapPin,
  Save,
  Sparkles,
  Wallet,
  Zap,
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
import {
  PropertySettingsSectionAlert,
  SettingsField,
} from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { SensitiveSettingsOtpDialog } from '@/features/dashboard/org/components/property-settings/SensitiveSettingsOtpDialog';
import { useParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { BrandColorField } from '@/features/dashboard/org/components/settings/BrandColorField';
import { useOrgBrandColor } from '@/features/dashboard/org/hooks/useOrgBrandColor';
import {
  DEFAULT_PARKING_RESIDENCE_NAME,
  PARKING_TYPES,
} from '@/features/dashboard/org/lib/parkingResidences';
import {
  formatParkingCode,
  formatParkingDisplayName,
} from '@/features/dashboard/org/lib/parkingSlotDisplay';
import {
  paymentMethodsDraftIsDirty,
  setPaymentMethodQrUrl,
  syncLegacyPaymentFieldsFromMethods,
  type PropertyPaymentMethod,
} from '@/features/dashboard/org/lib/paymentMethods';
import { computePaymentSettingsFingerprint } from '@/features/dashboard/org/lib/settingsVerificationFingerprint';
import {
  orgParkingsPath,
  parkingNotificationsPath,
} from '@/features/dashboard/org/lib/tenantPaths';
import { ParkingBookingAutomationSection } from '@/features/dashboard/parking/components/ParkingBookingAutomationSection';
import { ParkingDetailsSection } from '@/features/dashboard/parking/components/ParkingDetailsSection';
import { ParkingEmailAutomationSection } from '@/features/dashboard/parking/components/ParkingEmailAutomationSection';
import { ParkingFeaturesSection } from '@/features/dashboard/parking/components/ParkingFeaturesSection';
import { ParkingMediaUpload } from '@/features/dashboard/parking/components/ParkingMediaUpload';
import {
  useParkingSettings,
  useUpdateParkingSettings,
} from '@/features/dashboard/parking/hooks/useParkingSettings';
import { useParkingSettingsCompletionForDraft } from '@/features/dashboard/parking/hooks/useParkingSettingsCompletion';
import {
  useDeleteParking,
  useUpdateParking,
} from '@/features/dashboard/parking/hooks/useUpdateParking';
import { useUploadParkingSettingsAsset } from '@/features/dashboard/parking/hooks/useUploadParkingSettingsAsset';
import {
  mergeParkingAutomationToggles,
  type ParkingAutomationToggles,
} from '@/features/dashboard/parking/lib/parkingEmailAutomation';
import {
  parkingFeaturesDraftFromSettings,
  parkingFeaturesDraftIsDirty,
  parkingFeaturesSettingsPatch,
} from '@/features/dashboard/parking/lib/parkingFeaturesConstants';
import { type ParkingSettingsSectionId } from '@/features/dashboard/parking/lib/parkingSettingsCompletion';
import {
  parkingSettingsSectionBanner,
  resolveParkingSettingsFieldError,
} from '@/features/dashboard/parking/lib/parkingSettingsFieldError';
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
  PARKING_DESCRIPTION_MAX,
  type ParkingOperationalDraft,
  type ParkingProfileDraft,
} from '@/features/dashboard/parking/lib/parkingSettingsForm';
import { setParkingSettingsIssueSections } from '@/features/dashboard/parking/lib/parkingSettingsIssuesStore';

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
import { Textarea } from '@/components/ui/textarea';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

const SECTIONS: AdminSectionNavItem[] = [
  { id: 'basic', label: 'Basic Information', icon: Info },
  { id: 'media', label: 'Photos', icon: ImageIcon },
  { id: 'details', label: 'Parking Details', icon: Home },
  { id: 'features', label: 'Amenities', icon: Sparkles },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'payment', label: 'Payment', icon: Wallet },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'booking-automation', label: 'Booking Automation', icon: Zap },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

const readOnlyFieldClass = 'bg-muted/40';

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

function parkingTypeLabel(value: string): string {
  return PARKING_TYPES.find((type) => type.value === value)?.label ?? value;
}

export function ParkingSettingsCard() {
  const navigate = useNavigate();
  const { parking, orgSlug } = useParkingContext();
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
    parkingDetailsDraftFromSettings(parking.settings, parking.acceptedVehicleTypes)
  );
  const [detailsDraft, setDetailsDraft] = useState(detailsBaseline);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [automationBaseline, setAutomationBaseline] = useState<ParkingAutomationToggles>(() =>
    mergeParkingAutomationToggles(parking.settings?.automationToggles)
  );
  const [automationDraft, setAutomationDraft] = useState(automationBaseline);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [interactedFields, setInteractedFields] = useState<Record<string, boolean>>({});
  const [paymentOtpOpen, setPaymentOtpOpen] = useState(false);
  const [paymentOtpFingerprint, setPaymentOtpFingerprint] = useState('');
  const [qrUploadingMethodId, setQrUploadingMethodId] = useState<string | null>(null);
  const paymentOtpSucceededRef = useRef(false);

  const markFieldInteracted = useCallback((fieldId: string) => {
    setInteractedFields((current) => {
      if (current[fieldId]) return current;
      return { ...current, [fieldId]: true };
    });
  }, []);

  const profileDirtyRef = useRef(false);
  const operationalDirtyRef = useRef(false);
  const automationDirtyRef = useRef(false);
  const featuresDirtyRef = useRef(false);
  const locationDirtyRef = useRef(false);
  const detailsDirtyRef = useRef(false);

  const displayName = useMemo(
    () => formatParkingDisplayName(profileDraft.tower, profileDraft.level, profileDraft.slotNumber),
    [profileDraft.tower, profileDraft.level, profileDraft.slotNumber]
  );
  const parkingCode = useMemo(
    () => formatParkingCode(profileDraft.tower, profileDraft.level, profileDraft.slotNumber),
    [profileDraft.tower, profileDraft.level, profileDraft.slotNumber]
  );

  const parkingSlugPrefix =
    typeof window !== 'undefined' ? `${window.location.origin}/parkings/` : '/parkings/';

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
    const next = parkingDetailsDraftFromSettings(parking.settings, parking.acceptedVehicleTypes);
    setDetailsDraft(next);
    setDetailsBaseline(next);
  }, [parking.id, parking.updatedAt, parking.settings, parking.acceptedVehicleTypes]);

  useEffect(() => {
    if (!settings) return;
    if (operationalDirtyRef.current) return;
    const values = parkingOperationalDraftFromSettings(settings);
    setOperationalDraft(values);
    setOperationalBaseline(values);
    if (!automationDirtyRef.current) {
      const nextAutomation = mergeParkingAutomationToggles(settings.automationToggles);
      setAutomationDraft(nextAutomation);
      setAutomationBaseline(nextAutomation);
    }
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
  const automationDirty = JSON.stringify(automationDraft) !== JSON.stringify(automationBaseline);
  automationDirtyRef.current = automationDirty;
  const featuresDirty = parkingFeaturesDraftIsDirty(featuresDraft, featuresBaseline);
  featuresDirtyRef.current = featuresDirty;
  const locationDirty = parkingLocationDraftIsDirty(locationDraft, locationBaseline);
  locationDirtyRef.current = locationDirty;
  const detailsDirty = parkingDetailsDraftIsDirty(detailsDraft, detailsBaseline);
  detailsDirtyRef.current = detailsDirty;
  const isDirty =
    profileDirty ||
    operationalDirty ||
    automationDirty ||
    featuresDirty ||
    locationDirty ||
    detailsDirty;

  const isArchived = parking.status === 'INACTIVE';

  const { completion: draftCompletion } = useParkingSettingsCompletionForDraft({
    profile: profileDraft,
    operational: operationalDraft,
    details: detailsDraft,
    features: featuresDraft,
    location: locationDraft,
    coverImage,
    excludeParkingId: parking.id,
  });

  const { completion: savedCompletion } = useParkingSettingsCompletionForDraft({
    profile: profileBaseline,
    operational: operationalBaseline,
    details: detailsBaseline,
    features: featuresBaseline,
    location: locationBaseline,
    coverImage,
    excludeParkingId: parking.id,
  });

  const resolveFieldError = useCallback(
    (fieldId: string) =>
      resolveParkingSettingsFieldError(
        fieldId,
        draftCompletion.fieldErrors,
        interactedFields,
        showValidationErrors
      ),
    [draftCompletion.fieldErrors, interactedFields, showValidationErrors]
  );

  const navSections = useMemo(
    (): AdminSectionNavItem[] =>
      SECTIONS.map((section) => ({
        ...section,
        hasIssue: draftCompletion.issueSectionIds.includes(section.id as ParkingSettingsSectionId),
      })),
    [draftCompletion.issueSectionIds]
  );

  useEffect(() => {
    setParkingSettingsIssueSections(draftCompletion.issueSectionIds);
    return () => {
      setParkingSettingsIssueSections(savedCompletion.issueSectionIds);
    };
  }, [draftCompletion.issueSectionIds, savedCompletion.issueSectionIds]);

  const scrollToSettingsSection = (sectionId: ParkingSettingsSectionId) => {
    document
      .getElementById(`section-${sectionId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const busy =
    settingsLoading ||
    updateParking.isPending ||
    updateSettings.isPending ||
    deleteParking.isPending ||
    uploadQr.isPending;
  const saveDisabledByValidation = isDirty && !draftCompletion.isComplete;
  const saveDisabled = busy || saveDisabledByValidation;

  useEffect(() => {
    if (saveDisabledByValidation) {
      setShowValidationErrors(true);
    }
  }, [saveDisabledByValidation]);

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

  const handleSave = async (options?: {
    skipPaymentVerification?: boolean;
    settingsVerificationToken?: string;
  }) => {
    if (!operationalDraft || !operationalBaseline) return;

    if (!isDirty) {
      toast.message('No changes to save');
      return;
    }

    if (!draftCompletion.isComplete) {
      setShowValidationErrors(true);
      toast.error(draftCompletion.firstErrorMessage ?? 'Please fix the highlighted fields');
      if (draftCompletion.firstIssueSectionId) {
        scrollToSettingsSection(draftCompletion.firstIssueSectionId);
      }
      return;
    }

    const paymentChanged =
      operationalDirty &&
      paymentMethodsDraftIsDirty(
        operationalDraft.paymentMethods,
        operationalBaseline.paymentMethods
      );

    if (paymentChanged && operationalDirty && !options?.skipPaymentVerification) {
      const fingerprint = await computePaymentSettingsFingerprint(operationalDraft.paymentMethods);
      setPaymentOtpFingerprint(fingerprint);
      setPaymentOtpOpen(true);
      return;
    }

    setShowValidationErrors(false);

    try {
      let savedSomething = false;

      if (profileDirty) {
        const settingsPatch = parkingProfileSettingsPatch(profileDraft, inheritedBrandColor);
        await updateParking.mutateAsync({
          parkingId: parking.id,
          settings: settingsPatch,
        });
        setProfileBaseline(profileDraft);
        savedSomething = true;
      }

      if (operationalDirty) {
        await updateSettings.mutateAsync({
          paymentMethods: operationalDraft.paymentMethods,
          paymentProvider: operationalDraft.paymentProvider,
          gcashName: operationalDraft.gcashName.trim() || null,
          gcashNumber: operationalDraft.gcashNumber.trim() || null,
          ...(options?.settingsVerificationToken
            ? { settingsVerificationToken: options.settingsVerificationToken }
            : {}),
        });
        setOperationalBaseline(operationalDraft);
        savedSomething = true;
      }

      if (automationDirty) {
        await updateSettings.mutateAsync({
          automationToggles: automationDraft,
        });
        setAutomationBaseline(automationDraft);
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
          ...(detailsDirty ? { acceptedVehicleTypes: detailsDraft.acceptedVehicleTypes } : {}),
        });
        if (featuresDirty) setFeaturesBaseline(featuresDraft);
        if (locationDirty) setLocationBaseline(locationDraft);
        if (detailsDirty) setDetailsBaseline(detailsDraft);
        savedSomething = true;
      }

      if (savedSomething) {
        setInteractedFields({});
        toast.success('Settings saved');
      }
    } catch (error) {
      if (options?.settingsVerificationToken) {
        revertPaymentDraft();
      }
      toast.error(friendlyToastError(error, 'Could not save settings'));
    } finally {
      setPaymentOtpOpen(false);
      paymentOtpSucceededRef.current = false;
    }
  };

  const revertPaymentDraft = useCallback(() => {
    setOperationalDraft((current) => {
      if (!current || !operationalBaseline) return current;
      return {
        ...current,
        paymentMethods: operationalBaseline.paymentMethods,
        paymentProvider: operationalBaseline.paymentProvider,
        gcashName: operationalBaseline.gcashName,
        gcashNumber: operationalBaseline.gcashNumber,
      };
    });
  }, [operationalBaseline]);

  const handlePaymentOtpOpenChange = (open: boolean) => {
    if (!open && !paymentOtpSucceededRef.current) {
      revertPaymentDraft();
    }
    if (!open) paymentOtpSucceededRef.current = false;
    setPaymentOtpOpen(open);
  };

  const handlePaymentOtpVerified = (verificationToken: string) => {
    paymentOtpSucceededRef.current = true;
    void handleSave({
      skipPaymentVerification: true,
      settingsVerificationToken: verificationToken,
    });
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

  const handleArchive = async () => {
    try {
      await updateParking.mutateAsync({ parkingId: parking.id, status: 'INACTIVE' });
      toast.success('Parking archived');
      setArchiveOpen(false);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Archive failed'));
    }
  };

  const handleRestore = async () => {
    try {
      await updateParking.mutateAsync({ parkingId: parking.id, status: 'ACTIVE' });
      toast.success('Parking restored');
      setRestoreOpen(false);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Restore failed'));
    }
  };

  const setAutomationToggle = (key: keyof ParkingAutomationToggles, enabled: boolean) => {
    setAutomationDraft((current) => ({ ...current, [key]: enabled }));
  };

  if (settingsLoading || !settings || !operationalDraft) {
    return <AppSettingsCardSkeleton />;
  }

  return (
    <>
      <SensitiveSettingsOtpDialog
        open={paymentOtpOpen}
        onOpenChange={handlePaymentOtpOpenChange}
        scope="parking"
        patchFingerprint={paymentOtpFingerprint}
        onVerified={handlePaymentOtpVerified}
        busy={busy}
      />
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
              title={
                saveDisabledByValidation
                  ? (draftCompletion.firstErrorMessage ?? 'Fix required fields to save')
                  : undefined
              }
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
              title={
                saveDisabledByValidation
                  ? (draftCompletion.firstErrorMessage ?? 'Fix required fields to save')
                  : undefined
              }
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
          sections={navSections}
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
                    title={
                      saveDisabledByValidation
                        ? (draftCompletion.firstErrorMessage ?? 'Fix required fields to save')
                        : undefined
                    }
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
            description="Brand color, description, and slot identity."
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
                  value={parking.slug}
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
              help="Tints this parking slot's admin pages, guest listing, and accents."
              onChange={(value) => {
                setProfileField('brandColor', value);
                setBrandColorPreview(value.trim() || inheritedBrandColor);
              }}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5">
              <SettingsField
                id="settings-parking-type"
                label="Parking type"
                required
                error={resolveFieldError('settings-parking-type')}
                help="Set at creation and can't be changed."
              >
                <Input
                  id="settings-parking-type"
                  value={parkingTypeLabel(profileDraft.parkingType)}
                  readOnly
                  disabled={busy}
                  tabIndex={-1}
                  aria-readonly="true"
                  className={readOnlyFieldClass}
                />
              </SettingsField>

              <SettingsField
                id="settings-residence"
                label="Residence"
                required
                error={resolveFieldError('settings-residence')}
                help="Set at creation and can't be changed."
              >
                <Input
                  id="settings-residence"
                  value={profileDraft.residenceName.trim() || DEFAULT_PARKING_RESIDENCE_NAME}
                  readOnly
                  disabled={busy}
                  tabIndex={-1}
                  aria-readonly="true"
                  className={readOnlyFieldClass}
                />
              </SettingsField>

              <SettingsField
                id="settings-tower"
                label="Tower"
                required
                error={resolveFieldError('settings-tower')}
                help="Set at creation and can't be changed."
              >
                <Input
                  id="settings-tower"
                  value={profileDraft.tower}
                  readOnly
                  disabled={busy}
                  tabIndex={-1}
                  aria-readonly="true"
                  className={readOnlyFieldClass}
                />
              </SettingsField>

              <SettingsField
                id="settings-level"
                label="Level"
                required
                error={resolveFieldError('settings-level')}
                help="Set at creation and can't be changed."
              >
                <Input
                  id="settings-level"
                  value={profileDraft.level}
                  readOnly
                  disabled={busy}
                  tabIndex={-1}
                  aria-readonly="true"
                  className={readOnlyFieldClass}
                />
              </SettingsField>
            </div>

            <SettingsField
              id="settings-slot"
              label="Slot number"
              required
              error={resolveFieldError('settings-slot')}
              help="Set at creation and can't be changed."
            >
              <Input
                id="settings-slot"
                value={profileDraft.slotNumber}
                readOnly
                disabled={busy}
                tabIndex={-1}
                aria-readonly="true"
                className={cn(readOnlyFieldClass, 'tabular-nums')}
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
            description="Cover photo for the public listing."
          >
            {parkingSettingsSectionBanner('media', draftCompletion.sectionMessages) ? (
              <PropertySettingsSectionAlert
                message={parkingSettingsSectionBanner('media', draftCompletion.sectionMessages)!}
              />
            ) : null}
            <ParkingMediaUpload
              coverImage={coverImage}
              onCoverChange={setCoverImage}
              disabled={busy}
            />
          </AdminSection>

          <ParkingDetailsSection
            draft={detailsDraft}
            onChange={setDetailsDraft}
            disabled={busy}
            resolveFieldError={resolveFieldError}
            markFieldInteracted={markFieldInteracted}
          />

          <ParkingFeaturesSection
            draft={featuresDraft}
            onChange={setFeaturesDraft}
            disabled={busy}
            newCustomInput={newCustomFeatureInput}
            onNewCustomInputChange={setNewCustomFeatureInput}
            banner={parkingSettingsSectionBanner('features', draftCompletion.sectionMessages)}
          />

          <AdminSection
            id="location"
            title="Location"
            icon={MapPin}
            description="Address and map pin."
          >
            <PropertyLocationPicker
              disabled={busy}
              value={locationDraft}
              onChange={(patch) => setLocationDraft((current) => ({ ...current, ...patch }))}
              addressError={resolveFieldError('property-address')}
              mapError={resolveFieldError('property-location-map')}
              onFieldInteract={markFieldInteracted}
            />
          </AdminSection>

          <AdminSection
            id="payment"
            title="Payment"
            icon={Wallet}
            description="How guests pay for parking."
          >
            <PropertyPaymentMethodsSection
              data={parkingPaymentSettingsDto(settings)}
              methods={operationalDraft.paymentMethods}
              disabled={busy}
              resolveFieldError={resolveFieldError}
              markFieldInteracted={markFieldInteracted}
              onChange={setPaymentMethods}
              onMethodQrFile={(methodId, file) => {
                markFieldInteracted(`payment-method-${methodId}-qr`);
                setQrUploadingMethodId(methodId);
                void uploadQr
                  .mutateAsync(file)
                  .then((uploaded) => {
                    setPaymentMethods(
                      setPaymentMethodQrUrl(operationalDraft.paymentMethods, methodId, uploaded.url)
                    );
                  })
                  .catch((err) => {
                    toast.error(friendlyToastError(err, 'Upload failed'));
                  })
                  .finally(() => {
                    setQrUploadingMethodId(null);
                  });
              }}
              qrUploadingMethodId={qrUploadingMethodId}
            />
          </AdminSection>

          <AdminSection
            id="email"
            title="Email"
            icon={Mail}
            description="Reservation and booking status emails."
          >
            <ParkingEmailAutomationSection
              value={automationDraft}
              disabled={busy}
              onChange={setAutomationToggle}
            />
          </AdminSection>

          <AdminSection
            id="booking-automation"
            title="Booking Automation"
            icon={Zap}
            description="Automate host-side actions on new requests."
          >
            <ParkingBookingAutomationSection
              value={automationDraft}
              disabled={busy}
              onChange={setAutomationToggle}
            />
          </AdminSection>

          <AdminSection
            id="integrations"
            title="Integrations"
            icon={Globe}
            description="Telegram and AI service status."
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
            description="Archive or permanently delete this slot."
            className="border-destructive/50"
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-2.5 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold sm:text-sm">
                    {isArchived ? 'Restore parking' : 'Archive parking'}
                  </p>
                  <p className="text-card-description">
                    {isArchived
                      ? 'Sets status to Active — shows this slot on the public listing again.'
                      : 'Sets status to Inactive — hides this slot from the public listing. Bookings and settings are kept.'}
                  </p>
                </div>
                {isArchived ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || updateParking.isPending}
                    className="settings-action w-full sm:w-auto"
                    onClick={() => setRestoreOpen(true)}
                  >
                    {updateParking.isPending ? 'Restoring…' : 'Restore'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || updateParking.isPending}
                    className="settings-action w-full sm:w-auto"
                    onClick={() => setArchiveOpen(true)}
                  >
                    {updateParking.isPending ? 'Archiving…' : 'Archive'}
                  </Button>
                )}
              </div>

              <div className="border-destructive/50 flex flex-col gap-2.5 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="space-y-0.5">
                  <p className="text-destructive text-xs font-semibold sm:text-sm">
                    Delete parking
                  </p>
                  <p className="text-card-description">
                    Permanently removes this parking slot and its settings. This cannot be undone.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy || deleteParking.isPending}
                  className="settings-action w-full sm:w-auto"
                  onClick={() => setDeleteOpen(true)}
                >
                  {deleteParking.isPending ? 'Deleting…' : 'Delete parking'}
                </Button>
              </div>
            </div>

            <ResponsiveModal open={archiveOpen} onOpenChange={setArchiveOpen}>
              <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
                <ResponsiveModalHeader>
                  <ResponsiveModalTitle>
                    Archive {displayName || parking.name}?
                  </ResponsiveModalTitle>
                  <ResponsiveModalDescription>
                    This parking slot will be marked Inactive and hidden from the public listing.
                    You can restore it anytime from this section.
                  </ResponsiveModalDescription>
                </ResponsiveModalHeader>
                <ResponsiveModalFooter className="flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] w-full sm:w-auto"
                    disabled={updateParking.isPending}
                    onClick={() => setArchiveOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="min-h-[44px] w-full sm:w-auto"
                    disabled={updateParking.isPending}
                    onClick={() => void handleArchive()}
                  >
                    {updateParking.isPending ? 'Archiving…' : 'Archive parking'}
                  </Button>
                </ResponsiveModalFooter>
              </ResponsiveModalContent>
            </ResponsiveModal>

            <ResponsiveModal open={restoreOpen} onOpenChange={setRestoreOpen}>
              <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
                <ResponsiveModalHeader>
                  <ResponsiveModalTitle>
                    Restore {displayName || parking.name}?
                  </ResponsiveModalTitle>
                  <ResponsiveModalDescription>
                    This parking slot will be marked Active and appear on the public listing again.
                  </ResponsiveModalDescription>
                </ResponsiveModalHeader>
                <ResponsiveModalFooter className="flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] w-full sm:w-auto"
                    disabled={updateParking.isPending}
                    onClick={() => setRestoreOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="min-h-[44px] w-full sm:w-auto"
                    disabled={updateParking.isPending}
                    onClick={() => void handleRestore()}
                  >
                    {updateParking.isPending ? 'Restoring…' : 'Restore parking'}
                  </Button>
                </ResponsiveModalFooter>
              </ResponsiveModalContent>
            </ResponsiveModal>

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
    </>
  );
}
