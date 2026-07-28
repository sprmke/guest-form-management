import { memo, useMemo } from 'react';

import { useCalendarThumbnails } from '@/features/dashboard/marketing/components/calendar-builder/components/CalendarThumbnailsProvider';
import type { SavedCalendarTemplate } from '@/features/dashboard/marketing/components/calendar-builder/hooks/use-calendar-templates';
import { MARKETING_SIDEBAR_GRID } from '@/features/dashboard/marketing/components/shared/marketingSidebarLayout';
import type { MarketingSidebarMenuItem } from '@/features/dashboard/marketing/components/shared/MarketingSidebarSection';
import { MarketingSidebarSection } from '@/features/dashboard/marketing/components/shared/MarketingSidebarSection';
import { MarketingTemplateCard } from '@/features/dashboard/marketing/components/shared/MarketingTemplateCard';
import type { useMarketingCatalog } from '@/features/dashboard/marketing/hooks/useMarketingCatalog';
import {
  CALENDAR_CANVAS_DIMENSIONS,
  type CalendarCanvasFormat,
} from '@/features/dashboard/marketing/lib/calendarCanvasFormats';
import { HIDDEN_CATEGORY_LABEL } from '@/features/dashboard/marketing/lib/marketingCatalogHidden';

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

type Catalog = ReturnType<typeof useMarketingCatalog>;

type Props = {
  categories: CalendarPresetCategory[];
  customTemplates: SavedCalendarTemplate[];
  selectedKey: string | null;
  canvasFormat?: CalendarCanvasFormat;
  catalog: Catalog;
  onSelectPreset: (value: string) => void;
  onCustomizePreset: (value: string) => void;
  onSelectBlank: () => void;
  onCustomizeBlank: () => void;
  onSelectCustom: (id: string) => void;
  onCustomizeCustom: (id: string) => void;
};

export const CalendarTemplateSidebar = memo(function CalendarTemplateSidebar({
  categories,
  customTemplates,
  selectedKey,
  canvasFormat = 'square',
  catalog,
  onSelectPreset,
  onCustomizePreset,
  onSelectBlank,
  onCustomizeBlank,
  onSelectCustom,
  onCustomizeCustom,
}: Props) {
  const { getThumbnailUrl, isThumbnailLoading, requestThumbnail } = useCalendarThumbnails();

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

  const visibleCategories = useMemo(
    () => categories.filter((category) => !catalog.isCalendarCategoryHidden(category.label)),
    [categories, catalog]
  );

  const hiddenCategoryItems = useMemo(
    () => categories.filter((category) => catalog.isCalendarCategoryHidden(category.label)),
    [categories, catalog]
  );

  const hiddenPresets = useMemo(() => {
    const items: Array<{
      preset: CalendarPresetCategory['presets'][number];
      categoryLabel: string;
    }> = [];
    for (const category of categories) {
      if (catalog.isCalendarCategoryHidden(category.label)) continue;
      for (const preset of category.presets) {
        if (catalog.isCalendarPresetHidden(preset.value)) {
          items.push({ preset, categoryLabel: category.label });
        }
      }
    }
    return items;
  }, [categories, catalog]);

  const presetHideMenu = (presetValue: string): MarketingSidebarMenuItem[] => [
    {
      id: 'hide',
      label: 'Hide',
      onSelect: () => catalog.hideCalendarPreset(presetValue),
    },
  ];

  const presetUnhideMenu = (presetValue: string): MarketingSidebarMenuItem[] => [
    {
      id: 'unhide',
      label: 'Unhide',
      onSelect: () => catalog.unhideCalendarPreset(presetValue),
    },
  ];

  const categoryHideMenu = (categoryLabel: string): MarketingSidebarMenuItem[] => [
    {
      id: 'hide',
      label: 'Hide',
      onSelect: () => catalog.hideCalendarCategory(categoryLabel),
    },
  ];

  const categoryUnhideMenu = (categoryLabel: string): MarketingSidebarMenuItem[] => [
    {
      id: 'unhide',
      label: 'Unhide',
      onSelect: () => catalog.unhideCalendarCategory(categoryLabel),
    },
  ];

  const renderPresetCard = (
    preset: CalendarPresetCategory['presets'][number],
    options?: { unhide?: boolean; meta?: string }
  ) => {
    const thumbId = `preset:${preset.value}`;
    return (
      <li key={preset.value} className="min-w-0">
        <MarketingTemplateCard
          name={preset.label}
          meta={options?.meta ?? preset.description}
          thumbnailUrl={getThumbnailUrl(thumbId) ?? getThumbnailUrl(preset.value)}
          thumbnailLoading={isThumbnailLoading(thumbId) || isThumbnailLoading(preset.value)}
          onRequestThumbnail={() => requestThumbnail(thumbId)}
          selected={selectedKey === thumbId}
          onClick={() => onSelectPreset(preset.value)}
          onCustomize={() => onCustomizePreset(preset.value)}
          menuItems={
            options?.unhide ? presetUnhideMenu(preset.value) : presetHideMenu(preset.value)
          }
          {...calendarThumbProps}
        />
      </li>
    );
  };

  const hasHiddenItems = hiddenCategoryItems.length > 0 || hiddenPresets.length > 0;

  return (
    <>
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
                  {...calendarThumbProps}
                />
              </li>
            );
          })}
        </ul>
      </MarketingSidebarSection>

      {visibleCategories.map((category) => (
        <MarketingSidebarSection
          key={category.label}
          title={category.label}
          collapsible={false}
          menuItems={categoryHideMenu(category.label)}
        >
          <ul className={MARKETING_SIDEBAR_GRID}>
            {category.presets
              .filter((preset) => !catalog.isCalendarPresetHidden(preset.value))
              .map((preset) => renderPresetCard(preset))}
          </ul>
        </MarketingSidebarSection>
      ))}

      {hasHiddenItems ? (
        <MarketingSidebarSection title={HIDDEN_CATEGORY_LABEL} collapsible={false}>
          <ul className={MARKETING_SIDEBAR_GRID}>
            {hiddenCategoryItems.map((category) => (
              <li key={category.label} className="min-w-0">
                <MarketingTemplateCard
                  name={category.label}
                  meta="Category"
                  layout="row"
                  onClick={() => undefined}
                  menuItems={categoryUnhideMenu(category.label)}
                />
              </li>
            ))}
            {hiddenPresets.map(({ preset, categoryLabel }) =>
              renderPresetCard(preset, { unhide: true, meta: categoryLabel })
            )}
          </ul>
        </MarketingSidebarSection>
      ) : null}
    </>
  );
});
