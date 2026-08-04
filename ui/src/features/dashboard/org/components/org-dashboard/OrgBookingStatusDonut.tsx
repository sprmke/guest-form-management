import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import {
  DASHBOARD_STATUS_BREAKDOWN_ORDER,
  PENDING_DOCUMENTS_BUCKET_STATUSES,
  statusLabel,
  statusTone,
} from '@/features/dashboard/bookings/lib/bookingStatus';
import type { DashboardPipelineSlice } from '@/features/dashboard/property/lib/types';

const STATUS_CHART_COLORS: Record<string, string> = {
  red: '#f43f5e',
  yellow: '#f59e0b',
  green: '#10b981',
  amber: '#f97316',
  orange: '#fb923c',
  blue: '#3b82f6',
  purple: '#a855f7',
  neutral: '#6b7280',
};

type Props = {
  slices: DashboardPipelineSlice[];
};

function sliceColor(status: string): string {
  return STATUS_CHART_COLORS[statusTone(status)] ?? STATUS_CHART_COLORS.neutral;
}

const PENDING_DOCS_BUCKET = new Set<string>(PENDING_DOCUMENTS_BUCKET_STATUSES);

function normalizeStatusSlices(slices: DashboardPipelineSlice[]) {
  let pendingDocuments = 0;
  const counts = new Map<string, number>();

  for (const slice of slices) {
    if (PENDING_DOCS_BUCKET.has(slice.status)) {
      pendingDocuments += slice.count;
      continue;
    }
    counts.set(slice.status, (counts.get(slice.status) ?? 0) + slice.count);
  }

  return DASHBOARD_STATUS_BREAKDOWN_ORDER.map((status) => ({
    status,
    count: status === 'PENDING_DOCUMENTS' ? pendingDocuments : (counts.get(status) ?? 0),
    label: statusLabel(status),
    color: sliceColor(status),
  }));
}

export function OrgBookingStatusDonut({ slices }: Props) {
  const data = normalizeStatusSlices(slices);
  const chartData = data.filter((item) => item.count > 0);

  return (
    <section className="surface-card min-w-0 p-3 sm:p-4">
      <p className="text-section-title mb-3">Booking Status</p>

      <div className="flex h-[140px] items-center justify-center sm:h-[180px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={58}
                paddingAngle={2}
                dataKey="count"
                nameKey="label"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  const entry = payload?.[0]?.payload as (typeof chartData)[number] | undefined;
                  if (!active || !entry) return null;
                  return (
                    <div className="border-border bg-card rounded-lg border px-2 py-1.5 shadow-lg">
                      <p className="text-sm font-medium">{entry.label}</p>
                      <p className="text-muted-foreground text-sm">
                        {entry.count} booking{entry.count === 1 ? '' : 's'}
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="border-muted size-[116px] rounded-full border-[14px] sm:size-[136px] sm:border-[16px]"
            aria-hidden
          />
        )}
      </div>

      <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
        {data.map((item) => (
          <div key={item.status} className="flex items-center justify-between text-xs sm:text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <span className="text-muted-foreground truncate">{item.label}</span>
            </div>
            <span className="shrink-0 font-semibold tabular-nums">{item.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
