import { memo, useState } from 'react';

import { Sparkles } from 'lucide-react';

import { useCalendarThumbnails } from '@/features/dashboard/marketing/components/calendar-builder/components/CalendarThumbnailsProvider';
import type { SavedCalendarTemplate } from '@/features/dashboard/marketing/components/calendar-builder/hooks/useCalendarTemplates';
import { MARKETING_SIDEBAR_GRID } from '@/features/dashboard/marketing/components/shared/marketingSidebarLayout';
import type { MarketingSidebarMenuItem } from '@/features/dashboard/marketing/components/shared/MarketingSidebarSection';
import { MarketingSidebarSection } from '@/features/dashboard/marketing/components/shared/MarketingSidebarSection';
import { MarketingNameDialog } from '@/features/dashboard/marketing/components/shared/MarketingNameDialog';
import { MarketingTemplateCard } from '@/features/dashboard/marketing/components/shared/MarketingTemplateCard';
import {
  CALENDAR_CANVAS_DIMENSIONS,
  type CalendarCanvasFormat,
} from '@/features/dashboard/marketing/lib/calendarCanvasFormats';

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
import { Button } from '@/components/ui/button';

export type CalendarPresetCategory = {
  label: string;
  presets: Array<{
    value: string;
    label: string;
    description: string;
    color: string;
    secondary?: string;
  }>;
};

type Props = {
  categories: CalendarPresetCategory[];
  customTemplates: SavedCalendarTemplate[];
  selectedKey: string | null;
  canvasFormat?: CalendarCanvasFormat;
  onSelectPreset: (value: string) => void;
  onCustomizePreset: (value: string) => void;
  onSelectBlank: () => void;
  onCustomizeBlank: () => void;
  onSelectCustom: (id: string) => void;
  onCustomizeCustom: (id: string) => void;
  onRenameCustom: (id: string, name: string) => void | Promise<void>;
  onRemoveCustom: (id: string) => void | Promise<void>;
  onOpenAiGenerate?: () => void;
  aiGenerateBusy?: boolean;
};

export const CalendarTemplateSidebar = memo(function CalendarTemplateSidebar({
  categories,
  customTemplates,
  selectedKey,
  canvasFormat = 'square',
  onSelectPreset,
  onCustomizePreset,
  onSelectBlank,
  onCustomizeBlank,
  onSelectCustom,
  onCustomizeCustom,
  onRenameCustom,
  onRemoveCustom,
  onOpenAiGenerate,
  aiGenerateBusy = false,
}: Props) {
  const { getThumbnailUrl, isThumbnailLoading, requestThumbnail } = useCalendarThumbnails();
  const [removeTarget, setRemoveTarget] = useState<SavedCalendarTemplate | null>(null);
  const [renameTarget, setRenameTarget] = useState<SavedCalendarTemplate | null>(null);

  const dims = CALENDAR_CANVAS_DIMENSIONS[canvasFormat];
  const calendarThumbProps = {
    thumbnailWidth: dims.width,
    thumbnailHeight: dims.height,
    thumbnailOrientation:
      canvasFormat === 'portrait'
        ? ('portrait' as const)
        : canvasFormat === 'landscape'
          ? ('landscape' as const)
          : ('square' as const),
  };

  const customMenu = (template: SavedCalendarTemplate): MarketingSidebarMenuItem[] => [
    {
      id: 'rename',
      label: 'Rename',
      onSelect: () => setRenameTarget(template),
    },
    {
      id: 'remove',
      label: 'Remove',
      destructive: true,
      onSelect: () => setRemoveTarget(template),
    },
  ];

  const renderPresetCard = (preset: CalendarPresetCategory['presets'][number]) => {
    const thumbId = `preset:${preset.value}`;
    return (
      <li key={preset.value} className="min-w-0">
        <MarketingTemplateCard
          name={preset.label}
          meta={preset.description}
          thumbnailUrl={getThumbnailUrl(thumbId) ?? getThumbnailUrl(preset.value)}
          thumbnailLoading={isThumbnailLoading(thumbId) || isThumbnailLoading(preset.value)}
          onRequestThumbnail={() => requestThumbnail(thumbId)}
          selected={selectedKey === thumbId}
          onClick={() => onSelectPreset(preset.value)}
          onCustomize={() => onCustomizePreset(preset.value)}
          {...calendarThumbProps}
        />
      </li>
    );
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    await onRemoveCustom(removeTarget.id);
    setRemoveTarget(null);
  };

  return (
    <>
      {onOpenAiGenerate ? (
        <Button
          type="button"
          variant="outline"
          className="mb-2 min-h-[44px] w-full gap-2"
          disabled={aiGenerateBusy}
          onClick={onOpenAiGenerate}
        >
          <Sparkles className="size-4" aria-hidden />
          {aiGenerateBusy ? 'Generating…' : 'Generate with AI'}
        </Button>
      ) : null}
      <MarketingSidebarSection title="Custom" collapsible={false}>
        <ul className={MARKETING_SIDEBAR_GRID}>
          <li className="min-w-0">
            <MarketingTemplateCard
              name="Blank calendar"
              meta="Default styles"
              thumbnailUrl={getThumbnailUrl('preset:default') ?? getThumbnailUrl('default')}
              thumbnailLoading={
                isThumbnailLoading('preset:default') || isThumbnailLoading('default')
              }
              onRequestThumbnail={() => requestThumbnail('preset:default')}
              selected={selectedKey === 'preset:default'}
              onClick={onSelectBlank}
              onCustomize={onCustomizeBlank}
              {...calendarThumbProps}
            />
          </li>
          {customTemplates.map((template) => {
            const thumbId = `custom:${template.id}`;
            return (
              <li key={template.id} className="min-w-0">
                <MarketingTemplateCard
                  name={template.name}
                  thumbnailUrl={getThumbnailUrl(thumbId) ?? getThumbnailUrl(`saved:${template.id}`)}
                  thumbnailLoading={
                    isThumbnailLoading(thumbId) || isThumbnailLoading(`saved:${template.id}`)
                  }
                  onRequestThumbnail={() => requestThumbnail(`saved:${template.id}`)}
                  selected={selectedKey === `custom:${template.id}`}
                  onClick={() => onSelectCustom(template.id)}
                  onCustomize={() => onCustomizeCustom(template.id)}
                  menuItems={customMenu(template)}
                  {...calendarThumbProps}
                />
              </li>
            );
          })}
        </ul>
      </MarketingSidebarSection>

      {categories.map((category) => (
        <MarketingSidebarSection key={category.label} title={category.label} collapsible={false}>
          <ul className={MARKETING_SIDEBAR_GRID}>
            {category.presets.map((preset) => renderPresetCard(preset))}
          </ul>
        </MarketingSidebarSection>
      ))}

      <MarketingNameDialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        title="Rename template"
        defaultValue={renameTarget?.name ?? ''}
        confirmLabel="Save"
        onConfirm={async (name) => {
          if (!renameTarget) return;
          await onRenameCustom(renameTarget.id, name);
          setRenameTarget(null);
        }}
      />

      <AlertDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[min(calc(100vw-1.5rem),24rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? removeTarget.aiGenerated
                  ? `"${removeTarget.name}" will be deleted for all formats (Square, Portrait, Landscape).`
                  : `"${removeTarget.name}" will be deleted permanently.`
                : 'This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleRemoveConfirm()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
