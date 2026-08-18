import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  icon: LucideIcon;
  title: string;
  className?: string;
};

export function SuperAdminEmptyState({ icon: Icon, title, className }: Props) {
  return (
    <div
      className={cn(
        'surface-card flex flex-col items-center justify-center gap-3 px-4 py-14 text-center',
        className
      )}
    >
      <Icon className="text-muted-foreground size-10" aria-hidden />
      <p className="text-foreground text-sm font-medium">{title}</p>
    </div>
  );
}
