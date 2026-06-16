import { useState } from 'react';
import { ChevronDown, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  FinanceExportType,
  FinanceLineItem,
  FinanceQuery,
  FinanceSummary,
} from '@/features/finance/lib/types';
import {
  fetchAllFinanceBookings,
  fetchFinanceLineItems,
  fetchFinanceSummary,
} from '@/features/finance/hooks/useFinanceApi';
import { downloadFinanceReportPdf } from '@/features/finance/lib/exportPdf';

const FULL_REPORT = { type: 'combined' as const, label: 'Full report' };

const SECTION_OPTIONS: { type: FinanceExportType; label: string }[] = [
  { type: 'overview', label: 'Overview summary' },
  { type: 'stays', label: 'Stays ledger' },
  { type: 'operating', label: 'Transactions' },
];

const menuItemClass =
  'flex w-full min-h-[44px] items-center px-3.5 py-2 text-left text-[13px] font-medium text-foreground/80 transition-colors hover:bg-muted/50 disabled:opacity-60';

/** Matches BookingFilters FilterBtn density (rounded-lg, 13px, 44px touch). */
const outlineBtnClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-card px-2.5 py-2 text-[13px] font-semibold text-foreground transition-all duration-100 hover:border-primary/40 hover:bg-muted/60 disabled:opacity-60';

type Props = {
  query: FinanceQuery;
  summary?: FinanceSummary;
  operating?: FinanceLineItem[];
};

export function FinanceExportMenu({
  query,
  summary: cachedSummary,
  operating: cachedOperating,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState<FinanceExportType | null>(null);

  async function handlePdfExport(type: FinanceExportType) {
    setLoading(type);
    setMenuOpen(false);
    try {
      const needsStays = type === 'stays' || type === 'combined';
      const needsOperating = type === 'operating' || type === 'combined';

      const [summary, stays, operating] = await Promise.all([
        cachedSummary ?? fetchFinanceSummary(query),
        needsStays ? fetchAllFinanceBookings(query) : Promise.resolve([]),
        needsOperating
          ? (cachedOperating ?? fetchFinanceLineItems(query))
          : Promise.resolve([]),
      ]);

      await downloadFinanceReportPdf({ query, summary, stays, operating }, type);
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PDF export failed');
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={busy}
        className={cn(
          outlineBtnClass,
          'gap-1.5 px-3',
          menuOpen && 'border-primary/40 bg-muted/60',
        )}
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Export report"
      >
        {busy ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="hidden sm:inline">Export report</span>
        <span className="sm:hidden">Report</span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground transition-transform duration-150',
            menuOpen && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close export menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1.5 min-w-[11.5rem] w-max max-w-[min(calc(100vw-24px),13rem)] overflow-hidden rounded-xl border border-border/50 bg-popover shadow-elevated-lg dark:border-border/20"
          >
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              className={cn(menuItemClass, loading === FULL_REPORT.type && 'bg-muted/50')}
              onClick={() => void handlePdfExport(FULL_REPORT.type)}
            >
              {FULL_REPORT.label}
            </button>

            <div className="border-b border-separator" role="separator" />

            <div className="py-0.5">
              {SECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className={cn(menuItemClass, loading === opt.type && 'bg-muted/50')}
                  onClick={() => void handlePdfExport(opt.type)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
