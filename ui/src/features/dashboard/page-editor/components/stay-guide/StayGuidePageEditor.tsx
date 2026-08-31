import { useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { toast } from 'sonner';

import { PreviewOverrideProvider } from '@/features/guest/lib/previewOverrideContext';
import {
  isShowcaseTemplateKey,
  type ShowcaseTemplateKey,
} from '@/features/guest/marketing/showcase/types/showcase';
import { useGuestStayGuidePreview } from '@/features/guest/stay-guide/hooks/useGuestStayGuide';
import {
  normalizeStayGuideConfigV2,
  stayGuideConfigV2ToV1,
  type StayGuideConfigV2,
} from '@/features/guest/stay-guide/lib/stayGuideConfig';
import { extractLeadingSectionHeading } from '@/features/guest/stay-guide/lib/stayGuideContent';
import { StayGuidePage } from '@/features/guest/stay-guide/pages/StayGuidePage';

import {
  usePropertyTemplateMutations,
  usePropertyTemplates,
  type PropertyTemplateDto,
} from '@/features/dashboard/bookings/hooks/usePropertyTemplates';
import { normalizeBlockLevelPlaceholdersInHtml } from '@/features/dashboard/bookings/lib/normalizeBlockLevelPlaceholders';
import { applyPropertyTemplatePlaceholders } from '@/features/dashboard/bookings/lib/propertyTemplatePlaceholders';
import { scopedFunctionsUrl, usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import { PageEditorHeader } from '@/features/dashboard/page-editor/components/PageEditorHeader';
import { PageEditorLeaveConfirmDialog } from '@/features/dashboard/page-editor/components/PageEditorLeaveConfirmDialog';
import { PageEditorPreviewPane } from '@/features/dashboard/page-editor/components/PageEditorPreviewPane';
import { PageEditorShell } from '@/features/dashboard/page-editor/components/PageEditorShell';
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
import { resolvePageEditorPublicLinks } from '@/features/dashboard/page-editor/lib/pageEditorPublicLinks';
import { STAY_GUIDE_STANDARD_TEMPLATE_KEYS } from '@/features/dashboard/page-editor/lib/stayGuideChapterSections';
import { useStayGuideEditorStore } from '@/features/dashboard/page-editor/stores/stayGuideEditorStore';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { SectionContentSkeleton } from '@/components/skeletons/AdminSkeletons';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

async function patchStayGuideTemplate(propertyId: string, templateKey: ShowcaseTemplateKey) {
  const jwt = await getSessionJwt();
  const res = await fetch(scopedFunctionsUrl('/custom-pages-settings', propertyId), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pageType: 'stay_guide', templateKey }),
  });
  const json = (await res.json()) as { success?: boolean; error?: string };
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Failed to update template');
  }
}

export function StayGuidePageEditor({
  orgSlug,
  propertySlug,
}: {
  orgSlug: string;
  propertySlug: string;
  propertyId: string | null;
}) {
  const navigate = useNavigate();
  const propertyId = usePropertyIdParam();
  const configQuery = usePublicPageConfig('stay_guide');
  const saveMutation = useSavePublicPageConfig('stay_guide');
  const previewQuery = useGuestStayGuidePreview(propertySlug, propertyId ?? '');
  const templatesQuery = usePropertyTemplates();
  const { saveTemplate } = usePropertyTemplateMutations();

  const config = useStayGuideEditorStore((s) => s.config);
  const templateKey = useStayGuideEditorStore((s) => s.templateKey);
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
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const { canUse: canUseAutosave } = useFeatureGate('publicPagesAutosave');
  const { open: openUpgradeModal } = useUpgradeModal();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  useEffect(() => {
    if (!configQuery.data || hydrated) return;
    void (async () => {
      let key: ShowcaseTemplateKey = 'showcase-aurora';
      if (propertyId) {
        try {
          const jwt = await getSessionJwt();
          const res = await fetch(scopedFunctionsUrl('/custom-pages-settings', propertyId), {
            headers: { Authorization: `Bearer ${jwt}` },
          });
          const json = (await res.json()) as {
            success?: boolean;
            data?: { pages?: Array<{ pageType: string; templateKey: string }> };
          };
          const stayGuide = json.data?.pages?.find((page) => page.pageType === 'stay_guide');
          if (stayGuide && isShowcaseTemplateKey(stayGuide.templateKey)) {
            key = stayGuide.templateKey;
          }
        } catch {
          /* default */
        }
      }
      hydrate(normalizeStayGuideConfigV2(configQuery.data.config as StayGuideConfigV2), key);
      setTemplateLoaded(true);
    })();
  }, [configQuery.data, hydrate, hydrated, propertyId]);

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

  const templateSave = usePageEditorAutoSave({
    enabled: canUseAutosave && hydrated && templateLoaded && Boolean(propertyId),
    contentFingerprint: hydrated ? templateKey : null,
    save: async () => {
      if (!propertyId) return;
      await patchStayGuideTemplate(propertyId, templateKey);
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

  const status = mergePageEditorAutoSaveStatuses([
    configSave.status,
    templateSave.status,
    contentSave.status,
  ]);
  const errorMessage = firstPageEditorAutoSaveError([configSave, templateSave, contentSave]);
  const isDirty = canUseAutosave
    ? status === 'pending' || status === 'error'
    : status === 'pending';

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
      data: {
        ...previewQuery.data,
        sectionConfig: stayGuideConfigV2ToV1(config),
        templateKey,
        sections,
      },
    };
  }, [previewQuery.data, config, contentDrafts, templateKey]);

  const backHref = propertySectionPath(orgSlug, propertySlug, 'public-pages');
  const publicLinks = useMemo(
    () =>
      propertyId ? resolvePageEditorPublicLinks('stay-guide', propertySlug, propertyId) : null,
    [propertyId, propertySlug]
  );

  const saveAllPending = () =>
    Promise.all([configSave.saveNow(), templateSave.saveNow(), contentSave.saveNow()]);

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

  const handleDraftChange = (nextTemplateKey: string, draft: StayGuideSectionDraft) => {
    setContentDrafts((current) => ({ ...current, [nextTemplateKey]: draft }));
  };

  const handleResetSection = (nextTemplateKey: string) => {
    const template = templatesByKey[nextTemplateKey];
    if (!template) return;
    setContentDrafts((current) => ({
      ...current,
      [nextTemplateKey]: {
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
      <AdminMobilePage title="Stay Guide" titleId="stay-guide-editor-heading">
        <SectionContentSkeleton rows={5} className="min-h-[50vh]" />
      </AdminMobilePage>
    );
  }

  if (configQuery.isError || previewQuery.isError || templatesQuery.isError || !mergedPreview) {
    return (
      <AdminMobilePage title="Stay Guide" titleId="stay-guide-editor-heading">
        <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center px-4 text-center text-sm">
          Could not load the Stay Guide editor.
        </div>
      </AdminMobilePage>
    );
  }

  return (
    <AdminMobilePage title="Stay Guide" titleId="stay-guide-editor-heading">
      <PageEditorShell
        header={
          <PageEditorHeader
            pageLabel="Stay Guide"
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
        onDiscardAndLeave={() => {
          setShowLeaveConfirm(false);
          navigate(backHref);
        }}
        isSaving={isSavingBeforeLeave}
      />
    </AdminMobilePage>
  );
}
