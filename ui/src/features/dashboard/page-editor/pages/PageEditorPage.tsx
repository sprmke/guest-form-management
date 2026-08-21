import { useEffect, useMemo, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  appSettingsToFormValues,
  useAppSettings,
  useUpdateAppSettings,
  type AppSettingsFormValues,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOrgBrandColor } from '@/features/dashboard/org/hooks/useOrgBrandColor';
import {
  orgSettingsToFormValues,
  useOrgSettings,
} from '@/features/dashboard/org/hooks/useOrgSettings';
import { useUpdateProperty } from '@/features/dashboard/org/hooks/useUpdateProperty';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import {
  resolveCancellationPolicyDisplay,
  validateCancellationPolicySettings,
} from '@/features/dashboard/org/lib/propertyCancellationPolicy';
import {
  mergeExternalReviewsForSingleReviewSave,
  validateExternalReviewDraft,
} from '@/features/dashboard/org/lib/propertyExternalReviews';
import { resolveHouseRulesForDisplay } from '@/features/dashboard/org/lib/propertyHouseRulesConstants';
import { validateOrgBrandColor } from '@/features/dashboard/org/lib/orgSettingsValidation';
import {
  propertyMediaFromProperty,
  propertyProfileDraftFromProperty,
} from '@/features/dashboard/org/lib/propertySettingsForm';
import {
  resolveAmenityLabels,
  type PropertyMediaItem,
} from '@/features/dashboard/org/lib/propertySettingsConstants';
import { normalizePropertySocialLinksForSave } from '@/features/dashboard/org/lib/propertySocialLinks';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { PageEditorHeader } from '@/features/dashboard/page-editor/components/PageEditorHeader';
import { PageEditorPreviewPane } from '@/features/dashboard/page-editor/components/PageEditorPreviewPane';
import { PageEditorShell } from '@/features/dashboard/page-editor/components/PageEditorShell';
import {
  PropertyLandingEditorPanel,
  type LandingProfileContent,
} from '@/features/dashboard/page-editor/components/property-landing/PropertyLandingEditorPanel';
import { PropertySettingsBrandColorPreview } from '@/features/dashboard/page-editor/components/property-landing/PropertySettingsBrandColorPreview';
import { StayGuideEditorPanel } from '@/features/dashboard/page-editor/components/stay-guide/StayGuideEditorPanel';
import { usePageEditorAutoSave } from '@/features/dashboard/page-editor/hooks/usePageEditorAutoSave';
import {
  usePublicPageConfig,
  useSavePublicPageConfig,
} from '@/features/dashboard/page-editor/hooks/usePublicPageConfig';
import { usePropertyLandingEditorStore } from '@/features/dashboard/page-editor/stores/propertyLandingEditorStore';
import { useStayGuideEditorStore } from '@/features/dashboard/page-editor/stores/stayGuideEditorStore';
import { RequirePropertyFeature } from '@/features/dashboard/plans/components/RequirePropertyFeature';
import { PreviewOverrideProvider } from '@/features/guest/lib/previewOverrideContext';
import { PropertyDetailPage } from '@/features/guest/marketing/pages/PropertyDetailPage';
import { usePublicPropertyDetail } from '@/features/guest/marketing/properties/hooks/usePublicPropertyDetail';
import type { PropertyLandingSectionConfig } from '@/features/guest/marketing/properties/types/publicProperty';
import { useGuestStayGuidePreview } from '@/features/guest/stay-guide/hooks/useGuestStayGuide';
import type { StayGuideSectionConfig } from '@/features/guest/stay-guide/lib/api';
import { StayGuidePage } from '@/features/guest/stay-guide/pages/StayGuidePage';

import { usePageTitle } from '@/lib/pageTitle';
import { propertyBrandColorStoredValue } from '@/lib/theme/brandColor';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

