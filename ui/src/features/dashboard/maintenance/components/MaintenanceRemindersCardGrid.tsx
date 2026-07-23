import { formatIsoDate } from '@/utils/format/bookingDisplay';
import { CheckCircle2, Clock3, Pencil, Repeat, Trash2 } from 'lucide-react';

import { recurrenceIntervalLabel } from '@/features/dashboard/finance/lib/recurrence';
import type { MaintenanceItem } from '@/features/dashboard/maintenance/lib/types';

import { FinanceStaysCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import { cn } from '@/lib/utils';

type ItemActions = {
  onEdit: (item: MaintenanceItem) => void;
  onDelete: (item: MaintenanceItem) => void;
  onOpenSeries?: (item: MaintenanceItem) => void;
};

type Props = ItemActions & {
  items: MaintenanceItem[];
  isLoading: boolean;
  isRefreshing?: boolean;
  showStatus?: boolean;
};

export function MaintenanceRemindersCardGrid({
  items,
  isLoading,
  isRefreshing = false,
  showStatus = false,
  onEdit,
  onDelete,
  onOpenSeries,
}: Props) {
  if (isLoading) return <FinanceStaysCardGridSkeleton />;

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
        'transition-opacity duration-300',
        isRefreshing && 'opacity-60'
      )}
    >
      {items.map((item) => (
        <MaintenanceReminderCard
          key={item.id}
          item={item}
          showStatus={showStatus}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
          onOpenSeries={onOpenSeries ? () => onOpenSeries(item) : undefined}
        />
      ))}
    </div>
  );
}

function MaintenanceReminderCard({
  item,
  showStatus,
  onEdit,
  onDelete,
  onOpenSeries,
}: {
  item: MaintenanceItem;
  showStatus: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenSeries?: () => void;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEdit();
    }
  };

  const recurrenceLabel = recurrenceIntervalLabel(item.recurrence_interval);
  const isRecurring = Boolean(item.recurrence_series_id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={handleKey}
      aria-label={`Edit reminder ${item.label}`}
      className={cn(
        'border-border/50 bg-card flex h-full min-h-[11.5rem] cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-200',
        'hover:border-border outline-none hover:-translate-y-0.5',
        'focus-visible:ring-sidebar-primary/40 focus-visible:ring-2'
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col px-3.5 pt-3.5 sm:px-4 sm:pt-4">
        <p className="text-muted-foreground text-[11px] font-medium tabular-nums">
          {formatIsoDate(item.scheduled_on)}
        </p>

        <div className="mt-2 min-w-0">
          {isRecurring && onOpenSeries ? (
            <button
              type="button"
              className="max-w-full text-left"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSeries();
              }}
            >
              <p className="text-foreground truncate text-sm font-bold underline-offset-2 hover:underline">
                {item.label}
              </p>
            </button>
          ) : (
            <p className="text-foreground truncate text-sm font-bold">{item.label}</p>
          )}

          <div className="mt-0.5 flex min-h-4 items-center">
            {recurrenceLabel ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
                <Repeat className="size-3 shrink-0" aria-hidden />
                {recurrenceLabel}
              </span>
            ) : (
              <span className="invisible text-[10px]" aria-hidden>
                —
              </span>
            )}
          </div>
        </div>

        <p className="text-data-secondary mt-1 min-h-[1.125rem] truncate">
          {item.category || '\u00A0'}
        </p>

        {showStatus ? (
          <div className="mt-2 flex min-h-[22px] items-center">
            {item.telegram_reminder_enabled ? (
              <MaintenanceStatusBadge isComplete={Boolean(item.completed_at)} />
            ) : null}
          </div>
        ) : null}

        <p className="text-data-secondary mt-2 line-clamp-2 min-h-[2.5rem]">
          {item.notes?.trim() || '\u00A0'}
        </p>
      </div>

      <div className="border-separator bg-muted/20 dark:bg-muted/30 mt-auto flex justify-end border-t">
        {isRecurring && onOpenSeries ? (
          <CardIconAction
            label="View recurring series"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSeries();
            }}
          >
            <Repeat className="size-4" />
          </CardIconAction>
        ) : null}
        <CardIconAction
          label="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="size-4" />
        </CardIconAction>
        <CardIconAction
          label="Delete"
          destructive
          edge="right"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-4" />
        </CardIconAction>
      </div>
    </div>
  );
}

function CardIconAction({
  label,
  onClick,
  destructive,
  edge,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  destructive?: boolean;
  edge?: 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center p-2.5',
        'text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors',
        destructive && 'hover:bg-destructive/10 hover:text-destructive',
        edge === 'right' && 'rounded-br-xl'
      )}
    >
      {children}
    </button>
  );
}

export function MaintenanceStatusBadge({ isComplete }: { isComplete: boolean }) {
  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="size-3 shrink-0" aria-hidden />
        Done
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
      <Clock3 className="size-3 shrink-0" aria-hidden />
      Pending
    </span>
  );
}
