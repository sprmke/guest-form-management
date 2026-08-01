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
import { Plus, Trash2 } from 'lucide-react';

import { VideoClipThumbnail } from '@/features/dashboard/marketing/components/video-editor/VideoClipThumbnail';
import { useVideoSceneThumbnails } from '@/features/dashboard/marketing/hooks/useVideoSceneThumbnails';
import { VIDEO_FORMAT_DIMENSIONS } from '@/features/dashboard/marketing/lib/video/videoFormatDimensions';
import type {
  VideoFormat,
  VideoProject,
  VideoScene,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import {
  reorderScenes,
  removeScene,
  videoProjectDurationInFrames,
} from '@/features/dashboard/marketing/lib/video/videoProjectUtils';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Timeline clip frame sized to the project format (9:16 / 1:1 / 16:9). */
function timelineClipFrameSize(format: VideoFormat): { width: number; height: number } {
  const dims = VIDEO_FORMAT_DIMENSIONS[format];
  const aspect = dims.width / dims.height;
  // Portrait needs more height so 9:16 reads clearly; landscape stays shorter.
  const height = format === 'instagram-story' ? 140 : format === 'instagram-post' ? 112 : 88;
  const width = Math.max(64, Math.round(height * aspect));
  return { width, height };
}

type Props = {
  project: VideoProject;
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onProjectChange: (project: VideoProject) => void;
  onAddScene: () => void;
  isPlaying?: boolean;
  brandColor?: string;
};

export function VideoTimeline({
  project,
  selectedSceneId,
  onSelectScene,
  onProjectChange,
  onAddScene,
  isPlaying = false,
  brandColor,
}: Props) {
  const totalFrames = videoProjectDurationInFrames(project);
  const formatLabel = VIDEO_FORMAT_DIMENSIONS[project.format].aspect;
  const addFrame = timelineClipFrameSize(project.format);
  const { getSceneThumbnailUrl, isSceneThumbnailLoading } = useVideoSceneThumbnails(
    project,
    brandColor
  );

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
            <div className="flex min-w-min items-end gap-1.5">
              {project.scenes.map((scene, index) => (
                <SortableTimelineClip
                  key={scene.id}
                  scene={scene}
                  index={index}
                  format={project.format}
                  selected={selectedSceneId === scene.id}
                  playing={isPlaying && selectedSceneId === scene.id}
                  canRemove={project.scenes.length > 1}
                  compositionThumbUrl={getSceneThumbnailUrl(scene.id)}
                  compositionThumbLoading={isSceneThumbnailLoading(scene.id)}
                  onSelect={() => onSelectScene(scene.id)}
                  onRemove={() => handleRemove(scene.id)}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={onAddScene}
                style={{ width: addFrame.width, height: addFrame.height }}
                className="border-border bg-muted/30 hover:bg-muted text-muted-foreground shrink-0 flex-col gap-1 rounded-lg border-dashed px-2"
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
  format,
  selected,
  playing,
  canRemove,
  compositionThumbUrl,
  compositionThumbLoading,
  onSelect,
  onRemove,
}: {
  scene: VideoScene;
  index: number;
  format: VideoFormat;
  selected: boolean;
  playing: boolean;
  canRemove: boolean;
  compositionThumbUrl?: string;
  compositionThumbLoading: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });

  const frame = timelineClipFrameSize(format);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: frame.width,
    height: frame.height,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group/clip relative shrink-0', isDragging && 'z-10 opacity-95')}
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
          }
        }}
        aria-pressed={selected}
        aria-label={`Select ${scene.label}`}
        className={cn(
          'relative size-full cursor-grab overflow-hidden rounded-lg border text-left active:cursor-grabbing',
          'border-border/80 bg-neutral-950 shadow-sm transition-shadow duration-150',
          'hover:border-primary/50 hover:shadow-md',
          'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          selected && 'border-primary ring-primary/30 shadow-md ring-2',
          playing && selected && 'border-primary',
          isDragging && 'shadow-lg'
        )}
      >
        <div className="absolute inset-0">
          {compositionThumbUrl ? (
            <img
              src={compositionThumbUrl}
              alt=""
              className="size-full object-cover object-center"
              draggable={false}
            />
          ) : scene.imageUrl ? (
            <VideoClipThumbnail
              url={scene.imageUrl}
              mediaType={scene.backgroundMediaType}
              className="size-full"
            />
          ) : compositionThumbLoading ? (
            <Skeleton className="size-full rounded-none" aria-hidden />
          ) : (
            <div className="flex size-full items-center justify-center bg-neutral-900 text-[10px] font-semibold uppercase tracking-wide text-white/50">
              {scene.kind}
            </div>
          )}
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/55 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent"
          aria-hidden
        />

        <span className="absolute left-1.5 top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-black/65 text-[10px] font-bold tabular-nums text-white backdrop-blur-sm">
          {index + 1}
        </span>

        <span className="absolute right-1.5 top-1.5 z-10 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/95 backdrop-blur-sm">
          {scene.durationSec}s
        </span>

        <span className="absolute bottom-1.5 left-1.5 z-10 min-w-0 max-w-[calc(100%-2.75rem)] truncate text-xs font-semibold text-white drop-shadow-sm">
          {scene.label}
        </span>
      </div>

      {canRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${scene.label}`}
          className={cn(
            'absolute bottom-1 right-1 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md',
            'bg-black/55 text-white/90 backdrop-blur-sm transition-opacity',
            'hover:bg-black/75 hover:text-white',
            'opacity-100 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/clip:opacity-100'
          )}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
