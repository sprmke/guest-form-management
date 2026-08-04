import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  AlertTriangle,
  ClipboardList,
  FileCheck2,
  FormInput,
  Globe,
  Home,
  Image as ImageIcon,
  Info,
  ListChecks,
  Mail,
  MapPin,
  Mic,
  Save,
  Share2,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  AdminSectionNavLayout,
  type AdminSectionNavItem,
} from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import {
  appSettingsToFormValues,
  useAppSettings,
  useUpdateAppSettings,
  type AppSettingsFormValues,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import {
  buildVoiceReceptionistPatch,
  useUpdateVoiceReceptionistSettings,
  useVoiceReceptionistSettings,
  voiceReceptionistFormIsDirty,
  voiceReceptionistToFormValues,
  type VoiceReceptionistFormValues,
} from '@/features/dashboard/bookings/hooks/useVoiceReceptionistSettings';
import {
  applyBuildingFormsTeamDefaults,
  pickBuildingFormsTeamContact,
} from '@/features/dashboard/bookings/lib/buildingFormsTeamDefaults';
import { PaymentSettingsSaveConfirmDialog } from '@/features/dashboard/org/components/property-settings/PaymentSettingsSaveConfirmDialog';
import {
  operationalSettingsDraftIsDirty,
  PropertyOperationalSettingsSections,
} from '@/features/dashboard/org/components/property-settings/PropertyOperationalSettingsSections';
import {
  PropertyDangerZoneSection,
  PropertyProfileMainSections,
} from '@/features/dashboard/org/components/property-settings/PropertyProfileSettingsSections';
import { PropertySettingsBrandColorPreview } from '@/features/dashboard/org/components/property-settings/PropertySettingsBrandColorPreview';
import { PropertySocialsBrandingSection } from '@/features/dashboard/org/components/property-settings/PropertySocialsBrandingSection';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useCheckPropertyName } from '@/features/dashboard/org/hooks/useCheckPropertyName';
import { useDeleteProperty } from '@/features/dashboard/org/hooks/useDeleteProperty';
import { useOrgBrandColor } from '@/features/dashboard/org/hooks/useOrgBrandColor';
import {
  orgSettingsToFormValues,
  useOrgSettings,
} from '@/features/dashboard/org/hooks/useOrgSettings';
import { usePropertySettingsCompletionForDraft } from '@/features/dashboard/org/hooks/usePropertySettingsCompletion';
import { useTowerUnitConflict } from '@/features/dashboard/org/hooks/useTowerUnitConflict';
import { useUpdateProperty } from '@/features/dashboard/org/hooks/useUpdateProperty';
import { publicPropertySlugUrlPrefix } from '@/features/dashboard/org/lib/guestPublicPaths';
import { paymentMethodsDraftIsDirty } from '@/features/dashboard/org/lib/paymentMethods';
import type { PropertyAutomationToggleKey } from '@/features/dashboard/org/lib/propertyEmailAutomation';
import { type PropertySettingsSectionId } from '@/features/dashboard/org/lib/propertySettingsCompletion';
import { resolvePropertySettingsFieldError } from '@/features/dashboard/org/lib/propertySettingsFieldError';
import {
  gafTowerUnitFromProfile,
  propertyProfileDraftFromProperty,
  propertyProfileDraftIsDirty,
  propertySlugPreview,
  type PropertyProfileDraft,
} from '@/features/dashboard/org/lib/propertySettingsForm';
import { setPropertySettingsIssueSections } from '@/features/dashboard/org/lib/propertySettingsIssuesStore';
import {
  applySavedOperationalSections,
  applySavedProfileSections,
  buildAppSettingsPatchForSections,
  buildProfilePatchForSections,
  planPropertySettingsSave,
} from '@/features/dashboard/org/lib/propertySettingsSave';
import { normalizePropertySocialLinksForSave } from '@/features/dashboard/org/lib/propertySocialLinks';
import { orgPropertiesPath, propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { usePropertyTeam } from '@/features/dashboard/team/hooks/usePropertyTeam';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { MobileHeroActionButton } from '@/components/mobile/MobileHeroActionButton';
import { AppSettingsCardSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { propertyBrandColorStoredValue } from '@/lib/theme/brandColor';

const SETTINGS_SECTIONS: AdminSectionNavItem[] = [
  { id: 'basic', label: 'Basic Information', icon: Info },
  { id: 'media', label: 'Photos & Videos', icon: ImageIcon },
  { id: 'details', label: 'Property Details', icon: Home },
  { id: 'amenities', label: 'Amenities', icon: Sparkles },
  { id: 'house-rules', label: 'House Rules', icon: ListChecks },
  { id: 'guest-form', label: 'Guest Form', icon: FormInput },
  { id: 'cancellation', label: 'Cancellation', icon: Shield },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'branding', label: 'Socials', icon: Share2 },
  { id: 'payment', label: 'Payment', icon: Wallet },
  { id: 'building-forms', label: 'Building Forms', icon: ClipboardList },
  { id: 'email-automations', label: 'Email Automations', icon: Mail },
  { id: 'workflow-documents', label: 'Booking Workflow', icon: FileCheck2 },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'voice-receptionist', label: 'Voice Receptionist', icon: Mic },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

function mergeProfileDraftAfterSave(
  current: PropertyProfileDraft,
  saved: PropertyProfileDraft
): PropertyProfileDraft {
  return {
    ...saved,
    type: current.type,
  };
}

export function PropertySettingsCard() {
  const navigate = useNavigate();
  const { property, orgSlug, propertySlug } = useOrgContext();
  const {
    data: appSettings,
    isLoading: appSettingsLoading,
    isError: appSettingsError,
    error: appSettingsLoadError,
  } = useAppSettings();
  const { data: propertyTeam } = usePropertyTeam();
  const updateProperty = useUpdateProperty(orgSlug);
  const deleteProperty = useDeleteProperty(orgSlug);
  const updateAppSettings = useUpdateAppSettings();
  const {
    data: voiceSettings,
    isLoading: voiceSettingsLoading,
    isError: voiceSettingsError,
    error: voiceSettingsLoadError,
  } = useVoiceReceptionistSettings();
  const updateVoiceSettings = useUpdateVoiceReceptionistSettings();
  const orgBrandColor = useOrgBrandColor();
  const inheritedBrandColor = appSettings?.inheritedBrandColor ?? orgBrandColor;
  const { data: orgSettings } = useOrgSettings();
  const orgSocialLinks = useMemo(
    () =>
      orgSettings
        ? orgSettingsToFormValues(orgSettings)
        : {
            facebookPageUrl: '',
            airbnbUrl: '',
            instagramUrl: '',
            tiktokUrl: '',
            mainSocialPlatform: '',
          },
    [orgSettings]
  );

  const [profileBaseline, setProfileBaseline] = useState(() =>
    propertyProfileDraftFromProperty(property)
  );
  const [profileDraft, setProfileDraft] = useState(profileBaseline);
  const [operationalDraft, setOperationalDraft] = useState<AppSettingsFormValues | null>(null);
  const [operationalBaseline, setOperationalBaseline] = useState<AppSettingsFormValues | null>(
    null
  );
  const [voiceDraft, setVoiceDraft] = useState<VoiceReceptionistFormValues | null>(null);
  const [voiceBaseline, setVoiceBaseline] = useState<VoiceReceptionistFormValues | null>(null);
  const [newCustomAmenityInputs, setNewCustomAmenityInputs] = useState<Record<string, string>>({});
  const [newCustomHouseRuleInputs, setNewCustomHouseRuleInputs] = useState<Record<string, string>>(
    {}
  );
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [interactedFields, setInteractedFields] = useState<Record<string, boolean>>({});
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);

  const markFieldInteracted = useCallback((fieldId: string) => {
    setInteractedFields((current) => {
      if (current[fieldId]) return current;
      return { ...current, [fieldId]: true };
    });
  }, []);

  const profileDirtyRef = useRef(false);
  const operationalDirtyRef = useRef(false);
  const voiceDirtyRef = useRef(false);
  const skipProfileSyncRef = useRef(false);
  const [mediaGalleryBusy, setMediaGalleryBusy] = useState(false);

  useEffect(() => {
    if (profileDirtyRef.current) return;
    if (skipProfileSyncRef.current) {
      skipProfileSyncRef.current = false;
      return;
    }
    const next = propertyProfileDraftFromProperty(property);
    setProfileDraft(next);
    setProfileBaseline(next);
  }, [property.id, property.updatedAt, property.settings]);

  useEffect(() => {
    if (!appSettings) return;
    if (operationalDirtyRef.current) return;
    let values = appSettingsToFormValues(appSettings);
    const teamDefaults = propertyTeam?.members
      ? pickBuildingFormsTeamContact(propertyTeam.members)
      : null;
    values = applyBuildingFormsTeamDefaults(values, appSettings.fieldSources, teamDefaults);
    setOperationalDraft(values);
    setOperationalBaseline(values);
  }, [appSettings, propertyTeam?.members]);

  useEffect(() => {
    if (!voiceSettings) return;
    if (voiceDirtyRef.current) return;
    const values = voiceReceptionistToFormValues(voiceSettings);
    setVoiceDraft(values);
    setVoiceBaseline(values);
  }, [voiceSettings]);

  const gafTowerUnit = useMemo(
    () => gafTowerUnitFromProfile(profileDraft),
    [profileDraft.tower, profileDraft.unitNumber]
  );

  useEffect(() => {
    setOperationalDraft((current) => {
      if (!current || current.gafTowerAndUnitNumber === gafTowerUnit) return current;
      return { ...current, gafTowerAndUnitNumber: gafTowerUnit };
    });
  }, [gafTowerUnit]);

  const profileDirty = propertyProfileDraftIsDirty(profileDraft, profileBaseline);
  profileDirtyRef.current = profileDirty;

  const nameChanged =
    profileDraft.name.trim().toLowerCase() !== profileBaseline.name.trim().toLowerCase();

  const nameCheck = useCheckPropertyName(profileDraft.name, property.id, nameChanged);

  const nameUnavailable = nameChanged && nameCheck.isUnavailable;
  const nameConflictMessage = nameUnavailable ? (nameCheck.data?.message ?? null) : null;

  const { conflict: towerConflictDetail, hasActiveListing: towerUnitListed } = useTowerUnitConflict(
    profileDraft.tower,
    profileDraft.unitNumber,
    property.id
  );

  // Only treat ACTIVE peer as a save blocker when this listing is (or would stay) ACTIVE.
  const towerUnitBlocksSave =
    towerUnitListed && (profileDraft.status === 'ACTIVE' || property.status === 'ACTIVE');

  const { completion: draftCompletion } = usePropertySettingsCompletionForDraft({
    profile: profileDraft,
    operational: operationalDraft,
    propertyId: property.id,
    orgSlug,
    nameUnavailable,
    towerUnitConflict: towerUnitBlocksSave,
  });

  const { completion: savedCompletion } = usePropertySettingsCompletionForDraft({
    profile: profileBaseline,
    operational: operationalBaseline,
    propertyId: property.id,
    orgSlug,
    nameUnavailable: false,
    towerUnitConflict: false,
  });

  const towerConflict = towerUnitBlocksSave ? towerConflictDetail : null;

  const settingsCompletion = draftCompletion;

  const resolveFieldError = useCallback(
    (fieldId: string) =>
      resolvePropertySettingsFieldError(
        fieldId,
        settingsCompletion.fieldErrors,
        interactedFields,
        showValidationErrors
      ),
    [settingsCompletion.fieldErrors, interactedFields, showValidationErrors]
  );
  const operationalDirty =
    operationalDraft && operationalBaseline && appSettings
      ? operationalSettingsDraftIsDirty(operationalDraft, operationalBaseline, inheritedBrandColor)
      : false;
  operationalDirtyRef.current = operationalDirty;
  const voiceDirty =
    voiceDraft && voiceBaseline ? voiceReceptionistFormIsDirty(voiceDraft, voiceBaseline) : false;
  voiceDirtyRef.current = voiceDirty;
  const isDirty = profileDirty || operationalDirty || voiceDirty;

  const busy =
    appSettingsLoading ||
    updateAppSettings.isPending ||
    updateVoiceSettings.isPending ||
    deleteProperty.isPending ||
    (updateProperty.isPending && !mediaGalleryBusy);

  const propertySlugPrefix = publicPropertySlugUrlPrefix();

  const slugPreview = propertySlugPreview(profileDraft.name, property.slug, profileBaseline.name);

  const navSections = useMemo(
    (): AdminSectionNavItem[] =>
      SETTINGS_SECTIONS.map((section) => ({
        ...section,
        hasIssue: settingsCompletion.issueSectionIds.includes(
          section.id as PropertySettingsSectionId
        ),
      })),
    [settingsCompletion.issueSectionIds]
  );

  useEffect(() => {
    setPropertySettingsIssueSections(settingsCompletion.issueSectionIds);
    return () => {
      setPropertySettingsIssueSections(savedCompletion.issueSectionIds);
    };
  }, [settingsCompletion.issueSectionIds, savedCompletion.issueSectionIds]);

  const scrollToSettingsSection = (sectionId: PropertySettingsSectionId) => {
    document
      .getElementById(`section-${sectionId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setProfileField = <K extends keyof PropertyProfileDraft>(
    key: K,
    value: PropertyProfileDraft[K]
  ) => {
    setProfileDraft((current) => ({ ...current, [key]: value }));
  };

  const handleMediaPersisted = (media: PropertyProfileDraft['media']) => {
    setProfileDraft((current) => ({ ...current, media }));
    setProfileBaseline((current) => ({ ...current, media }));
  };

  const persistMediaOrder = async (media: PropertyProfileDraft['media']) => {
    skipProfileSyncRef.current = true;
    setMediaGalleryBusy(true);
    try {
      const result = await updateProperty.mutateAsync({
        propertyId: property.id,
        status: profileDraft.status,
        settings: { media },
      });
      const savedProfile = propertyProfileDraftFromProperty(result.property);
      handleMediaPersisted(savedProfile.media);
    } finally {
      setMediaGalleryBusy(false);
    }
  };

  const setOperationalField = <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K]
  ) => {
    setOperationalDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const setAutomationToggle = (key: PropertyAutomationToggleKey, value: boolean) => {
    setOperationalDraft((current) =>
      current
        ? {
            ...current,
            automationToggles: { ...current.automationToggles, [key]: value },
          }
        : current
    );
  };

  const setVoiceField = <K extends keyof VoiceReceptionistFormValues>(
    key: K,
    value: VoiceReceptionistFormValues[K]
  ) => {
    setVoiceDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = async (options?: { skipPaymentConfirm?: boolean }) => {
    if (!operationalDraft || !operationalBaseline || !appSettings) return;

    if (towerConflict) {
      toast.error('Tower and unit combination is already in use');
      return;
    }

    const plan = planPropertySettingsSave({
      profileDraft,
      profileBaseline,
      operationalDraft,
      operationalBaseline,
      completion: settingsCompletion,
      inheritedBrandColor,
    });

    if (!plan.hasSavableWork && !voiceDirty) {
      setShowValidationErrors(true);
      if (plan.firstBlockedMessage) {
        toast.error(plan.firstBlockedMessage);
      } else if (!profileDirty && !operationalDirty && !voiceDirty) {
        toast.message('No changes to save');
      }
      if (plan.firstBlockedSectionId) {
        scrollToSettingsSection(plan.firstBlockedSectionId);
      }
      return;
    }

    const paymentWillSave = plan.operationalSections.includes('payment');
    const paymentChanged = paymentMethodsDraftIsDirty(
      operationalDraft.paymentMethods,
      operationalBaseline.paymentMethods
    );

    if (paymentWillSave && paymentChanged && !options?.skipPaymentConfirm) {
      setPaymentConfirmOpen(true);
      return;
    }

    setShowValidationErrors(false);

    try {
      let savedSomething = false;
      const savedProfileSections = plan.profileSections;
      const savedOperationalSections = plan.operationalSections;

      const profilePayload = buildProfilePatchForSections(
        profileDraft,
        property.id,
        savedProfileSections
      );
      if (profilePayload) {
        const result = await updateProperty.mutateAsync(profilePayload);
        const savedProfile = propertyProfileDraftFromProperty(result.property);
        const mergedSaved = mergeProfileDraftAfterSave(profileDraft, savedProfile);
        setProfileDraft((current) =>
          applySavedProfileSections(current, mergedSaved, savedProfileSections)
        );
        setProfileBaseline((current) =>
          applySavedProfileSections(current, mergedSaved, savedProfileSections)
        );
        savedSomething = true;
        if (profilePayload.name && result.property.slug !== propertySlug) {
          navigate(propertySectionPath(orgSlug, result.property.slug, 'settings'), {
            replace: true,
          });
        }
      }

      const operationalPatch = buildAppSettingsPatchForSections(
        {
          ...operationalDraft,
          ...normalizePropertySocialLinksForSave(operationalDraft, orgSocialLinks),
          gafTowerAndUnitNumber: gafTowerUnitFromProfile(profileDraft),
          brandColor: propertyBrandColorStoredValue(
            operationalDraft.brandColor,
            inheritedBrandColor
          ),
        },
        savedOperationalSections
      );
      if (operationalPatch) {
        const saved = await updateAppSettings.mutateAsync(operationalPatch);
        const values = appSettingsToFormValues(saved);
        setOperationalDraft((current) =>
          current
            ? applySavedOperationalSections(current, values, savedOperationalSections)
            : values
        );
        setOperationalBaseline((current) =>
          current
            ? applySavedOperationalSections(current, values, savedOperationalSections)
            : values
        );
        savedSomething = true;
      }

      if (voiceDirty && voiceDraft) {
        const saved = await updateVoiceSettings.mutateAsync(
          buildVoiceReceptionistPatch(voiceDraft)
        );
        const values = voiceReceptionistToFormValues(saved);
        setVoiceDraft(values);
        setVoiceBaseline(values);
        savedSomething = true;
      }

      if (savedSomething) {
        setInteractedFields({});
        if (plan.blockedSections.length > 0) {
          toast.success('New changes has been saved.');
          scrollToSettingsSection(plan.blockedSections[0]!);
        } else {
          toast.success('Settings saved');
        }
      }
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save settings'));
    } finally {
      setPaymentConfirmOpen(false);
    }
  };

  const handlePaymentConfirmSave = () => {
    void handleSave({ skipPaymentConfirm: true });
  };

  const handleArchiveProperty = async () => {
    try {
      const result = await updateProperty.mutateAsync({
        propertyId: property.id,
        status: 'INACTIVE',
      });
      const savedProfile = propertyProfileDraftFromProperty(result.property);
      setProfileDraft(savedProfile);
      setProfileBaseline(savedProfile);
      toast.success('Property archived');
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not archive property'));
      throw error;
    }
  };

  const handleRestoreProperty = async () => {
    try {
      const result = await updateProperty.mutateAsync({
        propertyId: property.id,
        status: 'ACTIVE',
      });
      const savedProfile = propertyProfileDraftFromProperty(result.property);
      setProfileDraft(savedProfile);
      setProfileBaseline(savedProfile);
      toast.success('Property restored');
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not restore property'));
      throw error;
    }
  };

  const handleDeleteProperty = async () => {
    await deleteProperty.mutateAsync(property.id);
    toast.success('Property deleted');
    navigate(orgPropertiesPath(orgSlug));
  };

  if (appSettingsLoading) {
    return <AppSettingsCardSkeleton />;
  }

  return (
    <AdminMobilePage
      title="Settings"
      subtitle="Profile, operations, and integrations for this listing."
      titleId="property-settings-heading"
      className="flex min-h-0 flex-1 flex-col"
      heroTrailing={
        isDirty ? (
          <MobileHeroActionButton
            aria-label={busy ? 'Saving' : 'Save changes'}
            disabled={busy || Boolean(towerConflict) || nameUnavailable}
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
            disabled={busy || Boolean(towerConflict) || nameUnavailable}
            className="min-h-[44px] gap-1.5"
          >
            <Save className="size-4" aria-hidden />
            {busy ? 'Saving...' : 'Save Changes'}
          </Button>
        ) : undefined
      }
    >
      <PaymentSettingsSaveConfirmDialog
        open={paymentConfirmOpen}
        onOpenChange={setPaymentConfirmOpen}
        onConfirm={handlePaymentConfirmSave}
        busy={busy}
      />
      {operationalDraft && appSettings ? (
        <PropertySettingsBrandColorPreview
          brandColor={operationalDraft.brandColor}
          resolvedBrandColor={appSettings.resolvedBrandColor}
        />
      ) : null}
      {appSettingsError ? (
        <p className="text-destructive text-sm">
          {(appSettingsLoadError as Error)?.message ?? 'Could not load operational settings'}
        </p>
      ) : null}

      {appSettings && operationalDraft ? (
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
                    disabled={busy || Boolean(towerConflict) || nameUnavailable}
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
          <PropertyProfileMainSections
            draft={profileDraft}
            onChange={setProfileField}
            disabled={busy}
            propertySlugPrefix={propertySlugPrefix}
            slugPreview={slugPreview}
            towerConflict={towerConflict}
            nameUnavailable={nameUnavailable}
            nameConflictMessage={nameConflictMessage}
            nameChecking={nameChanged && nameCheck.showChecking}
            newCustomAmenityInputs={newCustomAmenityInputs}
            onNewCustomAmenityInputChange={(categoryId, value) =>
              setNewCustomAmenityInputs((current) => ({
                ...current,
                [categoryId]: value,
              }))
            }
            newCustomHouseRuleInputs={newCustomHouseRuleInputs}
            onNewCustomHouseRuleInputChange={(categoryId, value) =>
              setNewCustomHouseRuleInputs((current) => ({
                ...current,
                [categoryId]: value,
              }))
            }
            onMediaPersisted={handleMediaPersisted}
            onPersistMediaOrder={persistMediaOrder}
            mediaGalleryBusy={mediaGalleryBusy}
            resolveFieldError={resolveFieldError}
            markFieldInteracted={markFieldInteracted}
            sectionMessages={settingsCompletion.sectionMessages}
            brandColor={operationalDraft.brandColor}
            inheritedBrandColor={inheritedBrandColor}
            onBrandColorChange={(value) => setOperationalField('brandColor', value)}
          />

          <PropertySocialsBrandingSection
            data={appSettings}
            draft={operationalDraft}
            orgSocialLinks={orgSocialLinks}
            disabled={busy}
            resolveFieldError={resolveFieldError}
            markFieldInteracted={markFieldInteracted}
            onChange={setOperationalField}
            sectionMessages={settingsCompletion.sectionMessages}
          />

          <PropertyOperationalSettingsSections
            data={appSettings}
            draft={operationalDraft}
            residenceName={profileDraft.residenceName}
            towerUnitLabel={gafTowerUnit}
            disabled={busy}
            onChange={setOperationalField}
            onAutomationToggleChange={setAutomationToggle}
            resolveFieldError={resolveFieldError}
            markFieldInteracted={markFieldInteracted}
            sectionMessages={settingsCompletion.sectionMessages}
            voiceReceptionist={{
              draft: voiceDraft,
              availableVoices: voiceSettings?.availableVoices ?? [],
              isLoading: voiceSettingsLoading,
              isError: voiceSettingsError,
              errorMessage: (voiceSettingsLoadError as Error)?.message ?? null,
              onChange: setVoiceField,
            }}
          />

          <PropertyDangerZoneSection
            propertyName={profileDraft.name.trim() || property.name}
            isArchived={profileDraft.status === 'INACTIVE'}
            disabled={busy}
            archivePending={updateProperty.isPending}
            restorePending={updateProperty.isPending}
            deletePending={deleteProperty.isPending}
            onArchive={handleArchiveProperty}
            onRestore={handleRestoreProperty}
            onDelete={handleDeleteProperty}
          />
        </AdminSectionNavLayout>
      ) : null}
    </AdminMobilePage>
  );
}
