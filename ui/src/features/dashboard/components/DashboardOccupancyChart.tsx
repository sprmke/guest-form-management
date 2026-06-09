import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardChartTooltip } from '@/features/dashboard/components/DashboardChartTooltip';
import {
  chartYDomain,
  useChartTheme,
} from '@/features/dashboard/hooks/useChartTheme';
import type { DashboardCheckInPoint } from '@/features/dashboard/lib/types';

type Props = {
  data: DashboardCheckInPoint[];
};

function VolumeTooltip({
  active,
  payload,
  theme,
}: {
  active?: boolean;
  payload?: Array<{ payload: DashboardCheckInPoint }>;
  theme: ReturnType<typeof useChartTheme>;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <DashboardChartTooltip
      theme={theme}
      title={point.label}
      rows={[
        { label: 'Check-ins', value: point.checkIns, accent: theme.sky },
        { label: 'Nights booked', value: point.nights, accent: theme.amber },
      ]}
    />
  );
}

export function DashboardOccupancyChart({ data }: Props) {
  const theme = useChartTheme();
  const checkInDomain = useMemo(
    () => chartYDomain(data.map((d) => d.checkIns), 'count'),
    [data],
  );
  const nightsDomain = useMemo(
    () => chartYDomain(data.map((d) => d.nights), 'count'),
    [data],
  );

  const hasData = data.some((d) => d.checkIns > 0);

  if (!hasData) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-1.5 text-center">
        <p className="text-sm font-semibold text-foreground">No check-ins</p>
        <p className="max-w-xs text-caption">
          Stays starting in this period will show here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="h-[228px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray="4 4"
              stroke={theme.grid}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: theme.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              yAxisId="checkIns"
              domain={checkInDomain}
              allowDecimals={false}
              tick={{ fill: theme.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <YAxis
              yAxisId="nights"
              orientation="right"
              domain={nightsDomain}
              allowDecimals={false}
              tick={{ fill: theme.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<VolumeTooltip theme={theme} />} />
            <Bar
              yAxisId="checkIns"
              dataKey="checkIns"
              name="Check-ins"
              fill={theme.sky}
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Line
              yAxisId="nights"
              type="monotone"
              dataKey="nights"
              name="Nights booked"
              stroke={theme.amber}
              strokeWidth={2}
              dot={{ r: 3, fill: theme.amber, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: theme.tooltipBg, strokeWidth: 2 }}
              animationDuration={700}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-5 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: theme.sky }}
          />
          Check-ins
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full border-2 bg-transparent"
            style={{ borderColor: theme.amber }}
          />
          Nights booked
        </span>
      </div>
    </div>
  );
}
