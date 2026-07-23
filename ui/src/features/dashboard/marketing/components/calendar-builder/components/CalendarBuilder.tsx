import { useRef, useCallback, useState, useEffect, useMemo } from 'react';

import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Send,
  ChevronLeft as ChevronLeftIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { usePublicPropertyDetail } from '@/features/guest/marketing/properties/hooks/usePublicPropertyDetail';

import { useAppSettings } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { CalendarPropertyMediaProvider } from '@/features/dashboard/marketing/components/calendar-builder/components/CalendarPropertyMediaProvider';
import { CalendarThumbnailsProvider } from '@/features/dashboard/marketing/components/calendar-builder/components/CalendarThumbnailsProvider';
import { MarketingAutoSaveStatus } from '@/features/dashboard/marketing/components/shared/MarketingAutoSaveStatus';
import { SaveMarketingTemplateButton } from '@/features/dashboard/marketing/components/shared/SaveMarketingTemplateButton';
import { useMarketingStudioHeaderActions } from '@/features/dashboard/marketing/components/shared/marketingStudioHeaderActions';
import { MarketingEditorHistoryControls } from '@/features/dashboard/marketing/components/shared/MarketingEditorHistoryControls';
import { MarketingEditorSidebar } from '@/features/dashboard/marketing/components/shared/MarketingEditorSidebar';
import { MarketingPreviewHeader } from '@/features/dashboard/marketing/components/shared/MarketingPreviewHeader';
import { useMarketingAutoSave } from '@/features/dashboard/marketing/hooks/useMarketingAutoSave';
import { useCalendarTemplateDedupe } from '@/features/dashboard/marketing/hooks/useCalendarTemplateDedupe';
import { useMarketingCatalog } from '@/features/dashboard/marketing/hooks/useMarketingCatalog';
import { applyBrandAccentToCalendarStyles } from '@/features/dashboard/marketing/lib/calendarBrandColors';
import {
  aspectPresetForCalendarFormat,
  findCalendarAutosaveTemplate,
  isCalendarBlankPreset,
  isCalendarCustomPreset,
  isCalendarPresetAutosave,
  CALENDAR_CUSTOM_PRESET_ID,
} from '@/features/dashboard/marketing/lib/calendarAutosave';
import {
  calendarFormatToAspectPreset,
  calendarPreviewLayout,
  canvasFrameDefaultsForFormat,
  fitZoomLevelForContainer,
  normalizeCalendarCanvasFrame,
  type CalendarCanvasFormat,
} from '@/features/dashboard/marketing/lib/calendarCanvasFormats';
import { marketingContentFingerprint } from '@/features/dashboard/marketing/lib/marketingContentFingerprint';
import {
  propertyGalleryMediaItems,
  propertyMediaItems,
} from '@/features/dashboard/marketing/lib/polotno/propertyMedia';
import { useOrgBrandColor } from '@/features/dashboard/org/hooks/useOrgBrandColor';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { resolveOrgBrandHex } from '@/lib/theme/brandColor';

import { CalendarFormatPicker } from './CalendarFormatPicker';
import { CalendarPreview } from './CalendarPreview';
import { CalendarPreviewScaledFrame } from './CalendarPreviewScaledFrame';
import { CalendarTemplateSidebar } from './CalendarTemplateSidebar';
import {
  ContainerPanel,
  CanvasFramePanel,
  HeaderPanel,
  DayNamesPanel,
  GridPanel,
  CellPanel,
  TodayPanel,
  BookedPanel,
  AvailablePanel,
  LegendPanel,
  WatermarkPanel,
} from './panels';
import { useCalendarTemplates } from '../hooks/use-calendar-templates';
import { useCalendarBuilderStore } from '../stores/calendar-builder-store';
import { normalizeCalendarStyles, type CalendarStyles, type PreviewBooking } from '../types';

interface CalendarBuilderProps {
  propertyName?: string;
  propertySlug?: string;
  bookings?: PreviewBooking[];
  blockedDays?: number[];
  exportContainerRef?: React.Ref<HTMLDivElement>;
  onExport?: () => void;
  onPublish?: () => void;
  isExporting?: boolean;
}

