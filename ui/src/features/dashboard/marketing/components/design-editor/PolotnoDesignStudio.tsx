import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Download, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { usePublicPropertyDetail } from '@/features/guest/marketing/properties/hooks/usePublicPropertyDetail';

import { useAppSettings } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { KamePolotnoEditor } from '@/features/dashboard/marketing/components/design-editor/polotno/KamePolotnoEditor';
import { MarketingAutoSaveStatus } from '@/features/dashboard/marketing/components/shared/MarketingAutoSaveStatus';
import { MarketingEditorSidebar } from '@/features/dashboard/marketing/components/shared/MarketingEditorSidebar';
import type { MarketingFormatOption } from '@/features/dashboard/marketing/components/shared/MarketingFormatPicker';
import { useMarketingStudioHeaderActions } from '@/features/dashboard/marketing/components/shared/MarketingStudioHeaderActions';
import {
  MarketingTemplatesPanel,
  type PresetTemplateItem,
} from '@/features/dashboard/marketing/components/shared/MarketingTemplatesPanel';
import { useDesignTemplateCleanup } from '@/features/dashboard/marketing/hooks/useDesignTemplateCleanup';
import { useMarketingAutoSave } from '@/features/dashboard/marketing/hooks/useMarketingAutoSave';
import { useMarketingAutoSaveSuspension } from '@/features/dashboard/marketing/hooks/useMarketingAutoSaveSuspension';
import { useMarketingBookedDates } from '@/features/dashboard/marketing/hooks/useMarketingBookedDates';
import { useMarketingCatalog } from '@/features/dashboard/marketing/hooks/useMarketingCatalog';
import {
  useMarketingTemplates,
  type MarketingTemplateRecord,
} from '@/features/dashboard/marketing/hooks/useMarketingTemplates';
import { usePolotnoStoreFingerprint } from '@/features/dashboard/marketing/hooks/usePolotnoStoreFingerprint';
import {
  DESIGN_CUSTOM_SOURCE_PRESET_ID,
  findDesignAutosaveTemplate,
} from '@/features/dashboard/marketing/lib/designAutosave';
import {
  campaignTemplatesForFormat,
  DESIGN_FORMAT_DIMENSIONS,
} from '@/features/dashboard/marketing/lib/designCampaignTemplates';
import {
  type CampaignCategory,
  type DesignBinding,
} from '@/features/dashboard/marketing/lib/designCanvasTypes';
import {
  availabilityTextForMonth,
  openSlotDatesForMonth,
} from '@/features/dashboard/marketing/lib/marketingBookedDates';
import {
  marketingDesignSidebarRecords,
  marketingSavedTemplateCategoryId,
} from '@/features/dashboard/marketing/lib/marketingSavedTemplates';
import { marketingEditorWorkspaceClassName } from '@/features/dashboard/marketing/lib/marketingEditorWorkspace';
import { ensurePolotnoConfigured } from '@/features/dashboard/marketing/lib/polotno/initPolotno';
import { buildPolotnoCampaignDocument } from '@/features/dashboard/marketing/lib/polotno/polotnoCampaignDocuments';
import {
  createPolotnoStore,
  exportPolotnoStorePng,
  type PolotnoStore,
} from '@/features/dashboard/marketing/lib/polotno/polotnoStore';
import { syncPolotnoTextBounds } from '@/features/dashboard/marketing/lib/polotno/syncPolotnoTextBounds';
import { renderDesignStoreThumbnail } from '@/features/dashboard/marketing/lib/renderMarketingDesignThumbnail';
import type { DesignTemplateFormat } from '@/features/dashboard/marketing/lib/templateRegistry';
import { useOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOrgBrandColor } from '@/features/dashboard/org/hooks/useOrgBrandColor';
import { useOrgSettings } from '@/features/dashboard/org/hooks/useOrgSettings';

import { Button } from '@/components/ui/button';
import { formatMoneyCompact } from '@/utils/format/currency';
import { cn } from '@/lib/utils';

/* Blueprint CSS is scoped to .polotno-studio-root via postcss.config.js + vite plugin */
import '@/features/dashboard/marketing/styles/polotno-blueprint.css';
import './polotno-design-studio.css';

export type DesignExportPayload = {
  blob: Blob;
  format: DesignTemplateFormat;
  templateId: string;
};

type Props = {
  onPublish?: (payload: DesignExportPayload) => void;
};

const CATEGORIES: CampaignCategory[] = ['promo', 'slots', 'giveaway', 'fully-booked'];

