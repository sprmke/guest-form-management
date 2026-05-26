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
        'w-full min-h-[44px] rounded-xl border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-2 border-primary bg-primary/5'
          : 'border border-border bg-card hover:bg-muted/40',
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
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
      className="space-y-3 rounded-xl border border-border/80 bg-muted/15 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
      role="note"
    >
      <p className="font-semibold text-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