// 10 production-ready designer templates grouped by visual language.
// Each description cites the font pairing so the picker communicates the design system.
const PRESET_CATEGORIES = [
  {
    label: 'Editorial',
    presets: [
      {
        value: 'editorial-serif',
        label: 'Editorial Serif',
        description: 'Playfair · text booked label',
        color: '#111827',
      },
      {
        value: 'modern-classic',
        label: 'Modern Classic',
        description: 'Cormorant · Jost',
        color: '#9a3412',
        secondary: '#c2410c',
      },
    ],
  },
  {
    label: 'Minimal',
    presets: [
      {
        value: 'swiss-minimal',
        label: 'Swiss Minimal',
        description: 'Inter Tight · pattern booked',
        color: '#000000',
      },
      {
        value: 'mono-ink',
        label: 'Mono Ink',
        description: 'Space Grotesk · high contrast',
        color: '#171717',
      },
    ],
  },
  {
    label: 'Warm & Organic',
    presets: [
      {
        value: 'terracotta',
        label: 'Terracotta',
        description: 'Fraunces · gradient booked',
        color: '#c2410c',
        secondary: '#9a3412',
      },
    ],
  },
  {
    label: 'Photo Backgrounds',
    presets: [
      {
        value: 'tropical-paradise',
        label: 'Tropical Paradise',
        description: 'Beach photo · icon booked',
        color: '#00897b',
        secondary: '#4db6ac',
      },
      {
        value: 'cozy-cabin',
        label: 'Cozy Cabin',
        description: 'Wood texture · icon booked',
        color: '#8d6e63',
        secondary: '#6d4c41',
      },
    ],
  },
  {
    label: 'Dark & Luxe',
    presets: [
      {
        value: 'onyx-luxe',
        label: 'Onyx Luxe',
        description: 'Outfit · gold fill booked',
        color: '#0a0a0a',
        secondary: '#d4af37',
      },
      {
        value: 'midnight-velvet',
        label: 'Midnight Velvet',
        description: 'Manrope · navy gradient',
        color: '#1e1b4b',
        secondary: '#6366f1',
      },
    ],
  },
  {
    label: 'Contemporary',
    presets: [
      {
        value: 'risograph-pop',
        label: 'Risograph Pop',
        description: 'Space Grotesk · border grid',
        color: '#f43f5e',
        secondary: '#2563eb',
      },
    ],
  },
];

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200];
const MIN_ZOOM = 25;
const MAX_ZOOM = 200;

