import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { toast } from 'sonner';

import { PreviewOverrideProvider } from '@/features/guest/lib/previewOverrideContext';
import { PropertyDetailPage } from '@/features/guest/marketing/pages/PropertyDetailPage';
import { usePublicPropertyDetail } from '@/features/guest/marketing/properties/hooks/usePublicPropertyDetail';
import type { PropertyLandingSectionConfig } from '@/features/guest/marketing/properties/types/publicProperty';
import { useGuestStayGuidePreview } from '@/features/guest/stay-guide/hooks/useGuestStayGuide';
import type { StayGuideSectionConfig } from '@/features/guest/stay-guide/lib/api';
import { extractLeadingSectionHeading } from '@/features/guest/stay-guide/lib/stayGuideContent';
import { StayGuidePage } from '@/features/guest/stay-guide/pages/StayGuidePage';

import {
  appSettingsToFormValues,
  useAppSettings,
  useUpdateAppSettings,
  type AppSettingsFormValues,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import {
  usePropertyTemplateMutations,
  usePropertyTemplates,
  type PropertyTemplateDto,
} from '@/features/dashboard/bookings/hooks/usePropertyTemplates';
import { normalizeBlockLevelPlaceholdersInHtml } from '@/features/dashboard/bookings/lib/normalizeBlockLevelPlaceholders';
import { applyPropertyTemplatePlaceholders } from '@/features/dashboard/bookings/lib/propertyTemplatePlaceholders';
import { PropertySettingsBrandColorPreview } from '@/features/dashboard/org/components/property-settings/PropertySettingsBrandColorPreview';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';
import { hasPropertyPermission } from '@/features/dashboard/team/lib/propertyPermissions';
import { useOrgBrandColor } from '@/features/dashboard/org/hooks/useOrgBrandColor';
import {
  orgSettingsToFormValues,
  useOrgSettings,
} from '@/features/dashboard/org/hooks/useOrgSettings';
import { useUpdateProperty } from '@/features/dashboard/org/hooks/useUpdateProperty';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { validateOrgBrandColor } from '@/features/dashboard/org/lib/orgSettingsValidation';
import {
  resolveCancellationPolicyDisplay,
  validateCancellationPolicySettings,
} from '@/features/dashboard/org/lib/propertyCancellationPolicy';
import {
  mergeExternalReviewsForSingleReviewSave,
  validateExternalReviewDraft,
} from '@/features/dashboard/org/lib/propertyExternalReviews';
import { resolveHouseRulesForDisplay } from '@/features/dashboard/org/lib/propertyHouseRulesConstants';
import {
  resolveAmenityLabels,
  type PropertyMediaItem,
} from '@/features/dashboard/org/lib/propertySettingsConstants';
import {
  propertyMediaFromProperty,
  propertyProfileDraftFromProperty,
} from '@/features/dashboard/org/lib/propertySettingsForm';
import { normalizePropertySocialLinksForSave } from '@/features/dashboard/org/lib/propertySocialLinks';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { PageEditorHeader } from '@/features/dashboard/page-editor/components/PageEditorHeader';
import { PageEditorLeaveConfirmDialog } from '@/features/dashboard/page-editor/components/PageEditorLeaveConfirmDialog';
import { PageEditorPreviewPane } from '@/features/dashboard/page-editor/components/PageEditorPreviewPane';
import { PageEditorShell } from '@/features/dashboard/page-editor/components/PageEditorShell';
import {
  PropertyLandingEditorPanel,
  type LandingProfileContent,
} from '@/features/dashboard/page-editor/components/property-landing/PropertyLandingEditorPanel';
import { PropertyShowcasePageEditor } from '@/features/dashboard/page-editor/components/property-showcase/PropertyShowcasePageEditor';
import { StayGuideEditorPanel } from '@/features/dashboard/page-editor/components/stay-guide/StayGuideEditorPanel';
import {
  draftFromTemplate,
  isStayGuideSectionDraftDirty,
  type StayGuideSectionDraft,
} from '@/features/dashboard/page-editor/components/stay-guide/StayGuideSectionContentCard';
import {
  firstPageEditorAutoSaveError,
  mergePageEditorAutoSaveStatuses,
  usePageEditorAutoSave,
} from '@/features/dashboard/page-editor/hooks/usePageEditorAutoSave';
import {
  usePublicPageConfig,
  useSavePublicPageConfig,
} from '@/features/dashboard/page-editor/hooks/usePublicPageConfig';
import { STAY_GUIDE_STANDARD_TEMPLATE_KEYS } from '@/features/dashboard/page-editor/lib/stayGuideChapterSections';
import { resolvePageEditorPublicLinks } from '@/features/dashboard/page-editor/lib/pageEditorPublicLinks';
import { usePropertyLandingEditorStore } from '@/features/dashboard/page-editor/stores/propertyLandingEditorStore';
import { useStayGuideEditorStore } from '@/features/dashboard/page-editor/stores/stayGuideEditorStore';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { SectionContentSkeleton } from '@/components/skeletons/AdminSkeletons';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { usePageTitle } from '@/lib/pageTitle';
import { propertyBrandColorStoredValue } from '@/lib/theme/brandColor';

const EDITABLE_PAGE_IDS = new Set(['stay-guide', 'listing', 'showcase']);

const PAGE_EDITOR_META = {
  listing: { label: 'Property' },
  'stay-guide': { label: 'Stay Guide' },
  showcase: { label: 'Showcase' },
} as const;

function PageEditorChrome({ children }: { children: ReactNode }) {
  return (
    <AdminMobilePage
      title="Public Pages"
      subtitle="Every guest URL for this listing."
      titleId="public-pages-heading"
    >
      {children}
    </AdminMobilePage>
  );
}

function mediaItemsToPreview(media: PropertyMediaItem[]) {
  const ordered = [...media].sort((a, b) => a.order - b.order);
  const images = ordered.filter((item) => item.type === 'image').map((item) => item.url);
  return {
    media: ordered.map((item) => ({
      id: item.id,
      url: item.url,
      type: item.type,
      caption: item.caption,
      isPrimary: item.isPrimary,
      order: item.order,
    })),
    images,
  };
}

export function PageEditorPage() {
  const { pageId = '' } = useParams<{ pageId: string }>();
  const { orgSlug, propertySlug, property } = useOrgContext();
  const propertyId = usePropertyIdParam();
  const { data: access, isLoading: accessLoading } = usePropertyPermissions();

  const title =
    pageId === 'listing'
      ? property?.name
        ? `${property.name} - Edit Listing`
        : 'Edit Listing'
      : pageId === 'showcase'
        ? property?.name
          ? `${property.name} - Edit Showcase`
          : 'Edit Showcase'
        : property?.name
          ? `${property.name} - Edit Stay Guide`
          : 'Edit Stay Guide';
  usePageTitle(title);

  if (!EDITABLE_PAGE_IDS.has(pageId)) {
    return <Navigate to={propertySectionPath(orgSlug, propertySlug, 'public-pages')} replace />;
  }

  const requiredEdit =
    pageId === 'listing'
      ? 'publicPages.property:edit'
      : pageId === 'showcase'
        ? 'publicPages.showcase:edit'
        : 'publicPages.stayGuide:edit';
  if (!accessLoading && !hasPropertyPermission(access?.permissions, requiredEdit)) {
    return <Navigate to={propertySectionPath(orgSlug, propertySlug, 'public-pages')} replace />;
  }

  if (pageId === 'listing') {
    return (
      <PropertyLandingPageEditor
        orgSlug={orgSlug}
        propertySlug={propertySlug}
        propertyId={propertyId}
      />
    );
  }

  if (pageId === 'showcase') {
    return (
      <PropertyShowcasePageEditor
        orgSlug={orgSlug}
        propertySlug={propertySlug}
        propertyId={propertyId}
      />
    );
  }

  return (
    <StayGuidePageEditor orgSlug={orgSlug} propertySlug={propertySlug} propertyId={propertyId} />
  );
}

function StayGuidePageEditor({
  orgSlug,
  propertySlug,
  propertyId,
}: {
  orgSlug: string;
  propertySlug: string;
  propertyId: string | null;
}) {
  const navigate = useNavigate();
  const configQuery = usePublicPageConfig('stay_guide');
  const saveMutation = useSavePublicPageConfig('stay_guide');
  const previewQuery = useGuestStayGuidePreview(propertySlug, propertyId ?? '');
  const templatesQuery = usePropertyTemplates();
  const { saveTemplate } = usePropertyTemplateMutations();

  const config = useStayGuideEditorStore((s) => s.config);
  const hydrated = useStayGuideEditorStore((s) => s.hydrated);
  const historyIndex = useStayGuideEditorStore((s) => s.historyIndex);
  const historyLength = useStayGuideEditorStore((s) => s.history.length);
  const hydrate = useStayGuideEditorStore((s) => s.hydrate);
  const reset = useStayGuideEditorStore((s) => s.reset);
  const undo = useStayGuideEditorStore((s) => s.undo);
  const redo = useStayGuideEditorStore((s) => s.redo);
  const markClean = useStayGuideEditorStore((s) => s.markClean);

  const [contentDrafts, setContentDrafts] = useState<Record<string, StayGuideSectionDraft>>({});
  const [contentHydrated, setContentHydrated] = useState(false);
  const { canUse: canUseAutosave } = useFeatureGate('publicPagesAutosave');
  const { open: openUpgradeModal } = useUpgradeModal();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  useEffect(() => {
    if (!configQuery.data || hydrated) return;
    hydrate(configQuery.data.config as StayGuideSectionConfig);
  }, [configQuery.data, hydrate, hydrated]);

  const templatesByKey = useMemo(() => {
    const map: Record<string, PropertyTemplateDto> = {};
    for (const template of templatesQuery.data?.templates ?? []) {
      if (template.category === 'standard') {
        map[template.templateKey] = template;
      }
    }
    return map;
  }, [templatesQuery.data?.templates]);

  useEffect(() => {
    if (!templatesQuery.data || contentHydrated) return;
    const next: Record<string, StayGuideSectionDraft> = {};
    for (const key of STAY_GUIDE_STANDARD_TEMPLATE_KEYS) {
      const template = templatesByKey[key];
      if (template) next[key] = draftFromTemplate(template);
    }
    if (Object.keys(next).length === 0) return;
    setContentDrafts(next);
    setContentHydrated(true);
  }, [templatesQuery.data, templatesByKey, contentHydrated]);

  const fingerprint = useMemo(() => (hydrated ? JSON.stringify(config) : null), [config, hydrated]);

  const configSave = usePageEditorAutoSave({
    enabled: hydrated && Boolean(propertyId),
    suspended: configQuery.isLoading || !hydrated,
    persist: canUseAutosave,
    contentFingerprint: fingerprint,
    debounceMs: 1000,
    save: async () => {
      await saveMutation.mutateAsync(config);
      markClean();
    },
  });

  const contentFingerprint = useMemo(() => {
    if (!contentHydrated) return null;
    return JSON.stringify(
      STAY_GUIDE_STANDARD_TEMPLATE_KEYS.map((key) => {
        const draft = contentDrafts[key];
        return draft
          ? { key, content: draft.content, sectionImageUrl: draft.sectionImageUrl }
          : { key };
      })
    );
  }, [contentDrafts, contentHydrated]);

  const contentSave = usePageEditorAutoSave({
    enabled: contentHydrated && Boolean(propertyId),
    suspended: !contentHydrated || templatesQuery.isLoading,
    persist: canUseAutosave,
    contentFingerprint,
    debounceMs: 1200,
    save: async () => {
      const dirtyKeys = STAY_GUIDE_STANDARD_TEMPLATE_KEYS.filter((key) => {
        const draft = contentDrafts[key];
        const template = templatesByKey[key];
        return draft && template && isStayGuideSectionDraftDirty(draft, template);
      });
      for (const key of dirtyKeys) {
        const draft = contentDrafts[key];
        if (!draft) continue;
        await saveTemplate.mutateAsync({
          templateKey: key,
          content: draft.content,
          sectionImageUrl: draft.sectionImageUrl,
          silent: true,
          publicPagesAutosaveGate: true,
        });
      }
    },
  });

  const status = mergePageEditorAutoSaveStatuses([configSave.status, contentSave.status]);
  const errorMessage = firstPageEditorAutoSaveError([configSave, contentSave]);
  const isDirty = status === 'pending';

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const mergedPreview = useMemo(() => {
    if (!previewQuery.data) return null;
    const sections = previewQuery.data.sections.map((section) => {
      const draft = contentDrafts[section.key];
      if (!draft) return section;
      const filled = applyPropertyTemplatePlaceholders(draft.content);
      const { heading, bodyHtml } = extractLeadingSectionHeading(filled);
      return {
        ...section,
        displayHeading: heading || section.label,
        html: heading ? bodyHtml : filled,
        imageUrl: draft.sectionImageUrl,
        imageUpdatedAt: draft.imageBust
          ? new Date(draft.imageBust).toISOString()
          : section.imageUpdatedAt,
      };
    });
    return {
      kind: 'stay-guide' as const,
      data: { ...previewQuery.data, sectionConfig: config, sections },
    };
  }, [previewQuery.data, config, contentDrafts]);

  const backHref = propertySectionPath(orgSlug, propertySlug, 'public-pages');
  const pageMeta = PAGE_EDITOR_META['stay-guide'];
  const publicLinks = useMemo(
    () =>
      propertyId ? resolvePageEditorPublicLinks('stay-guide', propertySlug, propertyId) : null,
    [propertyId, propertySlug]
  );

  const saveAllPending = () => Promise.all([configSave.saveNow(), contentSave.saveNow()]);

  const handleManualSaveClick = async () => {
    if (!canUseAutosave) {
      openUpgradeModal('publicPagesAutosave');
      return;
    }
    try {
      await saveAllPending();
      toast.success('Saved');
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save changes'));
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigate(backHref);
  };

  const handleSaveAndLeave = async () => {
    if (!canUseAutosave) {
      setShowLeaveConfirm(false);
      openUpgradeModal('publicPagesAutosave');
      return;
    }
    setIsSavingBeforeLeave(true);
    try {
      await saveAllPending();
      navigate(backHref);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save changes'));
    } finally {
      setIsSavingBeforeLeave(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleDiscardAndLeave = () => {
    setShowLeaveConfirm(false);
    navigate(backHref);
  };

  const handleDraftChange = (templateKey: string, draft: StayGuideSectionDraft) => {
    setContentDrafts((current) => ({ ...current, [templateKey]: draft }));
  };

  const handleResetSection = (templateKey: string) => {
    const template = templatesByKey[templateKey];
    if (!template) return;
    setContentDrafts((current) => ({
      ...current,
      [templateKey]: {
        content: normalizeBlockLevelPlaceholdersInHtml(template.defaultContent),
        sectionImageUrl: null,
        imageBust: 0,
      },
    }));
  };

  const isBootstrapping =
    (configQuery.isLoading && !configQuery.data) ||
    (previewQuery.isLoading && !previewQuery.data) ||
    (templatesQuery.isLoading && !templatesQuery.data) ||
    !hydrated ||
    !contentHydrated;

  if (isBootstrapping) {
    return (
      <PageEditorChrome>
        <SectionContentSkeleton rows={5} className="min-h-[50vh]" />
      </PageEditorChrome>
    );
  }

  if (configQuery.isError || previewQuery.isError || templatesQuery.isError || !mergedPreview) {
    return (
      <PageEditorChrome>
        <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center px-4 text-center text-sm">
          Could not load the Stay Guide editor.
        </div>
      </PageEditorChrome>
    );
  }

  return (
    <PageEditorChrome>
      <PageEditorShell
        header={
          <PageEditorHeader
            pageLabel={pageMeta.label}
            onBack={handleBack}
            autoSaveStatus={status}
            autoSaveError={errorMessage}
            openHref={publicLinks?.openHref}
            copyHref={publicLinks?.copyHref}
            publicPageLabel={publicLinks?.pageLabel}
            manualSave={{
              visible: !canUseAutosave && status === 'pending',
              onClick: () => void handleManualSaveClick(),
              isSaving: status === 'saving',
            }}
          />
        }
        controls={
          <StayGuideEditorPanel
            templatesByKey={templatesByKey}
            drafts={contentDrafts}
            onDraftChange={handleDraftChange}
            onResetSection={handleResetSection}
            contentBusy={saveTemplate.isPending}
          />
        }
        preview={
          <PageEditorPreviewPane
            canUndo={historyIndex > 0}
            canRedo={historyIndex < historyLength - 1}
            onUndo={undo}
            onRedo={redo}
          >
            <PreviewOverrideProvider value={mergedPreview}>
              <StayGuidePage />
            </PreviewOverrideProvider>
          </PageEditorPreviewPane>
        }
      />
      <PageEditorLeaveConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onSaveAndLeave={() => void handleSaveAndLeave()}
        onDiscardAndLeave={handleDiscardAndLeave}
        isSaving={isSavingBeforeLeave}
      />
    </PageEditorChrome>
  );
}

function contentFromProperty(
  property: Parameters<typeof propertyProfileDraftFromProperty>[0]
): LandingProfileContent {
  const draft = propertyProfileDraftFromProperty(property);
  return {
    description: draft.description,
    enabledAmenities: draft.enabledAmenities,
    customAmenities: draft.customAmenities,
    enabledHouseRules: draft.enabledHouseRules,
    customHouseRules: draft.customHouseRules,
    cancellationPolicy: draft.cancellationPolicy,
  };
}

function PropertyLandingPageEditor({
  orgSlug,
  propertySlug,
  propertyId,
}: {
  orgSlug: string;
  propertySlug: string;
  propertyId: string | null;
}) {
  const navigate = useNavigate();
  const { property } = useOrgContext();
  const configQuery = usePublicPageConfig('property_landing');
  const saveMutation = useSavePublicPageConfig('property_landing');
  const previewQuery = usePublicPropertyDetail(propertySlug);
  const updateProperty = useUpdateProperty(orgSlug);
  const { data: appSettings } = useAppSettings();
  const updateAppSettings = useUpdateAppSettings();
  const { data: orgSettings } = useOrgSettings();
  const orgBrandColor = useOrgBrandColor();
  const inheritedBrandColor = appSettings?.inheritedBrandColor ?? orgBrandColor;
  const orgSocialLinks = orgSettings
    ? orgSettingsToFormValues(orgSettings)
    : {
        facebookPageUrl: '',
        airbnbUrl: '',
        instagramUrl: '',
        tiktokUrl: '',
        mainSocialPlatform: '',
      };

  const config = usePropertyLandingEditorStore((s) => s.config);
  const hydrated = usePropertyLandingEditorStore((s) => s.hydrated);
  const historyIndex = usePropertyLandingEditorStore((s) => s.historyIndex);
  const historyLength = usePropertyLandingEditorStore((s) => s.history.length);
  const hydrate = usePropertyLandingEditorStore((s) => s.hydrate);
  const reset = usePropertyLandingEditorStore((s) => s.reset);
  const undo = usePropertyLandingEditorStore((s) => s.undo);
  const redo = usePropertyLandingEditorStore((s) => s.redo);
  const markClean = usePropertyLandingEditorStore((s) => s.markClean);

  const [media, setMedia] = useState<PropertyMediaItem[]>(() =>
    propertyMediaFromProperty(property)
  );
  const [mediaBusy, setMediaBusy] = useState(false);
  const [brandColor, setBrandColor] = useState('');
  const [brandHydrated, setBrandHydrated] = useState(false);
  const [content, setContent] = useState<LandingProfileContent>(() =>
    contentFromProperty(property)
  );
  const [contentHydrated, setContentHydrated] = useState(false);
  const [socialDraft, setSocialDraft] = useState<AppSettingsFormValues | null>(null);
  const [socialBaseline, setSocialBaseline] = useState<AppSettingsFormValues | null>(null);
  const [interactedFields, setInteractedFields] = useState<Record<string, boolean>>({});
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const { canUse: canUseAutosave } = useFeatureGate('publicPagesAutosave');
  const { open: openUpgradeModal } = useUpgradeModal();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  useEffect(() => {
    if (!configQuery.data || hydrated) return;
    hydrate(configQuery.data.config as PropertyLandingSectionConfig);
  }, [configQuery.data, hydrate, hydrated]);

  useEffect(() => {
    setMedia(propertyMediaFromProperty(property));
    if (!contentHydrated) {
      setContent(contentFromProperty(property));
      setContentHydrated(true);
    }
  }, [property, contentHydrated]);

  useEffect(() => {
    if (!appSettings || brandHydrated) return;
    const values = appSettingsToFormValues(appSettings);
    setBrandColor(values.brandColor);
    setBrandHydrated(true);
    setSocialDraft(values);
    setSocialBaseline(values);
  }, [appSettings, brandHydrated]);

  const fingerprint = useMemo(() => (hydrated ? JSON.stringify(config) : null), [config, hydrated]);

  const configSave = usePageEditorAutoSave({
    enabled: hydrated && Boolean(propertyId),
    suspended: configQuery.isLoading || !hydrated,
    persist: canUseAutosave,
    contentFingerprint: fingerprint,
    debounceMs: 1000,
    save: async () => {
      await saveMutation.mutateAsync(config);
      markClean();
    },
  });

  const brandFingerprint = useMemo(
    () => (brandHydrated ? brandColor : null),
    [brandColor, brandHydrated]
  );
  const brandColorError = brandHydrated ? validateOrgBrandColor(brandColor) : null;

  const brandSave = usePageEditorAutoSave({
    enabled: brandHydrated && Boolean(propertyId) && !brandColorError,
    suspended: !appSettings || !brandHydrated,
    persist: canUseAutosave,
    contentFingerprint: brandFingerprint,
    debounceMs: 800,
    save: async () => {
      if (!appSettings) return;
      const stored = propertyBrandColorStoredValue(brandColor, inheritedBrandColor);
      await updateAppSettings.mutateAsync({ brandColor: stored, publicPagesAutosaveGate: true });
    },
  });

  const cancellationError =
    content.cancellationPolicy.type === 'custom'
      ? validateCancellationPolicySettings(content.cancellationPolicy)
      : null;

  const contentFingerprint = useMemo(
    () => (contentHydrated ? JSON.stringify(content) : null),
    [content, contentHydrated]
  );

  const contentSave = usePageEditorAutoSave({
    enabled: contentHydrated && Boolean(propertyId) && !cancellationError,
    suspended: !contentHydrated,
    persist: canUseAutosave,
    contentFingerprint,
    debounceMs: 1000,
    save: async () => {
      if (!propertyId) return;
      await updateProperty.mutateAsync({
        propertyId,
        publicPagesAutosaveGate: true,
        settings: {
          description: content.description.trim(),
          enabledAmenities: content.enabledAmenities,
          customAmenities: content.customAmenities,
          enabledHouseRules: content.enabledHouseRules,
          customHouseRules: content.customHouseRules,
          cancellationPolicy: content.cancellationPolicy,
        },
      });
    },
  });

  const socialFingerprint = useMemo(() => {
    if (!socialDraft) return null;
    return JSON.stringify({
      facebookPageUrl: socialDraft.facebookPageUrl,
      airbnbUrl: socialDraft.airbnbUrl,
      instagramUrl: socialDraft.instagramUrl,
      tiktokUrl: socialDraft.tiktokUrl,
      mainSocialPlatform: socialDraft.mainSocialPlatform,
      externalReviews: socialDraft.externalReviews,
      superhostVerificationUrl: socialDraft.superhostVerificationUrl,
    });
  }, [socialDraft]);

  const socialSave = usePageEditorAutoSave({
    enabled: Boolean(socialDraft && propertyId),
    suspended: !socialDraft || !appSettings,
    persist: canUseAutosave,
    contentFingerprint: socialFingerprint,
    debounceMs: 1000,
    save: async () => {
      if (!socialDraft) return;
      const normalized = normalizePropertySocialLinksForSave(socialDraft, orgSocialLinks);
      const saved = await updateAppSettings.mutateAsync({
        facebookPageUrl: normalized.facebookPageUrl,
        airbnbUrl: normalized.airbnbUrl,
        instagramUrl: normalized.instagramUrl,
        tiktokUrl: normalized.tiktokUrl,
        mainSocialPlatform: normalized.mainSocialPlatform,
        externalReviews: socialDraft.externalReviews,
        superhostVerificationUrl: socialDraft.superhostVerificationUrl,
        publicPagesAutosaveGate: true,
      });
      const values = appSettingsToFormValues(saved);
      setSocialDraft((current) =>
        current
          ? {
              ...current,
              facebookPageUrl: values.facebookPageUrl,
              airbnbUrl: values.airbnbUrl,
              instagramUrl: values.instagramUrl,
              tiktokUrl: values.tiktokUrl,
              mainSocialPlatform: values.mainSocialPlatform,
              externalReviews: values.externalReviews,
              superhostVerificationUrl: values.superhostVerificationUrl,
              brandColor: current.brandColor,
            }
          : values
      );
      setSocialBaseline(values);
    },
  });

  const status = mergePageEditorAutoSaveStatuses([
    configSave.status,
    brandSave.status,
    contentSave.status,
    socialSave.status,
  ]);
  const errorMessage = firstPageEditorAutoSaveError([
    configSave,
    brandSave,
    contentSave,
    socialSave,
  ]);
  const isDirty = status === 'pending';

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const saveAllPending = () =>
    Promise.all([
      configSave.saveNow(),
      brandSave.saveNow(),
      contentSave.saveNow(),
      socialSave.saveNow(),
    ]);

  const handleMediaPersisted = (next: PropertyMediaItem[]) => {
    setMedia(next);
  };

  const persistMediaOrder = async (next: PropertyMediaItem[]) => {
    if (!propertyId) return;
    setMediaBusy(true);
    try {
      await updateProperty.mutateAsync({
        propertyId,
        settings: { media: next },
      });
      setMedia(next);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save gallery order'));
      throw error;
    } finally {
      setMediaBusy(false);
    }
  };

  const markFieldInteracted = (fieldId: string) => {
    setInteractedFields((current) =>
      current[fieldId] ? current : { ...current, [fieldId]: true }
    );
  };

  const resolveFieldError = (fieldId: string) => {
    if (fieldId === 'cancellation-custom-title' || fieldId === 'cancellation-custom-description') {
      if (!interactedFields[fieldId] || !cancellationError) return null;
      if (fieldId === 'cancellation-custom-title' && cancellationError.includes('title')) {
        return cancellationError;
      }
      if (
        fieldId === 'cancellation-custom-description' &&
        cancellationError.includes('description')
      ) {
        return cancellationError;
      }
      if (fieldId === 'cancellation-custom-title') return cancellationError;
    }
    return null;
  };

  const handleSaveExternalReview = async (reviewId: string) => {
    if (!socialDraft || !socialBaseline) return;
    const draftReviews = socialDraft.externalReviews;
    const baselineReviews = socialBaseline.externalReviews;
    const reviewIndex = draftReviews.findIndex((review) => review.id === reviewId);
    const draftReview = draftReviews[reviewIndex];
    if (!draftReview) return;

    const validationError = validateExternalReviewDraft(draftReview, `Review ${reviewIndex + 1}`);
    if (validationError) {
      markFieldInteracted('property-external-reviews');
      toast.error(validationError);
      return;
    }

    const mergedReviews = mergeExternalReviewsForSingleReviewSave(
      reviewId,
      draftReviews,
      baselineReviews
    );
    if (!mergedReviews) return;

    setSavingReviewId(reviewId);
    try {
      const saved = await updateAppSettings.mutateAsync({ externalReviews: mergedReviews });
      const values = appSettingsToFormValues(saved);
      const savedReview = values.externalReviews.find((review) => review.id === reviewId);
      setSocialBaseline(values);
      setSocialDraft((current) => {
        if (!current || !savedReview) return current;
        return {
          ...current,
          externalReviews: current.externalReviews.map((review) =>
            review.id === reviewId ? savedReview : review
          ),
        };
      });
      toast.success('Review saved');
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save review'));
    } finally {
      setSavingReviewId(null);
    }
  };

  const onContentChange = <K extends keyof LandingProfileContent>(
    key: K,
    value: LandingProfileContent[K]
  ) => {
    setContent((current) => ({ ...current, [key]: value }));
  };

  const onSocialChange = <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K]
  ) => {
    setSocialDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const previewMedia = mediaItemsToPreview(media);
  const resolvedBrand = brandColor.trim() || appSettings?.resolvedBrandColor || inheritedBrandColor;

  const mergedPreview = useMemo(() => {
    if (!previewQuery.data) return null;
    const profile = propertyProfileDraftFromProperty(property);
    return {
      kind: 'property-landing' as const,
      data: {
        ...previewQuery.data,
        sectionConfig: config,
        media: previewMedia.media,
        images: previewMedia.images.length > 0 ? previewMedia.images : previewQuery.data.images,
        brandColor: resolvedBrand,
        description: content.description.trim() || null,
        amenities: resolveAmenityLabels(content.enabledAmenities, content.customAmenities),
        houseRules: resolveHouseRulesForDisplay({
          enabledIds: content.enabledHouseRules,
          customRules: content.customHouseRules,
          checkInTime: profile.checkInTime,
          checkOutTime: profile.checkOutTime,
        }),
        cancellationPolicy: resolveCancellationPolicyDisplay(content.cancellationPolicy),
      },
    };
  }, [
    previewQuery.data,
    config,
    previewMedia.media,
    previewMedia.images,
    resolvedBrand,
    content,
    property,
  ]);

  const backHref = propertySectionPath(orgSlug, propertySlug, 'public-pages');
  const pageMeta = PAGE_EDITOR_META.listing;
  const publicLinks = useMemo(
    () => (propertyId ? resolvePageEditorPublicLinks('listing', propertySlug, propertyId) : null),
    [propertyId, propertySlug]
  );

  const handleManualSaveClick = async () => {
    if (!canUseAutosave) {
      openUpgradeModal('publicPagesAutosave');
      return;
    }
    try {
      await saveAllPending();
      toast.success('Saved');
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save changes'));
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigate(backHref);
  };

  const handleSaveAndLeave = async () => {
    if (!canUseAutosave) {
      setShowLeaveConfirm(false);
      openUpgradeModal('publicPagesAutosave');
      return;
    }
    setIsSavingBeforeLeave(true);
    try {
      await saveAllPending();
      navigate(backHref);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save changes'));
    } finally {
      setIsSavingBeforeLeave(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleDiscardAndLeave = () => {
    setShowLeaveConfirm(false);
    navigate(backHref);
  };

  const isBootstrapping =
    (configQuery.isLoading && !configQuery.data) ||
    (previewQuery.isLoading && !previewQuery.data) ||
    !hydrated ||
    !brandHydrated ||
    !contentHydrated ||
    !socialDraft ||
    !appSettings;

  if (isBootstrapping) {
    return (
      <PageEditorChrome>
        <SectionContentSkeleton rows={5} className="min-h-[50vh]" />
      </PageEditorChrome>
    );
  }

  if (configQuery.isError || previewQuery.isError || !mergedPreview) {
    return (
      <PageEditorChrome>
        <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center px-4 text-center text-sm">
          Could not load the listing editor.
        </div>
      </PageEditorChrome>
    );
  }

  return (
    <PageEditorChrome>
      <PropertySettingsBrandColorPreview
        brandColor={brandColor}
        resolvedBrandColor={resolvedBrand}
      />
      <PageEditorShell
        header={
          <PageEditorHeader
            pageLabel={pageMeta.label}
            onBack={handleBack}
            autoSaveStatus={status}
            autoSaveError={errorMessage}
            openHref={publicLinks?.openHref}
            copyHref={publicLinks?.copyHref}
            publicPageLabel={publicLinks?.pageLabel}
            manualSave={{
              visible: !canUseAutosave && status === 'pending',
              onClick: () => void handleManualSaveClick(),
              isSaving: status === 'saving',
            }}
          />
        }
        controls={
          <PropertyLandingEditorPanel
            media={media}
            onMediaChange={setMedia}
            onMediaPersisted={handleMediaPersisted}
            onPersistMediaOrder={persistMediaOrder}
            mediaBusy={mediaBusy}
            brandColor={brandColor}
            inheritedBrandColor={inheritedBrandColor}
            onBrandColorChange={setBrandColor}
            brandColorError={brandColorError}
            content={content}
            onContentChange={onContentChange}
            socialDraft={socialDraft}
            socialBaselineReviews={socialBaseline?.externalReviews ?? []}
            appSettings={appSettings}
            orgSocialLinks={orgSocialLinks}
            onSocialChange={onSocialChange}
            resolveFieldError={resolveFieldError}
            markFieldInteracted={markFieldInteracted}
            onSaveReview={(reviewId) => void handleSaveExternalReview(reviewId)}
            savingReviewId={savingReviewId}
          />
        }
        preview={
          <PageEditorPreviewPane
            canUndo={historyIndex > 0}
            canRedo={historyIndex < historyLength - 1}
            onUndo={undo}
            onRedo={redo}
          >
            <PreviewOverrideProvider value={mergedPreview}>
              <PropertyDetailPage />
            </PreviewOverrideProvider>
          </PageEditorPreviewPane>
        }
      />
      <PageEditorLeaveConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onSaveAndLeave={() => void handleSaveAndLeave()}
        onDiscardAndLeave={handleDiscardAndLeave}
        isSaving={isSavingBeforeLeave}
      />
    </PageEditorChrome>
  );
}
