import { formatMoney } from '@/utils/format/currency';
import { useMemo, useState } from 'react';

import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  combineFinanceCategoryBreakdown,
  type FinanceCashFlowPoint,
  type FinanceCategoryBreakdown,
} from '@/features/dashboard/finance/lib/financeChartData';

import { SegmentedControl } from '@/components/ui/sliding-tabs';
import {
  CHART_EXPENSE_COLOR,
  CHART_HEIGHT_CLASS,
  CHART_INCOME_COLOR,
  chartAxisTick,
  defaultChartMargin,
  formatChartMoneyAxis,
} from '@/lib/charts/chartStyles';
import { FinanceChartCard } from '@/components/charts/FinanceChartCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsBelowMd } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type Props = {
  cashFlowData: FinanceCashFlowPoint[];
  incomeBreakdown: FinanceCategoryBreakdown[];
  expenseBreakdown: FinanceCategoryBreakdown[];
  className?: string;
  /** When true, children join a parent `lg:grid-cols-5` (dashboard layout). */
  embedded?: boolean;
  /** Show chart skeletons instead of empty states while data is loading. */
  isLoading?: boolean;
};

type BreakdownFilter = 'all' | 'income' | 'expenses';

const CHART_ANIMATION_MS = 550;

type PieTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: FinanceCategoryBreakdown }>;
};

/** Max donut size scales down as legend rows grow; chart stays centered in flex space. */
function breakdownChartSizeClass(legendCount: number, isMobile: boolean): string {
  const count = Math.min(legendCount, 6);
  const rows = isMobile ? count : Math.ceil(count / 2);

  if (rows <= 1) return isMobile ? 'size-[min(100%,220px)]' : 'size-[min(100%,280px)]';
  if (rows <= 2) return isMobile ? 'size-[min(100%,200px)]' : 'size-[min(100%,260px)]';
  return isMobile ? 'size-[min(100%,180px)]' : 'size-[min(100%,220px)]';
}

function BreakdownTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="border-border/60 bg-background shadow-elevated rounded-xl border px-3.5 py-2.5 text-xs">
      <p className="text-foreground font-semibold">{data.label}</p>
      <p className="text-muted-foreground mt-0.5">
        {formatMoney(data.amount)} ({data.percentage.toFixed(1)}%)
      </p>
    </div>
  );
}

type CashFlowTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: FinanceCashFlowPoint;
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
};

