import { format, parseISO } from 'date-fns';
import { ArrowLeft, Clock, FileSpreadsheet, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useImportBatches } from '@/features/dashboard/import/hooks/useImportBatches';
import type { ImportBatch } from '@/features/dashboard/import/types/importBatch';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOrgSlugParam } from '@/features/dashboard/org/lib/adminApiScope';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function statusVariant(status: ImportBatch['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'committed': return 'default';
    case 'committing': return 'secondary';
    case 'failed': return 'destructive';
    case 'reverted': return 'outline';
    default: return 'secondary';
  }
}

function statusLabel(status: ImportBatch['status']): string {
  const labels: Record<ImportBatch['status'], string> = {
    uploaded: 'Uploaded',
    mapping: 'Analyzing',
    mapped: 'Mapped',
    previewing: 'Previewing',
    previewed: 'Previewed',
    committing: 'Importing',
    committed: 'Imported',
    reverting: 'Reverting',
    reverted: 'Reverted',
    failed: 'Failed',
  };
  return labels[status] ?? status;
}

function ImportBatchRow({ batch }: { batch: ImportBatch }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate font-medium">{batch.original_file_name}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {batch.row_count.toLocaleString()} rows ·{' '}
          {format(parseISO(batch.created_at), 'MMM d, yyyy h:mm a')} · {batch.created_by}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={statusVariant(batch.status)}>{statusLabel(batch.status)}</Badge>
        {/* Revert wired in Task 6 — button hidden until real implementation lands. */}
        {batch.status === 'committed' && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Revert import"
            disabled
          >
            <RotateCcw className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ImportHistoryPage() {
  const orgContext = useOptionalOrgContext();
  const orgSlug = useOrgSlugParam();
  const propertySlug = orgContext?.propertySlug ?? null;
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch, isFetching } = useImportBatches();

  const backPath =
    orgSlug && propertySlug
      ? `/org/${orgSlug}/property/${propertySlug}/bookings`
      : -1;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Back to bookings"
          onClick={() => (typeof backPath === 'string' ? navigate(backPath) : navigate(-1))}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
        <h1 className="text-lg font-semibold">Import history</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-8"
          aria-label="Refresh"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : isError ? (
        <p className="text-center text-sm text-destructive">Failed to load import history.</p>
      ) : !data?.batches.length ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Clock className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No imports yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.batches.map((batch) => (
            <ImportBatchRow key={batch.id} batch={batch} />
          ))}
        </div>
      )}
    </div>
  );
}
