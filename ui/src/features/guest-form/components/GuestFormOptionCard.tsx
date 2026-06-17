import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type GuestFormOptionCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
};

/** SD-form-style selectable card for yes/no steps (parking, pets). */
export function GuestFormOptionCard({
  selected,
  onSelect,
  title,
  description,
  children,
}: GuestFormOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full min-h-[44px] rounded-xl border px-4 py-3 text-left transition-all duration-200 space-y-1',
        selected
          ? 'border-primary bg-primary/5 shadow-soft ring-1 ring-primary/20'
          : 'border-border/60 bg-card hover:border-primary/25 hover:bg-muted/40 hover:shadow-elevated',
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
    </button>
  );
}

type GuestFormInfoCalloutProps = {
  title: string;
  children: ReactNode;
};

export function GuestFormInfoCallout({
  title,
  children,
}: GuestFormInfoCalloutProps) {
  return (
    <div
      className="space-y-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
      role="note"
    >
      <p className="font-semibold text-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
