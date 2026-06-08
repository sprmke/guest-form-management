import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RECURRENCE_SCOPE_OPTIONS,
  recurrenceIntervalLabel,
} from '@/features/finance/lib/recurrence';
import type { FinanceLineItem, RecurrenceEditScope } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  item: FinanceLineItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: RecurrenceEditScope) => void;
  isPending?: boolean;
};

export function RecurringDeleteDialog({
  item,
  open,
  onClose,
  onConfirm,
  isPending,
}: Props) {
  const [scope, setScope] = useState<RecurrenceEditScope>('this');

  if (!item) return null;

  const isSeries = Boolean(item.recurrence_series_id);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onClose();
      }}
    >
      <DialogContent className="max-w-[min(calc(100vw-1.5rem),26rem)] sm:p-5">
        <DialogHeader className="text-left">
          <DialogTitle>Delete transaction</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-semibold text-foreground">{item.label}</span>
          {isSeries ? (
            <>
              {' '}
              from this{' '}
              {recurrenceIntervalLabel(item.recurrence_interval)?.toLowerCase()}{' '}
              series?
            </>
          ) : (
            '?'
          )}
        </p>

        {isSeries ? (
          <fieldset className="space-y-2">
            {RECURRENCE_SCOPE_OPTIONS.map((opt) => {
              const active = scope === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                    active
                      ? 'border-destructive/40 bg-destructive/5'
                      : 'border-border bg-muted/30 hover:bg-muted/50',
                  )}
                >
                  <input
                    type="radio"
                    name="delete-scope"
                    className="mt-1 size-4 shrink-0 accent-destructive"
                    checked={active}
                    onChange={() => setScope(opt.value)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-caption text-muted-foreground">
                      {opt.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        ) : null}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-xl border border-border text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-50"
            onClick={() => onConfirm(isSeries ? scope : 'this')}
          >
            {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Delete
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
