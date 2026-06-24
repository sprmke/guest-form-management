import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  CalendarRange,
  Hash,
  Loader2,
  Pencil,
  Repeat,
  Tag,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import {
  AdminDataTable,
  AdminTableHeadRow,
  AdminTableTh,
  adminTableCell,
  adminTableIconButtonClass,
  adminTableRowClass,
} from "@/features/admin/components/AdminDataTable";
import { formatIsoDate } from "@/features/admin/lib/formatters";
import { formatIsoDateForDisplay } from "@/utils/dates";
import {
  MaintenanceItemForm,
  telegramReminderPayloadFromForm,
  type MaintenanceItemFormValues,
} from "@/features/maintenance/components/MaintenanceItemForm";
import { RecurringDeleteDialog } from "@/features/maintenance/components/RecurringDeleteDialog";
import { useTelegramMaintenanceSettings } from "@/features/admin/hooks/useTelegramMaintenanceSettings";
import { MAINTENANCE_DEFAULT_REMINDER_TEMPLATE } from "@/features/maintenance/lib/maintenanceReminderTemplate";
import {
  useRecurringSeries,
  useRecurringSeriesMutations,
} from "@/features/maintenance/hooks/useMaintenanceItems";
import {
  recurrenceIntervalLabel,
  recurrenceScheduleUpdateFields,
  suggestExtendAfter,
  suggestExtendBefore,
} from "@/features/finance/lib/recurrence";
import type {
  MaintenanceItem,
  MaintenanceQuery,
} from "@/features/maintenance/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  anchor: MaintenanceItem | null;
  open: boolean;
  onClose: () => void;
  query: MaintenanceQuery;
};

