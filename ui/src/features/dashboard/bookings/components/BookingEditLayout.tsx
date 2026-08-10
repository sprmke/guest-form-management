/**
 * Shared layout primitives for BookingEditForm and progress-form edit sections.
 */

import React from 'react';

import { ChevronDown, Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input as ShadcnInput } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Matches shadcn Input — edit workspace fields (high contrast vs view rows). */
export const fieldControlClass =
  'flex w-full rounded-lg border-2 border-border/70 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/35 field-focus';

/** @deprecated Prefer `fieldControlClass` — kept for textarea in BookingEditForm. */
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

export function CollapsibleGroup({
  id,
  title,
  defaultOpen = true,
  variant = 'standalone',
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  variant?: 'standalone' | 'nested';
  children: React.ReactNode;
}) {
  const isNested = variant === 'nested';
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn(
        'group/collapse overflow-hidden',
        isNested
          ? 'border-border/60 border-b last:border-b-0'
          : cn(
              'border-border/70 bg-card rounded-2xl border shadow-md',
              'ring-border/30 dark:ring-border/50 ring-1'
            )
      )}
    >
      <CollapsibleTrigger
        type="button"
        className={cn(
          'flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left sm:px-5',
          'hover:bg-muted/45 focus-visible:ring-ring focus-visible:ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          isNested
            ? 'border-border/60 bg-muted/20 border-b group-data-[state=closed]/collapse:border-b-0'
            : 'border-border/60 bg-muted/30 border-b'
        )}
        aria-controls={`${id}-panel`}
      >
        <span className="bg-primary h-5 w-1 shrink-0 rounded-full" aria-hidden />
        <span className="text-foreground min-w-0 flex-1 text-sm font-bold tracking-tight">
          {title}
        </span>
        <ChevronDown
          className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapse:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          id={`${id}-panel`}
          className={cn(
            'space-y-4 px-3 py-4 sm:space-y-5 sm:px-5 sm:py-5',
            isNested ? 'bg-card' : 'from-card to-muted/15 bg-gradient-to-b'
          )}
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Section({
  id,
  title,
  children,
  className,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
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

export function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">{children}</div>;
}

export function Row3({ children }: { children: React.ReactNode }) {
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
  children: React.ReactNode;
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

export function EditSectionJumpNav({
  sections,
  className,
}: {
  sections: { id: string; label: string }[];
  className?: string;
}) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Edit form sections"
      className={cn('-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1', className)}
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => scrollTo(section.id)}
          className={cn(
            'border-border/60 bg-muted/30 text-foreground/80 hover:border-primary/30 hover:bg-muted/50 shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
            'focus-visible:ring-ring min-h-[44px] focus-visible:outline-none focus-visible:ring-2'
          )}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

export function EditStickyBar({
  onCancel,
  cancelDisabled,
  saveDisabled,
  savePending,
  saveLabel,
  formId,
}: {
  onCancel: () => void;
  cancelDisabled?: boolean;
  saveDisabled?: boolean;
  savePending?: boolean;
  saveLabel: string;
  /** When save button sits outside `<form>`, associate via form attribute. */
  formId?: string;
}) {
  return (
    <div
      className={cn(
        'border-border/70 bg-background/95 border-t px-3 py-3 backdrop-blur-sm sm:px-5',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]'
      )}
    >
      <div className="flex items-center justify-end gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelDisabled}
          className="border-border text-muted-foreground hover:bg-muted/50 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <X className="size-3.5" aria-hidden />
          Cancel
        </button>
        <Button
          type="submit"
          form={formId}
          disabled={saveDisabled}
          size="sm"
          className="min-h-[44px] rounded-lg px-5"
        >
          <Save className="size-3.5" aria-hidden />
          {savePending ? 'Saving…' : saveLabel}
        </Button>
      </div>
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
  label: React.ReactNode;
  className?: string;
  checkboxClassName?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
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
