import { useEffect, useState } from 'react';

import { Loader2 } from 'lucide-react';

import { EntityActivityHistory } from '@/features/dashboard/activity/components/EntityActivityHistory';
import { useTelegramFinanceSettings } from '@/features/dashboard/bookings/hooks/useTelegramFinanceSettings';
import {
  OperatingLineItemForm,
  telegramReminderPayloadFromForm,
  type OperatingLineItemFormValues,
} from '@/features/dashboard/finance/components/OperatingLineItemForm';
import { RecurringDeleteDialog } from '@/features/dashboard/finance/components/RecurringDeleteDialog';
import { RecurringSeriesModal } from '@/features/dashboard/finance/components/RecurringSeriesModal';
import { fetchRecurringSeriesItems } from '@/features/dashboard/finance/hooks/useFinanceApi';
import { useFinanceLineItemMutations } from '@/features/dashboard/finance/hooks/useFinanceLineItems';
import { FINANCE_DEFAULT_REMINDER_TEMPLATE } from '@/features/dashboard/finance/lib/financeReminderTemplate';
import { recurrenceScheduleUpdateFields } from '@/features/dashboard/finance/lib/recurrence';
import type { FinanceLineItem, FinanceQuery } from '@/features/dashboard/finance/lib/types';

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';

const TRANSACTION_FORM_ID = 'finance-transaction-form';

type Props = {
  query: FinanceQuery;
  createOpen: boolean;
  editingItem: FinanceLineItem | null;
  deletingItem: FinanceLineItem | null;
  seriesAnchor: FinanceLineItem | null;
  onCloseEditor: () => void;
  onDeletingChange: (item: FinanceLineItem | null) => void;
  onSeriesAnchorChange: (item: FinanceLineItem | null) => void;
};

export function FinanceTransactionModals({
  query,
  createOpen,
  editingItem,
  deletingItem,
  seriesAnchor,
  onCloseEditor,
  onDeletingChange,
  onSeriesAnchorChange,
}: Props) {
  const { create, update, remove } = useFinanceLineItemMutations(query);
  const { data: financeSettings } = useTelegramFinanceSettings();
  const globalDefaultMessageTemplate =
    financeSettings?.defaultReminderTemplate ?? FINANCE_DEFAULT_REMINDER_TEMPLATE;
  const [createSession, setCreateSession] = useState(0);
  const [editingSeriesUntil, setEditingSeriesUntil] = useState<string | null>(null);

  const modalOpen = createOpen || editingItem != null;

  useEffect(() => {
    if (!editingItem?.recurrence_series_id) {
      setEditingSeriesUntil(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchRecurringSeriesItems(editingItem.recurrence_series_id!);
        if (cancelled) return;
        const last = rows[rows.length - 1];
        setEditingSeriesUntil(last?.occurred_on ?? null);
      } catch {
        if (!cancelled) setEditingSeriesUntil(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editingItem?.id, editingItem?.recurrence_series_id]);

  useEffect(() => {
    if (createOpen && !editingItem) {
      setCreateSession((value) => value + 1);
    }
  }, [createOpen, editingItem]);

  function closeModal() {
    onCloseEditor();
    setEditingSeriesUntil(null);
  }

  function handleSubmit(values: OperatingLineItemFormValues) {
    const payload = {
      kind: values.kind,
      label: values.label.trim(),
      amount: values.amount,
      category: values.category.trim(),
      occurred_on: values.occurred_on,
      notes: values.notes?.trim() || null,
      ...telegramReminderPayloadFromForm(values, globalDefaultMessageTemplate),
    };

    if (editingItem) {
      const schedule = recurrenceScheduleUpdateFields({
        hasSeries: Boolean(editingItem.recurrence_series_id),
        recurrenceInterval: values.recurrence_interval,
        recurrenceUntil: values.recurrence_until,
        initialInterval: editingItem.recurrence_interval,
        initialUntil: editingSeriesUntil,
        editScope: values.edit_scope,
      });
      update.mutate(
        {
          id: editingItem.id,
          patch: {
            ...payload,
            ...(schedule.recurrence_interval !== undefined
              ? {
                  recurrence_interval: schedule.recurrence_interval,
                  recurrence_until: schedule.recurrence_until ?? null,
                }
              : {}),
          },
          scope: schedule.scope,
        },
        { onSuccess: closeModal }
      );
      return;
    }

    create.mutate(
      {
        ...payload,
        recurrence_interval:
          values.recurrence_interval === 'none' ? null : values.recurrence_interval,
        recurrence_until:
          values.recurrence_interval === 'none' ? null : (values.recurrence_until ?? null),
      },
      { onSuccess: closeModal }
    );
  }

  return (
    <>
      <ResponsiveModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <ResponsiveModalContent
          sheetLayout="split"
          className="flex max-h-[min(90dvh,44rem)] max-w-[min(calc(100vw-1.5rem),34rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(calc(100vw-2rem),36rem)] sm:p-0"
          onPointerDownOutside={(e) => {
            const target = e.target as Element | null;
            if (target?.closest('[data-radix-popper-content-wrapper]')) {
              e.preventDefault();
              return;
            }
            if (create.isPending || update.isPending) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (create.isPending || update.isPending) e.preventDefault();
          }}
        >
          <ResponsiveModalHeader className="border-border shrink-0 border-b px-4 pb-3.5 pt-[max(env(safe-area-inset-top,0px),1rem)] text-left sm:px-5 sm:pt-5">
            <ResponsiveModalTitle>
              {editingItem ? 'Edit transaction' : 'New transaction'}
            </ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <OperatingLineItemForm
              formId={TRANSACTION_FORM_ID}
              key={
                editingItem
                  ? `${editingItem.id}:${editingItem.telegram_reminder_interval}`
                  : `new-${createSession}`
              }
              initial={editingItem}
              seriesRecurrenceUntil={editingSeriesUntil}
              onSubmit={handleSubmit}
            />
            {editingItem ? (
              <EntityActivityHistory
                targetType="finance_entry"
                targetId={editingItem.id}
                className="border-border/60 mt-5 border-t pt-4"
                initialLimit={4}
              />
            ) : null}
          </div>
          <ResponsiveModalFooter className="border-border shrink-0 flex-row gap-2 border-t px-4 py-3.5 sm:px-5">
            <button
              type="button"
              className="border-border text-muted-foreground hover:bg-muted min-h-[44px] flex-1 rounded-xl border text-sm font-semibold transition-colors"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={TRANSACTION_FORM_ID}
              disabled={create.isPending || update.isPending}
              className="gradient-primary text-primary-foreground shadow-soft flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {create.isPending || update.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {editingItem ? 'Save' : 'Add transaction'}
            </button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <RecurringSeriesModal
        anchor={seriesAnchor}
        open={seriesAnchor != null}
        onClose={() => onSeriesAnchorChange(null)}
        query={query}
      />

      <RecurringDeleteDialog
        item={deletingItem}
        open={deletingItem != null}
        onClose={() => onDeletingChange(null)}
        isPending={remove.isPending}
        onConfirm={(scope) => {
          if (!deletingItem) return;
          remove.mutate(
            { id: deletingItem.id, scope },
            { onSuccess: () => onDeletingChange(null) }
          );
        }}
      />
    </>
  );
}
