import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { FinanceOverviewSkeleton } from '@/components/skeletons/AdminSkeletons';
import { formatMoney } from '@/features/admin/lib/formatters';
import { FinanceKpiCard } from '@/features/finance/components/FinanceKpiCard';
import type { FinanceSummary } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  summary: FinanceSummary | undefined;
  isLoading: boolean;
};

export function FinanceOverviewTab({ summary, isLoading }: Props) {
  if (isLoading && !summary) {
    return <FinanceOverviewSkeleton />;
  }
  if (!summary) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <div className="icon-well-sm bg-muted/80">
          <CircleDollarSign className="size-[18px] text-muted-foreground" aria-hidden />
        </div>
        <div>
          <p className="text-section-title font-bold text-foreground">
            No data for this period
          </p>
          <p className="mt-1 text-caption">
            Select a different date range above.
          </p>
        </div>
      </div>
    );
  }

  const { stays: s, operating: o, grandNet } = summary;
  const showPipeline = s.projectedNetPipeline !== 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="surface-card p-3 sm:p-4">
        <FinanceKpiCard
          label="Total net"
          value={formatMoney(grandNet)}
          icon={TrendingUp}
          valueClassName={cn(
            grandNet >= 0
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-600 dark:text-red-400',
          )}
          size="hero"
        />
      </div>

      <section>
        <p className="section-eyebrow mb-3 px-0.5">
          Stays · {s.count} in period · {s.completedCount} completed
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FinanceKpiCard
            label="Completed net"
            value={formatMoney(s.hostNetCompleted)}
            icon={Wallet}
            iconColor="text-emerald-600 dark:text-emerald-400"
            valueClassName={cn(
              s.hostNetCompleted >= 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-red-600 dark:text-red-400',
            )}
          />
          <FinanceKpiCard
            label="Booking rate"
            value={formatMoney(s.bookingRate)}
            icon={Banknote}
            iconColor="text-primary"
          />
          <FinanceKpiCard
            label="Other fees"
            value={formatMoney(s.otherFees)}
            icon={Banknote}
            iconColor="text-sky-600 dark:text-sky-400"
          />
          <FinanceKpiCard
            label="Outstanding"
            value={formatMoney(s.outstandingGuestBalance)}
            icon={ShieldCheck}
            iconColor="text-amber-600 dark:text-amber-400"
            valueClassName={cn(
              s.outstandingGuestBalance > 0
                ? 'text-amber-700 dark:text-amber-300'
                : undefined,
            )}
          />
        </div>

        {showPipeline ? (
          <div className="mt-3">
            <FinanceKpiCard
              label="Pipeline estimate"
              value={formatMoney(s.projectedNetPipeline)}
              valueClassName="text-amber-700 dark:text-amber-300"
            />
          </div>
        ) : null}
      </section>

      <section>
        <p className="section-eyebrow mb-3 px-0.5">Transactions</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <FinanceKpiCard
            label="Transactions net"
            value={formatMoney(o.net)}
            icon={CircleDollarSign}
            iconColor={
              o.net >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }
            valueClassName={cn(
              o.net >= 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-red-600 dark:text-red-400',
            )}
          />
          <FinanceKpiCard
            label="Income"
            value={formatMoney(o.income)}
            icon={ArrowUpRight}
          />
          <FinanceKpiCard
            label="Expenses"
            value={formatMoney(o.expenses)}
            icon={ArrowDownRight}
          />
        </div>
      </section>
    </div>
  );
}
