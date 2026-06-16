import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
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

type NoticeCopy = {
  title: string;
  detail?: string;
};

export type DocumentAiVerdictVariant = 'receipt' | 'valid_id';

function noticeCopy(
  verdict: ReceiptAiVerdict,
  summary?: string | null,
  variant: DocumentAiVerdictVariant = 'receipt',
): NoticeCopy | null {
  const v = String(verdict ?? '').toLowerCase();
  if (variant === 'valid_id') {
    switch (v) {
      case 'valid':
        return {
          title: 'Looks like a government ID',
          detail: summary?.trim() || undefined,
        };
      case 'likely_valid':
        return {
          title: 'Probably a valid ID',
          detail:
            summary?.trim() ||
            'Some details were hard to read — review if unsure.',
        };
      case 'unclear':
        return {
          title: "Couldn't verify this ID",
          detail: 'Review it yourself or upload a clearer photo or PDF.',
        };
      case 'invalid':
        return {
          title: "Doesn't look like a valid ID",
          detail:
            'Upload a clear photo or scan of a government-issued photo ID.',
        };
      case 'skipped':
        return null;
      default:
        return null;
    }
  }
  switch (v) {
    case 'valid':
      return {
        title: 'Looks like payment proof',
        detail: summary?.trim() || undefined,
      };
    case 'likely_valid':
      return {
        title: 'Probably payment proof',
        detail:
          summary?.trim() ||
          'Some details were hard to read — review if unsure.',
      };
    case 'unclear':
      return {
        title: "Couldn't verify this image",
        detail:
          'Review it yourself or upload a clearer screenshot or cash photo.',
      };
    case 'invalid':
      return {
        title: "Doesn't look like payment proof",
        detail:
          'Upload a GCash/Maya/bank transfer screenshot or a clear photo of the cash paid.',
      };
    case 'skipped':
      return null;
    default:
      return null;
  }
}

function compactBadgeClass(verdict: ReceiptAiVerdict): string {
  const v = String(verdict ?? '').toLowerCase();
  if (v === 'valid' || v === 'likely_valid') {
    return 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30';
  }
  if (v === 'invalid') {
    return 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30';
  }
  return 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30';
}

function cardClass(verdict: ReceiptAiVerdict): string {
  const v = String(verdict ?? '').toLowerCase();
  if (v === 'valid' || v === 'likely_valid') {
    return 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-500/10';
  }
  if (v === 'invalid') {
    return 'border-red-200/80 bg-red-50/60 dark:border-red-500/25 dark:bg-red-500/10';
  }
  return 'border-amber-200/80 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/10';
}

function NoticeIcon({ verdict }: { verdict: ReceiptAiVerdict }) {
  const v = String(verdict ?? '').toLowerCase();
  const className = 'size-4 shrink-0 mt-0.5';
  if (v === 'valid' || v === 'likely_valid') {
    return <CheckCircle2 className={cn(className, 'text-emerald-600 dark:text-emerald-400')} aria-hidden />;
  }
  if (v === 'invalid') {
    return <XCircle className={cn(className, 'text-red-600 dark:text-red-400')} aria-hidden />;
  }
  if (v === 'unclear') {
    return <HelpCircle className={cn(className, 'text-amber-600 dark:text-amber-400')} aria-hidden />;
  }
  return <AlertTriangle className={cn(className, 'text-amber-600 dark:text-amber-400')} aria-hidden />;
}

type Props = {
  verdict: ReceiptAiVerdict;
  summary?: string | null;
  className?: string;
  /** Pricing card: small pill only */
  compact?: boolean;
  variant?: DocumentAiVerdictVariant;
};

export function ReceiptAiVerdictBadge({
  verdict,
  summary,
  className,
  compact = false,
  variant = 'receipt',
}: Props) {
  if (!verdict || String(verdict).toLowerCase() === 'skipped') return null;

  const copy = noticeCopy(verdict, summary, variant);
  if (!copy) return null;

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
          compactBadgeClass(verdict),
          className,
        )}
      >
        AI: {formatReceiptAiVerdictLabel(verdict)}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2 rounded-lg border px-3 py-2.5',
        cardClass(verdict),
        className,
      )}
      role="status"
    >
      <NoticeIcon verdict={verdict} />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium leading-snug text-foreground">
          {copy.title}
        </p>
        {copy.detail ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {copy.detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Short toast after upload — keeps forms consistent. */
export function receiptAiUploadToastMessage(
  verdict: string | null | undefined,
  aiModelError?: string | null,
  variant: DocumentAiVerdictVariant = 'receipt',
): { type: 'success' | 'warning' | 'error'; message: string; description?: string } | null {
  if (aiModelError?.trim()) {
    return {
      type: 'error',
      message: variant === 'valid_id'
        ? 'AI could not check this ID'
        : 'AI could not check this receipt',
      description: aiModelError.trim(),
    };
  }
  if (variant === 'valid_id') {
    switch (String(verdict ?? '').toLowerCase()) {
      case 'invalid':
        return {
          type: 'error',
          message: "That image doesn't look like a valid ID",
        };
      case 'unclear':
        return {
          type: 'warning',
          message: "Couldn't verify the ID — please review",
        };
      case 'valid':
      case 'likely_valid':
        return { type: 'success', message: 'Valid ID uploaded' };
      default:
        return null;
    }
  }
  switch (String(verdict ?? '').toLowerCase()) {
    case 'invalid':
      return {
        type: 'error',
        message: "That image doesn't look like payment proof",
      };
    case 'unclear':
      return {
        type: 'warning',
        message: "Couldn't verify the receipt — please review",
      };
    case 'valid':
    case 'likely_valid':
      return { type: 'success', message: 'Receipt uploaded' };
    default:
      return null;
  }
}
