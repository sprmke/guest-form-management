import * as React from 'react';

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

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
  const importable = summary.valid;
  const needsFix = summary.error;

  return (
    <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-xl font-semibold text-primary">{importable}</p>
        <p className="text-xs text-muted-foreground">Ready</p>
      </div>
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-xl font-semibold text-destructive">{needsFix}</p>
        <p className="text-xs text-muted-foreground">Need fixing</p>
      </div>
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-xl font-semibold text-foreground">{summary.skipped}</p>
        <p className="text-xs text-muted-foreground">Excluded</p>
      </div>
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-xl font-semibold text-amber-600">{summary.warning}</p>
        <p className="text-xs text-muted-foreground">Warnings</p>
      </div>
    </div>
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
      return 'Valid';
    case 'error':
      return 'Error';
    case 'skipped':
      return 'Excluded';
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

type PreviewRowProps = {
  row: ImportBatchRowPreview;
  batchId: string;
  displayIndex: number;
};

function PreviewRow({ row, batchId, displayIndex }: PreviewRowProps) {
  const updateRow = useUpdateImportRow(batchId);
  const isExcluded = row.validationStatus === 'skipped';
  const message = primaryErrorMessage(row);
  const hasWarning = row.validationErrors.some((entry) => entry.severity === 'warning');

  const handleToggle = (checked: boolean) => {
    updateRow.mutate({
      batchId,
      rowId: row.id,
      validationStatus: checked ? 'skipped' : 'valid',
    });
  };

  return (
    <TableRow
      className={cn(
        row.validationStatus === 'error' && 'bg-destructive/5',
        isExcluded && 'opacity-60'
      )}
    >
      <TableCell className="w-10 px-2 text-xs text-muted-foreground">{displayIndex}</TableCell>
      <TableCell className="max-w-[8rem] truncate px-2 text-xs">
        {row.mappedData.primary_guest_name ?? row.mappedData.guest_facebook_name ?? '—'}
      </TableCell>
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
              row.validationStatus === 'error' && 'text-destructive'
            )}
          >
            {(row.validationStatus === 'error' || hasWarning) && (
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
          checked={isExcluded}
          disabled={updateRow.isPending}
          aria-label={`Exclude row ${displayIndex}`}
          onCheckedChange={handleToggle}
        />
      </TableCell>
    </TableRow>
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
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Validating rows…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (!isReady) return null;

  return (
    <div className="space-y-3">
      <PreviewSummary summary={summary} />

      <p className="text-xs text-muted-foreground">
        {summary.valid} of {summary.total} rows ready
        {summary.error > 0 ? ` · ${summary.error} need fixing` : ''}
      </p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-2 text-xs">#</TableHead>
              <TableHead className="h-9 px-2 text-xs">Guest</TableHead>
              <TableHead className="h-9 px-2 text-xs">Check-in</TableHead>
              <TableHead className="h-9 px-2 text-xs">Check-out</TableHead>
              <TableHead className="h-9 px-2 text-xs">Status</TableHead>
              <TableHead className="h-9 px-2 text-xs">Issue</TableHead>
              <TableHead className="h-9 px-2 text-xs">Exclude</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, index) => (
              <PreviewRow
                key={row.id}
                row={row}
                batchId={batchId}
                displayIndex={pageStart + index + 1}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              aria-label="Previous page"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </Button>
            <span className="min-w-[4rem] text-center">
              {safePage + 1} / {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              aria-label="Next page"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
