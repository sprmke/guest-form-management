import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Car,
  CircleDollarSign,
  Loader2,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
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
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Loading summary…</span>
      </div>
    );
  }
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <CircleDollarSign className="size-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">No data for this period</p>
        <p className="mt-1 text-xs text-slate-400">Select a different date range above.</p>
      </div>
    );
  }

  const { stays: s, operating: o, grandNet } = summary;

  return (
    <div className="space-y-6">
      {/* Hero: Grand net */}
      <FinanceKpiCard
        label="Grand net profit"
        value={formatMoney(grandNet)}
        hint={`${s.completedCount} completed stay${s.completedCount === 1 ? '' : 's'} + operating lines`}
        icon={TrendingUp}
        valueClassName={cn(grandNet >= 0 ? 'text-emerald-700' : 'text-red-600')}
        size="hero"
      />

      {/* Stays section */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Stays · {s.count} in period
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FinanceKpiCard
            label="Completed net"
            value={formatMoney(s.hostNetCompleted)}
            hint={`${s.completedCount} completed`}
            icon={Wallet}
            iconColor="text-emerald-500"
            valueClassName={cn(s.hostNetCompleted >= 0 ? 'text-emerald-700' : 'text-red-600')}
          />
          <FinanceKpiCard
            label="Collected"
            value={formatMoney(s.guestCollected)}
            hint="Balance payments received"
            icon={Banknote}
            iconColor="text-blue-500"
          />
          <FinanceKpiCard
            label="Revenue"
            value={formatMoney(s.stayRevenue)}
            hint="Collected minus SD"
            icon={PiggyBank}
            iconColor="text-teal-500"
          />
          <FinanceKpiCard
            label="Outstanding"
            value={formatMoney(s.outstandingGuestBalance)}
            hint="Unpaid guest balance"
            icon={ShieldCheck}
            iconColor="text-amber-500"
            valueClassName={cn(s.outstandingGuestBalance > 0 ? 'text-amber-700' : undefined)}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <FinanceKpiCard
            label="Parking margin"
            value={formatMoney(s.parkingMargin)}
            hint="Guest fee minus owner cost"
            icon={Car}
            iconColor="text-indigo-500"
          />
          <FinanceKpiCard
            label="SD expenses"
            value={formatMoney(s.sdExpenses)}
          />
          <FinanceKpiCard
            label="Pipeline"
            value={formatMoney(s.projectedNetPipeline)}
            hint="Projected · non-completed"
            valueClassName="text-amber-700"
          />
        </div>
      </div>

      {/* Operating section */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Operating
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <FinanceKpiCard
            label="Operating net"
            value={formatMoney(o.net)}
            icon={CircleDollarSign}
            iconColor={o.net >= 0 ? 'text-emerald-500' : 'text-red-500'}
            valueClassName={cn(o.net >= 0 ? 'text-emerald-700' : 'text-red-600')}
          />
          <FinanceKpiCard
            label="Income"
            value={formatMoney(o.income)}
            icon={ArrowUpRight}
            iconColor="text-emerald-500"
          />
          <FinanceKpiCard
            label="Expenses"
            value={formatMoney(o.expenses)}
            icon={ArrowDownRight}
            iconColor="text-red-500"
          />
        </div>
      </div>
    </div>
  );
}
