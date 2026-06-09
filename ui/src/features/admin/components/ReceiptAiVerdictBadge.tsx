import { cn } from '@/lib/utils';

export type ReceiptAiVerdict =
  | 'valid'
  | 'likely_valid'
  | 'unclear'
  | 'invalid'
  | 'skipped'
  | string
  | null
  | undefined;

export function formatReceiptAiVerdictLabel(verdict: ReceiptAiVerdict): string {
  switch (String(verdict ?? '').toLowerCase()) {
    case 'valid':
      return 'Valid';
    case 'likely_valid':
      return 'Likely valid';
    case 'unclear':
      return 'Unclear';
    case 'invalid':
      return 'Invalid';
    case 'skipped':
      return 'Not checked';
    default:
      return verdict ? String(verdict) : 'Unknown';
  }
}

export function receiptAiVerdictBlocksAdmin(verdict: ReceiptAiVerdict): boolean {
  return String(verdict ?? '').toLowerCase() === 'invalid';
}

function verdictStyles(verdict: ReceiptAiVerdict): string {
  const v = String(verdict ?? '').toLowerCase();
  if (v === 'valid' || v === 'likely_valid') {
    return 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30';
  }
  if (v === 'invalid') {
    return 'bg-red-50 text-red-900 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30';
  }
  return 'bg-amber-50 text-amber-950 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30';
}

type Props = {
  verdict: ReceiptAiVerdict;
  summary?: string | null;
  className?: string;
  compact?: boolean;
};

export function ReceiptAiVerdictBadge({
  verdict,
  summary,
  className,
  compact = false,
}: Props) {
  if (!verdict) return null;

  return (
    <div className={cn('space-y-1', className)}>
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
          verdictStyles(verdict),
        )}
      >
        AI: {formatReceiptAiVerdictLabel(verdict)}
      </span>
      {!compact && summary?.trim() ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{summary.trim()}</p>
      ) : null}
    </div>
  );
}
