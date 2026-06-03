import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { manilaTodayIso } from '@/features/finance/lib/financePeriod';
import type { FinanceLineItem } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

const schema = z.object({
  kind: z.enum(['expense', 'income']),
  label: z.string().min(1, 'Label is required').max(200),
  amount: z.coerce.number().min(0, 'Amount must be zero or positive'),
  category: z.string().max(80).optional(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required'),
  notes: z.string().max(2000).optional(),
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

export function OperatingLineItemForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<OperatingLineItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: initial?.kind ?? 'expense',
      label: initial?.label ?? '',
      amount: initial?.amount ?? 0,
      category: initial?.category ?? '',
      occurred_on: initial?.occurred_on ?? manilaTodayIso(),
      notes: initial?.notes ?? '',
    },
  });

  useEffect(() => {
    reset({
      kind: initial?.kind ?? 'expense',
      label: initial?.label ?? '',
      amount: initial?.amount ?? 0,
      category: initial?.category ?? '',
      occurred_on: initial?.occurred_on ?? manilaTodayIso(),
      notes: initial?.notes ?? '',
    });
  }, [initial, reset]);

  const kind = watch('kind');

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
                'flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-semibold capitalize transition-all',
                active
                  ? isIncome
                    ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300'
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
          <input
            list="finance-categories"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Select or type"
            {...register('category')}
          />
          <datalist id="finance-categories">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="Date" error={errors.occurred_on?.message}>
          <input
            type="date"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            {...register('occurred_on')}
          />
        </Field>
      </div>

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
          {initial ? 'Save changes' : 'Add line'}
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
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
      {error && (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      )}
    </label>
  );
}
