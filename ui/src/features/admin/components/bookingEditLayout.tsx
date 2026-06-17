/**
 * Shared layout primitives for BookingEditForm and progress-form edit sections.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input as ShadcnInput } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn(
        'group/collapse overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md',
        'ring-1 ring-border/30 dark:ring-border/50',
      )}
    >
      <CollapsibleTrigger
        type="button"
        className={cn(
          'flex min-h-[48px] w-full items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-3 text-left',
          'transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-5',
        )}
        aria-controls={`${id}-panel`}
      >
        <span
          className="h-5 w-1 shrink-0 rounded-full bg-primary"
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-sm font-bold tracking-tight text-foreground">
          {title}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapse:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          id={`${id}-panel`}
          className="space-y-4 bg-gradient-to-b from-card to-muted/15 px-3 py-4 sm:space-y-5 sm:px-5 sm:py-5"
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
        'space-y-3.5 rounded-xl border border-border/60 bg-card p-4 shadow-sm',
        'ring-1 ring-border/25 dark:bg-card/95 sm:p-5',
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="h-4 w-0.5 shrink-0 rounded-full bg-primary/70"
          aria-hidden
        />
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/80">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export function Row2({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">{children}</div>
  );
}

export function Row3({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">{children}</div>
  );
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
      <span className="text-xs font-semibold text-foreground/75">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
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
  inputClassName,
  ...inputProps
}: {
  label: React.ReactNode;
  className?: string;
  inputClassName?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-border/55 bg-muted/25 px-3.5 py-2.5',
        'transition-colors hover:border-primary/25 hover:bg-muted/40',
        'has-[:checked]:border-primary/35 has-[:checked]:bg-primary/5',
        className,
      )}
    >
      <input
        type="checkbox"
        className={cn(
          'size-[18px] shrink-0 rounded border-border text-primary accent-primary focus:ring-2 focus:ring-primary/25',
          inputClassName,
        )}
        {...inputProps}
      />
      <span className="text-sm font-medium leading-snug text-foreground">
        {label}
      </span>
    </label>
  );
}
