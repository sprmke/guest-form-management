import { useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { StyleSection } from '@/features/dashboard/marketing/components/calendar-builder/components/panels/StyleSection';
import { CopyOverrideField } from '@/features/dashboard/page-editor/components/shared/CopyOverrideField';
import { ImageSlotPicker } from '@/features/dashboard/page-editor/components/shared/ImageSlotPicker';
import { SectionReorderList } from '@/features/dashboard/page-editor/components/shared/SectionReorderList';
import {
  ColumnCountControl,
  MotionControl,
  PaletteControl,
  TypographyControl,
} from '@/features/dashboard/page-editor/components/shared/StyleControls';
import { PageEditorRevealTarget } from '@/features/dashboard/page-editor/lib/pageEditorPreviewScroll';
import { usePropertyShowcaseEditorStore } from '@/features/dashboard/page-editor/stores/propertyShowcaseEditorStore';
import { SHOWCASE_TEMPLATE_REGISTRY } from '@/features/guest/marketing/showcase/templates/registry';
import {
  SHOWCASE_SECTION_IDS,
  type ShowcaseSectionId,
} from '@/features/guest/marketing/showcase/types/showcase';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const SECTION_LABELS: Record<ShowcaseSectionId, string> = {
  hero: 'Hero',
  gallery: 'Gallery',
  about: 'About',
  amenities: 'Amenities',
  highlights: 'Highlights',
  location: 'Location',
  testimonials: 'Testimonials',
  host: 'Host',
  cta: 'Call to action',
};

type Props = {
  propertyImages: string[];
};

export function PropertyShowcaseEditorPanel({ propertyImages }: Props) {
  const config = usePropertyShowcaseEditorStore((s) => s.config);
  const templateKey = usePropertyShowcaseEditorStore((s) => s.templateKey);
  const setPublished = usePropertyShowcaseEditorStore((s) => s.setPublished);
  const setTemplateKey = usePropertyShowcaseEditorStore((s) => s.setTemplateKey);
  const setSectionVisible = usePropertyShowcaseEditorStore((s) => s.setSectionVisible);
  const reorderSections = usePropertyShowcaseEditorStore((s) => s.reorderSections);
  const setSectionCopy = usePropertyShowcaseEditorStore((s) => s.setSectionCopy);
  const setSectionColumns = usePropertyShowcaseEditorStore((s) => s.setSectionColumns);
  const setSectionImageSlots = usePropertyShowcaseEditorStore((s) => s.setSectionImageSlots);
  const setSectionCta = usePropertyShowcaseEditorStore((s) => s.setSectionCta);
  const setPalette = usePropertyShowcaseEditorStore((s) => s.setPalette);
  const setTypography = usePropertyShowcaseEditorStore((s) => s.setTypography);
  const setMotion = usePropertyShowcaseEditorStore((s) => s.setMotion);

  const [openSection, setOpenSection] = useState<ShowcaseSectionId | null>('hero');

  const orderedSections = [...config.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="min-w-0">
      <StyleSection title="Template" defaultOpen>
        <div className="grid gap-2">
          {SHOWCASE_TEMPLATE_REGISTRY.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTemplateKey(entry.key)}
              className={cn(
                'min-h-11 rounded-lg border px-3 py-2 text-left text-sm',
                templateKey === entry.key
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/40'
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </StyleSection>

      <StyleSection title="Publish" defaultOpen>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <Label htmlFor="showcase-published">Published</Label>
          <Switch
            id="showcase-published"
            checked={config.published}
            onCheckedChange={setPublished}
          />
        </div>
      </StyleSection>

      <StyleSection title="Sections" defaultOpen>
        <SectionReorderList
          items={orderedSections.map((section) => ({
            id: section.id,
            label: SECTION_LABELS[section.id],
            visible: section.visible,
            lockedVisible: section.id === 'hero' || section.id === 'cta',
          }))}
          onReorder={(ids) => reorderSections(ids as ShowcaseSectionId[])}
          onVisibilityChange={(id, visible) => setSectionVisible(id as ShowcaseSectionId, visible)}
          previewAnchorForItem={(id) => id}
        />
      </StyleSection>

      <StyleSection title="Style">
        <div className="space-y-4">
          <PaletteControl
            mode={config.palette.mode}
            accent={config.palette.accent}
            overlay={config.palette.overlay}
            onModeChange={(mode) => setPalette({ mode })}
            onAccentChange={(accent) => setPalette({ accent })}
            onOverlayChange={(overlay) => setPalette({ overlay })}
          />
          <TypographyControl
            displayFont={config.typography.displayFont}
            scale={config.typography.scale}
            onDisplayFontChange={(displayFont) => setTypography({ displayFont })}
            onScaleChange={(scale) => setTypography({ scale })}
          />
          <MotionControl
            intensity={config.motion.intensity}
            parallax={config.motion.parallax}
            canvas={config.motion.canvas}
            onIntensityChange={(intensity) => setMotion({ intensity })}
            onParallaxChange={(parallax) => setMotion({ parallax })}
            onCanvasChange={(canvas) => setMotion({ canvas })}
          />
        </div>
      </StyleSection>

      <StyleSection title="Section details" defaultOpen>
        <div className="space-y-2">
          {SHOWCASE_SECTION_IDS.map((id) => {
            const section = config.sections.find((entry) => entry.id === id);
            if (!section) return null;
            const open = openSection === id;
            return (
              <PageEditorRevealTarget key={id} anchor={id}>
                <div className="border-border overflow-hidden rounded-xl border">
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm font-medium"
                    onClick={() => setOpenSection(open ? null : id)}
                    aria-expanded={open}
                  >
                    {SECTION_LABELS[id]}
                    <ChevronDown
                      className={cn('size-4 transition-transform', open && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  {open ? (
                    <div className="border-border space-y-4 border-t px-3 py-3">
                      <CopyOverrideField
                        value={section.copy ?? {}}
                        onChange={(copy) => setSectionCopy(id, copy)}
                        onReset={() => setSectionCopy(id, {})}
                      />
                      {id === 'amenities' || id === 'highlights' ? (
                        <ColumnCountControl
                          value={section.columns ?? 3}
                          onChange={(columns) => setSectionColumns(id, columns)}
                        />
                      ) : null}
                      {id === 'gallery' || id === 'hero' ? (
                        <ImageSlotPicker
                          images={propertyImages}
                          selected={section.imageSlots ?? []}
                          onChange={(slots) => setSectionImageSlots(id, slots)}
                        />
                      ) : null}
                      {id === 'cta' || id === 'hero' ? (
                        <CopyOverrideField
                          value={{
                            heading: section.ctaLabel,
                            body: section.ctaTarget,
                          }}
                          onChange={(value) => setSectionCta(id, value.heading, value.body)}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </PageEditorRevealTarget>
            );
          })}
        </div>
      </StyleSection>
    </div>
  );
}
