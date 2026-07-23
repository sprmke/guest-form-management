import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

import { VideoClipThumbnail } from '@/features/dashboard/marketing/components/video-editor/VideoClipThumbnail';
import { VIDEO_FORMAT_DIMENSIONS } from '@/features/dashboard/marketing/lib/video/videoFormatDimensions';
import type { VideoScene } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import type { VideoProject } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import {
  reorderScenes,
  removeScene,
  videoProjectDurationInFrames,
} from '@/features/dashboard/marketing/lib/video/videoProjectUtils';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  project: VideoProject;
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onProjectChange: (project: VideoProject) => void;
  onAddScene: () => void;
  isPlaying?: boolean;
};

export function VideoTimeline({
  project,
  selectedSceneId,
  onSelectScene,
  onProjectChange,
  onAddScene,
  isPlaying = false,
}: Props) {
  const totalFrames = videoProjectDurationInFrames(project);
  const formatLabel = VIDEO_FORMAT_DIMENSIONS[project.format].aspect;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = project.scenes.findIndex((scene) => scene.id === active.id);
    const newIndex = project.scenes.findIndex((scene) => scene.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onProjectChange(reorderScenes(project, oldIndex, newIndex));
  };

  const handleRemove = (sceneId: string) => {
    const next = removeScene(project, sceneId);
    if (next === project) return;
    onProjectChange(next);
    if (selectedSceneId === sceneId) {
      onSelectScene(next.scenes[0]?.id ?? '');
    }
  };

  return (
    <div className="border-border bg-background shrink-0 border-t">
      <div className="text-muted-foreground flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="font-medium">{formatLabel}</span>
        <span>
          {project.scenes.length} clip{project.scenes.length === 1 ? '' : 's'} ·{' '}
          {(totalFrames / project.fps).toFixed(1)}s
        </span>
      </div>

      <div className="overflow-x-auto px-3 pb-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={project.scenes.map((scene) => scene.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex min-w-min items-stretch gap-2.5">
              {project.scenes.map((scene, index) => (
                <SortableTimelineClip
                  key={scene.id}
                  scene={scene}
                  index={index}
                  selected={selectedSceneId === scene.id}
                  playing={isPlaying && selectedSceneId === scene.id}
                  canRemove={project.scenes.length > 1}
                  onSelect={() => onSelectScene(scene.id)}
                  onRemove={() => handleRemove(scene.id)}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={onAddScene}
                className="border-border bg-background hover:bg-muted text-muted-foreground min-h-[147px] min-w-[130px] shrink-0 flex-col gap-1 self-stretch rounded-xl border-dashed px-3 py-2"
                aria-label="Add clip"
              >
                <Plus className="size-4" aria-hidden />
                <span className="text-xs">Add</span>
              </Button>
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function SortableTimelineClip({
  scene,
  index,
  selected,
  playing,
  canRemove,
  onSelect,
  onRemove,
}: {
  scene: VideoScene;
  index: number;
  selected: boolean;
  playing: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: scene.id,
  });

  const width = Math.max(108, Math.round(scene.durationSec * 44));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group/clip shrink-0', isDragging && 'z-10 opacity-90')}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Select ${scene.label}`}
        className={cn(
          'border-border bg-card flex w-full flex-col overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-200',
          'hover:border-primary/35 hover:shadow-md',
          'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          selected && 'border-primary bg-primary/[0.03] ring-primary/20 shadow-md ring-1',
          playing && selected && 'border-primary',
          isDragging && 'shadow-lg'
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-neutral-900/[0.06] to-neutral-900/[0.02]">
          {scene.imageUrl ? (
            <VideoClipThumbnail
              url={scene.imageUrl}
              mediaType={scene.backgroundMediaType}
              className="size-full"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide">
              {scene.kind}
            </div>
          )}
          <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur-sm">
            {index + 1}
          </span>
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90 backdrop-blur-sm">
            {scene.durationSec}s
          </span>
          {canRemove ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemove();
                }
              }}
              aria-label={`Remove ${scene.label}`}
              className="bg-background/95 text-muted-foreground hover:text-destructive absolute right-1.5 top-1.5 flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/clip:opacity-100"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </span>
          ) : null}
        </div>

        <div className="flex min-h-[44px] items-center gap-1 px-2 py-1.5">
          <span
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label={`Drag ${scene.label}`}
            className="text-muted-foreground hover:text-foreground flex min-h-[36px] min-w-[28px] shrink-0 cursor-grab items-center justify-center rounded-md active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate">
            <span className="block truncate text-xs font-semibold">{scene.label}</span>
            <span className="text-muted-foreground block truncate text-[10px] capitalize">
              {scene.kind}
            </span>
          </span>
        </div>
      </button>
    </div>
  );
}
