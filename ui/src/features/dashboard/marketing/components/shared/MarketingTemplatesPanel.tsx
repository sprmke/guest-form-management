import { useEffect, useMemo, useState } from 'react';

import { toast } from 'sonner';

import { MarketingCategoryChip } from '@/features/dashboard/marketing/components/shared/MarketingCategoryChip';
import {
  MarketingFormatPicker,
  type MarketingFormatOption,
} from '@/features/dashboard/marketing/components/shared/MarketingFormatPicker';
import { MarketingMoveTemplateDialog } from '@/features/dashboard/marketing/components/shared/MarketingMoveTemplateDialog';
import { MarketingNameDialog } from '@/features/dashboard/marketing/components/shared/MarketingNameDialog';
import { MARKETING_SIDEBAR_GRID } from '@/features/dashboard/marketing/components/shared/marketingSidebarLayout';
import { MarketingSidebarSection } from '@/features/dashboard/marketing/components/shared/MarketingSidebarSection';
import type { MarketingSidebarMenuItem } from '@/features/dashboard/marketing/components/shared/MarketingSidebarSection';
import { MarketingTemplateCard } from '@/features/dashboard/marketing/components/shared/MarketingTemplateCard';
import {
  useMarketingCatalog,
  type MarketingCatalogTab,
} from '@/features/dashboard/marketing/hooks/useMarketingCatalog';
import {
  useDeleteMarketingTemplate,
  useSaveMarketingTemplate,
  type MarketingTemplateRecord,
} from '@/features/dashboard/marketing/hooks/useMarketingTemplates';
import { useMarketingTemplateThumbnails } from '@/features/dashboard/marketing/hooks/useMarketingTemplateThumbnails';
import { DESIGN_CUSTOM_SOURCE_PRESET_ID } from '@/features/dashboard/marketing/lib/designAutosave';
import type { DesignBinding } from '@/features/dashboard/marketing/lib/designCanvasTypes';
import {
  ARCHIVE_MENU_LABEL,
  ARCHIVED_EMPTY_MESSAGE,
  isHiddenCategoryId,
  UNARCHIVE_MENU_LABEL,
} from '@/features/dashboard/marketing/lib/marketingCatalogHidden';
import { resolveFormatOptionDimensions } from '@/features/dashboard/marketing/lib/marketingFormats';
import {
  isDesignCustomTemplate,
  marketingSavedTemplateCategoryId,
  marketingSavedTemplateMatchesFormat,
  marketingVideoSavedCategoryId,
} from '@/features/dashboard/marketing/lib/marketingSavedTemplates';
import type { VideoFormat } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type PresetTemplateItem = {
  id: string;
  name: string;
  category: string;
  swatchPrimary: string;
  swatchSecondary?: string;
  badge?: string;
};

type DialogState =
  | { kind: 'add-category' }
  | { kind: 'rename-category'; categoryId: string; defaultValue: string }
  | { kind: 'rename-preset'; templateId: string; defaultValue: string }
  | { kind: 'save-template' }
  | null;

type MoveTarget = {
  kind: 'preset';
  templateId: string;
  templateName: string;
  currentCategoryId: string;
};

type DeleteTarget =
  | { kind: 'category'; categoryId: string }
  | { kind: 'saved-template'; recordId: string; name: string };

