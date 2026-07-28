import { useCallback, useMemo, useRef, useState } from 'react';

import { Check, GripVertical, X } from 'lucide-react';

import { AdminTableFlagsCell } from '@/features/dashboard/bookings/components/AdminDataTable';
import { BookingKanbanWorkflowModal } from '@/features/dashboard/bookings/components/BookingKanbanWorkflowModal';
import { BookingPropertyLabel } from '@/features/dashboard/bookings/components/BookingPropertyLabel';
import { GuestAvatar } from '@/features/dashboard/bookings/components/GuestAvatar';
import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import {
  bookingHasInvalidReceiptAi,
  bookingRequestsSurpriseDecor,
} from '@/features/dashboard/bookings/lib/bookingFlags';
import {
  canKanbanDropTo,
  KANBAN_COLUMNS,
  kanbanColumnForBooking,
} from '@/features/dashboard/bookings/lib/bookingStages';
import type { BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { BookingsCardGridSkeleton } from '@/components/skeletons/AdminSkeletons';
import { cn } from '@/lib/utils';
import { formatBookingDate, formatBookingDateShort } from '@/utils/format/bookingDisplay';
import { formatMoney } from '@/utils/format/currency';

type Props = {
  rows: BookingRow[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  showProperty?: boolean;
};

function guestName(row: BookingRow): string {
  return row.primary_guest_name || row.guest_facebook_name || row.guest_email || 'Guest';
}

function guestPax(row: BookingRow): number {
  return (row.number_of_adults ?? 0) + (row.number_of_children ?? 0);
}

type KanbanCardProps = {
  row: BookingRow;
  showProperty: boolean;
  onOpen: (row: BookingRow) => void;
  onDragStart: (e: React.DragEvent, row: BookingRow) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
};

function KanbanCard({
  row,
  showProperty,
  onOpen,
  onDragStart,
  onDragEnd,
  isDragging,
}: KanbanCardProps) {
  const name = guestName(row);
  const pax = guestPax(row);
  const hasInvalidReceiptAi = bookingHasInvalidReceiptAi(row);
  const hasAnyFlags =
    Boolean(row.need_parking) ||
    Boolean(row.has_pets) ||
    bookingRequestsSurpriseDecor(row.guest_requests_surprise_decor) ||
    hasInvalidReceiptAi;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, row)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(row)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(row);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open workflow for ${name}`}
      className={cn(
        'border-border/50 bg-card group relative cursor-grab overflow-hidden rounded-xl border shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 active:cursor-grabbing dark:shadow-none',
        'focus-visible:ring-sidebar-primary/40 outline-none focus-visible:ring-2',
        isDragging && 'ring-sidebar-primary opacity-50 ring-2'
      )}
    >
      <div className="flex items-start gap-2 p-3 pb-2">
        <GripVertical
          className="text-muted-foreground/40 group-hover:text-muted-foreground mt-1 size-4 shrink-0"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <GuestAvatar name={name} validIdUrl={row.valid_id_url} size="md" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-bold leading-tight">{name}</p>
              <p className="text-data-secondary truncate">{row.guest_email}</p>
              {showProperty ? (
                <BookingPropertyLabel name={row.property_name} className="mt-0.5 font-medium" />
              ) : null}
            </div>
          </div>

          <div className="mt-2.5">
            <p className="text-overline">Stay</p>
            <p className="text-data-primary mt-0.5 whitespace-nowrap">
              {formatBookingDateShort(row.check_in_date)}
              <span className="text-muted-foreground/50 mx-1.5 font-light">→</span>
              {formatBookingDate(row.check_out_date)}
            </p>
            <p className="text-data-secondary mt-0.5">
              {row.number_of_nights} {row.number_of_nights === 1 ? 'night' : 'nights'}
              <span className="text-muted-foreground/50 mx-1.5">·</span>
              {pax} {pax === 1 ? 'guest' : 'guests'}
            </p>
          </div>
        </div>
      </div>

      <div className="border-separator bg-muted/20 dark:bg-muted/30 flex items-center justify-between gap-2 border-t px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {hasAnyFlags ? (
            <AdminTableFlagsCell
              need_parking={row.need_parking}
              has_pets={row.has_pets}
              guest_requests_surprise_decor={row.guest_requests_surprise_decor}
              has_invalid_receipt_ai={hasInvalidReceiptAi}
            />
          ) : (
            <span className="text-caption text-muted-foreground/50">No flags</span>
          )}
        </div>
        {row.booking_rate != null ? (
          <span className="text-table-amount shrink-0">{formatMoney(row.booking_rate)}</span>
        ) : null}
      </div>
    </div>
  );
}

type KanbanColumnProps = {
  status: BookingStatus;
  rows: BookingRow[];
  showProperty: boolean;
  onOpen: (row: BookingRow) => void;
  onDragStart: (e: React.DragEvent, row: BookingRow) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: BookingStatus) => void;
  draggedRow: BookingRow | null;
  isDropTarget: boolean;
};

function KanbanColumn({
  status,
  rows,
  showProperty,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggedRow,
  isDropTarget,
}: KanbanColumnProps) {
  const canDrop = draggedRow ? canKanbanDropTo(draggedRow, status) : false;
  const isInvalidDrop = draggedRow && !canDrop && draggedRow.status !== status;

  return (
    <div
      className={cn(
        'border-border/50 bg-card flex flex-col rounded-xl border shadow-sm transition-all dark:shadow-none',
        isDropTarget && canDrop && 'ring-sidebar-primary/40 ring-2',
        isDropTarget && isInvalidDrop && 'ring-destructive/40 ring-2'
      )}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="border-separator flex items-center gap-2 border-b px-3 py-2.5">
        <StatusBadge status={status} className="max-w-[calc(100%-2rem)]" />
        <span className="bg-muted text-muted-foreground ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums">
          {rows.length}
        </span>
      </div>

      <div className="min-h-[12rem] flex-1 space-y-2.5 p-2.5">
        {rows.map((row) => (
          <KanbanCard
            key={row.id}
            row={row}
            showProperty={showProperty}
            onOpen={onOpen}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggedRow?.id === row.id}
          />
        ))}

        {rows.length === 0 ? (
          <div className="border-border/60 text-muted-foreground flex h-24 items-center justify-center rounded-lg border border-dashed text-xs">
            No bookings
          </div>
        ) : null}

        {draggedRow && draggedRow.status !== status ? (
          <div
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs',
              canDrop
                ? 'border-primary/40 bg-primary/5 text-primary'
                : 'border-destructive/40 bg-destructive/5 text-destructive'
            )}
          >
            {canDrop ? (
              <>
                <Check className="size-4" aria-hidden />
                Drop here
              </>
            ) : (
              <>
                <X className="size-4" aria-hidden />
                Cannot drop here
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BookingsEmptyState() {
  return (
    <div className="border-border/50 bg-card flex flex-col items-center justify-center gap-3 rounded-xl border py-20 text-center">
      <div className="bg-muted flex size-9 items-center justify-center rounded-full">
        <span className="text-muted-foreground text-lg leading-none">∅</span>
      </div>
      <div>
        <p className="text-section-title text-foreground font-bold">No bookings found</p>
        <p className="text-caption mt-1">Adjust your filters or clear the search.</p>
      </div>
    </div>
  );
}

function BookingsErrorState({ error }: { error: string }) {
  return (
    <div className="border-border/50 bg-card flex flex-col items-center justify-center gap-3 rounded-xl border py-20 text-center">
      <div className="flex size-9 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/15">
        <span className="text-base font-black leading-none text-red-500">!</span>
      </div>
      <div>
        <p className="text-section-title text-foreground font-bold">Could not load bookings</p>
        <p className="text-caption mt-1 max-w-xs">{error}</p>
      </div>
    </div>
  );
}

export function BookingKanban({
  rows,
  isLoading,
  error,
  isRefreshing,
  showProperty = false,
}: Props) {
  const [draggedRow, setDraggedRow] = useState<BookingRow | null>(null);
  const suppressClickRef = useRef(false);
  const [dropTargetStatus, setDropTargetStatus] = useState<BookingStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [previewRow, setPreviewRow] = useState<BookingRow | null>(null);

  const openWorkflow = useCallback((row: BookingRow) => {
    setActiveBookingId(row.id);
    setPreviewRow(row);
    setModalOpen(true);
  }, []);

  const handleCardOpen = useCallback(
    (row: BookingRow) => {
      if (suppressClickRef.current) return;
      openWorkflow(row);
    },
    [openWorkflow]
  );

  const handleDragStart = useCallback((e: React.DragEvent, row: BookingRow) => {
    suppressClickRef.current = false;
    setDraggedRow(row);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', row.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedRow(null);
    setDropTargetStatus(null);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: BookingStatus) => {
      e.preventDefault();
      if (!draggedRow || draggedRow.status === targetStatus) {
        setDraggedRow(null);
        setDropTargetStatus(null);
        return;
      }
      if (!canKanbanDropTo(draggedRow, targetStatus)) {
        setDraggedRow(null);
        setDropTargetStatus(null);
        return;
      }
      suppressClickRef.current = true;
      openWorkflow(draggedRow);
      setDraggedRow(null);
      setDropTargetStatus(null);
    },
    [draggedRow, openWorkflow]
  );

  const rowsByStatus = useMemo(() => {
    const map = Object.fromEntries(KANBAN_COLUMNS.map((s) => [s, [] as BookingRow[]])) as Record<
      BookingStatus,
      BookingRow[]
    >;

    for (const row of rows) {
      const col = kanbanColumnForBooking(row);
      if (!col || col === 'CANCELLED') continue;
      map[col]?.push(row);
    }
    return map;
  }, [rows]);

  if (error) return <BookingsErrorState error={error} />;
  if (isLoading) return <BookingsCardGridSkeleton />;
  if (rows.length === 0) return <BookingsEmptyState />;

  return (
    <>
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-4 transition-opacity duration-300',
          isRefreshing && 'opacity-60'
        )}
      >
        {KANBAN_COLUMNS.map((status) => (
          <div key={status} className="w-[17.5rem] shrink-0 sm:w-72">
            <KanbanColumn
              status={status}
              rows={rowsByStatus[status] ?? []}
              showProperty={showProperty}
              onOpen={handleCardOpen}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => {
                handleDragOver(e);
                setDropTargetStatus(status);
              }}
              onDrop={handleDrop}
              draggedRow={draggedRow}
              isDropTarget={dropTargetStatus === status}
            />
          </div>
        ))}
      </div>

      <BookingKanbanWorkflowModal
        bookingId={activeBookingId}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setActiveBookingId(null);
            setPreviewRow(null);
          }
        }}
        previewRow={previewRow}
      />
    </>
  );
}
