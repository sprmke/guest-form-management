import { useState, type ReactNode } from 'react';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import { StyleSection } from '@/features/dashboard/marketing/components/calendar-builder/components/panels/StyleSection';
import { SectionVisibilityToggle } from '@/features/dashboard/page-editor/components/controls/SectionVisibilityToggle';
import {
  StayGuideSectionContentCard,
  type StayGuideSectionDraft,
} from '@/features/dashboard/page-editor/components/stay-guide/StayGuideSectionContentCard';
import {
  CHAPTER_LABELS,
  STAY_GUIDE_CHAPTER_SECTIONS,
} from '@/features/dashboard/page-editor/lib/stayGuideChapterSections';
import { useStayGuideEditorStore } from '@/features/dashboard/page-editor/stores/stayGuideEditorStore';
import type { StayGuideChapterConfig } from '@/features/guest/stay-guide/lib/api';

import type { PropertyTemplateDto } from '@/features/dashboard/bookings/hooks/usePropertyTemplates';

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type Props = {
  templatesByKey: Record<string, PropertyTemplateDto>;
  drafts: Record<string, StayGuideSectionDraft>;
  onDraftChange: (templateKey: string, draft: StayGuideSectionDraft) => void;
  onResetSection: (templateKey: string) => void;
  contentBusy?: boolean;
};

function SortableSectionBlock({
  chapterId,
  label,
  visible,
  onVisibilityChange,
  children,
}: {
  chapterId: StayGuideChapterConfig['id'];
  label: string;
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapterId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'border-border overflow-hidden rounded-xl border',
        isDragging && 'bg-accent/40 z-10 shadow-sm'
      )}
    >
      <div className="flex min-h-[44px] items-center gap-1.5 px-2 py-1.5 sm:px-3">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-md"
          aria-label={`Reorder ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
        <Switch
          checked={visible}
          onCheckedChange={onVisibilityChange}
          aria-label={`Show ${label}`}
        />
      </div>
      <div className={cn('border-border space-y-2 border-t px-3 py-3', !visible && 'opacity-60')}>
        {children}
      </div>
    </div>
  );
}

export function StayGuideEditorPanel({
  templatesByKey,
  drafts,
  onDraftChange,
  onResetSection,
  contentBusy,
}: Props) {
  const config = useStayGuideEditorStore((s) => s.config);
  const setSectionVisible = useStayGuideEditorStore((s) => s.setSectionVisible);
  const setChapterVisible = useStayGuideEditorStore((s) => s.setChapterVisible);
  const reorderChapters = useStayGuideEditorStore((s) => s.reorderChapters);
  const [openSectionKey, setOpenSectionKey] = useState<string | null>(null);

  const orderedChapters = [...config.chapters].sort((a, b) => a.order - b.order);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedChapters.findIndex((chapter) => chapter.id === active.id);
    const newIndex = orderedChapters.findIndex((chapter) => chapter.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderChapters(
      arrayMove(orderedChapters, oldIndex, newIndex).map(
        (chapter) => chapter.id
      ) as StayGuideChapterConfig['id'][]
    );
  };

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
          id="stay-guide-check-in-docs"
          label="Check-in documents"
          checked={config.checkInDocuments.visible}
          onCheckedChange={(visible) => setSectionVisible('checkInDocuments', visible)}
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

      <StyleSection title="Sections" defaultOpen keepChildrenMounted>
        <div className="space-y-3 px-4 pb-4 pt-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedChapters.map((chapter) => chapter.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedChapters.map((chapter) => {
                const sections = STAY_GUIDE_CHAPTER_SECTIONS[chapter.id];
                return (
                  <SortableSectionBlock
                    key={chapter.id}
                    chapterId={chapter.id}
                    label={CHAPTER_LABELS[chapter.id]}
                    visible={chapter.visible}
                    onVisibilityChange={(visible) => setChapterVisible(chapter.id, visible)}
                  >
                    {sections.map((section) => {
                      const template = templatesByKey[section.templateKey];
                      const draft = drafts[section.templateKey];
                      if (!template || !draft) return null;
                      return (
                        <StayGuideSectionContentCard
                          key={section.templateKey}
                          template={template}
                          draft={draft}
                          open={openSectionKey === section.templateKey}
                          onOpenChange={(nextOpen) =>
                            setOpenSectionKey(nextOpen ? section.templateKey : null)
                          }
                          onDraftChange={(next) => onDraftChange(section.templateKey, next)}
                          onResetToDefault={() => onResetSection(section.templateKey)}
                          disabled={contentBusy}
                        />
                      );
                    })}
                  </SortableSectionBlock>
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      </StyleSection>
    </div>
  );
}
