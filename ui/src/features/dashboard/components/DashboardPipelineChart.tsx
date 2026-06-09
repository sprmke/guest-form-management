import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { statusLabel } from '@/features/admin/lib/bookingStatus';
import type { DashboardPipelineSlice } from '@/features/dashboard/lib/types';
import { pipelineBarColor } from '@/features/dashboard/lib/chartTheme';
import { DASHBOARD_PIPELINE_STATUSES } from '@/features/dashboard/lib/pipelineStages';
import { cn } from '@/lib/utils';

type Props = {
  data: DashboardPipelineSlice[];
  /** Optional period filter for row links (`/bookings?status=…&from=…&to=…`). */
  periodFrom?: string;
  periodTo?: string;
};

type ChartRow = DashboardPipelineSlice & {
  name: string;
  fill: string;
};

function mergePipelineRows(data: DashboardPipelineSlice[]): ChartRow[] {
  const byStatus = new Map(data.map((slice) => [slice.status, slice.count]));
  return DASHBOARD_PIPELINE_STATUSES.map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
    name: statusLabel(status),
    fill: pipelineBarColor(status),
  }));
}

export function DashboardPipelineChart({
  data,
  periodFrom,
  periodTo,
}: Props) {
  const rows = useMemo(() => mergePipelineRows(data), [data]);
  const activeRows = useMemo(
    () => rows.filter((row) => row.count > 0),
    [rows],
  );
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  const periodQuery =
    periodFrom && periodTo
      ? `&from=${encodeURIComponent(periodFrom)}&to=${encodeURIComponent(periodTo)}`
      : '';

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-2xl font-bold tabular-nums leading-none text-foreground">
            {total}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Active bookings
          </p>
        </div>
        <div
          className="flex h-2 overflow-hidden rounded-full bg-muted/60"
          role="img"
          aria-label={
            total === 0
              ? 'No active pipeline bookings'
              : activeRows
                  .map((row) => `${row.name}: ${row.count}`)
                  .join(', ')
          }
        >
          {activeRows.map((row) => (
            <div
              key={row.status}
              className="h-full transition-all duration-700 ease-out motion-reduce:transition-none"
              style={{
                width: `${Math.round((row.count / total) * 100)}%`,
                background: row.fill,
              }}
            />
          ))}
        </div>
      </div>

      <ul className="min-h-0 flex-1 space-y-1">
        {rows.map((row) => {
          const isActive = row.count > 0;
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          const href = `/bookings?status=${encodeURIComponent(row.status)}${periodQuery}`;

          return (
            <li key={row.status}>
              <Link
                to={href}
                className={cn(
                  'group flex min-h-[40px] items-center gap-2 rounded-lg px-2.5 py-2 transition-colors',
                  isActive
                    ? 'border border-border/50 bg-card hover:bg-muted/40'
                    : 'hover:bg-muted/25',
                )}
              >
                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    !isActive && 'bg-muted-foreground/25',
                  )}
                  style={isActive ? { background: row.fill } : undefined}
                  aria-hidden
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-xs',
                    isActive
                      ? 'font-semibold text-foreground'
                      : 'font-medium text-muted-foreground/80',
                  )}
                >
                  {row.name}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums',
                    isActive
                      ? 'bg-muted/70 text-foreground'
                      : 'text-muted-foreground/60',
                  )}
                >
                  {row.count}
                  {isActive ? (
                    <span className="ml-1 font-semibold text-muted-foreground">
                      ({pct}%)
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
