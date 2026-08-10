import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { AlertTriangle, Info, Loader2, Save, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  AdminSectionNavLayout,
  type AdminSectionNavItem,
} from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { OrgAiPlatformSection } from '@/features/dashboard/org/components/org-settings/OrgAiPlatformSection';
import { OrgDangerZoneSection } from '@/features/dashboard/org/components/org-settings/OrgDangerZoneSection';
import {
  OrgBasicInformationSection,
  OrgSocialsBrandingSection,
} from '@/features/dashboard/org/components/org-settings/OrgProfileSettingsSections';
import { OrgSettingsBrandColorPreview } from '@/features/dashboard/org/components/org-settings/OrgSettingsBrandColorPreview';
import { useCheckOrganizationName } from '@/features/dashboard/org/hooks/useCheckOrganizationName';
import { useDeleteOrganization } from '@/features/dashboard/org/hooks/useDeleteOrganization';
import { useOrganizations, useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import {
  orgOperatorFormIsDirty,
  orgSettingsToFormValues,
  useOrgSettings,
  useUpdateOrgSettings,
  type OrgOperatorSettingsFormValues,
} from '@/features/dashboard/org/hooks/useOrgSettings';
import {
  useOrgSettingsCompletionForDraft,
  useSavedOrgSettingsCompletion,
} from '@/features/dashboard/org/hooks/useOrgSettingsCompletion';
import { useUpdateOrganization } from '@/features/dashboard/org/hooks/useUpdateOrganization';
import { publicHostSlugUrlPrefix } from '@/features/dashboard/org/lib/guestPublicPaths';
import { type OrgSettingsSectionId } from '@/features/dashboard/org/lib/orgSettingsCompletion';
import { resolveOrgSettingsFieldError } from '@/features/dashboard/org/lib/orgSettingsFieldError';
import {
  orgSettingsDraftFromOrg,
  orgSettingsDraftIsDirty,
  orgSettingsDraftToPayload,
  orgSlugPreview,
  type OrgSettingsDraft,
} from '@/features/dashboard/org/lib/orgSettingsForm';
import { setOrgSettingsIssueSections } from '@/features/dashboard/org/lib/orgSettingsIssuesStore';
import { planOrgSettingsSave } from '@/features/dashboard/org/lib/orgSettingsSave';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { MobileHeroActionButton } from '@/components/mobile/MobileHeroActionButton';
import { Button } from '@/components/ui/button';
import { resolveNameAvailabilityState } from '@/lib/availabilityCheckState';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

const SETTINGS_SECTIONS: AdminSectionNavItem[] = [
  { id: 'basic', label: 'Basic information', icon: Info },
  { id: 'branding', label: 'Socials', icon: Share2 },
  { id: 'ai', label: 'AI usage', icon: Sparkles },
  { id: 'danger', label: 'Danger zone', icon: AlertTriangle },
];

export function OrgSettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { data, isLoading: orgsLoading } = useOrganizations();
  const { isLoading: propsLoading } = useProperties(orgSlug);
  const {
    data: operatorData,
    isLoading: operatorLoading,
    isError: operatorError,
    error: operatorLoadError,
  } = useOrgSettings();
  const updateOrganization = useUpdateOrganization();
  const updateOrgSettings = useUpdateOrgSettings();
  const deleteOrganization = useDeleteOrganization();

  const org = data?.organizations.find((entry) => entry.slug === orgSlug);

  const [profileBaseline, setProfileBaseline] = useState<OrgSettingsDraft | null>(null);
  const [operatorBaseline, setOperatorBaseline] = useState<OrgOperatorSettingsFormValues | null>(
    null
  );

  const [profileDraft, setProfileDraft] = useState<OrgSettingsDraft | null>(null);
  const [operatorDraft, setOperatorDraft] = useState<OrgOperatorSettingsFormValues | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [interactedFields, setInteractedFields] = useState<Record<string, boolean>>({});

  const markFieldInteracted = useCallback((fieldId: string) => {
    setInteractedFields((current) => {
      if (current[fieldId]) return current;
      return { ...current, [fieldId]: true };
    });
  }, []);

  const profileDirtyRef = useRef(false);
  const operatorDirtyRef = useRef(false);

  useEffect(() => {
    if (!org) return;
    if (profileDirtyRef.current) return;
    const next = orgSettingsDraftFromOrg(org);
    setProfileDraft(next);
    setProfileBaseline(next);
  }, [org?.id, org?.updatedAt, org?.settings]);

  useEffect(() => {
    if (!operatorData) return;
    const next = orgSettingsToFormValues(operatorData);
    setOperatorBaseline(next);
    if (!operatorDirtyRef.current) {
      setOperatorDraft(next);
    }
  }, [operatorData]);

  const profileDirty =
    profileDraft && profileBaseline
      ? orgSettingsDraftIsDirty(profileDraft, profileBaseline)
      : false;
  profileDirtyRef.current = profileDirty;
  const operatorDirty =
    operatorDraft && operatorBaseline
      ? orgOperatorFormIsDirty(operatorDraft, operatorBaseline)
      : false;
  operatorDirtyRef.current = operatorDirty;
  const isDirty = profileDirty || operatorDirty;

  const nameChanged =
    profileDraft && profileBaseline
      ? profileDraft.name.trim().toLowerCase() !== profileBaseline.name.trim().toLowerCase()
      : false;

  const nameCheck = useCheckOrganizationName(
    profileDraft?.name ?? '',
    org?.id,
    Boolean(profileDraft && nameChanged)
  );

  const nameUnavailable = nameChanged && nameCheck.isUnavailable;
  const nameConflictMessage = nameUnavailable ? (nameCheck.data?.message ?? null) : null;
  const nameChecking = nameChanged && nameCheck.showChecking;
  const nameAvailabilityState = resolveNameAvailabilityState({
    ready: Boolean(profileDraft && nameChanged && profileDraft.name.trim().length >= 2),
    showChecking: nameCheck.showChecking,
    isUnavailable: nameCheck.isUnavailable,
    isFetched: nameCheck.isFetched,
  });

  const busy =
    updateOrganization.isPending || updateOrgSettings.isPending || deleteOrganization.isPending;
  const isLoading = orgsLoading || propsLoading || operatorLoading;

  const setProfileField = <K extends keyof OrgSettingsDraft>(
    key: K,
    value: OrgSettingsDraft[K]
  ) => {
    setProfileDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const setOperatorField = <K extends keyof OrgOperatorSettingsFormValues>(
    key: K,
    value: OrgOperatorSettingsFormValues[K]
  ) => {
    setOperatorDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const scrollToOrgSettingsSection = (sectionId: OrgSettingsSectionId) => {
    document
      .getElementById(`section-${sectionId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = async () => {
    if (!org || !profileDraft || !operatorDraft || !profileBaseline || !operatorBaseline) return;

    const plan = planOrgSettingsSave({
      profileDraft,
      profileBaseline,
      operatorDraft,
      operatorBaseline,
      completion: settingsCompletion,
    });

    if (!plan.hasSavableWork) {
      setShowValidationErrors(true);
      if (plan.firstBlockedMessage) {
        toast.error(plan.firstBlockedMessage);
      } else if (!profileDirty && !operatorDirty) {
        toast.message('No changes to save');
      }
      if (plan.firstBlockedSectionId) {
        scrollToOrgSettingsSection(plan.firstBlockedSectionId);
      }
      return;
    }

    setShowValidationErrors(false);

    try {
      let savedSomething = false;

      if (plan.saveProfile) {
        const payload = orgSettingsDraftToPayload(profileDraft, org.id);
        const result = await updateOrganization.mutateAsync(payload);
        const savedProfile = orgSettingsDraftFromOrg(result.organization);
        setProfileDraft(savedProfile);
        setProfileBaseline(savedProfile);
        const nextSlug = result.organization.slug;
        if (nextSlug !== orgSlug) {
          navigate(`/org/${nextSlug}/settings`, { replace: true });
        }
        savedSomething = true;
      }

      if (plan.saveOperator) {
        const saved = await updateOrgSettings.mutateAsync(operatorDraft);
        const values = orgSettingsToFormValues(saved);
        setOperatorDraft(values);
        setOperatorBaseline(values);
        savedSomething = true;
      }

      if (savedSomething) {
        setInteractedFields({});
        if (plan.blockedSections.length > 0) {
          toast.success('New changes has been saved.');
          scrollToOrgSettingsSection(plan.blockedSections[0]!);
        } else {
          toast.success('Settings saved');
        }
      }
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save settings'));
    }
  };

  const handleDeleteOrganization = async () => {
    if (!org) return;
    try {
      await deleteOrganization.mutateAsync(org.id);
      toast.success('Organization deleted');
      navigate('/org', { replace: true });
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not delete organization'));
      throw error;
    }
  };

  const orgUrlPrefix = publicHostSlugUrlPrefix();

  const operatorSources = operatorData?.fieldSources;
  const formBusy = busy || isLoading;
  const slugPreview =
    org && profileDraft && profileBaseline
      ? orgSlugPreview(profileDraft.name, org.slug, profileBaseline.name)
      : '';

  const savedCompletion = useSavedOrgSettingsCompletion();

  const completionInput =
    profileDraft && operatorDraft
      ? {
          profile: profileDraft,
          operator: operatorDraft,
          nameUnavailable,
        }
      : null;

  const { completion: settingsCompletion } = useOrgSettingsCompletionForDraft(completionInput);

  const navSections = useMemo(
    (): AdminSectionNavItem[] =>
      SETTINGS_SECTIONS.map((section) => ({
        ...section,
        hasIssue:
          section.id !== 'danger' &&
          settingsCompletion.issueSectionIds.includes(section.id as OrgSettingsSectionId),
      })),
    [settingsCompletion.issueSectionIds]
  );

  useEffect(() => {
    if (!profileDraft || !operatorDraft) return;
    setOrgSettingsIssueSections(settingsCompletion.issueSectionIds);
    return () => {
      setOrgSettingsIssueSections(savedCompletion.issueSectionIds);
    };
  }, [
    profileDraft,
    operatorDraft,
    settingsCompletion.issueSectionIds,
    savedCompletion.issueSectionIds,
  ]);

  const resolveFieldError = useCallback(
    (fieldId: string) =>
      resolveOrgSettingsFieldError(
        fieldId,
        settingsCompletion.fieldErrors,
        interactedFields,
        showValidationErrors
      ),
    [settingsCompletion.fieldErrors, interactedFields, showValidationErrors]
  );

  return (
    <RequireAdmin>
      <AdminMobilePage
        title="Settings"
        subtitle="Manage your organization's profile, billing, and preferences."
        titleId="org-settings-heading"
        className="flex min-h-0 flex-1 flex-col"
        heroTrailing={
          isDirty && profileDraft ? (
            <MobileHeroActionButton
              aria-label={busy ? 'Saving' : 'Save changes'}
              disabled={busy || nameUnavailable || nameChecking}
              onClick={() => void handleSave()}
            >
              <Save className="size-5" aria-hidden />
            </MobileHeroActionButton>
          ) : undefined
        }
        desktopActions={
          isDirty && profileDraft ? (
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy || nameUnavailable || nameChecking}
              className="min-h-[44px] gap-1.5"
            >
              <Save className="size-4" aria-hidden />
              {busy ? 'Saving…' : 'Save'}
            </Button>
          ) : undefined
        }
      >
        {profileDraft ? (
          <OrgSettingsBrandColorPreview brandColor={profileDraft.brandColor} />
        ) : null}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
          </div>
        ) : !org || !profileDraft || !operatorDraft || !operatorData ? (
          <p className="text-muted-foreground text-sm">Organization not found.</p>
        ) : (
          <AdminSectionNavLayout
            className="min-h-0 flex-1"
            sections={navSections}
            footer={
              isDirty ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Unsaved changes
                  </p>
                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={busy || nameUnavailable || nameChecking}
                    className="min-h-[44px] w-full sm:w-auto"
                  >
                    {busy ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              ) : null
            }
          >
            {operatorError ? (
              <p className="text-destructive text-sm">
                {(operatorLoadError as Error)?.message ?? 'Could not load organization settings'}
              </p>
            ) : null}

            <OrgBasicInformationSection
              draft={profileDraft}
              disabled={formBusy}
              orgUrlPrefix={orgUrlPrefix}
              slugPreview={slugPreview}
              logoSource={operatorSources?.emailLogoUrl}
              logoUrl={operatorData.emailLogoUrl}
              nameUnavailable={nameUnavailable}
              nameConflictMessage={nameConflictMessage}
              nameAvailabilityState={nameAvailabilityState}
              resolveFieldError={resolveFieldError}
              markFieldInteracted={markFieldInteracted}
              onChange={setProfileField}
            />

            <OrgSocialsBrandingSection
              operatorDraft={operatorDraft}
              disabled={formBusy}
              resolveFieldError={resolveFieldError}
              markFieldInteracted={markFieldInteracted}
              onOperatorChange={setOperatorField}
            />

            <OrgAiPlatformSection />

            <OrgDangerZoneSection
              orgName={org.name}
              orgSlug={org.slug}
              disabled={formBusy}
              deletePending={deleteOrganization.isPending}
              onDelete={handleDeleteOrganization}
            />
          </AdminSectionNavLayout>
        )}
      </AdminMobilePage>
    </RequireAdmin>
  );
}
