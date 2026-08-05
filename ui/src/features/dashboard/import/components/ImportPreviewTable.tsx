import * as React from 'react';

import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import {
  ImportAlert,
  ImportStatStrip,
} from '@/features/dashboard/import/components/ImportModalChrome';
import { useImportBatchRows } from '@/features/dashboard/import/hooks/useImportBatchRows';
import { useUpdateImportRow } from '@/features/dashboard/import/hooks/useUpdateImportRow';
import type {
  ImportBatchRowPreview,
  ImportPreviewSummary,
} from '@/features/dashboard/import/types/importBatch';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

type Props = {
  batchId: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

function PreviewSummary({ summary }: { summary: ImportPreviewSummary }) {
  return (
    <ImportStatStrip
      stats={[
        { label: 'Ready', value: summary.valid, tone: 'primary' },
        { label: 'Need fixing', value: summary.error, tone: 'danger' },
        { label: 'Turned off', value: summary.skipped, tone: 'neutral' },
        { label: 'Warnings', value: summary.warning, tone: 'warning' },
      ]}
    />
  );
}

function rowStatusVariant(
  status: ImportBatchRowPreview['validationStatus']
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'valid':
      return 'default';
    case 'error':
      return 'destructive';
    case 'skipped':
      return 'outline';
    default:
      return 'secondary';
  }
}

function rowStatusLabel(status: ImportBatchRowPreview['validationStatus']): string {
  switch (status) {
    case 'valid':
      return 'Ready';
    case 'error':
      return 'Needs fixing';
    case 'skipped':
      return 'Turned off';
    default:
      return status;
  }
}

function primaryErrorMessage(row: ImportBatchRowPreview): string | null {
  const blocking = row.validationErrors.find((entry) => entry.severity === 'error');
  if (blocking) return blocking.message;
  const warning = row.validationErrors.find((entry) => entry.severity === 'warning');
  return warning?.message ?? null;
}

function guestName(row: ImportBatchRowPreview): string {
  return row.mappedData.primary_guest_name ?? row.mappedData.guest_facebook_name ?? 'No name';
}

type PreviewRowProps = {
  row: ImportBatchRowPreview;
  batchId: string;
  displayIndex: number;
};

function useRowImportToggle(batchId: string, row: ImportBatchRowPreview) {
  const updateRow = useUpdateImportRow(batchId);
  const isExcluded = row.validationStatus === 'skipped';
  const isError = row.validationStatus === 'error';

  const handleToggle = (willImport: boolean) => {
    updateRow.mutate({
      batchId,
      rowId: row.id,
      validationStatus: willImport ? 'valid' : 'skipped',
    });
  };

  return { updateRow, isExcluded, isError, handleToggle };
}

