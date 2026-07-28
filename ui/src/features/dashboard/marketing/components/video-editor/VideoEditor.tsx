import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChevronLeft, Download, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { usePublicPropertyDetail } from '@/features/guest/marketing/properties/hooks/usePublicPropertyDetail';

import { MarketingAutoSaveStatus } from '@/features/dashboard/marketing/components/shared/MarketingAutoSaveStatus';
import { MarketingEditorHistoryControls } from '@/features/dashboard/marketing/components/shared/MarketingEditorHistoryControls';
import { MarketingEditorSidebar } from '@/features/dashboard/marketing/components/shared/MarketingEditorSidebar';
import type { MarketingFormatOption } from '@/features/dashboard/marketing/components/shared/MarketingFormatPicker';
import { MarketingPreviewHeader } from '@/features/dashboard/marketing/components/shared/MarketingPreviewHeader';
import { useMarketingStudioHeaderActions } from '@/features/dashboard/marketing/components/shared/marketingStudioHeaderActions';
import {
  MarketingTemplatesPanel,
  type PresetTemplateItem,
} from '@/features/dashboard/marketing/components/shared/MarketingTemplatesPanel';
import type { VideoPreviewMode } from '@/features/dashboard/marketing/components/video-editor/useVideoPlayerTransport';
import {
  CampaignVideoComposition,
  type VideoCompositionProps,
} from '@/features/dashboard/marketing/components/video-editor/VideoCompositions';
import { VideoEditorSettings } from '@/features/dashboard/marketing/components/video-editor/VideoEditorSettings';
import { VideoPreviewWorkspace } from '@/features/dashboard/marketing/components/video-editor/VideoPreviewWorkspace';
import { VideoTimeline } from '@/features/dashboard/marketing/components/video-editor/VideoTimeline';
import { useEnsureDefaultVideoMusic } from '@/features/dashboard/marketing/hooks/useEnsureDefaultVideoMusic';
import { useMarketingAutoSave } from '@/features/dashboard/marketing/hooks/useMarketingAutoSave';
import { useMarketingBookedDates } from '@/features/dashboard/marketing/hooks/useMarketingBookedDates';
import { useMarketingCatalog } from '@/features/dashboard/marketing/hooks/useMarketingCatalog';
import { useMarketingSidebarLayout } from '@/features/dashboard/marketing/hooks/useMarketingSidebarLayout';
import {
  useDeleteMarketingTemplate,
  useMarketingTemplates,
  useUpdateMarketingTemplate,
} from '@/features/dashboard/marketing/hooks/useMarketingTemplates';
import { captureLiveVideoProjectThumbnail } from '@/features/dashboard/marketing/hooks/useMarketingTemplateThumbnails';
import {
  useVideoProjectHistory,
  useVideoProjectHistoryShortcuts,
} from '@/features/dashboard/marketing/hooks/useVideoProjectHistory';
import {
  type CampaignCategory,
  type DesignBinding,
} from '@/features/dashboard/marketing/lib/designCanvasTypes';
import {
  blobToDataUrl,
  exportVideoToBlob,
} from '@/features/dashboard/marketing/lib/exportVideoMedia';
import {
  availabilityTextForMonth,
  openSlotDatesForMonth,
} from '@/features/dashboard/marketing/lib/marketingBookedDates';
import { marketingContentFingerprint } from '@/features/dashboard/marketing/lib/marketingContentFingerprint';
import { DEFAULT_MARKETING_THUMB_BINDING } from '@/features/dashboard/marketing/lib/marketingDefaultBinding';
import {
  waitForMarketingIdle,
  yieldToMainThread,
} from '@/features/dashboard/marketing/lib/marketingIdle';
import { setPersistedPresetThumbnail } from '@/features/dashboard/marketing/lib/marketingPresetThumbnailStore';
import {
  getCachedMarketingThumbnail,
  publishMarketingPresetThumbnail,
  videoPresetThumbnailKey,
} from '@/features/dashboard/marketing/lib/marketingTemplateThumbnailCache';
import {
  propertyMediaItems,
  propertyGalleryMediaItems,
} from '@/features/dashboard/marketing/lib/polotno/propertyMedia';
import {
  pickBindingMediaAt,
  primaryBindingPhoto,
  resolveDesignBindingMedia,
} from '@/features/dashboard/marketing/lib/propertyBindingMedia';
import { renderVideoPresetThumbnail } from '@/features/dashboard/marketing/lib/renderMarketingVideoThumbnail';
import {
  VIDEO_FORMAT_DIMENSIONS,
  VIDEO_PREVIEW_CONTAINER_MIN_HEIGHT_CLASS,
} from '@/features/dashboard/marketing/lib/video/videoFormatDimensions';
import { buildDefaultVideoProject } from '@/features/dashboard/marketing/lib/video/videoProjectDefaults';
import type {
  VideoFormat,
  VideoProject,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import {
  addPhotoScene,
  sceneStartFrame,
  videoProjectDurationInFrames,
} from '@/features/dashboard/marketing/lib/video/videoProjectUtils';
import { getSceneLayers } from '@/features/dashboard/marketing/lib/video/videoSceneLayers';
import {
  getVideoCampaignTemplate,
  videoTemplatesForCategory,
} from '@/features/dashboard/marketing/lib/videoCampaignTemplates';
import { registerVideoThumbnailPlaybackPause } from '@/features/dashboard/marketing/lib/videoThumbnailCapture';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOrgSettings } from '@/features/dashboard/org/hooks/useOrgSettings';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/utils/format/currency';

