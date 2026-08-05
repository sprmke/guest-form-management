import * as React from 'react';

import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from 'lucide-react';

import { ImportFileDropzone } from '@/features/dashboard/import/components/ImportFileDropzone';
import { ImportManualMappingRow } from '@/features/dashboard/import/components/ImportManualMappingRow';
import { ImportPreviewTable } from '@/features/dashboard/import/components/ImportPreviewTable';
import { useAiMapColumns } from '@/features/dashboard/import/hooks/useAiMapColumns';
import { useCancelImportBatch } from '@/features/dashboard/import/hooks/useCancelImportBatch';
import {
  useCommitImportBatch,
  type CommitImportBatchFailure,
} from '@/features/dashboard/import/hooks/useCommitImportBatch';
import { clearImportPreviewCache, useImportBatchRows } from '@/features/dashboard/import/hooks/useImportBatchRows';
import { useImportPreview } from '@/features/dashboard/import/hooks/useImportPreview';
import { useSaveImportMapping } from '@/features/dashboard/import/hooks/useSaveImportMapping';
import { IMPORT_BATCHES_KEY } from '@/features/dashboard/import/hooks/useImportBatches';
import { BOOKINGS_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBookings';
import type {
  AiMapColumnsResult,
  ImportColumnMappingEntry,
} from '@/features/dashboard/import/types/importBatch';
import type { ImportParseResult } from '@/features/dashboard/import/types/importParse';
import type { Property } from '@/features/dashboard/org/types';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

// ── Step types ────────────────────────────────────────────────────────────────

type Step = 'upload' | 'automap' | 'manual' | 'preview' | 'commit';

const STEPS: Step[] = ['upload', 'automap', 'manual', 'preview', 'commit'];

const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload',
  automap: 'Analyze',
  manual: 'Map columns',
  preview: 'Preview',
  commit: 'Import',
};

function stepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

// ── Step progress bar ─────────────────────────────────────────────────────────

function StepProgress({ current }: { current: Step }) {
  const idx = stepIndex(current);
  return (
    <div className="flex items-center gap-1" aria-label={`Step ${idx + 1} of ${STEPS.length}: ${STEP_LABELS[current]}`}>
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i <= idx ? 'bg-primary' : 'bg-muted'
            )}
            aria-hidden
          />
        </React.Fragment>
      ))}
      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
        {idx + 1}/{STEPS.length}
      </span>
    </div>
  );
}

// ── Upload step ───────────────────────────────────────────────────────────────

type UploadStepProps = {
  properties: Property[];
  onParsed: (result: ImportParseResult) => void;
  onViewHistory?: () => void;
};