export function CalendarBuilder({
  propertyName = 'Beach Villa',
  propertySlug = '',
  bookings,
  blockedDays,
  exportContainerRef,
  onExport,
  onPublish,
  isExporting = false,
}: CalendarBuilderProps) {
  const { data: appSettings } = useAppSettings();
  const { data: publicProperty } = usePublicPropertyDetail(propertySlug);
  const orgBrandColor = useOrgBrandColor();
  const brandColor = appSettings?.resolvedBrandColor ?? orgBrandColor;

  const calendarPropertyImages = useMemo(() => {
    const gallery = publicProperty?.media?.length
      ? propertyGalleryMediaItems(
          publicProperty.media.map((item) => ({ url: item.url, type: item.type }))
        )
      : propertyMediaItems(publicProperty?.images ?? []);
    return gallery.filter((item) => item.type === 'image');
  }, [publicProperty?.media, publicProperty?.images]);

  const calendarRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenZoom, setFullscreenZoom] = useState(100);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [activeAutosaveTemplateId, setActiveAutosaveTemplateId] = useState<string | null>(null);
  const [activeCustomTemplateId, setActiveCustomTemplateId] = useState<string | null>(null);

  const { apiTemplates, savedTemplates } = useCalendarTemplates(propertySlug);
  const catalog = useMarketingCatalog('calendar');
  useCalendarTemplateDedupe(true);

  const calendarPresetIds = useMemo(
    () => [
      'default',
      ...PRESET_CATEGORIES.flatMap((category) => category.presets.map((preset) => preset.value)),
    ],
    []
  );

  const styles = useCalendarBuilderStore((state) => state.styles);
  const setStyles = useCalendarBuilderStore((state) => state.setStyles);
  const setIsDirty = useCalendarBuilderStore((state) => state.setIsDirty);
  const isDirty = useCalendarBuilderStore((state) => state.isDirty);
  const undo = useCalendarBuilderStore((state) => state.undo);
  const redo = useCalendarBuilderStore((state) => state.redo);
  const canUndo = useCalendarBuilderStore((state) => state.canUndo);
  const canRedo = useCalendarBuilderStore((state) => state.canRedo);
  const resetStyles = useCalendarBuilderStore((state) => state.resetStyles);
  const applyPreset = useCalendarBuilderStore((state) => state.applyPreset);
  const saveToHistory = useCalendarBuilderStore((state) => state.saveToHistory);
  const previewMonth = useCalendarBuilderStore((state) => state.previewMonth);
  const nextMonth = useCalendarBuilderStore((state) => state.nextMonth);
  const prevMonth = useCalendarBuilderStore((state) => state.prevMonth);

  const canvasFrame = normalizeCalendarCanvasFrame(styles.canvasFrame, brandColor);

  const activeSourcePresetId = useMemo(() => {
    if (selectedTemplateKey?.startsWith('preset:')) {
      return selectedTemplateKey.slice('preset:'.length);
    }
    if (selectedTemplateKey?.startsWith('custom:')) {
      return CALENDAR_CUSTOM_PRESET_ID;
    }
    return null;
  }, [selectedTemplateKey]);

  const customTemplates = useMemo(
    () => savedTemplates.filter((template) => isCalendarCustomPreset(template.sourcePresetId)),
    [savedTemplates]
  );

  const designerAutosaveEnabled = isCalendarPresetAutosave(activeSourcePresetId);
  const customAutosaveEnabled = Boolean(activeCustomTemplateId);
  const calendarAutosaveEnabled = designerAutosaveEnabled || customAutosaveEnabled;
  const manualSaveEnabled = isCalendarBlankPreset(activeSourcePresetId) && isDirty;

  const calendarTemplateName = useMemo(() => {
    if (activeCustomTemplateId) {
      return (
        customTemplates.find((template) => template.id === activeCustomTemplateId)?.name ??
        'Custom calendar'
      );
    }
    if (!activeSourcePresetId || isCalendarBlankPreset(activeSourcePresetId))
      return 'Blank calendar';
    for (const category of PRESET_CATEGORIES) {
      const preset = category.presets.find((item) => item.value === activeSourcePresetId);
      if (preset) return preset.label;
    }
    return 'Calendar';
  }, [activeCustomTemplateId, activeSourcePresetId, customTemplates]);

  const calendarAspectPreset = useMemo(
    () => aspectPresetForCalendarFormat(canvasFrame.format),
    [canvasFrame.format]
  );

  const calendarFingerprint = useMemo(
    () => marketingContentFingerprint(normalizeCalendarStyles(styles)),
    [styles]
  );

  const {
    status: autoSaveStatus,
    errorMessage: autoSaveError,
    markBaseline,
  } = useMarketingAutoSave({
    enabled: calendarAutosaveEnabled,
    contentFingerprint: calendarFingerprint,
    templateId: activeAutosaveTemplateId,
    resolveTemplateId: () => {
      if (activeAutosaveTemplateId) return activeAutosaveTemplateId;
      if (activeCustomTemplateId) return activeCustomTemplateId;
      if (!designerAutosaveEnabled || !activeSourcePresetId) return null;
      return (
        findCalendarAutosaveTemplate(apiTemplates, activeSourcePresetId, calendarAspectPreset)
          ?.id ?? null
      );
    },
    onTemplateIdChange: (id) => {
      setActiveAutosaveTemplateId(id);
      setIsDirty(false);
    },
    onSaved: () => setIsDirty(false),
    buildSavePayload: () => {
      const normalized = normalizeCalendarStyles(styles);

      if (activeCustomTemplateId) {
        return {
          name: calendarTemplateName,
          contentType: 'calendar',
          aspectPreset: calendarFormatToAspectPreset(normalized.canvasFrame.format),
          designJson: {
            styles: JSON.parse(JSON.stringify(normalized)),
            sourcePresetId: CALENDAR_CUSTOM_PRESET_ID,
          },
        };
      }

      if (!designerAutosaveEnabled || !activeSourcePresetId) return null;

      return {
        name: calendarTemplateName,
        contentType: 'calendar',
        aspectPreset: calendarFormatToAspectPreset(normalized.canvasFrame.format),
        designJson: {
          styles: JSON.parse(JSON.stringify(normalized)),
          sourcePresetId: activeSourcePresetId,
        },
      };
    },
  });

  const customDesignJson = useMemo(() => {
    const normalized = normalizeCalendarStyles(styles);
    return {
      styles: JSON.parse(JSON.stringify(normalized)),
      sourcePresetId: CALENDAR_CUSTOM_PRESET_ID,
    };
  }, [styles]);

  const handleCustomTemplateSaved = useCallback(
    (record: { id: string }) => {
      setActiveCustomTemplateId(record.id);
      setActiveAutosaveTemplateId(record.id);
      setSelectedTemplateKey(`custom:${record.id}`);
      setIsDirty(false);
      window.setTimeout(() => markBaseline(), 0);
    },
    [markBaseline, setIsDirty]
  );

  const mergeCanvasFormat = useCallback(
    (format: CalendarCanvasFormat) => {
      const defaults = canvasFrameDefaultsForFormat(format, brandColor);
      const current = normalizeCalendarStyles(useCalendarBuilderStore.getState().styles);
      return normalizeCalendarStyles({
        ...current,
        canvasFrame: {
          ...current.canvasFrame,
          format,
          padding: defaults.padding,
          calendarScale: defaults.calendarScale,
          background: defaults.background,
        },
      });
    },
    [brandColor]
  );

  const handleCanvasFormatChange = useCallback(
    (format: CalendarCanvasFormat) => {
      const aspectPreset = aspectPresetForCalendarFormat(format);

      if (designerAutosaveEnabled && activeSourcePresetId) {
        const autosave = findCalendarAutosaveTemplate(
          apiTemplates,
          activeSourcePresetId,
          aspectPreset
        );
        if (autosave?.designJson?.styles && typeof autosave.designJson.styles === 'object') {
          setStyles(
            normalizeCalendarStyles(
              JSON.parse(JSON.stringify(autosave.designJson.styles)) as CalendarStyles
            )
          );
          setActiveAutosaveTemplateId(autosave.id);
          saveToHistory();
          window.setTimeout(() => markBaseline(), 0);
          return;
        }
        setStyles(mergeCanvasFormat(format));
        setActiveAutosaveTemplateId(null);
        saveToHistory();
        window.setTimeout(() => markBaseline(), 0);
        return;
      }

      setStyles(mergeCanvasFormat(format));
      saveToHistory();
      window.setTimeout(() => markBaseline(), 0);
    },
    [
      activeSourcePresetId,
      apiTemplates,
      markBaseline,
      mergeCanvasFormat,
      designerAutosaveEnabled,
      saveToHistory,
      setStyles,
    ]
  );

  const loadPresetEditorState = useCallback(
    (presetId: string, options?: { openAdvanced?: boolean }) => {
      setActiveCustomTemplateId(null);

      if (isCalendarBlankPreset(presetId)) {
        applyPreset(presetId, brandColor);
        setActiveAutosaveTemplateId(null);
        setSelectedTemplateKey(`preset:${presetId}`);
        setShowAdvancedSettings(options?.openAdvanced ?? false);
        setIsDirty(false);
        window.setTimeout(() => markBaseline(), 0);
        return;
      }

      const aspectPreset = aspectPresetForCalendarFormat(canvasFrame.format);
      const autosave = findCalendarAutosaveTemplate(apiTemplates, presetId, aspectPreset);
      const savedStyles = autosave?.designJson?.styles;

      if (savedStyles && typeof savedStyles === 'object') {
        setStyles(
          normalizeCalendarStyles(JSON.parse(JSON.stringify(savedStyles)) as CalendarStyles)
        );
        setActiveAutosaveTemplateId(autosave!.id);
      } else {
        applyPreset(presetId, brandColor);
        setActiveAutosaveTemplateId(null);
      }

      setSelectedTemplateKey(`preset:${presetId}`);
      setShowAdvancedSettings(options?.openAdvanced ?? false);
      setIsDirty(false);
      window.setTimeout(() => markBaseline(), 0);
    },
    [apiTemplates, applyPreset, brandColor, canvasFrame.format, markBaseline, setIsDirty, setStyles]
  );

  const loadCustomTemplateState = useCallback(
    (templateId: string, options?: { openAdvanced?: boolean }) => {
      const template = savedTemplates.find((item) => item.id === templateId);
      if (!template) return;

      setStyles(
        normalizeCalendarStyles(JSON.parse(JSON.stringify(template.styles)) as CalendarStyles)
      );
      setActiveCustomTemplateId(templateId);
      setActiveAutosaveTemplateId(templateId);
      setSelectedTemplateKey(`custom:${templateId}`);
      setShowAdvancedSettings(options?.openAdvanced ?? false);
      setIsDirty(false);
      window.setTimeout(() => markBaseline(), 0);
    },
    [markBaseline, savedTemplates, setIsDirty, setStyles]
  );

  const didEstablishBaselineRef = useRef(false);
  useEffect(() => {
    if (didEstablishBaselineRef.current) return;
    didEstablishBaselineRef.current = true;
    window.setTimeout(() => markBaseline(), 0);
  }, [markBaseline]);

  const savedCalendarTemplatesForThumbs = useMemo(
    () =>
      savedTemplates.map((template) => ({
        id: template.id,
        sourcePresetId: template.sourcePresetId,
        styles: template.styles,
        updatedAt: template.createdAt,
        thumbnailDataUrl: template.thumbnailDataUrl,
      })),
    [savedTemplates]
  );

  useEffect(() => {
    if (selectedTemplateKey) return;
    loadPresetEditorState('default');
  }, [selectedTemplateKey, loadPresetEditorState]);

  useEffect(() => {
    if (!designerAutosaveEnabled || !activeSourcePresetId || activeAutosaveTemplateId) return;
    const autosave = findCalendarAutosaveTemplate(
      apiTemplates,
      activeSourcePresetId,
      calendarAspectPreset
    );
    const savedStyles = autosave?.designJson?.styles;
    if (!autosave || !savedStyles || typeof savedStyles !== 'object') return;

    setStyles(normalizeCalendarStyles(JSON.parse(JSON.stringify(savedStyles)) as CalendarStyles));
    setActiveAutosaveTemplateId(autosave.id);
    setIsDirty(false);
    window.setTimeout(() => markBaseline(), 0);
  }, [
    activeAutosaveTemplateId,
    activeSourcePresetId,
    apiTemplates,
    calendarAspectPreset,
    markBaseline,
    designerAutosaveEnabled,
    setIsDirty,
    setStyles,
  ]);

  const thumbnailOptions = useMemo(
    () => ({
      contentType: 'calendar' as const,
      presetIds: calendarPresetIds,
      canvasFormat: canvasFrame.format,
      brandColor,
      previewMonth,
      previewBookings: bookings ?? [],
      savedCalendarTemplates: savedCalendarTemplatesForThumbs,
    }),
    [
      calendarPresetIds,
      canvasFrame.format,
      brandColor,
      previewMonth,
      bookings,
      savedCalendarTemplatesForThumbs,
    ]
  );

  const previewLayout = useMemo(
    () => calendarPreviewLayout(canvasFrame.format, zoomLevel),
    [canvasFrame.format, zoomLevel]
  );
  const fullscreenLayout = useMemo(
    () => calendarPreviewLayout(canvasFrame.format, fullscreenZoom),
    [canvasFrame.format, fullscreenZoom]
  );

  const previewRef = exportContainerRef ?? calendarRef;

  const lastAppliedBrandRef = useRef<string | null>(null);

  useEffect(() => {
    const normalized = resolveOrgBrandHex(brandColor).toLowerCase();
    if (lastAppliedBrandRef.current === normalized) return;
    lastAppliedBrandRef.current = normalized;
    const current = useCalendarBuilderStore.getState().styles;
    setStyles(applyBrandAccentToCalendarStyles(current, brandColor));
  }, [brandColor, setStyles]);

  const applyFitZoom = useCallback(() => {
    const node = previewContainerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setZoomLevel(fitZoomLevelForContainer(canvasFrame.format, rect.width, rect.height));
  }, [canvasFrame.format]);

  useEffect(() => {
    applyFitZoom();
  }, [canvasFrame.format, applyFitZoom]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => {
      const nextLevel = ZOOM_LEVELS.find((level) => level > prev);
      return nextLevel ?? MAX_ZOOM;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const prevLevel = [...ZOOM_LEVELS].reverse().find((level) => level < prev);
      return prevLevel ?? MIN_ZOOM;
    });
  }, []);

  const handleFitToScreen = useCallback(() => {
    applyFitZoom();
  }, [applyFitZoom]);

  // Fullscreen handlers
  const handleOpenFullscreen = useCallback(() => {
    setIsFullscreen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreen(false);
    document.body.style.overflow = '';
  }, []);

  const handleFullscreenZoomIn = useCallback(() => {
    setFullscreenZoom((prev) => {
      const nextLevel = ZOOM_LEVELS.find((level) => level > prev);
      return nextLevel ?? MAX_ZOOM;
    });
  }, []);

  const handleFullscreenZoomOut = useCallback(() => {
    setFullscreenZoom((prev) => {
      const prevLevel = [...ZOOM_LEVELS].reverse().find((level) => level < prev);
      return prevLevel ?? MIN_ZOOM;
    });
  }, []);

  const handleFullscreenFitToScreen = useCallback(() => {
    const node = fullscreenContainerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setFullscreenZoom(fitZoomLevelForContainer(canvasFrame.format, rect.width, rect.height, 96));
  }, [canvasFrame.format]);

  useEffect(() => {
    if (!isFullscreen) return;
    const id = window.requestAnimationFrame(() => handleFullscreenFitToScreen());
    return () => window.cancelAnimationFrame(id);
  }, [isFullscreen, canvasFrame.format, handleFullscreenFitToScreen]);

  // Handle Escape key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        handleCloseFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleCloseFullscreen]);

  const handleReset = () => {
    if (selectedTemplateKey?.startsWith('custom:') && activeCustomTemplateId) {
      loadCustomTemplateState(activeCustomTemplateId);
      toast.success('Reset to saved');
      return;
    }
    if (activeSourcePresetId && !isCalendarBlankPreset(activeSourcePresetId)) {
      applyPreset(activeSourcePresetId, brandColor);
    } else {
      resetStyles(brandColor);
    }
    window.setTimeout(() => markBaseline(), 0);
    toast.success('Reset to default');
  };

  const handleSelectBlank = () => {
    loadPresetEditorState('default');
  };

  const handleCustomizeBlank = () => {
    loadPresetEditorState('default', { openAdvanced: true });
  };

  const handleApplyPreset = (value: string) => {
    loadPresetEditorState(value);
  };

  const handleCustomizePreset = (value: string) => {
    loadPresetEditorState(value, { openAdvanced: true });
  };

  const handleSelectCustom = (id: string) => {
    loadCustomTemplateState(id);
  };

  const handleCustomizeCustom = (id: string) => {
    loadCustomTemplateState(id, { openAdvanced: true });
  };

  const headerActions = useMemo(
    () => (
      <>
        {calendarAutosaveEnabled ? (
          <MarketingAutoSaveStatus status={autoSaveStatus} errorMessage={autoSaveError} />
        ) : null}
        {manualSaveEnabled ? (
          <SaveMarketingTemplateButton
            contentType="calendar"
            designJson={customDesignJson}
            defaultName="Custom calendar"
            aspectPreset={calendarAspectPreset}
            buttonLabel="Save Template"
            updateLabel="Save Template"
            onSaved={handleCustomTemplateSaved}
          />
        ) : null}
        {onExport ? (
          <Button
            variant="outline"
            className="min-h-[44px] gap-2"
            onClick={onExport}
            disabled={isExporting}
          >
            <Download className="size-4" aria-hidden />
            {isExporting ? 'Exporting…' : 'Download PNG'}
          </Button>
        ) : null}
        {onPublish ? (
          <Button className="min-h-[44px] gap-2" onClick={onPublish} disabled={isExporting}>
            <Send className="size-4" aria-hidden />
            Publish
          </Button>
        ) : null}
      </>
    ),
    [
      autoSaveError,
      autoSaveStatus,
      calendarAspectPreset,
      calendarAutosaveEnabled,
      customDesignJson,
      handleCustomTemplateSaved,
      isExporting,
      manualSaveEnabled,
      onExport,
      onPublish,
    ]
  );

  useMarketingStudioHeaderActions(headerActions);

  return (
    <TooltipProvider>
      <CalendarPropertyMediaProvider images={calendarPropertyImages}>
        <CalendarThumbnailsProvider
          options={thumbnailOptions}
          propertyName={propertyName}
          liveCaptureRef={previewRef as React.RefObject<HTMLDivElement | null>}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            <MarketingEditorSidebar
              layoutKey="calendar"
              header={
                showAdvancedSettings ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] gap-2"
                      onClick={() => setShowAdvancedSettings(false)}
                    >
                      <ChevronLeftIcon className="size-4" aria-hidden />
                      Templates
                    </Button>
                    <span className="text-sm font-medium">Advanced settings</span>
                  </div>
                ) : (
                  <p className="text-sm font-medium">Templates</p>
                )
              }
            >
              {showAdvancedSettings ? (
                <div className="space-y-4 pb-4">
                  <CalendarFormatPicker
                    brandColor={brandColor}
                    onFormatChange={handleCanvasFormatChange}
                  />
                  {canvasFrame.format !== 'square' ? <CanvasFramePanel /> : null}
                  <ContainerPanel />
                  <HeaderPanel />
                  <DayNamesPanel />
                  <GridPanel />
                  <CellPanel />
                  <TodayPanel />
                  <BookedPanel />
                  <AvailablePanel />
                  <LegendPanel />
                  <WatermarkPanel />
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  <CalendarFormatPicker
                    brandColor={brandColor}
                    onFormatChange={handleCanvasFormatChange}
                  />
                  <CalendarTemplateSidebar
                    categories={PRESET_CATEGORIES}
                    customTemplates={customTemplates}
                    selectedKey={selectedTemplateKey}
                    canvasFormat={canvasFrame.format}
                    catalog={catalog}
                    onSelectPreset={handleApplyPreset}
                    onCustomizePreset={handleCustomizePreset}
                    onSelectBlank={handleSelectBlank}
                    onCustomizeBlank={handleCustomizeBlank}
                    onSelectCustom={handleSelectCustom}
                    onCustomizeCustom={handleCustomizeCustom}
                  />
                </div>
              )}
            </MarketingEditorSidebar>

            {/* Right Side - Preview */}
            <div className="bg-muted/30 flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
              <MarketingPreviewHeader
                leading={
                  <MarketingEditorHistoryControls
                    canUndo={canUndo()}
                    canRedo={canRedo()}
                    onUndo={undo}
                    onRedo={redo}
                    onReset={handleReset}
                  />
                }
                actions={
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                    {/* Month Navigation */}
                    <div className="border-border bg-background flex items-center gap-1 rounded-md border px-1 py-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 min-h-[44px] w-9 min-w-[44px]"
                            onClick={prevMonth}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Previous Month</TooltipContent>
                      </Tooltip>
                      <span className="min-w-[100px] text-center text-xs font-medium">
                        {previewMonth.toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 min-h-[44px] w-9 min-w-[44px]"
                            onClick={nextMonth}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Next Month</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="bg-border hidden h-5 w-px sm:block" />

                    {/* Zoom Controls */}
                    <div className="border-border bg-background flex items-center gap-1 rounded-md border px-1 py-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 min-h-[44px] w-9 min-w-[44px]"
                            onClick={handleZoomOut}
                            disabled={zoomLevel <= MIN_ZOOM}
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom Out</TooltipContent>
                      </Tooltip>
                      <span className="min-w-[48px] text-center text-xs font-medium">
                        {zoomLevel}%
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 min-h-[44px] w-9 min-w-[44px]"
                            onClick={handleZoomIn}
                            disabled={zoomLevel >= MAX_ZOOM}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom In</TooltipContent>
                      </Tooltip>
                      <div className="bg-border mx-1 hidden h-4 w-px sm:block" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 min-h-[44px] w-9 min-w-[44px]"
                            onClick={handleFitToScreen}
                          >
                            <Minimize2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Fit to View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 min-h-[44px] w-9 min-w-[44px]"
                            onClick={handleOpenFullscreen}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Fullscreen</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                }
              />

              {/* Preview Area */}
              <div ref={previewContainerRef} className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="flex min-h-full items-center justify-center">
                  <CalendarPreviewScaledFrame
                    ref={previewRef}
                    styles={styles}
                    displayScale={previewLayout.displayScale}
                    nativeWidth={previewLayout.nativeWidth}
                    nativeHeight={previewLayout.nativeHeight}
                  >
                    {(calendarSize) => (
                      <CalendarPreview
                        styles={styles}
                        propertyName={propertyName}
                        bookings={bookings}
                        blockedDays={blockedDays}
                        displayMonth={previewMonth}
                        layoutMaxWidth={calendarSize}
                      />
                    )}
                  </CalendarPreviewScaledFrame>
                </div>
              </div>
            </div>
          </div>

          {/* Fullscreen Overlay */}
          {isFullscreen && (
            <div className="bg-background/95 fixed inset-0 z-50 flex flex-col backdrop-blur-sm">
              {/* Fullscreen Header */}
              <div className="border-border bg-background flex items-center justify-between border-b px-6 py-3">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">Calendar Preview</h2>
                  <span className="text-muted-foreground text-sm">
                    {propertyName} •{' '}
                    {previewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Month Navigation */}
                  <div className="border-border bg-muted/50 flex items-center gap-1 rounded-md border px-1 py-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Previous Month</TooltipContent>
                    </Tooltip>
                    <span className="min-w-[100px] text-center text-sm font-medium">
                      {previewMonth.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Next Month</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Zoom Controls */}
                  <div className="border-border bg-muted/50 flex items-center gap-1 rounded-md border px-1 py-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleFullscreenZoomOut}
                          disabled={fullscreenZoom <= MIN_ZOOM}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom Out</TooltipContent>
                    </Tooltip>
                    <span className="min-w-[56px] text-center text-sm font-medium">
                      {fullscreenZoom}%
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleFullscreenZoomIn}
                          disabled={fullscreenZoom >= MAX_ZOOM}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom In</TooltipContent>
                    </Tooltip>
                    <div className="bg-border mx-1 h-5 w-px" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleFullscreenFitToScreen}
                        >
                          <Minimize2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Fit to Screen</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Close Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={handleCloseFullscreen}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Close Fullscreen (Esc)</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Fullscreen Preview Area */}
              <div
                ref={fullscreenContainerRef}
                className="bg-muted/20 flex flex-1 items-center justify-center overflow-auto p-6 sm:p-8"
              >
                <CalendarPreviewScaledFrame
                  styles={styles}
                  displayScale={fullscreenLayout.displayScale}
                  nativeWidth={fullscreenLayout.nativeWidth}
                  nativeHeight={fullscreenLayout.nativeHeight}
                >
                  {(calendarSize) => (
                    <CalendarPreview
                      styles={styles}
                      propertyName={propertyName}
                      bookings={bookings}
                      blockedDays={blockedDays}
                      displayMonth={previewMonth}
                      layoutMaxWidth={calendarSize}
                    />
                  )}
                </CalendarPreviewScaledFrame>
              </div>
            </div>
          )}
        </CalendarThumbnailsProvider>
      </CalendarPropertyMediaProvider>
    </TooltipProvider>
  );
}
