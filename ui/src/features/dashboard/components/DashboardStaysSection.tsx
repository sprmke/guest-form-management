import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DashboardStaysListControls } from '@/features/dashboard/components/DashboardStaysListControls';
import { DashboardUpcomingList } from '@/features/dashboard/components/DashboardUpcomingList';
import type { DashboardStats } from '@/features/dashboard/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  data: DashboardStats;
  trendLabel: string;
  showEmptyDays: boolean;
  showPreviousDates: boolean;
  onShowEmptyDaysChange: (next: boolean) => void;
  onShowPreviousDatesChange: (next: boolean) => void;
  emptyDaysAvailable: boolean;
  className?: string;
};

export function DashboardStaysSection({
  data,
  trendLabel,
  showEmptyDays,
  showPreviousDates,
  onShowEmptyDaysChange,
  onShowPreviousDatesChange,
  emptyDaysAvailable,
  className,
}: Props) {
  return (
    <section
      className={cn(
        'surface-card flex min-w-0 flex-col overflow-hidden lg:col-span-3',
        className,
      )}
    >
      <div className="flex flex-col gap-2 border-b border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
        <div className="min-w-0">
          <p className="text-section-title font-bold text-foreground">
            Stays in period
          </p>
          <p className="break-words text-caption">
            By check-in date · {trendLabel}
          </p>
        </div>
        <div className="-mx-1 flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:shrink-0 sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0">
          <DashboardStaysListControls
            showEmptyDays={showEmptyDays}
            showPreviousDates={showPreviousDates}
            onShowEmptyDaysChange={onShowEmptyDaysChange}
            onShowPreviousDatesChange={onShowPreviousDatesChange}
            emptyDaysAvailable={emptyDaysAvailable}
          />
          <Link
            to={`/bookings?view=calendar&from=${data.trendWindow.from}&to=${data.trendWindow.to}`}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/10 sm:min-h-[36px]"
          >
            Calendar
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
      <div className="max-h-[min(70vh,520px)] overflow-y-auto">
        <DashboardUpcomingList
          stays={data.upcoming}
          manilaDate={data.manilaDate}
          rangeFrom={data.trendWindow.from}
          rangeTo={data.trendWindow.to}
          showEmptyDays={showEmptyDays}
          showPreviousDates={showPreviousDates}
        />
      </div>
    </section>
  );
}
