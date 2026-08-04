import { useEffect, useState } from 'react';

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

import { ResponsiveModal, ResponsiveModalContent, ResponsiveModalHeader, ResponsiveModalTitle } from '@/components/ui/responsive-modal';

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
          className="max-h-[min(90dvh,44rem)] max-w-[min(calc(100vw-1.5rem),34rem)] overflow-y-auto sm:max-w-[min(calc(100vw-2rem),36rem)] sm:p-5"
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
          <ResponsiveModalHeader className="text-left">
            <ResponsiveModalTitle>{editingItem ? 'Edit transaction' : 'New transaction'}</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <OperatingLineItemForm
            key={
              editingItem
                ? `${editingItem.id}:${editingItem.telegram_reminder_interval}`
                : `new-${createSession}`
            }
            initial={editingItem}
            seriesRecurrenceUntil={editingSeriesUntil}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            isPending={create.isPending || update.isPending}
          />
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
