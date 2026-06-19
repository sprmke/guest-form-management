import { useEffect, useRef, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { manilaTodayIso } from "@/features/maintenance/lib/maintenancePeriod";
import {
  defaultRecurrenceUntil,
  FINANCE_REMINDER_INTERVAL_OPTIONS,
  normalizeFinanceReminderInterval,
  RECURRENCE_INTERVAL_OPTIONS,
  RECURRENCE_SCOPE_OPTIONS,
} from "@/features/finance/lib/recurrence";
import {
  MAINTENANCE_DEFAULT_REMINDER_TEMPLATE,
  maintenanceMessageTemplateForApi,
  maintenanceMessageTemplateForForm,
} from "@/features/maintenance/lib/maintenanceReminderTemplate";
import { useTelegramMaintenanceSettings } from "@/features/admin/hooks/useTelegramMaintenanceSettings";
import type { MaintenanceItem } from "@/features/maintenance/lib/types";
import { CategoryCombobox } from "@/features/finance/components/CategoryCombobox";
import { NativeSelect } from "@/components/ui/native-select";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    label: z.string().trim().min(1, "Label is required").max(200),
    category: z.string().trim().min(1, "Category is required").max(80),
    scheduled_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid date required"),
    notes: z.string().max(2000).optional(),
    recurrence_interval: z.enum([
      "none",
      "daily",
      "weekly",
      "monthly",
      "quarterly",
      "yearly",
    ]),
    recurrence_until: z.string().optional(),
    edit_scope: z.enum(["this", "this_and_future", "all"]),
    telegram_reminder_enabled: z.boolean(),
    telegram_due_date: z.string().optional(),
    telegram_days_before: z.coerce.number().int().min(0).max(90),
    telegram_reminder_interval: z.enum([
      "hourly",
      "every_2_hours",
      "every_4_hours",
      "every_12_hours",
      "daily_noon",
    ]),
    telegram_message_template: z.string().max(4000).optional(),
    marked_complete: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.telegram_reminder_enabled) {
      if (
        data.telegram_due_date &&
        !/^\d{4}-\d{2}-\d{2}$/.test(data.telegram_due_date)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Valid due date required",
          path: ["telegram_due_date"],
        });
      }
    }
    if (data.recurrence_interval !== "none") {
      if (!data.recurrence_until?.match(/^\d{4}-\d{2}-\d{2}$/)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date required for recurring reminders",
          path: ["recurrence_until"],
        });
      } else if (data.recurrence_until < data.scheduled_on) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be on or after the start date",
          path: ["recurrence_until"],
        });
      }
    }
  });

export type MaintenanceItemFormValues = z.infer<typeof schema>;

export function telegramReminderPayloadFromForm(
  values: MaintenanceItemFormValues,
  globalDefaultMessageTemplate = MAINTENANCE_DEFAULT_REMINDER_TEMPLATE,
) {
  return {
    telegram_reminder_enabled: values.telegram_reminder_enabled,
    telegram_due_date: values.telegram_reminder_enabled
      ? values.telegram_due_date?.trim() || values.scheduled_on
      : null,
    telegram_days_before: values.telegram_days_before,
    telegram_reminder_interval: values.telegram_reminder_interval,
    telegram_message_template: maintenanceMessageTemplateForApi(
      values.telegram_message_template,
      values.telegram_reminder_enabled,
      globalDefaultMessageTemplate,
    ),
    marked_complete: values.marked_complete,
  };
}

const CATEGORY_SUGGESTIONS = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Appliance",
  "Cleaning",
  "Pest Control",
  "Landscaping",
  "Safety",
  "General",
  "Other",
];

type Props = {
  initial?: MaintenanceItem | null;
  onSubmit: (values: MaintenanceItemFormValues) => void;
  onCancel: () => void;
  isPending?: boolean;
};

function isCustomDueDate(
  due: string | null | undefined,
  scheduledOn: string,
): boolean {
  const normalizedDue = due?.trim().slice(0, 10);
  return Boolean(normalizedDue && normalizedDue !== scheduledOn);
}

