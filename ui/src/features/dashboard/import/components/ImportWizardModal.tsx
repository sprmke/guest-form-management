import * as React from 'react';

import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  History,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { BOOKINGS_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBookings';
import { ImportFileDropzone } from '@/features/dashboard/import/components/ImportFileDropzone';
import { ImportManualMappingRow } from '@/features/dashboard/import/components/ImportManualMappingRow';
import {
  ImportAlert,
  ImportFileBar,
  ImportModalBody,
  ImportModalFooter,
  ImportModalHeader,
  ImportStatStrip,
  ImportStepHeading,
  ImportStepper,
} from '@/features/dashboard/import/components/ImportModalChrome';
import { ImportPreviewTable } from '@/features/dashboard/import/components/ImportPreviewTable';
import { useAiMapColumns } from '@/features/dashboard/import/hooks/useAiMapColumns';
import { useCancelImportBatch } from '@/features/dashboard/import/hooks/useCancelImportBatch';
import {
  useCommitImportBatch,
  type CommitImportBatchFailure,
} from '@/features/dashboard/import/hooks/useCommitImportBatch';
import { IMPORT_BATCHES_KEY } from '@/features/dashboard/import/hooks/useImportBatches';
import {
  clearImportPreviewCache,
  useImportBatchRows,
} from '@/features/dashboard/import/hooks/useImportBatchRows';
import { useImportPreview } from '@/features/dashboard/import/hooks/useImportPreview';
import { useSaveImportMapping } from '@/features/dashboard/import/hooks/useSaveImportMapping';
import { downloadImportCsvTemplate } from '@/features/dashboard/import/lib/importCsvTemplate';
import {
  labelForImportTarget,
  REQUIRED_TARGET_FIELDS,
} from '@/features/dashboard/import/lib/importTargetFields';
import type {
  AiMapColumnsResult,
  ImportColumnMappingEntry,
} from '@/features/dashboard/import/types/importBatch';
import type { ImportParseResult } from '@/features/dashboard/import/types/importParse';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

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
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

// ── Steps ─────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'automap' | 'manual' | 'preview' | 'commit';

const ALL_STEPS: Step[] = ['upload', 'automap', 'manual', 'preview', 'commit'];

const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload',
  automap: 'Match',
  manual: 'Columns',
  preview: 'Preview',
  commit: 'Import',
};

const STEP_COPY: Record<Step, { title: string; description: string }> = {
  upload: {
    title: 'Add your file',
    description:
      'Upload a spreadsheet of past bookings. We hold the file until you finish or cancel.',
  },
  automap: {
    title: 'Reading your columns',
    description: 'We line up each column in your file with a booking field.',
  },
  manual: {
    title: 'Confirm the rest',
    description: 'Pick a booking field for each column below. Choose Skip if you do not need it.',
  },
  preview: {
    title: 'Check the rows',
    description: 'Rows with a problem are left out. Switch off Import on any row you want to skip.',
  },
  commit: {
    title: 'Ready to import',
    description:
      'Bookings are added with the status Imported. Guests are not emailed and no calendar events are created. You can undo this later from Past imports.',
  },
};

// ── Upload step ───────────────────────────────────────────────────────────────

type UploadStepProps = {
  onParsed: (result: ImportParseResult) => void;
  onViewHistory?: () => void;
};

