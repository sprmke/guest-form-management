import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

import { StyleSection } from '@/features/dashboard/marketing/components/calendar-builder/components/panels/StyleSection';
import { AccentColorControl } from '@/features/dashboard/page-editor/components/controls/AccentColorControl';
import { SectionOrderList } from '@/features/dashboard/page-editor/components/controls/SectionOrderList';
import { SectionVisibilityToggle } from '@/features/dashboard/page-editor/components/controls/SectionVisibilityToggle';
import { useStayGuideEditorStore } from '@/features/dashboard/page-editor/stores/stayGuideEditorStore';
import type { StayGuideChapterConfig } from '@/features/guest/stay-guide/lib/api';

const CHAPTER_LABELS: Record<StayGuideChapterConfig['id'], string> = {
  'getting-in': 'Getting In',
  'make-yourself-at-home': 'Make Yourself at Home',
  'before-you-go': 'Before You Go',
};

type Props = {
  brandColor: string;
  templatesHref: string;
};

export function StayGuideEditorPanel({ brandColor, templatesHref }: Props) {
  const config = useStayGuideEditorStore((s) => s.config);
  const setSectionVisible = useStayGuideEditorStore((s) => s.setSectionVisible);
  const setChapterVisible = useStayGuideEditorStore((s) => s.setChapterVisible);
  const setChapterAccent = useStayGuideEditorStore((s) => s.setChapterAccent);
  const reorderChapters = useStayGuideEditorStore((s) => s.reorderChapters);

  const orderedChapters = [...config.chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="min-w-0">
      <StyleSection title="Layout" defaultOpen>
        <SectionVisibilityToggle
          id="stay-guide-hero"
          label="Hero"
          checked={config.hero.visible}
          onCheckedChange={(visible) => setSectionVisible('hero', visible)}
        />
        <SectionVisibilityToggle
          id="stay-guide-pass"
          label="Stay Pass card"
          checked={config.stayPassCard.visible}
          onCheckedChange={(visible) => setSectionVisible('stayPassCard', visible)}
        />
        <SectionVisibilityToggle
          id="stay-guide-gallery"
          label="Gallery"
          checked={config.galleryCarousel.visible}
          onCheckedChange={(visible) => setSectionVisible('galleryCarousel', visible)}
        />
        <SectionVisibilityToggle
          id="stay-guide-tabs"
          label="Quick-nav tabs"
          checked={config.quickNavTabs.visible}
          onCheckedChange={(visible) => setSectionVisible('quickNavTabs', visible)}
        />
        <SectionVisibilityToggle
          id="stay-guide-help"
          label="Need Anything"
          checked={config.helpSection.visible}
          onCheckedChange={(visible) => setSectionVisible('helpSection', visible)}
        />
      </StyleSection>

      <StyleSection title="Chapters" defaultOpen>
        <SectionOrderList
          items={orderedChapters.map((chapter) => ({
            id: chapter.id,
            label: CHAPTER_LABELS[chapter.id],
            visible: chapter.visible,
          }))}
          onReorder={(ids) => reorderChapters(ids as StayGuideChapterConfig['id'][])}
          onVisibilityChange={(id, visible) =>
            setChapterVisible(id as StayGuideChapterConfig['id'], visible)
          }
        />

        {orderedChapters.map((chapter) => (
          <div key={`accent-${chapter.id}`} className="border-border space-y-2 border-t py-3">
            <p className="text-muted-foreground px-4 text-xs font-medium uppercase tracking-wide">
              {CHAPTER_LABELS[chapter.id]}
            </p>
            <AccentColorControl
              label="Accent color"
              value={chapter.accentColor}
              brandColor={brandColor}
              onChange={(accent) => setChapterAccent(chapter.id, accent)}
            />
          </div>
        ))}

        <div className="border-border border-t px-4 py-3">
          <Link
            to={templatesHref}
            className="text-primary inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium"
          >
            Edit content
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </div>
      </StyleSection>
    </div>
  );
}
