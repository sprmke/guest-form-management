import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  value: string | number;
  label: string;
};

export function ListingStatItem({ icon: Icon, value, label }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-foreground @sm:text-base @md:text-lg truncate text-sm font-semibold tabular-nums leading-tight">
          {value} <span className="text-muted-foreground font-normal">{label}</span>
        </p>
      </div>
    </div>
  );
}