function UploadStep({ properties, onParsed, onViewHistory }: UploadStepProps) {
  return (
    <div className="space-y-4">
      <ImportFileDropzone properties={properties} onParsed={onParsed} />
      {onViewHistory && (
        <div className="flex justify-center">
          <Button type="button" variant="link" size="sm" className="text-xs" onClick={onViewHistory}>
            View past imports
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Auto-map step ─────────────────────────────────────────────────────────────

type AutoMapStepProps = {
  batchId: string;
  parseResult: ImportParseResult;
  aiResult: AiMapColumnsResult | null;
  isLoading: boolean;
  error: string | null;
  onResult: (result: AiMapColumnsResult) => void;
  onRunMapping: () => void;
};

function AutoMapStep({
  parseResult,
  aiResult,
  isLoading,
  error,
  onRunMapping,
}: AutoMapStepProps) {
  const [matchedExpanded, setMatchedExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!aiResult && !isLoading && !error) {
      onRunMapping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Analyzing columns…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 py-4">
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRunMapping}>
          Retry
        </Button>
      </div>
    );
  }

  if (!aiResult) return null;

  const { summary, columnMapping } = aiResult;
  const matched = columnMapping.mappings.filter((e) => e.status === 'matched');
  const needsReview = columnMapping.mappings.filter((e) => e.status !== 'matched');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <p className="text-xl font-semibold text-primary">{summary.matched}</p>
          <p className="text-xs text-muted-foreground">Auto-matched</p>
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <p className="text-xl font-semibold text-foreground">{summary.needsReview}</p>
          <p className="text-xs text-muted-foreground">Need review</p>
        </div>
      </div>

      {aiResult.degraded && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          AI analysis ran in fallback mode — review suggestions carefully.
        </p>
      )}

      {matched.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMatchedExpanded((p) => !p)}
            aria-expanded={matchedExpanded}
          >
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
              {matched.length} auto-matched columns
            </span>
            {matchedExpanded ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
          </button>
          {matchedExpanded && (
            <ul className="space-y-1 rounded-lg border bg-muted/20 px-3 py-2">
              {matched.map((e) => (
                <li key={e.rawHeader} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground truncate">{e.rawHeader}</span>
                  <span className="shrink-0 font-medium text-foreground">→ {e.suggestedTarget}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {needsReview.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {needsReview.length} column{needsReview.length !== 1 ? 's' : ''} need{needsReview.length === 1 ? 's' : ''} your review in the next step.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {parseResult.rowCount.toLocaleString()} rows · {parseResult.headers.length} columns · {parseResult.headers[0] ? `"${parseResult.headers[0]}"…` : ''}
      </p>
    </div>
  );
}

// ── Manual mapping step ───────────────────────────────────────────────────────

type ManualMappingStepProps = {
  aiResult: AiMapColumnsResult;
  parseResult: ImportParseResult;
  mappingState: Record<string, string | null>;
  onMappingChange: (header: string, target: string | null) => void;
};

function ManualMappingStep({
  aiResult,
  parseResult,
  mappingState,
  onMappingChange,
}: ManualMappingStepProps) {
  const needsReview = aiResult.columnMapping.mappings.filter(
    (e) => e.status !== 'matched'
  );
  const matched = aiResult.columnMapping.mappings.filter((e) => e.status === 'matched');

  const usedTargets = React.useMemo(() => {
    const used = new Set<string>();
    for (const [, target] of Object.entries(mappingState)) {
      if (target) used.add(target);
    }
    // Also add matched ones
    for (const e of matched) {
      if (e.suggestedTarget) used.add(e.suggestedTarget);
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
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CheckCircle2 className="size-8 text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">All columns matched automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Review and confirm mappings for {needsReview.length} column{needsReview.length !== 1 ? 's' : ''}.
      </p>
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

// ── Commit step ───────────────────────────────────────────────────────────────

type CommitStepProps = {
  validCount: number;
  isCommitting: boolean;
  error: string | null;
  failedRows: CommitImportBatchFailure[];
};

function CommitStep({ validCount, isCommitting, error, failedRows }: CommitStepProps) {
  const visibleFailures = failedRows.slice(0, 5);

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      {isCommitting ? (
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      ) : error ? (
        <AlertTriangle className="size-8 text-destructive" aria-hidden />
      ) : (
        <CheckCircle2 className="size-8 text-primary" aria-hidden />
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {isCommitting
            ? 'Importing…'
            : `Ready to import ${validCount.toLocaleString()} booking${validCount !== 1 ? 's' : ''}`}
        </p>
        {!isCommitting && !error && (
          <p className="text-xs text-muted-foreground">
            Historical bookings will be created with status Imported and will not trigger emails or calendar events.
          </p>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {visibleFailures.length > 0 && (
        <ul className="w-full max-w-sm space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs text-destructive">
          {visibleFailures.map((row) => (
            <li key={row.rowIndex}>
              Row {row.rowIndex + 1}: {row.reason}
            </li>
          ))}
          {failedRows.length > visibleFailures.length && (
            <li className="text-muted-foreground">
              +{failedRows.length - visibleFailures.length} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Wizard modal ──────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties?: Property[];
  onViewHistory?: () => void;
};

export function ImportWizardModal({ open, onOpenChange, properties = [], onViewHistory }: Props) {
  const [step, setStep] = React.useState<Step>('upload');
  const [parseResult, setParseResult] = React.useState<ImportParseResult | null>(null);
  const [aiResult, setAiResult] = React.useState<AiMapColumnsResult | null>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [mappingState, setMappingState] = React.useState<Record<string, string | null>>({});
  // True only after import-commit returns status=committed. Guards cancel-on-close.
  const [isBatchCommitted, setIsBatchCommitted] = React.useState(false);
  const [commitResultError, setCommitResultError] = React.useState<string | null>(null);
  const [commitFailures, setCommitFailures] = React.useState<CommitImportBatchFailure[]>([]);
  const [previewRunKey, setPreviewRunKey] = React.useState(0);

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

  // Reset wizard state when modal opens.
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
      previewMutation.reset();
      commitMutation.reset();
    }
    // commitMutation excluded from deps — reset() is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, previewMutation]);

  const invalidatePreviewCache = React.useCallback(
    (batchId: string) => {
      clearImportPreviewCache(queryClient, propertyId ?? undefined, batchId);
      previewMutation.reset();
      setPreviewRunKey((key) => key + 1);
    },
    [queryClient, propertyId, previewMutation]
  );

  const handleParsed = (result: ImportParseResult) => {
    setParseResult(result);
    setStep('automap');
  };

  const handleRunAiMapping = async () => {
    if (!parseResult) return;
    setAiError(null);
    try {
      const result = await aiMapMutation.mutateAsync(parseResult.batchId);
      setAiResult(result);

      // Pre-fill only likely_matched — ambiguous/unmatched start blank (null).
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
    setMappingState((prev) => ({ ...prev, [header]: target }));
  };

  const handleCancelBatch = async () => {
    if (parseResult?.batchId) {
      try {
        await cancelMutation.mutateAsync(parseResult.batchId);
      } catch {
        // Best effort — close anyway.
      }
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    // Only skip cancel-delete when the batch has been truly committed via API.
    // step === 'commit' alone is a placeholder and does NOT mean committed.
    if (parseResult?.batchId && !isBatchCommitted) {
      void handleCancelBatch();
    } else {
      onOpenChange(false);
    }
  };

  const handleContinueFromAutomap = () => {
    if (!aiResult || !parseResult) return;
    const hasReview = aiResult.columnMapping.mappings.some((e) => e.status !== 'matched');
    if (hasReview) {
      setStep('manual');
    } else {
      invalidatePreviewCache(parseResult.batchId);
      setStep('preview');
    }
  };

  const handleContinueFromManual = async () => {
    if (!parseResult || !aiResult) return;

    // Build final mapping: matched entries keep AI target, others use mappingState.
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
      // Error shown in footer.
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

  const handleContinueFromPreview = () => {
    setStep('commit');
  };

  const handleCommit = async () => {
    if (!parseResult?.batchId || commitMutation.isPending) return;
    setCommitResultError(null);
    setCommitFailures([]);
    try {
      const data = await commitMutation.mutateAsync(parseResult.batchId);

      if (data.status === 'committed') {
        setIsBatchCommitted(true);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: [...IMPORT_BATCHES_KEY] }),
        ]);
        onOpenChange(false);
        return;
      }

      if (data.status === 'failed') {
        setCommitResultError(
          data.failed.length > 0
            ? `${data.failed.length} row(s) failed to import`
            : 'Import failed — no rows were inserted'
        );
        setCommitFailures(data.failed);
        return;
      }

      setCommitResultError('No valid rows to import');
    } catch (err) {
      console.error('[ImportWizardModal] commit failed:', err);
    }
  };

  const commitError =
    commitMutation.isError
      ? (commitMutation.error as Error).message
      : commitResultError;

  const isBusy =
    aiMapMutation.isPending ||
    saveMappingMutation.isPending ||
    previewMutation.isPending ||
    cancelMutation.isPending ||
    commitMutation.isPending;

  const title = `Import bookings — ${STEP_LABELS[step]}`;

  return (
    <ResponsiveModal open={open} onOpenChange={handleClose}>
      <ResponsiveModalContent
        className={cn('sm:max-w-lg', step === 'preview' && 'sm:max-w-2xl')}
        sheetLayout="split"
        showCloseButton={false}
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1 space-y-2">
            <ResponsiveModalTitle className="text-base font-semibold">
              Import bookings
            </ResponsiveModalTitle>
            <StepProgress current={step} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 mt-0.5"
            aria-label="Close"
            disabled={isBusy}
            onClick={handleClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ResponsiveModalDescription className="sr-only">{title}</ResponsiveModalDescription>

          {step === 'upload' && (
            <UploadStep
              properties={properties}
              onParsed={handleParsed}
              onViewHistory={onViewHistory}
            />
          )}

          {step === 'automap' && parseResult && (
            <AutoMapStep
              batchId={parseResult.batchId}
              parseResult={parseResult}
              aiResult={aiResult}
              isLoading={aiMapMutation.isPending}
              error={aiError}
              onResult={setAiResult}
              onRunMapping={() => void handleRunAiMapping()}
            />
          )}

          {step === 'manual' && parseResult && aiResult && (
            <ManualMappingStep
              aiResult={aiResult}
              parseResult={parseResult}
              mappingState={mappingState}
              onMappingChange={handleMappingChange}
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
              isCommitting={commitMutation.isPending}
              error={commitError}
              failedRows={commitFailures}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 pb-4 pt-3">
          {saveMappingMutation.isError && (
            <p className="mb-2 text-xs text-destructive">
              {(saveMappingMutation.error as Error).message}
            </p>
          )}

          {previewMutation.isError && step === 'preview' && (
            <p className="mb-2 text-xs text-destructive">
              {(previewMutation.error as Error).message}
            </p>
          )}

          {commitError && step === 'commit' && (
            <p className="mb-2 text-xs text-destructive">{commitError}</p>
          )}

          <ResponsiveModalFooter className="pt-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={handleClose}
            >
              Cancel
            </Button>

            {step === 'automap' && aiResult && !aiMapMutation.isPending && (
              <Button
                type="button"
                size="sm"
                onClick={handleContinueFromAutomap}
                disabled={isBusy}
              >
                Continue
              </Button>
            )}

            {step === 'manual' && (
              <Button
                type="button"
                size="sm"
                disabled={isBusy}
                onClick={() => void handleContinueFromManual()}
              >
                {saveMappingMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            )}

            {step === 'preview' && previewReady && !previewMutation.isPending && (
              <Button
                type="button"
                size="sm"
                disabled={isBusy || previewSummary.valid === 0}
                onClick={handleContinueFromPreview}
              >
                Continue
              </Button>
            )}

            {step === 'commit' && (
              <Button
                type="button"
                size="sm"
                disabled={isBusy || previewSummary.valid === 0}
                onClick={() => void handleCommit()}
              >
                {commitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                    Importing…
                  </>
                ) : (
                  'Import'
                )}
              </Button>
            )}
          </ResponsiveModalFooter>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