function PreviewRowDesktop({ row, batchId, displayIndex }: PreviewRowProps) {
  const { updateRow, isExcluded, isError, handleToggle } = useRowImportToggle(batchId, row);
  const message = primaryErrorMessage(row);
  const hasWarning = row.validationErrors.some((entry) => entry.severity === 'warning');

  return (
    <TableRow className={cn(isError && 'bg-destructive/5', isExcluded && 'opacity-60')}>
      <TableCell className="text-muted-foreground w-10 px-2 text-xs">{displayIndex}</TableCell>
      <TableCell className="max-w-[8rem] truncate px-2 text-xs">{guestName(row)}</TableCell>
      <TableCell className="whitespace-nowrap px-2 text-xs">
        {row.mappedData.check_in_date ?? '—'}
      </TableCell>
      <TableCell className="whitespace-nowrap px-2 text-xs">
        {row.mappedData.check_out_date ?? '—'}
      </TableCell>
      <TableCell className="px-2">
        <Badge variant={rowStatusVariant(row.validationStatus)} className="text-[10px]">
          {rowStatusLabel(row.validationStatus)}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[10rem] px-2 text-xs">
        {message ? (
          <span
            className={cn(
              'flex items-start gap-1',
              hasWarning && row.validationStatus === 'valid' && 'text-amber-600',
              isError && 'text-destructive'
            )}
          >
            {(isError || hasWarning) && (
              <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
            )}
            <span className="line-clamp-2">{message}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-2">
        <Switch
          checked={!isExcluded}
          disabled={updateRow.isPending || isError}
          aria-label={`Import row ${displayIndex}`}
          onCheckedChange={handleToggle}
        />
      </TableCell>
    </TableRow>
  );
}

function PreviewRowMobile({ row, batchId, displayIndex }: PreviewRowProps) {
  const { updateRow, isExcluded, isError, handleToggle } = useRowImportToggle(batchId, row);
  const message = primaryErrorMessage(row);
  const hasWarning = row.validationErrors.some((entry) => entry.severity === 'warning');

  return (
    <li
      className={cn(
        'border-border/70 space-y-2 rounded-xl border px-3 py-2.5',
        isError && 'border-destructive/40 bg-destructive/5',
        isExcluded && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">
            <span className="text-muted-foreground mr-1.5 tabular-nums">#{displayIndex}</span>
            {guestName(row)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
            {row.mappedData.check_in_date ?? '—'} → {row.mappedData.check_out_date ?? '—'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={rowStatusVariant(row.validationStatus)} className="text-[10px]">
            {rowStatusLabel(row.validationStatus)}
          </Badge>
          <Switch
            checked={!isExcluded}
            disabled={updateRow.isPending || isError}
            aria-label={`Import row ${displayIndex}`}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>
      {message ? (
        <p
          className={cn(
            'flex items-start gap-1.5 text-xs',
            isError && 'text-destructive',
            hasWarning && !isError && 'text-amber-700 dark:text-amber-300'
          )}
        >
          <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
          <span className="line-clamp-3">{message}</span>
        </p>
      ) : null}
      {isError ? (
        <p className="text-muted-foreground text-[11px]">Go Back to fix column mapping.</p>
      ) : null}
    </li>
  );
}

function PreviewPagination({
  pageStart,
  pageSize,
  total,
  safePage,
  pageCount,
  onPageChange,
}: {
  pageStart: number;
  pageSize: number;
  total: number;
  safePage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">
        {pageStart + 1}–{Math.min(pageStart + pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Previous page"
          disabled={safePage <= 0}
          onClick={() => onPageChange(Math.max(0, safePage - 1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <span className="min-w-[4rem] text-center tabular-nums">
          {safePage + 1} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Next page"
          disabled={safePage >= pageCount - 1}
          onClick={() => onPageChange(Math.min(pageCount - 1, safePage + 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function ImportPreviewTable({ batchId, isLoading, error, onRetry }: Props) {
  const { rows, summary, isReady } = useImportBatchRows(batchId);
  const [page, setPage] = React.useState(0);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageRows = rows.slice(pageStart, pageStart + PAGE_SIZE);

  React.useEffect(() => {
    setPage(0);
  }, [batchId, rows.length]);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 py-14">
        <Loader2 className="text-primary size-7 animate-spin" aria-hidden />
        <p className="text-sm">Checking every row…</p>
      </div>
    );
  }

  if (error) {
    return (
      <ImportAlert
        tone="error"
        action={
          onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
      >
        {error}
      </ImportAlert>
    );
  }

  if (!isReady) return null;

  return (
    <div className="space-y-3">
      <PreviewSummary summary={summary} />

      {/* Phone: stacked cards */}
      <ul className="space-y-2 sm:hidden">
        {pageRows.map((row, index) => (
          <PreviewRowMobile
            key={row.id}
            row={row}
            batchId={batchId}
            displayIndex={pageStart + index + 1}
          />
        ))}
      </ul>

      {/* Tablet+ : table */}
      <div className="border-border/70 hidden overflow-hidden rounded-xl border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-2 text-xs">#</TableHead>
              <TableHead className="h-9 px-2 text-xs">Guest</TableHead>
              <TableHead className="h-9 px-2 text-xs">Check-in</TableHead>
              <TableHead className="h-9 px-2 text-xs">Check-out</TableHead>
              <TableHead className="h-9 px-2 text-xs">Status</TableHead>
              <TableHead className="h-9 px-2 text-xs">Issue</TableHead>
              <TableHead className="h-9 px-2 text-xs">Import</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, index) => (
              <PreviewRowDesktop
                key={row.id}
                row={row}
                batchId={batchId}
                displayIndex={pageStart + index + 1}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <PreviewPagination
        pageStart={pageStart}
        pageSize={PAGE_SIZE}
        total={rows.length}
        safePage={safePage}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
