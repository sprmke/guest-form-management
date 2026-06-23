import { useEffect, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { manilaTodayIso } from "@/features/finance/lib/financePeriod";
import {
  defaultRecurrenceUntil,
  FINANCE_REMINDER_INTERVAL_OPTIONS,
  normalizeFinanceReminderInterval,
  RECURRENCE_INTERVAL_OPTIONS,
  RECURRENCE_SCOPE_OPTIONS,
} from "@/features/finance/lib/recurrence";
import {
  FINANCE_DEFAULT_REMINDER_TEMPLATE,
  financeMessageTemplateForApi,
  financeMessageTemplateForForm,
} from "@/features/finance/lib/financeReminderTemplate";
import { useTelegramFinanceSettings } from "@/features/admin/hooks/useTelegramFinanceSettings";
import type { FinanceLineItem } from "@/features/finance/lib/types";
import { requiredPositiveMoney } from "@/features/admin/lib/moneyFieldSchema";
import { CategoryCombobox } from "@/features/finance/components/CategoryCombobox";
import { TelegramReminderSchedulePreview } from "@/features/finance/components/TelegramReminderSchedulePreview";
import { NativeSelect } from "@/components/ui/native-select";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    kind: z.enum(["expense", "income"]),
    label: z.string().trim().min(1, "Label is required").max(200),
    amount: requiredPositiveMoney({
      requiredError: "Amount is required",
      positiveError: "Amount must be greater than 0",
    }),
    category: z.string().trim().min(1, "Category is required").max(80),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid date required"),
    notes: z.string().max(2000).optional(),
    recurrence_interval: z.enum([
      "none",
      "daily",
      "weekly",
      "monthly",
      "twice_monthly",
      "every_2_months",
      "quarterly",
      "yearly",
    ]),
    recurrence_until: z.string().optional(),
    edit_scope: z.enum(["this", "this_and_future", "all"]),
    telegram_reminder_enabled: z.boolean(),
    telegram_days_before: z.coerce.number().int().min(0).max(90),
    telegram_reminder_interval: z.enum([
      "hourly",
      "every_2_hours",
      "every_4_hours",
      "every_12_hours",
      "daily_noon",
    ]),
    telegram_message_template: z.string().max(4000).optional(),
    marked_paid: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.recurrence_interval !== "none") {
      if (!data.recurrence_until?.match(/^\d{4}-\d{2}-\d{2}$/)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date required for recurring transactions",
          path: ["recurrence_until"],
        });
      } else if (data.recurrence_until < data.occurred_on) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be on or after the start date",
          path: ["recurrence_until"],
        });
      }
    }
  });

export type OperatingLineItemFormValues = z.infer<typeof schema>;

export function telegramReminderPayloadFromForm(
  values: OperatingLineItemFormValues,
  globalDefaultMessageTemplate = FINANCE_DEFAULT_REMINDER_TEMPLATE,
) {
  return {
    telegram_reminder_enabled: values.telegram_reminder_enabled,
    telegram_due_date: values.telegram_reminder_enabled
      ? values.occurred_on
      : null,
    telegram_days_before: values.telegram_days_before,
    telegram_reminder_interval: values.telegram_reminder_interval,
    telegram_message_template: financeMessageTemplateForApi(
      values.telegram_message_template,
      values.telegram_reminder_enabled,
      globalDefaultMessageTemplate,
    ),
    marked_paid: values.marked_paid,
  };
}

const CATEGORY_SUGGESTIONS = [
  "Rent",
  "Amortization",
  "Utilities",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Staff",
  "Other",
];

type Props = {
  initial?: FinanceLineItem | null;
  onSubmit: (values: OperatingLineItemFormValues) => void;
  onCancel: () => void;
  isPending?: boolean;
};

