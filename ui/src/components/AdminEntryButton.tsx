import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

export function AdminEntryButton({ className }: Props) {
  return (
    <Link
      to="/bookings"
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-elevated transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
      aria-label="Admin bookings"
      title="Bookings"
    >
      <LayoutDashboard className="size-4" aria-hidden />
    </Link>
  );
}