export function RecurringSeriesModal({ anchor, open, onClose, query }: Props) {
  const seriesId = anchor?.recurrence_series_id ?? null;
  const {
    data: items = [],
    isLoading,
    isFetching,
  } = useRecurringSeries(open ? seriesId : null);
  const { extend, update, remove } = useRecurringSeriesMutations(
    seriesId,
    query,
  );
  const { data: maintenanceSettings } = useTelegramMaintenanceSettings();
  const globalDefaultMessageTemplate =
    maintenanceSettings?.defaultReminderTemplate ??
    MAINTENANCE_DEFAULT_REMINDER_TEMPLATE;

  const [extendBeforeUntil, setExtendBeforeUntil] = useState("");
  const [extendAfterUntil, setExtendAfterUntil] = useState("");
  const [editing, setEditing] = useState<MaintenanceItem | null>(null);
  const [deleting, setDeleting] = useState<MaintenanceItem | null>(null);

  const interval =
    anchor?.recurrence_interval ?? items[0]?.recurrence_interval ?? null;
  const seriesStart = items[0]?.scheduled_on;
  const seriesEnd = items[items.length - 1]?.scheduled_on;

  useEffect(() => {
    if (!open || !interval || !seriesStart || !seriesEnd) return;
    setExtendBeforeUntil(suggestExtendBefore(seriesStart, interval));
    setExtendAfterUntil(suggestExtendAfter(seriesEnd, interval, seriesStart));
  }, [open, interval, seriesStart, seriesEnd]);

  const summary = useMemo(() => {
    if (!anchor || items.length === 0) return null;
    const template = items[0];
    return {
      label: template.label,
      category: template.category,
      count: items.length,
    };
  }, [anchor, items]);

  function handleEditSubmit(values: MaintenanceItemFormValues) {
    if (!editing) return;
    const schedule = recurrenceScheduleUpdateFields({
      hasSeries: true,
      recurrenceInterval: values.recurrence_interval,
      recurrenceUntil: values.recurrence_until,
      initialInterval: editing.recurrence_interval,
      initialUntil: seriesEnd,
      editScope: values.edit_scope,
    });
    update.mutate(
      {
        id: editing.id,
        patch: {
          label: values.label.trim(),
          category: values.category.trim(),
          scheduled_on: values.scheduled_on,
          notes: values.notes?.trim() || null,
          ...telegramReminderPayloadFromForm(
            values,
            globalDefaultMessageTemplate,
          ),
          ...(schedule.recurrence_interval !== undefined
            ? {
                recurrence_interval: schedule.recurrence_interval,
                recurrence_until: schedule.recurrence_until ?? null,
              }
            : {}),
        },
        scope: schedule.scope,
      },
      { onSuccess: () => setEditing(null) },
    );
  }

  const busy =
    extend.isPending || update.isPending || remove.isPending || isFetching;

  if (!anchor?.recurrence_series_id) return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !busy) onClose();
        }}
      >
        <DialogContent
          className="flex max-h-[min(90dvh,44rem)] w-full max-w-[min(calc(100vw-1.5rem),36rem)] flex-col gap-0 overflow-hidden p-0 pb-0 pt-0 sm:max-w-[min(90vw,42rem)] sm:p-0 md:max-w-[min(90vw,48rem)] lg:max-h-[min(90dvh,52rem)] lg:max-w-[min(calc(100vw-3rem),56rem)])]"
          onPointerDownOutside={(e) => {
            const target = e.target as Element | null;
            if (target?.closest("[data-radix-popper-content-wrapper]")) {
              e.preventDefault();
              return;
            }
            if (busy) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <div className="shrink-0 space-y-3.5 border-b border-border/60 px-4 pb-3.5 pt-[max(env(safe-area-inset-top,0px),0.875rem)] sm:px-5 sm:pb-4">
            <DialogHeader className="space-y-2.5 pr-0 text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-12 sm:pr-14">
                <span>{summary?.label ?? anchor.label}</span>
                {interval ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary ring-1 ring-primary/20">
                    <Repeat className="size-3" aria-hidden />
                    {recurrenceIntervalLabel(interval)}
                  </span>
                ) : null}
              </DialogTitle>

              {summary && seriesStart && seriesEnd ? (
                <SeriesSummaryGrid
                  category={summary.category}
                  count={summary.count}
                  seriesStart={seriesStart}
                  seriesEnd={seriesEnd}
                />
              ) : isLoading ? (
                <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
              ) : null}
            </DialogHeader>

            {interval && seriesStart && seriesEnd ? (
              <div className="space-y-2">
                <p className="text-overline">Extend series</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ExtendPanel
                    label="Add earlier occurrences"
                    description={`Before ${formatIsoDateForDisplay(seriesStart)}`}
                    date={extendBeforeUntil}
                    onDateChange={setExtendBeforeUntil}
                    max={seriesStart}
                    disabled={busy}
                    pending={extend.isPending}
                    onExtend={() => {
                      if (!seriesId || extendBeforeUntil >= seriesStart) return;
                      extend.mutate({
                        recurrence_series_id: seriesId,
                        direction: "before",
                        extend_until: extendBeforeUntil,
                      });
                    }}
                  />
                  <ExtendPanel
                    label="Add later occurrences"
                    description={`After ${formatIsoDateForDisplay(seriesEnd)}`}
                    date={extendAfterUntil}
                    onDateChange={setExtendAfterUntil}
                    min={seriesEnd}
                    disabled={busy}
                    pending={extend.isPending}
                    onExtend={() => {
                      if (!seriesId || extendAfterUntil <= seriesEnd) return;
                      extend.mutate({
                        recurrence_series_id: seriesId,
                        direction: "after",
                        extend_until: extendAfterUntil,
                      });
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-3 pb-[max(env(safe-area-inset-bottom,0px),0.875rem)] sm:px-5">
            {!isLoading && items.length > 0 ? (
              <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
                <p className="text-overline">Occurrences</p>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {items.length} total
                </span>
              </div>
            ) : null}
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Loading series…
              </div>
            ) : items.length === 0 ? (
              <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-muted-foreground">
                No occurrences found in this series.
              </p>
            ) : (
              <AdminDataTable
                minWidth={480}
                stickyHeader
                className="min-h-0 flex-1"
              >
                <AdminTableHeadRow sticky>
                  <AdminTableTh className="pr-3 pl-2 sm:pl-3">
                    Date
                  </AdminTableTh>
                  <AdminTableTh className="hidden px-2 sm:table-cell sm:px-3 lg:max-w-none lg:whitespace-normal">
                    Notes
                  </AdminTableTh>
                  <AdminTableTh className="pr-2 pl-2 text-right sm:pr-3">
                    <span className="sr-only">Actions</span>
                  </AdminTableTh>
                </AdminTableHeadRow>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={adminTableRowClass(index, {
                        interactive: false,
                      })}
                    >
                      <td
                        className={cn(
                          "whitespace-nowrap",
                          adminTableCell.status,
                        )}
                      >
                        <p className="text-data-primary">
                          {formatIsoDate(item.scheduled_on)}
                        </p>
                        {item.id === anchor.id ? (
                          <span className="mt-0.5 inline-flex rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Opened from list
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "hidden max-w-[280px] truncate text-data-secondary sm:table-cell",
                          adminTableCell.body,
                        )}
                      >
                        {item.notes ?? "—"}
                      </td>
                      <td className={adminTableCell.action}>
                        <div className="flex justify-end gap-0.5">
                          <button
                            type="button"
                            className={adminTableIconButtonClass}
                            aria-label={`Edit ${formatIsoDate(item.scheduled_on)}`}
                            onClick={() => setEditing(item)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={cn(
                              adminTableIconButtonClass,
                              "hover:bg-destructive/10 hover:text-destructive",
                            )}
                            aria-label={`Delete ${formatIsoDate(item.scheduled_on)}`}
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminDataTable>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing != null}
        onOpenChange={(next) => {
          if (!next && !update.isPending) setEditing(null);
        }}
      >
        <DialogContent
          className="max-h-[min(90dvh,44rem)] max-w-[min(calc(100vw-1.5rem),34rem)] overflow-y-auto sm:max-w-[min(calc(100vw-2rem),36rem)] sm:p-5"
          onPointerDownOutside={(e) => {
            const target = e.target as Element | null;
            if (target?.closest("[data-radix-popper-content-wrapper]")) {
              e.preventDefault();
              return;
            }
            if (update.isPending) e.preventDefault();
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>Edit occurrence</DialogTitle>
          </DialogHeader>
          {editing ? (
            <MaintenanceItemForm
              key={`${editing.id}:${editing.telegram_reminder_interval}`}
              initial={editing}
              seriesRecurrenceUntil={seriesEnd}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditing(null)}
              isPending={update.isPending}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <RecurringDeleteDialog
        item={deleting}
        open={deleting != null}
        onClose={() => setDeleting(null)}
        isPending={remove.isPending}
        singleOccurrenceOnly
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </>
  );
}

function SeriesSummaryGrid({
  category,
  count,
  seriesStart,
  seriesEnd,
}: {
  category: string | null;
  count: number;
  seriesStart: string;
  seriesEnd: string;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <SummaryStat icon={Tag} label="Category" value={category ?? "—"} />
        <SummaryStat icon={Hash} label="Occurrences" value={String(count)} />
        <SummaryStat
          icon={CalendarRange}
          label="Date range"
          value={
            <>
              {formatIsoDate(seriesStart)}
              <span className="mx-1 font-normal text-muted-foreground">→</span>
              {formatIsoDate(seriesEnd)}
            </>
          }
        />
      </div>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Tag;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-2.5">
      <div className="flex items-center gap-1.5">
        {Icon ? (
          <Icon
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        ) : null}
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="mt-1.5 truncate text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function ExtendPanel({
  label,
  description,
  date,
  onDateChange,
  min,
  max,
  disabled,
  pending,
  onExtend,
}: {
  label: string;
  description: string;
  date: string;
  onDateChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  pending?: boolean;
  onExtend: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <div className="mb-2.5 flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <CalendarPlus className="size-[18px] text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <IsoDateInput
          value={date}
          min={min}
          max={max}
          disabled={disabled}
          className="min-w-0 flex-1"
          onChange={(e) => onDateChange(e.target.value)}
        />
        <button
          type="button"
          disabled={disabled || !date || pending}
          className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold gradient-primary text-primary-foreground shadow-soft disabled:opacity-50 sm:w-auto sm:min-w-[5.5rem]"
          onClick={onExtend}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Add
        </button>
      </div>
    </div>
  );
}