const EDITABLE_PAGE_IDS = new Set(['stay-guide', 'listing']);

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

  const title =
    pageId === 'listing'
      ? property?.name
        ? `${property.name} - Edit Listing`
        : 'Edit Listing'
      : property?.name
        ? `${property.name} - Edit Stay Guide`
        : 'Edit Stay Guide';
  usePageTitle(title);

  if (!EDITABLE_PAGE_IDS.has(pageId)) {
    return <Navigate to={propertySectionPath(orgSlug, propertySlug, 'public-pages')} replace />;
  }

  return (
    <RequirePropertyFeature feature="customPages">
      {pageId === 'listing' ? (
        <PropertyLandingPageEditor
          orgSlug={orgSlug}
          propertySlug={propertySlug}
          propertyId={propertyId}
        />
      ) : (
        <StayGuidePageEditor
          orgSlug={orgSlug}
          propertySlug={propertySlug}
          propertyId={propertyId}
        />
      )}
    </RequirePropertyFeature>
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
  const configQuery = usePublicPageConfig('stay_guide');
  const saveMutation = useSavePublicPageConfig('stay_guide');
  const previewQuery = useGuestStayGuidePreview(propertySlug, propertyId ?? '');

  const config = useStayGuideEditorStore((s) => s.config);
  const hydrated = useStayGuideEditorStore((s) => s.hydrated);
  const historyIndex = useStayGuideEditorStore((s) => s.historyIndex);
  const historyLength = useStayGuideEditorStore((s) => s.history.length);
  const hydrate = useStayGuideEditorStore((s) => s.hydrate);
  const reset = useStayGuideEditorStore((s) => s.reset);
  const undo = useStayGuideEditorStore((s) => s.undo);
  const redo = useStayGuideEditorStore((s) => s.redo);
  const markClean = useStayGuideEditorStore((s) => s.markClean);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  useEffect(() => {
    if (!configQuery.data || hydrated) return;
    hydrate(configQuery.data.config as StayGuideSectionConfig);
  }, [configQuery.data, hydrate, hydrated]);

  const fingerprint = useMemo(() => (hydrated ? JSON.stringify(config) : null), [config, hydrated]);

  const { status, errorMessage } = usePageEditorAutoSave({
    enabled: hydrated && Boolean(propertyId),
    suspended: configQuery.isLoading || !hydrated,
    contentFingerprint: fingerprint,
    debounceMs: 1000,
    save: async () => {
      await saveMutation.mutateAsync(config);
      markClean();
    },
  });

  const mergedPreview = useMemo(() => {
    if (!previewQuery.data) return null;
    return {
      kind: 'stay-guide' as const,
      data: { ...previewQuery.data, sectionConfig: config },
    };
  }, [previewQuery.data, config]);

  const backHref = propertySectionPath(orgSlug, propertySlug, 'public-pages');
  const templatesHref = propertySectionPath(orgSlug, propertySlug, 'templates');
  const brandColor = previewQuery.data?.property.brandColor ?? '#0d9488';

  const isBootstrapping =
    (configQuery.isLoading && !configQuery.data) ||
    (previewQuery.isLoading && !previewQuery.data) ||
    !hydrated;

  if (isBootstrapping) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (configQuery.isError || previewQuery.isError || !mergedPreview) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center px-4 text-center text-sm">
        Could not load the Stay Guide editor.
      </div>
    );
  }

  return (
    <PageEditorShell
      header={
        <PageEditorHeader
          title="Edit Stay Guide"
          backHref={backHref}
          autoSaveStatus={status}
          autoSaveError={errorMessage}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < historyLength - 1}
          onUndo={undo}
          onRedo={redo}
        />
      }
      controls={<StayGuideEditorPanel brandColor={brandColor} templatesHref={templatesHref} />}
      preview={
        <PageEditorPreviewPane>
          <PreviewOverrideProvider value={mergedPreview}>
            <StayGuidePage />
          </PreviewOverrideProvider>
        </PageEditorPreviewPane>
      }
    />
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

  const { status, errorMessage } = usePageEditorAutoSave({
    enabled: hydrated && Boolean(propertyId),
    suspended: configQuery.isLoading || !hydrated,
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

  usePageEditorAutoSave({
    enabled: brandHydrated && Boolean(propertyId) && !brandColorError,
    suspended: !appSettings || !brandHydrated,
    contentFingerprint: brandFingerprint,
    debounceMs: 800,
    save: async () => {
      if (!appSettings) return;
      const stored = propertyBrandColorStoredValue(brandColor, inheritedBrandColor);
      await updateAppSettings.mutateAsync({ brandColor: stored });
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

  usePageEditorAutoSave({
    enabled: contentHydrated && Boolean(propertyId) && !cancellationError,
    suspended: !contentHydrated,
    contentFingerprint,
    debounceMs: 1000,
    save: async () => {
      if (!propertyId) return;
      await updateProperty.mutateAsync({
        propertyId,
        status: property.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
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

  usePageEditorAutoSave({
    enabled: Boolean(socialDraft && propertyId),
    suspended: !socialDraft || !appSettings,
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

  const handleMediaPersisted = (next: PropertyMediaItem[]) => {
    setMedia(next);
  };

  const persistMediaOrder = async (next: PropertyMediaItem[]) => {
    if (!propertyId) return;
    setMediaBusy(true);
    try {
      await updateProperty.mutateAsync({
        propertyId,
        status: property.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
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
      <div className="flex min-h-[50vh] items-center justify-center" role="status">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (configQuery.isError || previewQuery.isError || !mergedPreview) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center px-4 text-center text-sm">
        Could not load the listing editor.
      </div>
    );
  }

  return (
    <>
      <PropertySettingsBrandColorPreview
        brandColor={brandColor}
        resolvedBrandColor={resolvedBrand}
      />
      <PageEditorShell
        header={
          <PageEditorHeader
            title="Edit Listing"
            backHref={backHref}
            autoSaveStatus={status}
            autoSaveError={errorMessage}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < historyLength - 1}
            onUndo={undo}
            onRedo={redo}
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
          <PageEditorPreviewPane>
            <PreviewOverrideProvider value={mergedPreview}>
              <PropertyDetailPage />
            </PreviewOverrideProvider>
          </PageEditorPreviewPane>
        }
      />
    </>
  );
}
