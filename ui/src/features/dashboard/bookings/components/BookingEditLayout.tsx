/**
 * Shared layout primitives for BookingEditForm and progress-form edit sections.
 */

import React from 'react';

import { ChevronDown } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input as ShadcnInput } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Matches shadcn Input — use on textareas and other native controls. */
export const fieldControlClass =
  'flex w-full rounded-lg border border-border/50 bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground ring-offset-background transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/25';

/** @deprecated Prefer `fieldControlClass` — kept for textarea in BookingEditForm. */
export const inputClass = cn(fieldControlClass, 'resize-none');

export const Input = ShadcnInput;

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
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-border/60 bg-card space-y-3.5 rounded-xl border p-4 shadow-sm',
        'ring-border/25 dark:bg-card/95 ring-1 sm:p-5',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="bg-primary/70 h-4 w-0.5 shrink-0 rounded-full" aria-hidden />
        <h3 className="text-foreground/80 text-[11px] font-bold uppercase tracking-[0.14em]">
          {title}
        </h3>
      </div>
      {children}
    </div>
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
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-foreground/75 text-xs font-semibold">
        {label}
        {required && (
          <span className="text-destructive ml-0.5" aria-hidden>
            *
          </span>
        )}
      </span>
      {children}
    </label>
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