function defaultValues(
  initial: MaintenanceItem | null | undefined,
  globalDefaultMessageTemplate: string,
): MaintenanceItemFormValues {
  const start = initial?.scheduled_on ?? manilaTodayIso();
  const interval = initial?.recurrence_interval ?? "none";
  return {
    label: initial?.label ?? "",
    category: initial?.category ?? "",
    scheduled_on: start,
    notes: initial?.notes ?? "",
    recurrence_interval: interval === null ? "none" : interval,
    recurrence_until:
      interval && interval !== "none"
        ? defaultRecurrenceUntil(start, interval)
        : "",
    edit_scope: "this",
    telegram_reminder_enabled: initial?.telegram_reminder_enabled ?? false,
    telegram_due_date:
      initial?.telegram_due_date?.trim().slice(0, 10) || start,
    telegram_days_before: initial?.telegram_days_before ?? 3,
    telegram_reminder_interval: normalizeFinanceReminderInterval(
      initial?.telegram_reminder_interval,
    ),
    telegram_message_template: maintenanceMessageTemplateForForm(
      initial?.telegram_message_template,
      globalDefaultMessageTemplate,
    ),
    marked_complete: Boolean(initial?.completed_at),
  };
}

export function MaintenanceItemForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: Props) {
  const isRecurringEdit = Boolean(initial?.recurrence_series_id);
  const isEdit = Boolean(initial);
  const { data: maintenanceSettings } = useTelegramMaintenanceSettings();
  const globalDefaultMessageTemplate =
    maintenanceSettings?.defaultReminderTemplate ??
    MAINTENANCE_DEFAULT_REMINDER_TEMPLATE;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<MaintenanceItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(initial, globalDefaultMessageTemplate),
  });

  const dueDateCustomRef = useRef(
    isCustomDueDate(initial?.telegram_due_date, initial?.scheduled_on ?? ""),
  );

  useEffect(() => {
    const next = defaultValues(initial, globalDefaultMessageTemplate);
    reset(next, { keepDefaultValues: false });
    dueDateCustomRef.current = initial
      ? isCustomDueDate(initial.telegram_due_date, next.scheduled_on)
      : false;
  }, [initial, globalDefaultMessageTemplate, reset]);

  const recurrenceInterval = watch("recurrence_interval");
  const scheduledOn = watch("scheduled_on");
  const editScope = watch("edit_scope");
  const telegramReminderEnabled = watch("telegram_reminder_enabled");

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
    if (!isEdit && recurrenceInterval !== "none" && scheduledOn) {
      setValue(
        "recurrence_until",
        defaultRecurrenceUntil(scheduledOn, recurrenceInterval),
      );
    }
  }, [recurrenceInterval, scheduledOn, isEdit, setValue]);

  useEffect(() => {
    if (!scheduledOn || dueDateCustomRef.current) return;
    setValue("telegram_due_date", scheduledOn);
  }, [scheduledOn, setValue]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Label" required error={errors.label?.message}>
        <input
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          {...register("label")}
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

        <Field label="Date" error={errors.scheduled_on?.message}>
          <Controller
            name="scheduled_on"
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
          rows={2}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          {...register("notes")}
        />
      </Field>

      <fieldset className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
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
              Send reminders
            </span>
          </span>
        </label>

        {telegramReminderEnabled ? (
          <div className="space-y-4">
            <Field
              label="Due date"
              error={errors.telegram_due_date?.message}
            >
              <Controller
                name="telegram_due_date"
                control={control}
                render={({ field }) => (
                  <IsoDateInput
                    value={field.value ?? ""}
                    onChange={(event) => {
                      const nextDue = event.target.value;
                      dueDateCustomRef.current =
                        nextDue.trim().slice(0, 10) !== scheduledOn;
                      field.onChange(event);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                )}
              />
            </Field>

            <Field
              label="Days before due"
              error={errors.telegram_days_before?.message}
            >
              <input
                type="number"
                min={0}
                max={90}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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

            <Field
              label="Message"
              error={errors.telegram_message_template?.message}
            >
              <textarea
                rows={9}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register("telegram_message_template")}
              />
            </Field>

            <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                {...register("marked_complete")}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Mark as done
                </span>
              </span>
            </label>
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
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {initial ? "Save" : "Add reminder"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
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
      {error ? (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