export function PolotnoDesignStudio({ onPublish }: Props) {
  const { property, org } = useOrgContext();
  const catalog = useMarketingCatalog('design');
  const { data: appSettings } = useAppSettings();
  const { data: orgSettings } = useOrgSettings();
  const orgBrandColor = useOrgBrandColor();
  const brandColor = appSettings?.resolvedBrandColor ?? orgBrandColor;
  const orgLogoUrl =
    orgSettings?.emailLogoUrl?.trim() ||
    org.logoUrl?.trim() ||
    (typeof org.settings?.emailLogoUrl === 'string' ? org.settings.emailLogoUrl.trim() : '') ||
    null;
  const storeRef = useRef<PolotnoStore | null>(null);
  const [storeReady, setStoreReady] = useState(false);
  const [format, setFormat] = useState<DesignTemplateFormat>('instagram-post');
  const [category, setCategory] = useState<string>('promo');
  const [selectedId, setSelectedId] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);

  const { data: savedTemplates = [] } = useMarketingTemplates('design');
  useDesignTemplateCleanup(true);
  const customSavedTemplates = useMemo(
    () => marketingDesignSidebarRecords(savedTemplates),
    [savedTemplates]
  );
  const savedTemplatesRef = useRef(savedTemplates);
  savedTemplatesRef.current = savedTemplates;

  const {
    suspended: autoSaveSuspended,
    begin: beginAutoSaveSuspension,
    end: endAutoSaveSuspension,
  } = useMarketingAutoSaveSuspension();

  const { data: publicProperty } = usePublicPropertyDetail(property.slug);
  const { data: bookedDates } = useMarketingBookedDates();
  const previewMonth = useMemo(() => new Date(), []);
  const bindingRef = useRef<DesignBinding | null>(null);
  const skipPresetApplyRef = useRef(false);
  const appliedDocumentKeyRef = useRef<string | null>(null);

  const binding = useMemo<DesignBinding>(() => {
    const rate = publicProperty?.pricing.baseRate ?? 2799;
    return {
      propertyName: property.name,
      propertyPhoto: publicProperty?.images[0] ?? null,
      nightlyRate: `${formatMoneyCompact(rate)} / night`,
      availabilityText: availabilityTextForMonth(bookedDates ?? [], previewMonth),
      monthLabel: previewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      monthShort: previewMonth.toLocaleDateString('en-US', { month: 'long' }),
      openSlots: openSlotDatesForMonth(bookedDates ?? [], previewMonth, 5),
    };
  }, [property.name, publicProperty, bookedDates, previewMonth]);

  bindingRef.current = binding;

  const showPresetTemplates = catalog.isBuiltinCategory(category);
  const templates = useMemo(
    () =>
      showPresetTemplates ? campaignTemplatesForFormat(format, category as CampaignCategory) : [],
    [format, category, showPresetTemplates]
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0],
    [templates, selectedId]
  );

  useEffect(() => {
    ensurePolotnoConfigured();
    if (!storeRef.current) {
      storeRef.current = createPolotnoStore();
      setStoreReady(true);
    }
    return () => {
      (storeRef.current as { destroy?: () => void } | null)?.destroy?.();
      storeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const first = templates[0];
    if (first && !templates.some((t) => t.id === selectedId)) {
      setSelectedId(first.id);
    }
  }, [templates, selectedId]);

  const applyTemplate = useCallback(
    async (templateId: string) => {
      const store = storeRef.current;
      if (!store || !templateId) return;

      beginAutoSaveSuspension();
      setLoadingTemplate(true);
      try {
        const autosave = findDesignAutosaveTemplate(savedTemplatesRef.current, templateId, format);
        if (autosave?.designJson?.polotno && typeof autosave.designJson.polotno === 'object') {
          setSavedTemplateId(autosave.id);
          store.loadJSON(autosave.designJson.polotno as Record<string, unknown>);
          store.history.clear();
          await syncPolotnoTextBounds(store);
          return;
        }

        const doc = buildPolotnoCampaignDocument(templateId, bindingRef.current!, { brandColor });
        if (!doc) return;

        setSavedTemplateId(null);
        store.loadJSON(doc);
        store.history.clear();
        await syncPolotnoTextBounds(store);
      } catch {
        toast.error('Could not load template');
      } finally {
        setLoadingTemplate(false);
        endAutoSaveSuspension();
      }
    },
    [beginAutoSaveSuspension, brandColor, endAutoSaveSuspension, format]
  );

  const applyTemplateRef = useRef(applyTemplate);
  applyTemplateRef.current = applyTemplate;

  const applySavedTemplate = useCallback(
    async (record: MarketingTemplateRecord) => {
      const store = storeRef.current;
      if (!store) return;

      const polotno = record.designJson.polotno;
      if (!polotno || typeof polotno !== 'object') {
        toast.error('Could not load template');
        return;
      }

      const savedFormat =
        record.aspectPreset ??
        (typeof record.designJson.format === 'string'
          ? (record.designJson.format as DesignTemplateFormat)
          : null);
      const savedCategory = marketingSavedTemplateCategoryId(record);

      skipPresetApplyRef.current = true;
      appliedDocumentKeyRef.current = `saved:${record.id}`;
      beginAutoSaveSuspension();
      setLoadingTemplate(true);

      try {
        if (savedFormat && savedFormat !== format) {
          setFormat(savedFormat as DesignTemplateFormat);
        }
        if (savedCategory && savedCategory !== category) {
          setCategory(savedCategory);
        }

        setSavedTemplateId(record.id);
        const baseTemplateId =
          typeof record.designJson.templateId === 'string' ? record.designJson.templateId : '';
        if (baseTemplateId) {
          setSelectedId(baseTemplateId);
        }

        store.loadJSON(polotno);
        store.history.clear();
        await syncPolotnoTextBounds(store);
      } catch {
        toast.error('Could not load template');
      } finally {
        setLoadingTemplate(false);
        endAutoSaveSuspension();
      }
    },
    [beginAutoSaveSuspension, category, endAutoSaveSuspension, format]
  );

  useEffect(() => {
    if (skipPresetApplyRef.current) {
      skipPresetApplyRef.current = false;
      return;
    }
    if (savedTemplateId) return;
    if (!storeReady || !selectedId) return;
    if (!templates.some((template) => template.id === selectedId)) return;

    const applyKey = `${selectedId}:${format}`;
    if (appliedDocumentKeyRef.current === applyKey) return;

    appliedDocumentKeyRef.current = applyKey;
    void applyTemplateRef.current(selectedId);
  }, [selectedId, storeReady, format, templates, savedTemplateId]);

  const store = storeRef.current;

  const designFingerprint = usePolotnoStoreFingerprint(store, {
    templateId: selectedId,
    format,
  });

  const designTemplateName = useMemo(() => {
    if (savedTemplateId) {
      return savedTemplates.find((record) => record.id === savedTemplateId)?.name ?? 'Design';
    }
    return selectedTemplate?.name ?? 'Design';
  }, [savedTemplateId, savedTemplates, selectedTemplate?.name]);

  const {
    status: autoSaveStatus,
    errorMessage: autoSaveError,
    markBaseline,
  } = useMarketingAutoSave({
    contentFingerprint: storeReady ? designFingerprint : null,
    templateId: savedTemplateId,
    suspended: loadingTemplate || autoSaveSuspended,
    resolveTemplateId: () => {
      if (savedTemplateId) return savedTemplateId;
      if (!selectedId) return null;
      return findDesignAutosaveTemplate(savedTemplates, selectedId, format)?.id ?? null;
    },
    onTemplateIdChange: setSavedTemplateId,
    buildSavePayload: () => {
      if (!store) return null;
      const editingCustom = Boolean(
        savedTemplateId && customSavedTemplates.some((record) => record.id === savedTemplateId)
      );
      return {
        name: designTemplateName,
        contentType: 'design',
        aspectPreset: format,
        platform: format.includes('facebook') ? 'facebook' : 'instagram',
        designJson: {
          templateId: selectedId,
          sourcePresetId: editingCustom ? DESIGN_CUSTOM_SOURCE_PRESET_ID : selectedId,
          format,
          categoryId: category,
          category,
          binding,
          polotno: store.toJSON(),
        },
      };
    },
  });

  const handleSavedTemplateCreated = useCallback(
    (record: MarketingTemplateRecord) => {
      skipPresetApplyRef.current = true;
      appliedDocumentKeyRef.current = `saved:${record.id}`;
      setSavedTemplateId(record.id);
      markBaseline();
    },
    [markBaseline]
  );

  const handleResetDesign = useCallback(() => {
    if (!selectedId) return;
    appliedDocumentKeyRef.current = null;
    void applyTemplate(selectedId).then(() => {
      appliedDocumentKeyRef.current = `${selectedId}:${format}`;
      markBaseline();
    });
    toast.success('Reset to default');
  }, [applyTemplate, selectedId, format, markBaseline]);

  // Capture polotno JSON only when Save runs — avoid store.toJSON() every render.
  const designJsonForSave = useCallback(() => {
    const activeStore = storeRef.current;
    if (!activeStore) return null;
    return {
      templateId: selectedId,
      format,
      binding: bindingRef.current!,
      polotno: activeStore.toJSON(),
    };
  }, [selectedId, format]);

  const handleDownload = useCallback(async () => {
    const activeStore = storeRef.current;
    const template = selectedTemplate;
    if (!activeStore || !template) return;
    setExporting(true);
    try {
      const blob = await exportPolotnoStorePng(activeStore);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `design-${property.slug}-${template.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Design downloaded');
    } catch {
      toast.error('Failed to export design');
    } finally {
      setExporting(false);
    }
  }, [property.slug, selectedTemplate]);

  const handlePublish = useCallback(async () => {
    const activeStore = storeRef.current;
    const template = selectedTemplate;
    if (!onPublish || !activeStore || !template) return;
    setExporting(true);
    try {
      const blob = await exportPolotnoStorePng(activeStore);
      if (!blob) return;
      onPublish({ blob, format, templateId: template.id });
    } catch {
      toast.error('Failed to prepare design');
    } finally {
      setExporting(false);
    }
  }, [format, onPublish, selectedTemplate]);

  const propertyImageUrls = useMemo(
    () => publicProperty?.images ?? (binding.propertyPhoto ? [binding.propertyPhoto] : []),
    [publicProperty?.images, binding.propertyPhoto]
  );

  const builderActions = useMemo(
    () => (
      <>
        <MarketingAutoSaveStatus status={autoSaveStatus} errorMessage={autoSaveError} />
        <Button
          variant="outline"
          className="min-h-[44px] gap-2"
          disabled={!storeReady || exporting || loadingTemplate}
          onClick={() => void handleDownload()}
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          Download PNG
        </Button>
        {onPublish ? (
          <Button
            className="min-h-[44px] gap-2"
            disabled={!storeReady || exporting || loadingTemplate}
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
    ),
    [
      autoSaveStatus,
      autoSaveError,
      storeReady,
      exporting,
      loadingTemplate,
      onPublish,
      handleDownload,
      handlePublish,
    ]
  );

  const builderStatus = useMemo(
    () =>
      loadingTemplate ? (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Loading…
        </span>
      ) : null,
    [loadingTemplate]
  );

  const headerActions = useMemo(
    () => (
      <>
        {builderStatus}
        {builderActions}
      </>
    ),
    [builderActions, builderStatus]
  );

  useMarketingStudioHeaderActions(headerActions);

  const formatOptions = useMemo<MarketingFormatOption[]>(
    () =>
      (Object.keys(DESIGN_FORMAT_DIMENSIONS) as DesignTemplateFormat[]).map((key) => ({
        value: key,
        width: DESIGN_FORMAT_DIMENSIONS[key].width,
        height: DESIGN_FORMAT_DIMENSIONS[key].height,
      })),
    []
  );

  const presetTemplates = useMemo<PresetTemplateItem[]>(
    () =>
      CATEGORIES.flatMap((cat) =>
        campaignTemplatesForFormat(format, cat).map((template) => ({
          id: template.id,
          name: template.name,
          category: cat,
          swatchPrimary: template.preview.primary,
          swatchSecondary: template.preview.secondary,
        }))
      ),
    [format]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <MarketingEditorSidebar
        layoutKey="design"
        header={<p className="text-sm font-medium">Templates</p>}
      >
        <MarketingTemplatesPanel
          tab="design"
          contentType="design"
          brandColor={brandColor}
          formatOptions={formatOptions}
          format={format}
          onFormatChange={(value) => {
            setSavedTemplateId(null);
            appliedDocumentKeyRef.current = null;
            setFormat(value as DesignTemplateFormat);
          }}
          category={category}
          onCategoryChange={setCategory}
          presetTemplates={presetTemplates}
          selectedId={selectedId}
          onSelectPreset={(templateId) => {
            setSavedTemplateId(null);
            appliedDocumentKeyRef.current = null;
            setSelectedId(templateId);
          }}
          savedRecords={customSavedTemplates}
          selectedSavedId={
            savedTemplateId && customSavedTemplates.some((record) => record.id === savedTemplateId)
              ? savedTemplateId
              : null
          }
          onSelectSaved={(record) => void applySavedTemplate(record)}
          onSavedTemplate={handleSavedTemplateCreated}
          designJsonForSave={designJsonForSave}
          aspectPreset={format}
          platform={format.includes('facebook') ? 'facebook' : 'instagram'}
          captureSaveThumbnail={async () => {
            const activeStore = storeRef.current;
            if (!activeStore) return null;
            return renderDesignStoreThumbnail(activeStore);
          }}
        />
      </MarketingEditorSidebar>

      <div
        className={cn(
          'polotno-studio-root relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          marketingEditorWorkspaceClassName
        )}
      >
        <div className="relative min-h-0 flex-1">
          {storeReady && store ? (
            <KamePolotnoEditor
              store={store}
              propertyImageUrls={propertyImageUrls}
              brandColor={brandColor}
              logoUrl={orgLogoUrl}
              style={{ width: '100%', height: '100%' }}
              onResetDesign={handleResetDesign}
              resetDisabled={loadingTemplate || (!selectedId && !savedTemplateId)}
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
              Starting editor…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
