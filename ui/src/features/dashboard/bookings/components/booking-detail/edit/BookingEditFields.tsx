/**
 * Shared RHF field glue for the booking edit tabs (and the nested Workflow
 * Details sub-forms, which still use `Section` via `WorkflowFormShell`'s
 * `variant="edit"` — see GuestSdRefundEditForm.tsx / GuestSdRefundDetailsSection.tsx).
 *
 * Relocated verbatim from the retired `BookingEditLayout.tsx` — no visual
 * changes here, `CollapsibleGroup` and `EditSectionJumpNav` were the only
 * pieces retired outright (replaced by real tabs in `BookingEditTabs.tsx`).
 */

import type { ReactNode, FocusEventHandler } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input as ShadcnInput } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import type { FieldError } from 'react-hook-form';

/** Matches shadcn Input — edit workspace fields (high contrast vs view rows). */
export const fieldControlClass =
  'flex w-full rounded-lg border-2 border-border/70 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/35 field-focus';

/** @deprecated Prefer `fieldControlClass` — kept for textarea in tab files. */
export const inputClass = cn(fieldControlClass, 'resize-none');

export const Input = ShadcnInput;

export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

export function fieldAriaProps(
  fieldId: string,
  error?: string
): {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
} {
  if (!error) return { id: fieldId };
  return {
    id: fieldId,
    'aria-invalid': true,
    'aria-describedby': fieldErrorId(fieldId),
  };
}

/** Extracts a displayable message from an RHF `FieldError`, if any. */
export function fieldErrorMessage(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  if (typeof error.message === 'string' && error.message) return error.message;
  return undefined;
}

/**
 * Sub-heading + divider for grouping fields inside a tab body (e.g. "Guest
 * Identity" / "Additional Guests" / "More details" inside the Guest tab, or
 * the nested Workflow Details sub-forms). Not a collapsible — tabs already
 * own the top-level section switch.
 */
export function Section({
  id,
  title,
  children,
  className,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'border-border/50 space-y-3.5 border-t pt-4 first:border-t-0 first:pt-0',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="bg-primary/70 h-4 w-0.5 shrink-0 rounded-full" aria-hidden />
        <h3 className="text-foreground/80 text-[11px] font-bold uppercase tracking-[0.14em]">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

export function Row2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">{children}</div>;
}

export function Row3({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">{children}</div>;
}

export function Field({
  label,
  required,
  error,
  htmlFor,
  fieldKey,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  /** Used for scroll-to-error (`data-field`) when htmlFor is absent. */
  fieldKey?: string;
  children: ReactNode;
}) {
  const errorId = htmlFor ? fieldErrorId(htmlFor) : fieldKey ? fieldErrorId(fieldKey) : undefined;

  return (
    <div className="flex flex-col gap-1.5" data-field={fieldKey ?? htmlFor}>
      <label htmlFor={htmlFor} className="text-foreground/75 text-xs font-semibold">
        {label}
        {required && (
          <span className="text-destructive ml-0.5" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-xs leading-snug">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxOption({
  label,
  className,
  checkboxClassName,
  checked,
  onCheckedChange,
  disabled,
  id,
  name,
  onBlur,
}: {
  label: ReactNode;
  className?: string;
  checkboxClassName?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'border-border/55 bg-muted/25 flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5',
        'hover:border-primary/25 hover:bg-muted/40 transition-colors',
        checked && 'border-primary/35 bg-primary/5',
        className
      )}
    >
      <Checkbox
        id={id}
        name={name}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        onBlur={onBlur}
        className={checkboxClassName}
      />
      <span className="text-foreground text-sm font-medium leading-snug">{label}</span>
    </label>
  );
}
