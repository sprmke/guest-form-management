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

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type SectionOrderItem = {
  id: string;
  label: string;
  visible: boolean;
};

type Props = {
  items: SectionOrderItem[];
  onReorder: (orderedIds: string[]) => void;
  onVisibilityChange: (id: string, visible: boolean) => void;
  className?: string;
};

function SortableRow({
  item,
  onVisibilityChange,
}: {
  item: SectionOrderItem;
  onVisibilityChange: (id: string, visible: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'border-border flex min-h-[44px] items-center gap-2 border-b px-4 py-2 last:border-b-0',
        isDragging && 'bg-accent/40 z-10'
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-md"
        aria-label={`Reorder ${item.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
      <Switch
        checked={item.visible}
        onCheckedChange={(checked) => onVisibilityChange(item.id, checked)}
        aria-label={`Show ${item.label}`}
      />
    </div>
  );
}

export function SectionOrderList({ items, onReorder, onVisibilityChange, className }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex).map((item) => item.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className={cn('min-w-0', className)}>
          {items.map((item) => (
            <SortableRow key={item.id} item={item} onVisibilityChange={onVisibilityChange} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