type Props = {
  tab: MarketingCatalogTab;
  contentType: 'design' | 'video';
  formatOptions: MarketingFormatOption[];
  format: string;
  onFormatChange: (format: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  presetTemplates: PresetTemplateItem[];
  selectedId: string;
  onSelectPreset: (templateId: string) => void;
  onCustomizePreset?: (templateId: string) => void;
  savedRecords?: MarketingTemplateRecord[];
  selectedSavedId?: string | null;
  onSelectSaved?: (record: MarketingTemplateRecord) => void;
  onSavedTemplate?: (record: MarketingTemplateRecord) => void;
  designJsonForSave?: Record<string, unknown> | (() => Record<string, unknown> | null);
  aspectPreset?: string;
  platform?: string;
  /** Video: hide rename/delete on template cards; use editor settings instead */
  videoTemplateMenus?: 'minimal' | 'full';
  brandColor?: string;
  binding?: DesignBinding;
  /** Capture a JPEG data URL when saving a custom template (stored in designJson.thumbnailDataUrl). */
  captureSaveThumbnail?: () => Promise<string | null>;
  getThumbnailUrl?: (id: string) => string | undefined;
  isThumbnailLoading?: (id: string) => boolean;
};

export function MarketingTemplatesPanel({
  tab,
  contentType,
  formatOptions,
  format,
  onFormatChange,
  category,
  onCategoryChange,
  presetTemplates,
  selectedId,
  onSelectPreset,
  onCustomizePreset,
  savedRecords = [],
  selectedSavedId = null,
  onSelectSaved,
  onSavedTemplate,
  designJsonForSave,
  aspectPreset,
  platform,
  videoTemplateMenus = tab === 'video' ? 'minimal' : 'full',
  brandColor,
  binding,
  captureSaveThumbnail,
  getThumbnailUrl: getThumbnailUrlProp,
  isThumbnailLoading: isThumbnailLoadingProp,
}: Props) {
  const catalog = useMarketingCatalog(tab);
  const viewingHidden = isHiddenCategoryId(category);
  const saveTemplate = useSaveMarketingTemplate();
  const deleteTemplate = useDeleteMarketingTemplate();

  const visibleSavedRecords = useMemo(() => {
    return savedRecords.filter((record) => {
      if (contentType === 'design' && !isDesignCustomTemplate(record)) return false;
      if (!marketingSavedTemplateMatchesFormat(record, format)) return false;
      if (viewingHidden) return catalog.isSavedTemplateHidden(record.id);
      if (catalog.isSavedTemplateHidden(record.id)) return false;
      const savedCategory =
        tab === 'video'
          ? marketingVideoSavedCategoryId(record)
          : marketingSavedTemplateCategoryId(record);
      return savedCategory === category;
    });
  }, [savedRecords, contentType, format, viewingHidden, catalog, category, tab]);

  const visibleSavedIds = useMemo(
    () => visibleSavedRecords.map((record) => record.id),
    [visibleSavedRecords]
  );

  const visiblePresets = useMemo(() => {
    if (viewingHidden) {
      return presetTemplates.filter((template) => catalog.isPresetHidden(template.id));
    }
    return presetTemplates.filter((template) => {
      if (catalog.isPresetHidden(template.id)) return false;
      const effectiveCategory = catalog.getPresetCategory(template.id, template.category);
      return effectiveCategory === category;
    });
  }, [presetTemplates, category, catalog, viewingHidden]);

  const visiblePresetIds = useMemo(
    () => visiblePresets.map((template) => template.id),
    [visiblePresets]
  );

  const thumbnailOptions = useMemo(
    () =>
      contentType === 'video'
        ? {
            contentType: 'video' as const,
            presetIds: visiblePresetIds,
            format: format as VideoFormat,
            brandColor,
            binding,
            savedRecords: visibleSavedRecords,
          }
        : {
            contentType: 'design' as const,
            presetIds: visiblePresetIds,
            brandColor,
            savedRecords: visibleSavedRecords,
          },
    [contentType, visiblePresetIds, format, brandColor, binding, visibleSavedRecords]
  );

  const thumbnailHook = useMarketingTemplateThumbnails(thumbnailOptions);
  const { requestThumbnail, requestThumbnails } = thumbnailHook;

  const visiblePresetIdsKey = visiblePresetIds.join(',');

  useEffect(() => {
    if (visiblePresetIds.length === 0) return;
    requestThumbnails(visiblePresetIds);
  }, [visiblePresetIdsKey, visiblePresetIds, requestThumbnails]);

  const visibleSavedIdsKey = visibleSavedIds.join(',');

  useEffect(() => {
    if (visibleSavedIds.length === 0) return;
    requestThumbnails(visibleSavedIds.map((id) => `saved:${id}`));
  }, [visibleSavedIdsKey, visibleSavedIds, requestThumbnails]);

  useEffect(() => {
    if (selectedId && !selectedSavedId) requestThumbnail(selectedId);
  }, [selectedId, selectedSavedId, requestThumbnail]);

  useEffect(() => {
    if (selectedSavedId) requestThumbnail(`saved:${selectedSavedId}`);
  }, [selectedSavedId, requestThumbnail]);

  const getThumbnailUrl = getThumbnailUrlProp ?? thumbnailHook.getThumbnailUrl;
  const isThumbnailLoading = isThumbnailLoadingProp ?? thumbnailHook.isThumbnailLoading;

  const formatDims = useMemo(
    () => resolveFormatOptionDimensions(formatOptions, format),
    [formatOptions, format]
  );

  const [dialog, setDialog] = useState<DialogState>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const hiddenBuiltinCategories = useMemo(
    () =>
      catalog.prefs.hiddenBuiltinCategories.map((categoryId) => ({
        id: categoryId,
        label: catalog.getHiddenBuiltinCategoryLabel(categoryId),
      })),
    [catalog]
  );

  const switchAwayFromCategory = (categoryId: string) => {
    if (category !== categoryId) return;
    const fallback = catalog.movableCategories[0];
    if (fallback) onCategoryChange(fallback.id);
  };

  const categoryMenuItems = (
    categoryId: string,
    kind: 'builtin' | 'custom' | 'hidden'
  ): MarketingSidebarMenuItem[] => {
    if (kind === 'hidden') return [];

    const renameItem: MarketingSidebarMenuItem = {
      id: 'rename',
      label: 'Rename',
      onSelect: () => {
        const label =
          catalog.categories.find((item) => item.id === categoryId)?.label ?? categoryId;
        setDialog({ kind: 'rename-category', categoryId, defaultValue: label });
      },
    };

    if (kind === 'custom') {
      return [
        renameItem,
        {
          id: 'delete',
          label: 'Remove',
          destructive: true,
          onSelect: () => setDeleteTarget({ kind: 'category', categoryId }),
        },
      ];
    }

    return [
      renameItem,
      {
        id: 'hide',
        label: ARCHIVE_MENU_LABEL,
        onSelect: () => {
          catalog.hideBuiltinCategory(categoryId);
          switchAwayFromCategory(categoryId);
        },
      },
    ];
  };

  const moveMenuItem = (target: MoveTarget): MarketingSidebarMenuItem | null => {
    const hasOtherCategories = catalog.movableCategories.some(
      (item) => item.id !== target.currentCategoryId
    );
    if (!hasOtherCategories) return null;
    return {
      id: 'move',
      label: 'Move',
      onSelect: () => setMoveTarget(target),
    };
  };

  const savedMenuItems = (record: MarketingTemplateRecord): MarketingSidebarMenuItem[] => {
    if (viewingHidden) {
      return [
        {
          id: 'unhide',
          label: UNARCHIVE_MENU_LABEL,
          onSelect: () => catalog.unhideSavedTemplate(record.id),
        },
      ];
    }
    return [
      {
        id: 'archive',
        label: ARCHIVE_MENU_LABEL,
        onSelect: () => catalog.hideSavedTemplate(record.id),
      },
      {
        id: 'delete',
        label: 'Remove',
        destructive: true,
        onSelect: () =>
          setDeleteTarget({ kind: 'saved-template', recordId: record.id, name: record.name }),
      },
    ];
  };

  const presetMenuItems = (templateId: string, displayName: string, currentCategoryId: string) => {
    if (viewingHidden) {
      return [
        {
          id: 'unhide',
          label: UNARCHIVE_MENU_LABEL,
          onSelect: () => catalog.unhidePresetTemplate(templateId),
        },
      ];
    }

    const moveItem = moveMenuItem({
      kind: 'preset',
      templateId,
      templateName: displayName,
      currentCategoryId,
    });
    if (videoTemplateMenus === 'minimal') {
      return [
        ...(moveItem ? [moveItem] : []),
        {
          id: 'hide',
          label: ARCHIVE_MENU_LABEL,
          onSelect: () => catalog.hidePresetTemplate(templateId),
        },
      ];
    }
    return [
      {
        id: 'rename',
        label: 'Rename',
        onSelect: () => setDialog({ kind: 'rename-preset', templateId, defaultValue: displayName }),
      },
      ...(moveItem ? [moveItem] : []),
      {
        id: 'hide',
        label: ARCHIVE_MENU_LABEL,
        onSelect: () => catalog.hidePresetTemplate(templateId),
      },
    ];
  };

  const handleMoveConfirm = (targetCategoryId: string) => {
    if (!moveTarget) return;

    catalog.movePresetTemplate(moveTarget.templateId, targetCategoryId);
    toast.success('Template moved');
    setMoveTarget(null);
    if (category === moveTarget.currentCategoryId) {
      onCategoryChange(targetCategoryId);
    }
  };

  const handleDialogConfirm = async (value: string) => {
    if (!dialog) return;

    try {
      switch (dialog.kind) {
        case 'add-category': {
          const id = catalog.addCategory(value);
          if (id) onCategoryChange(id);
          break;
        }
        case 'rename-category':
          catalog.renameCategory(dialog.categoryId, value);
          break;
        case 'rename-preset':
          catalog.renamePresetTemplate(dialog.templateId, value);
          break;
        case 'save-template':
          {
            const designJsonPayload =
              typeof designJsonForSave === 'function' ? designJsonForSave() : designJsonForSave;
            if (!designJsonPayload) {
              toast.error('Nothing to save yet');
              return;
            }
            const thumbnailDataUrl = captureSaveThumbnail
              ? await captureSaveThumbnail()
              : undefined;
            const record = await saveTemplate.mutateAsync({
              name: value,
              contentType,
              platform,
              aspectPreset: aspectPreset ?? format,
              designJson: {
                ...designJsonPayload,
                ...(contentType === 'design'
                  ? { sourcePresetId: DESIGN_CUSTOM_SOURCE_PRESET_ID }
                  : {}),
                categoryId: viewingHidden
                  ? (catalog.movableCategories[0]?.id ?? category)
                  : category,
                ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
              },
            });
            onSavedTemplate?.(record);
          }
          break;
        default:
          break;
      }
      setDialog(null);
    } catch {
      // Mutation hook surfaces toast errors; keep dialog open.
      throw new Error('Dialog action failed');
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'category') {
      catalog.deleteCategory(deleteTarget.categoryId);
      if (category === deleteTarget.categoryId) {
        const fallback = catalog.movableCategories.find(
          (item) => item.id !== deleteTarget.categoryId
        );
        if (fallback) onCategoryChange(fallback.id);
      }
      setDeleteTarget(null);
      return;
    }

    void deleteTemplate.mutateAsync(deleteTarget.recordId).finally(() => {
      setDeleteTarget(null);
    });
  };

  const dialogMeta = (() => {
    if (!dialog) return null;
    switch (dialog.kind) {
      case 'add-category':
        return { title: 'New category', confirmLabel: 'Add', defaultValue: '' };
      case 'rename-category':
        return {
          title: 'Rename category',
          confirmLabel: 'Save',
          defaultValue: dialog.defaultValue,
        };
      case 'rename-preset':
        return {
          title: 'Rename template',
          confirmLabel: 'Save',
          defaultValue: dialog.defaultValue,
        };
      case 'save-template':
        return { title: 'Save template', confirmLabel: 'Save', defaultValue: 'My template' };
      default:
        return null;
    }
  })();

  const hasTemplates =
    visiblePresets.length > 0 ||
    visibleSavedRecords.length > 0 ||
    (viewingHidden && hiddenBuiltinCategories.length > 0);

  return (
    <>
      <div className="space-y-4">
        <MarketingFormatPicker options={formatOptions} value={format} onChange={onFormatChange} />

        <MarketingSidebarSection
          title="Category"
          collapsible={false}
          onAdd={() => setDialog({ kind: 'add-category' })}
          addLabel="Add category"
        >
          <div className={MARKETING_SIDEBAR_GRID}>
            {catalog.categories.map((item) => (
              <MarketingCategoryChip
                key={item.id}
                id={item.id}
                label={item.label}
                selected={category === item.id}
                onClick={() => onCategoryChange(item.id)}
                menuItems={categoryMenuItems(item.id, item.kind)}
              />
            ))}
          </div>
        </MarketingSidebarSection>
      </div>

      <MarketingSidebarSection
        title="Templates"
        collapsible={false}
        onAdd={
          designJsonForSave && !viewingHidden
            ? () => setDialog({ kind: 'save-template' })
            : undefined
        }
        addLabel="Save template"
      >
        {hasTemplates ? (
          <ul className={MARKETING_SIDEBAR_GRID}>
            {viewingHidden
              ? hiddenBuiltinCategories.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <MarketingTemplateCard
                      name={item.label}
                      meta="Category"
                      layout="row"
                      onClick={() => undefined}
                      menuItems={[
                        {
                          id: 'unhide',
                          label: UNARCHIVE_MENU_LABEL,
                          onSelect: () => catalog.unhideBuiltinCategory(item.id),
                        },
                      ]}
                    />
                  </li>
                ))
              : null}
            {visibleSavedRecords.map((record) => (
              <li key={record.id} className="min-w-0">
                <MarketingTemplateCard
                  name={record.name}
                  thumbnailUrl={
                    getThumbnailUrl?.(record.id) ?? getThumbnailUrl?.(`saved:${record.id}`)
                  }
                  thumbnailLoading={
                    isThumbnailLoading?.(record.id) ?? isThumbnailLoading?.(`saved:${record.id}`)
                  }
                  onRequestThumbnail={() => requestThumbnail(`saved:${record.id}`)}
                  thumbnailWidth={formatDims.width}
                  thumbnailHeight={formatDims.height}
                  thumbnailOrientation={formatDims.orientation}
                  selected={selectedSavedId === record.id}
                  onClick={() => onSelectSaved?.(record)}
                  menuItems={savedMenuItems(record)}
                />
              </li>
            ))}
            {visiblePresets.map((template) => {
              const displayName = catalog.getTemplateLabel(template.id, template.name);
              const currentCategoryId = catalog.getPresetCategory(template.id, template.category);
              return (
                <li key={template.id} className="min-w-0">
                  <MarketingTemplateCard
                    name={displayName}
                    badge={template.badge}
                    thumbnailUrl={getThumbnailUrl?.(template.id)}
                    thumbnailLoading={isThumbnailLoading?.(template.id)}
                    onRequestThumbnail={() => requestThumbnail(template.id)}
                    thumbnailWidth={formatDims.width}
                    thumbnailHeight={formatDims.height}
                    thumbnailOrientation={formatDims.orientation}
                    selected={!selectedSavedId && selectedId === template.id}
                    onClick={() => onSelectPreset(template.id)}
                    onCustomize={
                      onCustomizePreset ? () => onCustomizePreset(template.id) : undefined
                    }
                    menuItems={presetMenuItems(template.id, displayName, currentCategoryId)}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">
            {viewingHidden ? ARCHIVED_EMPTY_MESSAGE : 'No templates in this category.'}
          </p>
        )}
      </MarketingSidebarSection>

      {dialogMeta ? (
        <MarketingNameDialog
          open={Boolean(dialog)}
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
          title={dialogMeta.title}
          defaultValue={dialogMeta.defaultValue}
          confirmLabel={dialogMeta.confirmLabel}
          onConfirm={(value) => void handleDialogConfirm(value)}
        />
      ) : null}

      {moveTarget ? (
        <MarketingMoveTemplateDialog
          open={Boolean(moveTarget)}
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
          templateName={moveTarget.templateName}
          categories={catalog.movableCategories}
          currentCategoryId={moveTarget.currentCategoryId}
          onSelectCategory={(categoryId) => handleMoveConfirm(categoryId)}
        />
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        {deleteTarget ? (
          <AlertDialogContent className="max-w-[min(calc(100vw-1.5rem),24rem)]">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget.kind === 'saved-template'
                  ? `"${deleteTarget.name}" will be deleted permanently.`
                  : 'This cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </>
  );
}
