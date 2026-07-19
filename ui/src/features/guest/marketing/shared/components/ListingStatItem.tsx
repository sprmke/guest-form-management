import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  value: string | number;
  label: string;
};

export function ListingStatItem({ icon: Icon, value, label }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted rounded-full p-2.5">
        <Icon className="text-muted-foreground h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-foreground text-lg font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </div>
  );
}
