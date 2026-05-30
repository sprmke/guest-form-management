import { useState } from 'react';
import { ChevronDown, FileText, Loader2, Sheet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  FinanceExportType,
  FinanceLineItem,
  FinanceQuery,
  FinanceSummary,
} from '@/features/finance/lib/types';
import {
  downloadFinanceExport,
  fetchAllFinanceBookings,
  fetchFinanceLineItems,
  fetchFinanceSummary,
} from '@/features/finance/hooks/useFinanceApi';
import { downloadCsvBlob } from '@/features/finance/lib/exportCsv';
import { downloadFinanceReportPdf } from '@/features/finance/lib/exportPdf';

const CSV_OPTIONS: { type: FinanceExportType; label: string }[] = [
  { type: 'overview', label: 'Overview summary' },
  { type: 'stays', label: 'Stays ledger' },
  { type: 'operating', label: 'Operating lines' },
  { type: 'combined', label: 'Combined (all sections)' },
];

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
  const [csvOpen, setCsvOpen] = useState(false);
  const [loading, setLoading] = useState<'pdf' | FinanceExportType | null>(null);

  async function handlePdfExport() {
    setLoading('pdf');
    setCsvOpen(false);
    try {
      const [summary, stays, operating] = await Promise.all([
        cachedSummary ?? fetchFinanceSummary(query),
        fetchAllFinanceBookings(query),
        cachedOperating ?? fetchFinanceLineItems(query),
      ]);
      downloadFinanceReportPdf({ query, summary, stays, operating });
      toast.success('Finance report downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Report export failed');
    } finally {
      setLoading(null);
    }
  }

  async function handleCsvExport(type: FinanceExportType) {
    setLoading(type);
    setCsvOpen(false);
    try {
      const { blob, filename } = await downloadFinanceExport(query, type);
      downloadCsvBlob(blob, filename);
      toast.success('CSV downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'CSV export failed');
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div className="relative inline-flex">
      {/* Primary action — PDF report */}
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-l-lg border border-r-0 border-slate-200 bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:opacity-60"
        onClick={() => void handlePdfExport()}
      >
        {loading === 'pdf' ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <FileText className="size-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Export report</span>
        <span className="sm:hidden">Report</span>
      </button>

      {/* Secondary — CSV formats */}
      <div className="relative">
        <button
          type="button"
          disabled={busy}
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60',
            csvOpen && 'bg-slate-50',
          )}
          onClick={() => setCsvOpen((v) => !v)}
          aria-expanded={csvOpen}
          aria-haspopup="menu"
          aria-label="Export as CSV"
        >
          {loading && loading !== 'pdf' ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </button>

        {csvOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Close CSV menu"
              onClick={() => setCsvOpen(false)}
            />
            <div
              role="menu"
              className="absolute right-0 z-50 mt-1.5 w-[min(calc(100vw-24px),15rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Spreadsheet (CSV)
                </p>
              </div>
              {CSV_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  onClick={() => void handleCsvExport(opt.type)}
                >
                  <Sheet className="size-4 shrink-0 text-slate-400" aria-hidden />
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