import type { PlayerRef } from '@remotion/player';

export type VideoExportPayload = {
  templateId: string;
  project: VideoProject;
  blob: Blob;
  dataUrl: string;
};

type Props = {
  onPublish?: (payload: VideoExportPayload) => void;
};

const CATEGORIES: CampaignCategory[] = ['promo', 'slots', 'giveaway', 'fully-booked'];

export function VideoEditor({ onPublish }: Props) {
  const { property, org } = useOrgContext();
  const { data: orgSettings } = useOrgSettings();
  const catalog = useMarketingCatalog('video');
  const { data: savedTemplates = [] } = useMarketingTemplates('video');
  const updateTemplate = useUpdateMarketingTemplate();
  const deleteTemplate = useDeleteMarketingTemplate();

  const [category, setCategory] = useState<string>('promo');
  const [selectedId, setSelectedId] = useState('promo-500-off');
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [autoSaveSuspended, setAutoSaveSuspended] = useState(false);
  const [format, setFormat] = useState<VideoFormat>('instagram-story');
  const [exporting, setExporting] = useState(false);
  const { project, setProject, replaceProject, undo, redo, canUndo, canRedo } =
    useVideoProjectHistory();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [showEditorSettings, setShowEditorSettings] = useState(false);
  const [previewMode, setPreviewMode] = useState<VideoPreviewMode>('all');
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elementFocusRequest, setElementFocusRequest] = useState(0);
  const playerRef = useRef<PlayerRef>(null);
  const { expandSidebar } = useMarketingSidebarLayout('video');

  useVideoProjectHistoryShortcuts({ undo, redo, enabled: Boolean(project) });

  useEnsureDefaultVideoMusic(project, setProject);

  const { data: publicProperty } = usePublicPropertyDetail(property.slug);
  const { data: bookedDates } = useMarketingBookedDates();
  const previewMonth = useMemo(() => new Date(), []);

  const binding = useMemo<DesignBinding>(() => {
    const rate = publicProperty?.pricing.baseRate ?? 2799;
    const galleryMedia =
      publicProperty?.media?.map((item) => ({ url: item.url, type: item.type })) ?? [];
    const resolvedMedia = resolveDesignBindingMedia({
      propertyMedia: galleryMedia,
      images: publicProperty?.images,
      propertyPhoto: publicProperty?.images[0] ?? null,
    });

    return {
      propertyName: property.name,
      propertyPhoto: primaryBindingPhoto(resolvedMedia),
      propertyMedia: resolvedMedia,
      nightlyRate: `${formatMoneyCompact(rate)} / night`,
      availabilityText: availabilityTextForMonth(bookedDates ?? [], previewMonth),
      monthLabel: previewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      monthShort: previewMonth.toLocaleDateString('en-US', { month: 'long' }),
      openSlots: openSlotDatesForMonth(bookedDates ?? [], previewMonth, 5),
    };
  }, [property.name, publicProperty, bookedDates, previewMonth]);

  const templates = useMemo(
    () => (catalog.isBuiltinCategory(category) ? videoTemplatesForCategory(category) : []),
    [category, catalog]
  );

  const selected = useMemo(
    () => getVideoCampaignTemplate(selectedId) ?? templates[0],
    [selectedId, templates]
  );

  const propertyImages = useMemo(
    () =>
      publicProperty?.media?.length
        ? propertyGalleryMediaItems(
            publicProperty.media.map((item) => ({ url: item.url, type: item.type }))
          )
        : propertyMediaItems(
            publicProperty?.images ?? (binding.propertyPhoto ? [binding.propertyPhoto] : [])
          ),
    [publicProperty?.media, publicProperty?.images, binding.propertyPhoto]
  );

  const dimensions = VIDEO_FORMAT_DIMENSIONS[format];
  const brandColor = (org.settings?.brandColor as string | undefined) ?? '#e8752a';
  const orgLogoUrl =
    orgSettings?.emailLogoUrl?.trim() ||
    org.logoUrl?.trim() ||
    (typeof org.settings?.emailLogoUrl === 'string' ? org.settings.emailLogoUrl.trim() : '') ||
    null;

  const applyTemplate = useCallback(
    (templateId: string, openEditor: boolean) => {
      const template = getVideoCampaignTemplate(templateId) ?? templates[0];
      if (!template) return;

      setAutoSaveSuspended(true);
      setSavedTemplateId(null);
      setSelectedId(template.id);
      const next = buildDefaultVideoProject(
        template.id,
        category as CampaignCategory,
        binding,
        format
      );
      replaceProject(next);
      setSelectedSceneId(next.scenes[0]?.id ?? null);
      if (openEditor) setShowEditorSettings(true);
      window.setTimeout(() => setAutoSaveSuspended(false), 0);
    },
    [templates, category, binding, format, replaceProject]
  );

  const propertyMediaKey = useMemo(
    () =>
      binding.propertyMedia?.map((item) => `${item.type}:${item.url}`).join('|') ??
      binding.propertyPhoto ??
      '',
    [binding.propertyMedia, binding.propertyPhoto]
  );

  const projectTemplateSeed = useMemo(
    () => `${selected?.id ?? ''}:${category}:${format}:${propertyMediaKey}`,
    [selected?.id, category, format, propertyMediaKey]
  );

  const projectTemplateSeedRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      playerRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    const first = templates[0];
    if (first && !templates.some((template) => template.id === selectedId) && !savedTemplateId) {
      setSelectedId(first.id);
    }
  }, [templates, selectedId, savedTemplateId]);

  useEffect(() => {
    if (savedTemplateId) return;
    if (!selected) return;
    if (projectTemplateSeedRef.current === projectTemplateSeed && project) return;

    projectTemplateSeedRef.current = projectTemplateSeed;
    setAutoSaveSuspended(true);
    const next = buildDefaultVideoProject(
      selected.id,
      category as CampaignCategory,
      binding,
      format
    );
    replaceProject(next);
    setSelectedSceneId(next.scenes[0]?.id ?? null);
    window.setTimeout(() => setAutoSaveSuspended(false), 0);
  }, [
    selected,
    category,
    savedTemplateId,
    binding,
    format,
    projectTemplateSeed,
    project,
    replaceProject,
  ]);

  useEffect(() => {
    setProject((prev) => (prev && prev.format !== format ? { ...prev, format } : prev));
  }, [format]);

  const selectedScene = useMemo(
    () => project?.scenes.find((scene) => scene.id === selectedSceneId) ?? project?.scenes[0],
    [project, selectedSceneId]
  );

  const selectedSceneIndex = useMemo(() => {
    if (!project || !selectedScene) return 0;
    return project.scenes.findIndex((scene) => scene.id === selectedScene.id);
  }, [project, selectedScene]);

  useEffect(() => {
    if (!selectedScene) {
      setSelectedElementId(null);
      return;
    }
    const layers = getSceneLayers(selectedScene);
    const layerIds = layers.map((layer) => layer.id);
    setSelectedElementId((current) =>
      current && layerIds.includes(current) ? current : (layerIds[0] ?? null)
    );
  }, [
    selectedScene?.id,
    selectedScene?.kind,
    selectedScene?.layers,
    selectedScene?.hiddenElements,
  ]);

  useEffect(() => {
    if (!showEditorSettings || !project || !playerRef.current) return;
    const frame = sceneStartFrame(project, selectedSceneIndex);
    playerRef.current.seekTo(frame);
  }, [showEditorSettings, project, selectedSceneIndex, selectedScene?.id]);

  const inputProps = useMemo<VideoCompositionProps>(() => {
    if (!project) {
      return {
        project: buildDefaultVideoProject('promo-500-off', 'promo', binding, format),
        brandColor: typeof brandColor === 'string' ? brandColor : '#e8752a',
      };
    }
    return {
      project,
      brandColor: typeof brandColor === 'string' ? brandColor : '#e8752a',
    };
  }, [project, brandColor, binding, format]);

  const durationInFrames = useMemo(
    () => (project ? videoProjectDurationInFrames(project) : 150),
    [project]
  );

  const designJson = useMemo(
    () => ({
      templateId: project?.templateId ?? selected?.id ?? selectedId,
      format,
      category,
      categoryId: category,
      binding,
      project,
    }),
    [project, selected?.id, selectedId, format, category, binding]
  );

  const templateDisplayName = useMemo(() => {
    if (savedTemplateId) {
      return savedTemplates.find((record) => record.id === savedTemplateId)?.name ?? 'Video';
    }
    if (selected) {
      return catalog.getTemplateLabel(selected.id, selected.name);
    }
    return 'Video';
  }, [savedTemplateId, savedTemplates, selected, catalog]);

  const videoFingerprint = useMemo(() => {
    if (!project || autoSaveSuspended) return null;
    return marketingContentFingerprint({
      templateId: project.templateId,
      format,
      category,
      project,
    });
  }, [project, format, category, autoSaveSuspended]);

  const {
    status: autoSaveStatus,
    errorMessage: autoSaveError,
    markBaseline,
  } = useMarketingAutoSave({
    contentFingerprint: videoFingerprint,
    templateId: savedTemplateId,
    suspended: autoSaveSuspended,
    onTemplateIdChange: setSavedTemplateId,
    buildSavePayload: () => {
      if (!project) return null;
      return {
        name: templateDisplayName,
        contentType: 'video',
        aspectPreset: format,
        platform: format === 'landscape' ? 'facebook' : 'instagram',
        designJson: {
          templateId: project.templateId,
          format,
          category,
          categoryId: category,
          binding,
          project,
        },
      };
    },
  });

  const autoSaveResumeRef = useRef(false);
  useEffect(() => {
    if (autoSaveSuspended) {
      autoSaveResumeRef.current = true;
      return;
    }
    if (autoSaveResumeRef.current) {
      autoSaveResumeRef.current = false;
      window.setTimeout(() => markBaseline(), 0);
    }
  }, [autoSaveSuspended, markBaseline]);

  const formatOptions = useMemo<MarketingFormatOption[]>(
    () =>
      (Object.keys(VIDEO_FORMAT_DIMENSIONS) as VideoFormat[]).map((key) => ({
        value: key,
        width: VIDEO_FORMAT_DIMENSIONS[key].width,
        height: VIDEO_FORMAT_DIMENSIONS[key].height,
      })),
    []
  );

  const presetTemplates = useMemo<PresetTemplateItem[]>(
    () =>
      CATEGORIES.flatMap((cat) =>
        videoTemplatesForCategory(cat).map((template) => ({
          id: template.id,
          name: template.name,
          category: cat,
          swatchPrimary: template.swatchPrimary,
          swatchSecondary: template.swatchSecondary,
          badge: VIDEO_FORMAT_DIMENSIONS[format].aspect,
        }))
      ),
    [format]
  );

  const formatPresetIds = useMemo(
    () => presetTemplates.map((template) => template.id),
    [presetTemplates]
  );

  useEffect(() => {
    return registerVideoThumbnailPlaybackPause(() => {
      playerRef.current?.pause();
      setPreviewPlaying(false);
    });
  }, []);

  useEffect(() => {
    if (!project) return;

    let cancelled = false;

    void (async () => {
      await waitForMarketingIdle(500);
      if (cancelled) return;

      for (const templateId of formatPresetIds) {
        if (cancelled) break;

        const cacheKey = videoPresetThumbnailKey(templateId, format, brandColor);
        if (getCachedMarketingThumbnail(cacheKey)) continue;

        const dataUrl = await renderVideoPresetThumbnail(
          templateId,
          format,
          DEFAULT_MARKETING_THUMB_BINDING,
          brandColor
        );
        if (cancelled || !dataUrl) continue;

        publishMarketingPresetThumbnail(templateId, cacheKey, dataUrl);
        void setPersistedPresetThumbnail(`video:${cacheKey}`, dataUrl);
        await yieldToMainThread();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [project, format, formatPresetIds, brandColor]);

  const handleExportVideo = async () => {
    if (!project) throw new Error('No project');
    const blob = await exportVideoToBlob({
      templateId: project.templateId,
      component: CampaignVideoComposition,
      width: dimensions.width,
      height: dimensions.height,
      fps: project.fps,
      durationInFrames,
      inputProps,
    });
    const dataUrl = await blobToDataUrl(blob);
    return { blob, dataUrl };
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const { blob } = await handleExportVideo();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-${property.slug}-${selected?.id ?? savedTemplateId ?? 'campaign'}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Video export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePublish = async () => {
    if (!onPublish || !project) return;

    setExporting(true);
    try {
      const { blob, dataUrl } = await handleExportVideo();
      onPublish({
        templateId: selected?.id ?? selectedId,
        project,
        blob,
        dataUrl,
      });
    } catch {
      toast.error('Video export failed');
    } finally {
      setExporting(false);
    }
  };

  const seekToSceneId = useCallback(
    (sceneId: string, options?: { play?: boolean; mode?: VideoPreviewMode }) => {
      setSelectedSceneId(sceneId);
      if (!project) return;
      const index = project.scenes.findIndex((scene) => scene.id === sceneId);
      if (index < 0) return;

      if (options?.mode) {
        setPreviewMode(options.mode);
      }

      const frame = sceneStartFrame(project, index);
      playerRef.current?.seekTo(frame);

      if (options?.play) {
        void playerRef.current?.play();
      } else {
        playerRef.current?.pause();
      }
    },
    [project]
  );

  const handleTimelineSelectScene = useCallback(
    (sceneId: string) => {
      seekToSceneId(sceneId, { play: true, mode: 'clip' });
    },
    [seekToSceneId]
  );

  const handleCanvasSelectElement = useCallback(
    (layerId: string, sceneId: string) => {
      playerRef.current?.pause();
      expandSidebar();
      setShowEditorSettings(true);
      setSelectedSceneId(sceneId);
      setSelectedElementId(layerId);
      setElementFocusRequest((count) => count + 1);
    },
    [expandSidebar]
  );

  const handleResetProject = useCallback(() => {
    const templateId = project?.templateId ?? selected?.id ?? selectedId;
    setAutoSaveSuspended(true);
    const next = buildDefaultVideoProject(
      templateId,
      category as CampaignCategory,
      binding,
      format
    );
    replaceProject(next);
    setSelectedSceneId(next.scenes[0]?.id ?? null);
    setSelectedElementId(null);
    setPreviewMode('all');
    playerRef.current?.pause();
    playerRef.current?.seekTo(0);
    window.setTimeout(() => setAutoSaveSuspended(false), 0);
    toast.success('Reset to default');
  }, [project?.templateId, selected?.id, selectedId, category, binding, format, replaceProject]);

  const handleAddScene = useCallback(() => {
    if (!project) return;
    const media = binding.propertyMedia ?? [];
    const { url, mediaType } = pickBindingMediaAt(media, project.scenes.length);
    const next = addPhotoScene(project, url, mediaType);
    setProject(next);
    const added = next.scenes[next.scenes.length - 1];
    if (added) {
      seekToSceneId(added.id, { play: true, mode: 'clip' });
      setShowEditorSettings(true);
    }
  }, [project, binding.propertyMedia, seekToSceneId]);

  const handleRenameTemplate = async (name: string) => {
    if (savedTemplateId) {
      await updateTemplate.mutateAsync({ id: savedTemplateId, name });
      return;
    }
    if (selected) {
      catalog.renamePresetTemplate(selected.id, name);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!savedTemplateId) return;
    await deleteTemplate.mutateAsync(savedTemplateId);
    setSavedTemplateId(null);
    setShowEditorSettings(false);
    const first = templates[0];
    if (first) {
      applyTemplate(first.id, false);
    }
  };

  const compositionKey = useMemo(
    () =>
      project
        ? `${format}-${durationInFrames}-${project.music?.url ?? 'no-music'}-${project.scenes.map((scene) => scene.id).join('-')}`
        : 'empty',
    [project, format, durationInFrames]
  );

  const builderActions = (
    <>
      <MarketingAutoSaveStatus status={autoSaveStatus} errorMessage={autoSaveError} />
      <Button
        variant="outline"
        className="min-h-[44px] gap-2"
        disabled={exporting || !project}
        onClick={() => void handleDownload()}
      >
        {exporting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
        Download MP4
      </Button>
      {onPublish ? (
        <Button
          className="min-h-[44px] gap-2"
          disabled={exporting || !project}
          onClick={() => void handlePublish()}
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          Publish
        </Button>
      ) : null}
    </>
  );

  useMarketingStudioHeaderActions(builderActions);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <MarketingEditorSidebar
        layoutKey="video"
        header={
          showEditorSettings ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-[44px] gap-2"
                onClick={() => setShowEditorSettings(false)}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Templates
              </Button>
              <span className="truncate text-sm font-medium">{templateDisplayName}</span>
            </div>
          ) : (
            <p className="text-sm font-medium">Templates</p>
          )
        }
      >
        {showEditorSettings && project && selectedScene ? (
          <VideoEditorSettings
            project={project}
            selectedScene={selectedScene}
            selectedSceneIndex={selectedSceneIndex}
            propertyImages={propertyImages}
            brandColor={brandColor}
            logoUrl={orgLogoUrl}
            templateName={templateDisplayName}
            savedTemplateId={savedTemplateId}
            onRenameSavedTemplate={handleRenameTemplate}
            onDeleteSavedTemplate={savedTemplateId ? handleDeleteTemplate : undefined}
            onRenameDisplayName={(name) => {
              if (selected) catalog.renamePresetTemplate(selected.id, name);
            }}
            onProjectChange={setProject}
            binding={binding}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            elementFocusRequest={elementFocusRequest}
          />
        ) : (
          <MarketingTemplatesPanel
            tab="video"
            contentType="video"
            formatOptions={formatOptions}
            format={format}
            onFormatChange={(value) => setFormat(value as VideoFormat)}
            category={category}
            onCategoryChange={setCategory}
            presetTemplates={presetTemplates}
            selectedId={selectedId}
            onSelectPreset={(templateId) => applyTemplate(templateId, true)}
            onCustomizePreset={(templateId) => applyTemplate(templateId, true)}
            designJsonForSave={designJson}
            aspectPreset={format}
            platform={format === 'landscape' ? 'facebook' : 'instagram'}
            videoTemplateMenus="minimal"
            brandColor={brandColor}
            binding={binding}
            captureSaveThumbnail={async () => {
              if (!project) return null;
              return captureLiveVideoProjectThumbnail(project, brandColor);
            }}
          />
        )}
      </MarketingEditorSidebar>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {project ? (
          <>
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col overflow-hidden',
                VIDEO_PREVIEW_CONTAINER_MIN_HEIGHT_CLASS
              )}
            >
              <MarketingPreviewHeader
                leading={
                  <MarketingEditorHistoryControls
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={undo}
                    onRedo={redo}
                    onReset={handleResetProject}
                  />
                }
              />
              <VideoPreviewWorkspace
                playerRef={playerRef}
                project={project}
                format={format}
                durationInFrames={durationInFrames}
                inputProps={inputProps}
                selectedSceneIndex={selectedSceneIndex}
                previewMode={previewMode}
                onPreviewModeChange={setPreviewMode}
                onPlayingChange={setPreviewPlaying}
                onProjectChange={setProject}
                compositionKey={compositionKey}
                selectedElementId={selectedElementId}
                onHighlightElement={setSelectedElementId}
                onCanvasSelectElement={handleCanvasSelectElement}
              />
            </div>
            <VideoTimeline
              project={project}
              selectedSceneId={selectedSceneId}
              onSelectScene={handleTimelineSelectScene}
              onProjectChange={setProject}
              onAddScene={handleAddScene}
              isPlaying={previewPlaying}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="text-muted-foreground size-8 animate-spin" aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}
