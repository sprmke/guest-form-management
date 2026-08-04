import * as React from 'react';

import { format, parseISO } from 'date-fns';
import { AlertTriangle, ArrowLeft, FileSpreadsheet, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useImportBatches, IMPORT_BATCHES_KEY } from '@/features/dashboard/import/hooks/useImportBatches';
import {
  useRevertImportBatch,
  useRevertDryRun,
  type RevertDryRunResult,
} from '@/features/dashboard/import/hooks/useRevertImportBatch';
import type { ImportBatch } from '@/features/dashboard/import/types/importBatch';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOrgSlugParam } from '@/features/dashboard/org/lib/adminApiScope';
import { BOOKINGS_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBookings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

// ── Revert confirm dialog ──────────────────────────────────────────────────────

type RevertDialogProps = {
  batch: ImportBatch;
  open: boolean;
  dryRunResult: RevertDryRunResult | null;
  isDryRunLoading: boolean;
  isDryRunFailed: boolean;
  includeMoved: boolean;
  onIncludeMovedChange: (checked: boolean) => void;
  onRetryDryRun: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  isReverting: boolean;
  revertError: string | null;
};

function RevertDialog({
  batch,
  open,
  dryRunResult,
  isDryRunLoading,
  isDryRunFailed,
  includeMoved,
  onIncludeMovedChange,
  onRetryDryRun,
  onConfirm,
  onCancel,
  isReverting,
  revertError,
}: RevertDialogProps) {
  const hasMoved = (dryRunResult?.movedCount ?? 0) > 0;
  const hasModified = (dryRunResult?.modifiedCount ?? 0) > 0;
  const importedCount = dryRunResult?.importedCount ?? 0;
  const movedCount = dryRunResult?.movedCount ?? 0;

  // Total that will actually be cancelled given current checkbox state.
  const totalToCancel = importedCount + (includeMoved ? movedCount : 0);

  // Confirm requires a successful dry-run result; disabled while loading, on failure,
  // or when the effective cancel count is zero. The server enforces the same no-op guard
  // as a backstop, but we keep the UI gate to prevent accidental corrupt batch status.
  const confirmDisabled =
    isReverting || isDryRunLoading || isDryRunFailed || dryRunResult === null || totalToCancel === 0;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revert import?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {isDryRunLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  <span>Checking import status…</span>
                </div>
              ) : isDryRunFailed ? (
                // dryRun failed — require Retry before Confirm becomes available.
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <div className="flex-1 space-y-1">
                    <span>Could not check import status. Retry before continuing.</span>
                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 py-0 text-xs font-medium underline-offset-2 hover:underline"
                        onClick={onRetryDryRun}
                      >
                        Retry check
                      </Button>
                    </div>
                  </div>
                </div>
              ) : dryRunResult ? (
                <>
                  <p>
                    <span className="font-medium text-foreground">{totalToCancel.toLocaleString()}</span>{' '}
                    booking{totalToCancel !== 1 ? 's' : ''} from{' '}
                    <span className="font-medium text-foreground">{batch.original_file_name}</span>{' '}
                    will be cancelled.
                  </p>

                  {hasModified && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span>
                        {dryRunResult.modifiedCount} booking{dryRunResult.modifiedCount !== 1 ? 's were' : ' was'} edited after this import was committed.
                      </span>
                    </div>
                  )}

                  {hasMoved && (
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium text-foreground">{movedCount}</span>{' '}
                        booking{movedCount !== 1 ? 's have' : ' has'} already been moved into the workflow (e.g. Pending Review) and will be skipped unless you include them below.
                      </p>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="include-moved"
                          checked={includeMoved}
                          onCheckedChange={(v) => onIncludeMovedChange(v === true)}
                        />
                        <label htmlFor="include-moved" className="cursor-pointer text-foreground">
                          Also cancel moved bookings
                        </label>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // dryRun not yet fired (shouldn't happen in practice — fired on open).
                <p>
                  Cancel all <span className="font-medium text-foreground">Imported</span> bookings from{' '}
                  <span className="font-medium text-foreground">{batch.original_file_name}</span>?
                </p>
              )}

              {revertError && <p className="text-destructive">{revertError}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isReverting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isReverting ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                Reverting…
              </>
            ) : (
              'Revert'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Batch row ──────────────────────────────────────────────────────────────────

function ImportBatchRow({
  batch,
  onRevert,
}: {
  batch: ImportBatch;
  onRevert: (batch: ImportBatch) => void;
}) {
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
        {batch.status === 'committed' && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Revert import"
            onClick={() => onRevert(batch)}
          >
            <RotateCcw className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function ImportHistoryPage() {
  const orgContext = useOptionalOrgContext();
  const orgSlug = useOrgSlugParam();
  const propertySlug = orgContext?.propertySlug ?? null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useImportBatches();
  const revertMutation = useRevertImportBatch();
  const dryRunMutation = useRevertDryRun();

  const [revertTarget, setRevertTarget] = React.useState<ImportBatch | null>(null);
  const [revertError, setRevertError] = React.useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = React.useState<RevertDryRunResult | null>(null);
  const [isDryRunFailed, setIsDryRunFailed] = React.useState(false);
  const [includeMoved, setIncludeMoved] = React.useState(false);

  const backPath =
    orgSlug && propertySlug
      ? `/org/${orgSlug}/property/${propertySlug}/bookings`
      : -1;

  const runDryRun = React.useCallback(
    (batchId: string) => {
      setDryRunResult(null);
      setIsDryRunFailed(false);
      dryRunMutation.mutate(batchId, {
        onSuccess: (result) => {
          setDryRunResult(result);
          setIsDryRunFailed(false);
        },
        onError: () => {
          setDryRunResult(null);
          setIsDryRunFailed(true);
        },
      });
    },
    // dryRunMutation excluded from deps — mutate() is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleRevertClick = (batch: ImportBatch) => {
    setRevertTarget(batch);
    setRevertError(null);
    setIncludeMoved(false);
    // Fire dry-run immediately so counts/warnings are ready when dialog opens.
    runDryRun(batch.id);
  };

  const handleRevertConfirm = async () => {
    if (!revertTarget) return;
    setRevertError(null);
    try {
      await revertMutation.mutateAsync({ batchId: revertTarget.id, includeMoved });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...IMPORT_BATCHES_KEY] }),
        queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY }),
      ]);
      setRevertTarget(null);
    } catch (err) {
      setRevertError((err as Error).message);
    }
  };

  const handleRevertCancel = () => {
    if (revertMutation.isPending) return;
    setRevertTarget(null);
    setRevertError(null);
    setDryRunResult(null);
    setIsDryRunFailed(false);
    setIncludeMoved(false);
    revertMutation.reset();
    dryRunMutation.reset();
  };

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
          <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No imports yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.batches.map((batch) => (
            <ImportBatchRow key={batch.id} batch={batch} onRevert={handleRevertClick} />
          ))}
        </div>
      )}

      {revertTarget && (
        <RevertDialog
          batch={revertTarget}
          open={Boolean(revertTarget)}
          dryRunResult={dryRunResult}
          isDryRunLoading={dryRunMutation.isPending}
          isDryRunFailed={isDryRunFailed}
          includeMoved={includeMoved}
          onIncludeMovedChange={setIncludeMoved}
          onRetryDryRun={() => revertTarget && runDryRun(revertTarget.id)}
          onConfirm={() => void handleRevertConfirm()}
          onCancel={handleRevertCancel}
          isReverting={revertMutation.isPending}
          revertError={revertError}
        />
      )}
    </div>
  );
}
