import { useEffect, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { manilaTodayIso } from '@/features/finance/lib/financePeriod';
import {
  defaultRecurrenceUntil,
  RECURRENCE_INTERVAL_OPTIONS,
  RECURRENCE_SCOPE_OPTIONS,
  recurrenceIntervalLabel,
} from '@/features/finance/lib/recurrence';
import type { FinanceLineItem } from '@/features/finance/lib/types';
import { CategoryCombobox } from '@/features/finance/components/CategoryCombobox';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';

const schema = z
  .object({
    kind: z.enum(['expense', 'income']),
    label: z.string().min(1, 'Label is required').max(200),
    amount: z.coerce.number().min(0, 'Amount must be zero or positive'),
    category: z.string().max(80).optional(),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required'),
    notes: z.string().max(2000).optional(),
    recurrence_interval: z.enum([
      'none',
      'daily',
      'weekly',
      'monthly',
      'quarterly',
      'yearly',
    ]),
    recurrence_until: z.string().optional(),
    edit_scope: z.enum(['this', 'this_and_future', 'all']),
  })
  .superRefine((data, ctx) => {
    if (data.recurrence_interval !== 'none') {
      if (!data.recurrence_until?.match(/^\d{4}-\d{2}-\d{2}$/)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date required for recurring transactions',
          path: ['recurrence_until'],
        });
      } else if (data.recurrence_until < data.occurred_on) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be on or after the start date',
          path: ['recurrence_until'],
        });
      }
    }
  });

export type OperatingLineItemFormValues = z.infer<typeof schema>;

const CATEGORY_SUGGESTIONS = [
  'Rent',
  'Utilities',
  'Supplies',
  'Maintenance',
  'Marketing',
  'Staff',
  'Other',
];

type Props = {
  initial?: FinanceLineItem | null;
  onSubmit: (values: OperatingLineItemFormValues) => void;
  onCancel: () => void;
  isPending?: boolean;
};

function defaultValues(initial?: FinanceLineItem | null): OperatingLineItemFormValues {
  const start = initial?.occurred_on ?? manilaTodayIso();
  const interval = initial?.recurrence_interval ?? 'none';
  return {
    kind: initial?.kind ?? 'expense',
    label: initial?.label ?? '',
    amount: initial?.amount ?? 0,
    category: initial?.category ?? '',
    occurred_on: start,
    notes: initial?.notes ?? '',
    recurrence_interval: interval === null ? 'none' : interval,
    recurrence_until:
      interval && interval !== 'none'
        ? defaultRecurrenceUntil(start, interval)
        : '',
    edit_scope: 'this',
  };
}

export function OperatingLineItemForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: Props) {
  const isRecurringEdit = Boolean(initial?.recurrence_series_id);
  const isEdit = Boolean(initial);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OperatingLineItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(initial),
  });

  useEffect(() => {
    reset(defaultValues(initial));
  }, [initial, reset]);

  const kind = watch('kind');
  const recurrenceInterval = watch('recurrence_interval');
  const occurredOn = watch('occurred_on');
  const editScope = watch('edit_scope');

  useEffect(() => {
    if (!isEdit && recurrenceInterval !== 'none' && occurredOn) {
      setValue(
        'recurrence_until',
        defaultRecurrenceUntil(occurredOn, recurrenceInterval),
      );
    }
  }, [recurrenceInterval, occurredOn, isEdit, setValue]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 gap-2">
        {(['expense', 'income'] as const).map((k) => {
          const active = kind === k;
          const isIncome = k === 'income';
          return (
            <button
              key={k}
              type="button"
              className={cn(
                'flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-ui font-semibold capitalize transition-all',
                active
                  ? isIncome
                    ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-red-500/10 text-red-600 ring-1 ring-red-500/25 dark:bg-red-500/15 dark:text-red-400'
                  : 'border border-border bg-muted/40 text-muted-foreground hover:bg-muted/60',
              )}
              onClick={() => reset({ ...watch(), kind: k })}
            >
              {isIncome ? (
                <ArrowUpRight className="size-4" aria-hidden />
              ) : (
                <ArrowDownRight className="size-4" aria-hidden />
              )}
              {k}
            </button>
          );
        })}
      </div>

      <Field label="Label" error={errors.label?.message}>
        <input
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="e.g. Monthly rent"
          {...register('label')}
        />
      </Field>

      <Field label="Amount (₱)" error={errors.amount?.message}>
        <input
          type="number"
          step="0.01"
          min={0}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="0.00"
          {...register('amount')}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" error={errors.category?.message}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <CategoryCombobox
                value={field.value ?? ''}
                onChange={field.onChange}
                suggestions={CATEGORY_SUGGESTIONS}
              />
            )}
          />
        </Field>

        <Field label="Date" error={errors.occurred_on?.message}>
          <input
            type="date"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            {...register('occurred_on')}
          />
        </Field>
      </div>

      {!isEdit ? (
        <>
          <Field label="Repeat" error={errors.recurrence_interval?.message}>
            <NativeSelect {...register('recurrence_interval')}>
              {RECURRENCE_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {recurrenceInterval !== 'none' ? (
            <Field label="Repeats until" error={errors.recurrence_until?.message}>
              <input
                type="date"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register('recurrence_until')}
              />
            </Field>
          ) : null}
        </>
      ) : isRecurringEdit ? (
        <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-caption text-muted-foreground">
          Part of a{' '}
          <span className="font-semibold text-foreground">
            {recurrenceIntervalLabel(initial?.recurrence_interval)}
          </span>{' '}
          series. Choose how changes apply below.
        </p>
      ) : null}

      {isEdit && isRecurringEdit ? (
        <fieldset className="space-y-2">
          <legend className="mb-1.5 block text-overline">Apply changes to</legend>
          {RECURRENCE_SCOPE_OPTIONS.map((opt) => {
            const active = editScope === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-muted/30 hover:bg-muted/50',
                )}
              >
                <input
                  type="radio"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  value={opt.value}
                  {...register('edit_scope')}
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

      <Field label="Notes" error={errors.notes?.message}>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Optional notes…"
          {...register('notes')}
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="min-h-[44px] flex-1 rounded-xl border border-border text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl gradient-primary text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {initial ? 'Save changes' : 'Add transaction'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-overline">{label}</span>
      {children}
      {error && (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      )}
    </label>
  );
}