function UploadStep({ onParsed, onViewHistory }: UploadStepProps) {
  return (
    <div>
      <ImportFileDropzone onParsed={onParsed} />

      <div className="border-border/70 mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-2 min-h-11"
          onClick={() => downloadImportCsvTemplate()}
        >
          <Download className="size-4" aria-hidden />
          Download template
        </Button>
        {onViewHistory ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -mr-2 min-h-11"
            onClick={onViewHistory}
          >
            <History className="size-4" aria-hidden />
            Past imports
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ── Match step ────────────────────────────────────────────────────────────────

type AutoMapStepProps = {
  aiResult: AiMapColumnsResult | null;
  isLoading: boolean;
  error: string | null;
  onRunMapping: () => void;
};

function AutoMapStep({ aiResult, isLoading, error, onRunMapping }: AutoMapStepProps) {
  const [matchedExpanded, setMatchedExpanded] = React.useState(false);
  const matchedPanelId = React.useId();

  React.useEffect(() => {
    if (!aiResult && !isLoading && !error) {
      onRunMapping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 py-14">
        <Loader2 className="text-primary size-7 animate-spin" aria-hidden />
        <p className="text-sm">Matching your columns…</p>
      </div>
    );
  }

  if (error) {
    return (
      <ImportAlert
        tone="error"
        action={
          <Button type="button" variant="outline" size="sm" onClick={onRunMapping}>
            Try again
          </Button>
        }
      >
        {error}
      </ImportAlert>
    );
  }

  if (!aiResult) return null;

  const { summary, columnMapping } = aiResult;
  const matched = columnMapping.mappings.filter((e) => e.status === 'matched');

  return (
    <div className="space-y-4">
      <ImportStatStrip
        stats={[
          { label: 'Matched', value: summary.matched, tone: 'primary' },
          { label: 'Need your input', value: summary.needsReview, tone: 'neutral' },
        ]}
      />

      {aiResult.degraded ? (
        <ImportAlert tone="warning">
          Matching ran in basic mode, so please double-check the suggestions.
        </ImportAlert>
      ) : null}

      {matched.length > 0 ? (
        <div className="border-border/70 overflow-hidden rounded-xl border">
          <button
            type="button"
            className="hover:bg-muted/40 flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors"
            onClick={() => setMatchedExpanded((p) => !p)}
            aria-expanded={matchedExpanded}
            aria-controls={matchedPanelId}
          >
            <span className="text-foreground flex items-center gap-2 font-medium">
              <CheckCircle2 className="text-primary size-4 shrink-0" aria-hidden />
              {matched.length} column{matched.length !== 1 ? 's' : ''} matched
            </span>
            {matchedExpanded ? (
              <ChevronUp className="text-muted-foreground size-4" aria-hidden />
            ) : (
              <ChevronDown className="text-muted-foreground size-4" aria-hidden />
            )}
          </button>
          {matchedExpanded ? (
            <ul id={matchedPanelId} className="border-border/70 divide-border/60 divide-y border-t">
              {matched.map((entry) => (
                <li
                  key={entry.rawHeader}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                >
                  <span className="text-muted-foreground min-w-0 flex-1 truncate">
                    {entry.rawHeader}
                  </span>
                  <span className="text-foreground max-w-[55%] shrink-0 truncate text-right font-medium">
                    {labelForImportTarget(entry.suggestedTarget)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <ImportAlert tone="info">
          Nothing matched automatically. Continue to map each column yourself.
        </ImportAlert>
      )}
    </div>
  );
}

// ── Columns step ──────────────────────────────────────────────────────────────

type ManualMappingStepProps = {
  aiResult: AiMapColumnsResult;
  parseResult: ImportParseResult;
  mappingState: Record<string, string | null>;
  onMappingChange: (header: string, target: string | null) => void;
  error: string | null;
  missingRequired: string[];
};

function ManualMappingStep({
  aiResult,
  parseResult,
  mappingState,
  onMappingChange,
  error,
  missingRequired,
}: ManualMappingStepProps) {
  const needsReview = aiResult.columnMapping.mappings.filter((e) => e.status !== 'matched');
  const matched = aiResult.columnMapping.mappings.filter((e) => e.status === 'matched');

  const usedTargets = React.useMemo(() => {
    const used = new Set<string>();
    for (const [, target] of Object.entries(mappingState)) {
      if (target) used.add(target);
    }
    for (const entry of matched) {
      if (entry.suggestedTarget) used.add(entry.suggestedTarget);
    }
    return used;
  }, [mappingState, matched]);

  const samplesByHeader = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const header of parseResult.headers) {
      map[header] = parseResult.sampleRows
        .map((row) => String(row[header] ?? '').trim())
        .filter(Boolean)
        .slice(0, 3);
    }
    return map;
  }, [parseResult]);

  if (needsReview.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <CheckCircle2 className="text-primary size-8" aria-hidden />
        <p className="text-foreground text-sm font-medium">Every column matched</p>
        <p className="text-muted-foreground text-sm">There is nothing to confirm here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <ImportAlert tone="error" className="mb-3">
          {error}
        </ImportAlert>
      ) : null}
      {missingRequired.length > 0 ? (
        <ImportAlert tone="warning" className="mb-3">
          Still need: {missingRequired.map(labelForImportTarget).join(', ')}
        </ImportAlert>
      ) : null}
      {needsReview.map((entry: ImportColumnMappingEntry) => (
        <ImportManualMappingRow
          key={entry.rawHeader}
          entry={entry}
          samples={samplesByHeader[entry.rawHeader] ?? []}
          value={mappingState[entry.rawHeader] ?? null}
          onChange={onMappingChange}
          usedTargets={usedTargets}
        />
      ))}
    </div>
  );
}

// ── Preview step ──────────────────────────────────────────────────────────────

type PreviewStepProps = {
  batchId: string;
  previewRunKey: number;
  isLoading: boolean;
  error: string | null;
  onRunPreview: (force?: boolean) => void;
};

function PreviewStep({ batchId, previewRunKey, isLoading, error, onRunPreview }: PreviewStepProps) {
  React.useEffect(() => {
    onRunPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, previewRunKey]);

  return (
    <ImportPreviewTable
      batchId={batchId}
      isLoading={isLoading}
      error={error}
      onRetry={() => onRunPreview(true)}
    />
  );
}

// ── Import step ───────────────────────────────────────────────────────────────

type CommitStepProps = {
  validCount: number;
  excludedCount: number;
  isCommitting: boolean;
  error: string | null;
  failedRows: CommitImportBatchFailure[];
};

function CommitStep({
  validCount,
  excludedCount,
  isCommitting,
  error,
  failedRows,
}: CommitStepProps) {
  const visibleFailures = failedRows.slice(0, 5);

  if (isCommitting) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 py-14">
        <Loader2 className="text-primary size-7 animate-spin" aria-hidden />
        <p className="text-sm">Adding {validCount.toLocaleString()} bookings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ImportStatStrip
        stats={[
          { label: 'Will be added', value: validCount, tone: 'primary' },
          { label: 'Left out', value: excludedCount, tone: 'neutral' },
        ]}
      />

      {error ? <ImportAlert tone="error">{error}</ImportAlert> : null}

      {visibleFailures.length > 0 ? (
        <div className="border-destructive/30 bg-destructive/5 divide-destructive/20 text-destructive divide-y overflow-hidden rounded-xl border text-xs">
          {visibleFailures.map((row) => (
            <p key={row.rowIndex} className="px-3 py-2">
              <span className="font-medium">Row {row.rowIndex + 1}</span> · {row.reason}
            </p>
          ))}
          {failedRows.length > visibleFailures.length ? (
            <p className="text-muted-foreground px-3 py-2">
              and {failedRows.length - visibleFailures.length} more
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function coveredTargets(
  aiResult: AiMapColumnsResult | null,
  mappingState: Record<string, string | null>
): Set<string> {
  const used = new Set<string>();
  if (!aiResult) return used;
  for (const entry of aiResult.columnMapping.mappings) {
    if (entry.status === 'matched' && entry.suggestedTarget) {
      used.add(entry.suggestedTarget);
    }
  }
  for (const target of Object.values(mappingState)) {
    if (target) used.add(target);
  }
  return used;
}

function missingRequiredTargets(
  aiResult: AiMapColumnsResult | null,
  mappingState: Record<string, string | null>
): string[] {
  const used = coveredTargets(aiResult, mappingState);
  return REQUIRED_TARGET_FIELDS.map((f) => f.id).filter((id) => !used.has(id));
}

// ── Wizard ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewHistory?: () => void;
};

export function ImportWizardModal({ open, onOpenChange, onViewHistory }: Props) {
  const [step, setStep] = React.useState<Step>('upload');
  const [parseResult, setParseResult] = React.useState<ImportParseResult | null>(null);
  const [aiResult, setAiResult] = React.useState<AiMapColumnsResult | null>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [mappingState, setMappingState] = React.useState<Record<string, string | null>>({});
  const [isBatchCommitted, setIsBatchCommitted] = React.useState(false);
  const [commitResultError, setCommitResultError] = React.useState<string | null>(null);
  const [commitFailures, setCommitFailures] = React.useState<CommitImportBatchFailure[]>([]);
  const [previewRunKey, setPreviewRunKey] = React.useState(0);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [showMissingRequired, setShowMissingRequired] = React.useState(false);

  /** Batch that must be cancelled if the modal closes without a successful commit. */
  const pendingCancelBatchIdRef = React.useRef<string | null>(null);
  const stepHeadingRef = React.useRef<HTMLHeadingElement>(null);

  const queryClient = useQueryClient();
  const propertyId = usePropertyIdParam();
  const aiMapMutation = useAiMapColumns();
  const saveMappingMutation = useSaveImportMapping();
  const previewMutation = useImportPreview();
  const cancelMutation = useCancelImportBatch();
  const commitMutation = useCommitImportBatch();
  const { summary: previewSummary, isReady: previewReady } = useImportBatchRows(
    parseResult?.batchId ?? null
  );

  React.useEffect(() => {
    if (open) {
      setStep('upload');
      setParseResult(null);
      setAiResult(null);
      setAiError(null);
      setMappingState({});
      setIsBatchCommitted(false);
      setCommitResultError(null);
      setCommitFailures([]);
      setPreviewRunKey(0);
      setDiscardOpen(false);
      setShowMissingRequired(false);
      previewMutation.reset();
      commitMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, previewMutation]);

  // Parent can close without going through requestClose (e.g. Past imports). Cancel orphans.
  React.useEffect(() => {
    if (open) return;
    const batchId = pendingCancelBatchIdRef.current;
    if (!batchId) return;
    pendingCancelBatchIdRef.current = null;
    void cancelMutation.mutateAsync(batchId).catch(() => {
      // Best effort cleanup.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step, open]);

  const invalidatePreviewCache = React.useCallback(
    (batchId: string) => {
      clearImportPreviewCache(queryClient, propertyId ?? undefined, batchId);
      previewMutation.reset();
      setPreviewRunKey((key) => key + 1);
    },
    [queryClient, propertyId, previewMutation]
  );

  const handleParsed = (result: ImportParseResult) => {
    pendingCancelBatchIdRef.current = result.batchId;
    setParseResult(result);
    setStep('automap');
  };

  const handleRunAiMapping = async () => {
    if (!parseResult) return;
    setAiError(null);
    try {
      const result = await aiMapMutation.mutateAsync(parseResult.batchId);
      setAiResult(result);

      const initial: Record<string, string | null> = {};
      for (const entry of result.columnMapping.mappings) {
        if (entry.status === 'likely_matched') {
          initial[entry.rawHeader] = entry.suggestedTarget;
        } else if (entry.status !== 'matched') {
          initial[entry.rawHeader] = null;
        }
      }
      setMappingState(initial);
    } catch (err) {
      setAiError((err as Error).message);
    }
  };

  const handleMappingChange = (header: string, target: string | null) => {
    setShowMissingRequired(false);
    setMappingState((prev) => ({ ...prev, [header]: target }));
  };

  const finishClose = () => {
    setDiscardOpen(false);
    onOpenChange(false);
  };

  const discardAndClose = async () => {
    const batchId = pendingCancelBatchIdRef.current ?? parseResult?.batchId ?? null;
    pendingCancelBatchIdRef.current = null;
    if (batchId) {
      try {
        await cancelMutation.mutateAsync(batchId);
      } catch {
        // Best effort — close anyway.
      }
    }
    finishClose();
  };

  const isBusy =
    aiMapMutation.isPending ||
    saveMappingMutation.isPending ||
    previewMutation.isPending ||
    cancelMutation.isPending ||
    commitMutation.isPending;

  const requestClose = () => {
    if (isBusy) return;
    if (pendingCancelBatchIdRef.current && !isBatchCommitted) {
      setDiscardOpen(true);
      return;
    }
    finishClose();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return;
    requestClose();
  };

  const handleViewHistory = () => {
    // Closing triggers the orphan-cancel effect if a batch somehow exists.
    onViewHistory?.();
  };

  const hasReviewColumns = React.useMemo(
    () => Boolean(aiResult?.columnMapping.mappings.some((e) => e.status !== 'matched')),
    [aiResult]
  );

  const visibleSteps = React.useMemo(() => {
    if (aiResult && !hasReviewColumns) {
      return ALL_STEPS.filter((s) => s !== 'manual');
    }
    return ALL_STEPS;
  }, [aiResult, hasReviewColumns]);

  const missingRequired = React.useMemo(
    () => missingRequiredTargets(aiResult, mappingState),
    [aiResult, mappingState]
  );

  const handleContinueFromAutomap = () => {
    if (!aiResult || !parseResult) return;
    if (hasReviewColumns) {
      setStep('manual');
    } else {
      invalidatePreviewCache(parseResult.batchId);
      setStep('preview');
    }
  };

  const handleContinueFromManual = async () => {
    if (!parseResult || !aiResult) return;

    if (missingRequired.length > 0) {
      setShowMissingRequired(true);
      return;
    }

    const finalMapping: Record<string, string | null> = {};
    for (const entry of aiResult.columnMapping.mappings) {
      if (entry.status === 'matched' && entry.suggestedTarget) {
        finalMapping[entry.rawHeader] = entry.suggestedTarget;
      } else {
        finalMapping[entry.rawHeader] = mappingState[entry.rawHeader] ?? null;
      }
    }

    try {
      await saveMappingMutation.mutateAsync({
        batchId: parseResult.batchId,
        columnMapping: finalMapping,
      });
      invalidatePreviewCache(parseResult.batchId);
      setStep('preview');
    } catch (err) {
      console.error('[ImportWizardModal] save mapping failed:', err);
    }
  };

  const handleRunPreview = async (force = false) => {
    if (!parseResult?.batchId || previewMutation.isPending) return;
    if (!force && previewReady) return;
    try {
      await previewMutation.mutateAsync(parseResult.batchId);
    } catch (err) {
      console.error('[ImportWizardModal] preview failed:', err);
    }
  };

  const handleCommit = async () => {
    if (!parseResult?.batchId || commitMutation.isPending) return;
    setCommitResultError(null);
    setCommitFailures([]);
    try {
      const data = await commitMutation.mutateAsync(parseResult.batchId);

      if (data.status === 'committed') {
        const importedCount = data.inserted ?? previewSummary.valid;
        pendingCancelBatchIdRef.current = null;
        setIsBatchCommitted(true);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: [...IMPORT_BATCHES_KEY] }),
        ]);
        toast.success(
          `Imported ${importedCount.toLocaleString()} booking${importedCount !== 1 ? 's' : ''}`
        );
        onOpenChange(false);
        return;
      }

      if (data.status === 'failed') {
        setCommitResultError(
          data.failed.length > 0
            ? `${data.failed.length} row${data.failed.length !== 1 ? 's' : ''} could not be added.`
            : 'Nothing was added. Please try again.'
        );
        setCommitFailures(data.failed);
        return;
      }

      setCommitResultError('There are no rows left to import.');
    } catch (err) {
      console.error('[ImportWizardModal] commit failed:', err);
    }
  };

  const commitError = commitMutation.isError
    ? (commitMutation.error as Error).message
    : commitResultError;

  const backTarget: Step | null =
    step === 'manual'
      ? 'automap'
      : step === 'preview'
        ? hasReviewColumns
          ? 'manual'
          : 'automap'
        : step === 'commit'
          ? 'preview'
          : null;

  const copy = STEP_COPY[step];
  const stepIdx = Math.max(0, visibleSteps.indexOf(step));
  /** Preview and column mapping need a tall scrollport; upload/match/commit shrink to content. */
  const tallStep = step === 'preview' || step === 'manual';

  const primaryAction = (() => {
    if (step === 'automap') {
      return (
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={isBusy || !aiResult}
          onClick={handleContinueFromAutomap}
        >
          Continue
        </Button>
      );
    }

    if (step === 'manual') {
      return (
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={isBusy}
          onClick={() => void handleContinueFromManual()}
        >
          {saveMappingMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving
            </>
          ) : (
            'Continue'
          )}
        </Button>
      );
    }

    if (step === 'preview') {
      return (
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={isBusy || !previewReady || previewSummary.valid === 0}
          onClick={() => setStep('commit')}
        >
          Continue
        </Button>
      );
    }

    if (step === 'commit') {
      return (
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={isBusy || previewSummary.valid === 0}
          onClick={() => void handleCommit()}
        >
          {commitMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Importing
            </>
          ) : (
            `Import ${previewSummary.valid.toLocaleString()} booking${previewSummary.valid !== 1 ? 's' : ''}`
          )}
        </Button>
      );
    }

    return null;
  })();

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
        <ResponsiveModalContent
          className={cn(
            'flex w-[min(calc(100vw-1.5rem),42rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
            tallStep ? 'h-[min(90dvh,40rem)] max-h-[min(90dvh,40rem)]' : 'max-h-[min(90dvh,40rem)]',
            'sm:w-[min(92vw,42rem)] sm:max-w-[42rem] sm:p-0',
            tallStep && 'sm:h-[min(90dvh,40rem)] sm:max-h-[min(90dvh,40rem)]'
          )}
          sheetLayout="split"
          showCloseButton={false}
          aria-label="Import bookings"
          onEscapeKeyDown={(event) => {
            if (isBusy || discardOpen) {
              event.preventDefault();
              return;
            }
            event.preventDefault();
            requestClose();
          }}
          onPointerDownOutside={(event) => {
            if (isBusy || discardOpen) {
              event.preventDefault();
              return;
            }
            event.preventDefault();
            requestClose();
          }}
          onInteractOutside={(event) => {
            if (isBusy || discardOpen) {
              event.preventDefault();
            }
          }}
        >
          <ImportModalHeader
            icon={<Upload className="size-4" aria-hidden />}
            title="Import bookings"
            closeDisabled={isBusy}
            onClose={requestClose}
            below={
              <ImportStepper
                labels={visibleSteps.map((s) => STEP_LABELS[s])}
                currentIndex={stepIdx}
              />
            }
          />

          <ImportModalBody fill={tallStep}>
            <ResponsiveModalDescription className="sr-only">
              {`Step ${stepIdx + 1} of ${visibleSteps.length}. ${copy.description}`}
            </ResponsiveModalDescription>
            <p className="sr-only" aria-live="polite">
              {copy.title}. {copy.description}
            </p>

            {parseResult ? (
              <ImportFileBar
                fileName={parseResult.fileName}
                rowCount={parseResult.rowCount}
                columnCount={parseResult.headers.length}
              />
            ) : null}

            <ImportStepHeading
              title={copy.title}
              description={copy.description}
              headingRef={stepHeadingRef}
            />

            {step === 'upload' && (
              <UploadStep
                onParsed={handleParsed}
                onViewHistory={onViewHistory ? handleViewHistory : undefined}
              />
            )}

            {step === 'automap' && parseResult && (
              <AutoMapStep
                aiResult={aiResult}
                isLoading={aiMapMutation.isPending}
                error={aiError}
                onRunMapping={() => void handleRunAiMapping()}
              />
            )}

            {step === 'manual' && parseResult && aiResult && (
              <ManualMappingStep
                aiResult={aiResult}
                parseResult={parseResult}
                mappingState={mappingState}
                onMappingChange={handleMappingChange}
                error={
                  saveMappingMutation.isError ? (saveMappingMutation.error as Error).message : null
                }
                missingRequired={showMissingRequired ? missingRequired : []}
              />
            )}

            {step === 'preview' && parseResult && (
              <PreviewStep
                batchId={parseResult.batchId}
                previewRunKey={previewRunKey}
                isLoading={previewMutation.isPending}
                error={previewMutation.isError ? (previewMutation.error as Error).message : null}
                onRunPreview={(force) => void handleRunPreview(force)}
              />
            )}

            {step === 'commit' && (
              <CommitStep
                validCount={previewSummary.valid}
                excludedCount={previewSummary.error + previewSummary.skipped}
                isCommitting={commitMutation.isPending}
                error={commitError}
                failedRows={commitFailures}
              />
            )}
          </ImportModalBody>

          <ImportModalFooter
            left={
              backTarget ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  disabled={isBusy}
                  onClick={() => setStep(backTarget)}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Back
                </Button>
              ) : null
            }
            right={primaryAction}
          />
        </ResponsiveModalContent>
      </ResponsiveModal>

      <AlertDialog open={discardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this import?</AlertDialogTitle>
            <AlertDialogDescription>
              Your upload will be discarded. Nothing will be added to bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={cancelMutation.isPending}
              onClick={() => setDiscardOpen(false)}
            >
              Keep working
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void discardAndClose()}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                  Discarding…
                </>
              ) : (
                'Discard upload'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
