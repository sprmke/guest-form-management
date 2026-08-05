import * as React from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, FileSpreadsheet, History, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { BOOKINGS_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBookings';
import {
  ImportAlert,
  ImportModalBody,
  ImportModalFooter,
  ImportModalHeader,
} from '@/features/dashboard/import/components/ImportModalChrome';
import {
  IMPORT_BATCHES_KEY,
  useImportBatches,
} from '@/features/dashboard/import/hooks/useImportBatches';
import {
  useRevertDryRun,
  useRevertImportBatch,
  type RevertDryRunResult,
} from '@/features/dashboard/import/hooks/useRevertImportBatch';
import type { ImportBatch } from '@/features/dashboard/import/types/importBatch';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

// ── Status display ────────────────────────────────────────────────────────────

function statusVariant(
  status: ImportBatch['status']
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'committed':
      return 'default';
    case 'committing':
      return 'secondary';
    case 'failed':
      return 'destructive';
    case 'reverted':
      return 'outline';
    default:
      return 'secondary';
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

// ── Revert confirm ────────────────────────────────────────────────────────────

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
    isReverting ||
    isDryRunLoading ||
    isDryRunFailed ||
    dryRunResult === null ||
    totalToCancel === 0;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Undo this import?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-muted-foreground space-y-3 text-sm">
              {isDryRunLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  <span>Checking this import…</span>
                </div>
              ) : isDryRunFailed ? (
                <ImportAlert
                  tone="warning"
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 py-0 text-xs font-medium underline-offset-2 hover:underline"
                      onClick={onRetryDryRun}
                    >
                      Check again
                    </Button>
                  }
                >
                  We could not check this import. Try again before continuing.
                </ImportAlert>
              ) : dryRunResult ? (
                <>
                  <p>
                    <span className="text-foreground font-medium">
                      {totalToCancel.toLocaleString()}
                    </span>{' '}
                    booking{totalToCancel !== 1 ? 's' : ''} from{' '}
                    <span className="text-foreground font-medium">{batch.original_file_name}</span>{' '}
                    will be cancelled.
                  </p>

                  {hasModified && (
                    <ImportAlert tone="warning">
                      {dryRunResult.modifiedCount} booking
                      {dryRunResult.modifiedCount !== 1 ? 's were' : ' was'} edited after this
                      import ran.
                    </ImportAlert>
                  )}

                  {hasMoved && (
                    <div className="space-y-2">
                      <p>
                        <span className="text-foreground font-medium">{movedCount}</span> booking
                        {movedCount !== 1 ? 's have' : ' has'} already moved into the workflow. They
                        stay as they are unless you include them.
                      </p>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="include-moved"
                          checked={includeMoved}
                          onCheckedChange={(v) => onIncludeMovedChange(v === true)}
                        />
                        <label htmlFor="include-moved" className="text-foreground cursor-pointer">
                          Cancel those too
                        </label>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p>
                  Cancel every booking that came from{' '}
                  <span className="text-foreground font-medium">{batch.original_file_name}</span>?
                </p>
              )}

              {revertError && <p className="text-destructive">{revertError}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isReverting}>
            Keep them
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isReverting ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                Undoing…
              </>
            ) : (
              'Undo import'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Batch row ─────────────────────────────────────────────────────────────────

function ImportBatchRow({
  batch,
  onRevert,
}: {
  batch: ImportBatch;
  onRevert: (batch: ImportBatch) => void;
}) {
  return (
    <li className="border-border/70 flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <FileSpreadsheet className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">{batch.original_file_name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {batch.row_count.toLocaleString()} rows ·{' '}
            {format(parseISO(batch.created_at), 'MMM d, yyyy h:mm a')}
            {batch.created_by ? ` · ${batch.created_by}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Badge variant={statusVariant(batch.status)} className="shrink-0">
          {statusLabel(batch.status)}
        </Badge>
        {batch.status === 'committed' ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-11 shrink-0"
            aria-label={`Undo import of ${batch.original_file_name}`}
            onClick={() => onRevert(batch)}
          >
            <RotateCcw className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Returns to the import wizard. Omit to show only Close. */
  onBackToImport?: () => void;
};

export function ImportHistoryModal({ open, onOpenChange, onBackToImport }: Props) {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const { data, isLoading, isError, refetch, isFetching } = useImportBatches(page, pageSize, {
    enabled: open,
  });
  const revertMutation = useRevertImportBatch();
  const dryRunMutation = useRevertDryRun();

  const [revertTarget, setRevertTarget] = React.useState<ImportBatch | null>(null);
  const [revertError, setRevertError] = React.useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = React.useState<RevertDryRunResult | null>(null);
  const [isDryRunFailed, setIsDryRunFailed] = React.useState(false);
  const [includeMoved, setIncludeMoved] = React.useState(false);

  React.useEffect(() => {
    if (open) setPage(1);
  }, [open]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleRevertClick = (batch: ImportBatch) => {
    setRevertTarget(batch);
    setRevertError(null);
    setIncludeMoved(false);
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
      toast.success('Import undone');
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

  const batches = data?.batches ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <ResponsiveModalContent
          className={cn(
            'flex h-[min(85dvh,34rem)] max-h-[min(85dvh,34rem)] w-[min(calc(100vw-1.5rem),34rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
            'sm:w-[min(92vw,34rem)] sm:max-w-[34rem] sm:p-0'
          )}
          sheetLayout="split"
          showCloseButton={false}
          aria-label="Past imports"
        >
          <ImportModalHeader
            icon={<History className="size-4" aria-hidden />}
            title="Past imports"
            onClose={() => onOpenChange(false)}
            actions={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground size-9 shrink-0"
                aria-label="Refresh list"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
              </Button>
            }
          />

          <ImportModalBody>
            <ResponsiveModalDescription className="sr-only">
              Every CSV import for this property, newest first.
            </ResponsiveModalDescription>

            {isLoading ? (
              <div className="text-muted-foreground flex flex-col items-center gap-3 py-14">
                <Loader2 className="size-6 animate-spin" aria-hidden />
                <p className="text-sm">Loading your imports…</p>
              </div>
            ) : isError ? (
              <ImportAlert
                tone="error"
                action={
                  <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                    Try again
                  </Button>
                }
              >
                We could not load your imports.
              </ImportAlert>
            ) : batches.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <FileSpreadsheet className="text-muted-foreground/60 size-8" aria-hidden />
                <p className="text-foreground text-sm font-medium">No imports yet</p>
                <p className="text-muted-foreground text-sm">
                  Files you import will be listed here so you can undo them.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <ul className="space-y-2">
                  {batches.map((batch) => (
                    <ImportBatchRow key={batch.id} batch={batch} onRevert={handleRevertClick} />
                  ))}
                </ul>
                {pageCount > 1 ? (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      disabled={page <= 1 || isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {page} / {pageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      disabled={page >= pageCount || isFetching}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </ImportModalBody>

          <ImportModalFooter
            left={
              onBackToImport ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={onBackToImport}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Back to import
                </Button>
              ) : null
            }
          />
        </ResponsiveModalContent>
      </ResponsiveModal>

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
    </>
  );
}