function CashFlowTooltip({ active, payload, label }: CashFlowTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const showIncomeSplit = point.stayNetIncome > 0 || point.transactionIncome > 0;
  const showExpenseSplit = point.stayNetExpense > 0 || point.transactionExpense > 0;

  return (
    <div className="border-border/60 bg-background shadow-elevated rounded-xl border px-3.5 py-2.5 text-xs">
      {label ? <p className="text-foreground font-semibold">{label}</p> : null}
      <div className={label ? 'mt-1.5 space-y-1' : 'space-y-1'}>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground capitalize">{entry.name}</span>
            </div>
            <span className="text-foreground font-semibold tabular-nums">
              {formatMoney(entry.value)}
            </span>
          </div>
        ))}
      </div>
      {showIncomeSplit || showExpenseSplit ? (
        <div className="border-border/50 text-muted-foreground mt-2 space-y-1 border-t pt-2 text-[11px]">
          {showIncomeSplit ? (
            <>
              {point.stayNetIncome > 0 ? <p>Stay net: {formatMoney(point.stayNetIncome)}</p> : null}
              {point.transactionIncome > 0 ? (
                <p>Transactions: {formatMoney(point.transactionIncome)}</p>
              ) : null}
            </>
          ) : null}
          {showExpenseSplit ? (
            <>
              {point.stayNetExpense > 0 ? (
                <p>Stay net (loss): {formatMoney(point.stayNetExpense)}</p>
              ) : null}
              {point.transactionExpense > 0 ? (
                <p>Transactions: {formatMoney(point.transactionExpense)}</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CashFlowChartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading cash flow chart">
      <Skeleton className={`${CHART_HEIGHT_CLASS} w-full rounded-xl`} />
      <div className="mt-4 flex justify-center gap-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

function BreakdownChartSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-busy="true"
      aria-label="Loading breakdown chart"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-10">
        <Skeleton className="size-40 shrink-0 rounded-full sm:size-48" />
      </div>
      <div className="border-border/50 shrink-0 border-t pt-2">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FinanceTransactionsChart({
  cashFlowData,
  incomeBreakdown,
  expenseBreakdown,
  className,
  embedded = false,
  isLoading = false,
}: Props) {
  const isMobile = useIsBelowMd();
  const [pieChartType, setPieChartType] = useState<BreakdownFilter>('all');

  const pieData = useMemo(() => {
    if (pieChartType === 'income') return incomeBreakdown;
    if (pieChartType === 'expenses') return expenseBreakdown;
    return combineFinanceCategoryBreakdown(incomeBreakdown, expenseBreakdown);
  }, [pieChartType, incomeBreakdown, expenseBreakdown]);
  const breakdownChartSize = useMemo(
    () => breakdownChartSizeClass(pieData.length, isMobile),
    [pieData.length, isMobile]
  );
  const hasCashFlow = cashFlowData.some((point) => point.income > 0 || point.expenses > 0);

  const chartMargin = useMemo(() => defaultChartMargin(isMobile), [isMobile]);

  return (
    <div
      className={cn(
        embedded ? 'contents' : 'grid min-w-0 items-stretch gap-3 lg:grid-cols-5 xl:gap-4',
        className
      )}
    >
      <FinanceChartCard
        className="flex h-full flex-col lg:col-span-3"
        icon={BarChart3}
        title="Cash flow"
        description="Stay net, transactions, and expenses over time"
      >
        {isLoading ? (
          <CashFlowChartSkeleton />
        ) : hasCashFlow ? (
          <>
            <div className={CHART_HEIGHT_CLASS}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData} margin={chartMargin}>
                  <defs>
                    <linearGradient id="financeIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_INCOME_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_INCOME_COLOR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="financeExpensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_EXPENSE_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_EXPENSE_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-muted/60"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={chartAxisTick(isMobile)}
                    dy={10}
                    interval="preserveStartEnd"
                    minTickGap={isMobile ? 28 : 20}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={chartAxisTick(isMobile)}
                    tickFormatter={formatChartMoneyAxis}
                    width={isMobile ? 40 : 48}
                    dx={-10}
                  />
                  <Tooltip content={<CashFlowTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="income"
                    stroke={CHART_INCOME_COLOR}
                    strokeWidth={2}
                    fill="url(#financeIncomeGradient)"
                    isAnimationActive
                    animationDuration={CHART_ANIMATION_MS}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="expenses"
                    stroke={CHART_EXPENSE_COLOR}
                    strokeWidth={2}
                    fill="url(#financeExpensesGradient)"
                    isAnimationActive
                    animationDuration={CHART_ANIMATION_MS}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground text-sm">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground text-sm">Expenses</span>
              </div>
            </div>
          </>
        ) : (
          <div
            className={`flex flex-col items-center justify-center gap-1.5 text-center ${CHART_HEIGHT_CLASS}`}
          >
            <p className="text-foreground text-sm font-semibold">No cash flow in this period</p>
            <p className="text-caption max-w-xs">
              Add transactions or widen the date range to see daily income and expenses.
            </p>
          </div>
        )}
      </FinanceChartCard>

      <FinanceChartCard
        className="flex h-full flex-col lg:col-span-2"
        icon={PieChartIcon}
        title="Breakdown"
        description="By category"
        action={
          <div className="max-w-full overflow-x-auto">
            <SegmentedControl
              value={pieChartType}
              onChange={setPieChartType}
              listClassName="w-max min-w-0"
              triggerClassName="h-7 px-2.5 text-xs sm:px-3"
              options={[
                { value: 'all', label: 'All' },
                { value: 'income', label: 'Income' },
                { value: 'expenses', label: 'Expenses' },
              ]}
            />
          </div>
        }
      >
        {isLoading ? (
          <BreakdownChartSkeleton />
        ) : pieData.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-[160px] flex-1 items-center justify-center px-2 pb-10 sm:min-h-[200px]">
              <div className={cn('shrink-0 translate-y-1', breakdownChartSize)}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart key={pieChartType}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="92%"
                      paddingAngle={2}
                      dataKey="amount"
                      isAnimationActive
                      animationBegin={0}
                      animationDuration={CHART_ANIMATION_MS}
                      animationEasing="ease-out"
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={`${pieChartType}-${entry.category}`}
                          fill={entry.color}
                          className="stroke-background stroke-2 transition-opacity hover:opacity-80"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<BreakdownTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              key={pieChartType}
              className="border-border/50 animate-fade-in shrink-0 border-t pt-2"
            >
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {pieData.slice(0, 6).map((item) => (
                  <div key={item.category} className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground truncate text-xs">{item.label}</span>
                    <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[200px] flex-1 items-center justify-center sm:min-h-[260px]">
            <p className="text-muted-foreground text-sm">
              {pieChartType === 'all'
                ? 'No breakdown data available'
                : `No ${pieChartType} data available`}
            </p>
          </div>
        )}
      </FinanceChartCard>
    </div>
  );
}