function defaultValues(
  initial: FinanceLineItem | null | undefined,
  globalDefaultMessageTemplate: string,
): OperatingLineItemFormValues {
  const start = initial?.occurred_on ?? manilaTodayIso();
  const interval = initial?.recurrence_interval ?? "none";
  return {
    kind: initial?.kind ?? "expense",
    label: initial?.label ?? "",
    amount: initial?.amount ?? 0,
    category: initial?.category ?? "",
    occurred_on: start,
    notes: initial?.notes ?? "",
    recurrence_interval: interval === null ? "none" : interval,
    recurrence_until:
      interval && interval !== "none"
        ? defaultRecurrenceUntil(start, interval)
        : "",
    edit_scope: "this",
    telegram_reminder_enabled: initial?.telegram_reminder_enabled ?? false,
    telegram_days_before: initial?.telegram_days_before ?? 3,
    telegram_reminder_interval: normalizeFinanceReminderInterval(
      initial?.telegram_reminder_interval,
    ),
    telegram_message_template: financeMessageTemplateForForm(
      initial?.telegram_message_template,
      globalDefaultMessageTemplate,
    ),
    marked_paid: Boolean(initial?.paid_at),
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
  const { data: financeSettings } = useTelegramFinanceSettings();
  const globalDefaultMessageTemplate =
    financeSettings?.defaultReminderTemplate ??
    FINANCE_DEFAULT_REMINDER_TEMPLATE;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<OperatingLineItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(initial, globalDefaultMessageTemplate),
  });

  useEffect(() => {
    reset(defaultValues(initial, globalDefaultMessageTemplate), {
      keepDefaultValues: false,
    });
  }, [initial, globalDefaultMessageTemplate, reset]);

  const kind = watch("kind");
  const recurrenceInterval = watch("recurrence_interval");
  const recurrenceUntil = watch("recurrence_until");
  const occurredOn = watch("occurred_on");
  const editScope = watch("edit_scope");
  const telegramReminderEnabled = watch("telegram_reminder_enabled");
  const telegramDaysBefore = watch("telegram_days_before");
  const telegramReminderInterval = watch("telegram_reminder_interval");

  useEffect(() => {
    if (!telegramReminderEnabled) return;
    const current = getValues("telegram_message_template")?.trim();
    if (!current) {
      setValue("telegram_message_template", globalDefaultMessageTemplate);
    }
  }, [
    telegramReminderEnabled,
    globalDefaultMessageTemplate,
    getValues,
    setValue,
  ]);

  useEffect(() => {
    if (!isEdit && recurrenceInterval !== "none" && occurredOn) {
      setValue(
        "recurrence_until",
        defaultRecurrenceUntil(occurredOn, recurrenceInterval),
      );
    }
  }, [recurrenceInterval, occurredOn, isEdit, setValue]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 gap-2">
        {(["expense", "income"] as const).map((k) => {
          const active = kind === k;
          const isIncome = k === "income";
          return (
            <button
              key={k}
              type="button"
              className={cn(
                "flex gap-2 justify-center items-center font-semibold capitalize rounded-xl transition-all min-h-[44px] text-ui",
                active
                  ? isIncome
                    ? "text-emerald-700 ring-1 bg-emerald-500/10 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "text-red-600 ring-1 bg-red-500/10 ring-red-500/25 dark:bg-red-500/15 dark:text-red-400"
                  : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted/60",
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

      <Field label="Label" required error={errors.label?.message}>
        <input
          className="px-3 w-full h-10 text-sm rounded-lg border transition-colors border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="e.g. Monthly rent"
          {...register("label")}
        />
      </Field>

      <Field label="Amount (₱)" required error={errors.amount?.message}>
        <input
          type="number"
          step="0.01"
          min={0}
          className="px-3 w-full h-10 text-sm tabular-nums rounded-lg border transition-colors border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="0.00"
          {...register("amount")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" required error={errors.category?.message}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <CategoryCombobox
                value={field.value ?? ""}
                onChange={field.onChange}
                suggestions={CATEGORY_SUGGESTIONS}
              />
            )}
          />
        </Field>

        <Field label="Date" error={errors.occurred_on?.message}>
          <Controller
            name="occurred_on"
            control={control}
            render={({ field }) => (
              <IsoDateInput
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
              />
            )}
          />
        </Field>
      </div>

      {!isEdit ? (
        <>
          <Field label="Repeat" error={errors.recurrence_interval?.message}>
            <NativeSelect {...register("recurrence_interval")}>
              {RECURRENCE_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {recurrenceInterval !== "none" ? (
            <Field
              label="Repeats until"
              error={errors.recurrence_until?.message}
            >
              <Controller
                name="recurrence_until"
                control={control}
                render={({ field }) => <IsoDateInput {...field} />}
              />
            </Field>
          ) : null}
        </>
      ) : null}

      {isEdit && isRecurringEdit ? (
        <fieldset className="space-y-2">
          <legend className="mb-1.5 block text-overline">
            Apply changes to
          </legend>
          {RECURRENCE_SCOPE_OPTIONS.map((opt) => {
            const active = editScope === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                  active
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  value={opt.value}
                  {...register("edit_scope")}
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
          rows={7}
          className="px-3 py-2 w-full text-sm rounded-lg border transition-colors border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Optional notes…"
          {...register("notes")}
        />
      </Field>

      <fieldset className="p-3 space-y-3 rounded-xl border border-border/50 bg-muted/20">
        <legend className="sr-only">Telegram reminders</legend>
        <p className="text-overline">Telegram reminders</p>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 accent-primary"
            {...register("telegram_reminder_enabled")}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              Send payment due reminders
            </span>
            <span className="mt-0.5 block text-caption text-muted-foreground">
              Posts to your Finance Telegram group.
            </span>
          </span>
        </label>

        {telegramReminderEnabled ? (
          <div className="space-y-4">
            <Field
              label="Days before due"
              error={errors.telegram_days_before?.message}
            >
              <input
                type="number"
                min={0}
                max={90}
                className="px-3 w-full h-10 text-sm rounded-lg border border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register("telegram_days_before", { valueAsNumber: true })}
              />
            </Field>

            <Field
              label="How often to remind"
              error={errors.telegram_reminder_interval?.message}
            >
              <Controller
                name="telegram_reminder_interval"
                control={control}
                render={({ field: { value, onChange, name, onBlur } }) => (
                  <div
                    className="space-y-2"
                    role="radiogroup"
                    aria-label="How often to remind"
                  >
                    {FINANCE_REMINDER_INTERVAL_OPTIONS.map((opt) => {
                      const active = value === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                            active
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-muted/30 hover:bg-muted/50",
                          )}
                        >
                          <input
                            type="radio"
                            className="mt-1 size-4 shrink-0 accent-primary"
                            name={name}
                            value={opt.value}
                            checked={active}
                            onChange={() => onChange(opt.value)}
                            onBlur={onBlur}
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
                  </div>
                )}
              />
            </Field>

            <TelegramReminderSchedulePreview
              anchorDate={occurredOn}
              recurrenceInterval={recurrenceInterval}
              recurrenceUntil={recurrenceUntil}
              daysBefore={telegramDaysBefore}
              reminderInterval={telegramReminderInterval}
              singleOccurrenceOnly={isEdit}
            />

            <Field
              label="Message"
              error={errors.telegram_message_template?.message}
            >
              <textarea
                rows={9}
                className="px-3 py-2 w-full font-mono text-xs rounded-lg border border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register("telegram_message_template")}
              />
            </Field>

            {isEdit ? (
              <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  {...register("marked_paid")}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    Mark as paid
                  </span>
                  <span className="mt-0.5 block text-caption text-muted-foreground">
                    Stops reminders for this transaction.
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
      </fieldset>

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
          {isPending && <Loader2 className="animate-spin size-4" aria-hidden />}
          {initial ? "Save" : "Add transaction"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="block min-w-0">
      <span className="mb-1.5 block text-overline">
        {label}
        {required ? (
          <>
            {" "}
            <span className="text-destructive" aria-hidden>
              *
            </span>
          </>
        ) : null}
      </span>
      {children}
      {hint ? (
        <p className="mt-1 text-caption text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
