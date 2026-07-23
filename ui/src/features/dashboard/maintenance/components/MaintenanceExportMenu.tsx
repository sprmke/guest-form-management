import { useState } from 'react';

import { ChevronDown, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  fetchMaintenanceItems,
  fetchMaintenanceSummary,
} from '@/features/dashboard/maintenance/hooks/useMaintenanceApi';
import { downloadMaintenanceReportPdf } from '@/features/dashboard/maintenance/lib/exportPdf';
import type {
  MaintenanceExportType,
  MaintenanceItem,
  MaintenanceQuery,
  MaintenanceSummary,
} from '@/features/dashboard/maintenance/lib/types';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

const FULL_REPORT = { type: 'combined' as const, label: 'Full report' };

const SECTION_OPTIONS: { type: MaintenanceExportType; label: string }[] = [
  { type: 'overview', label: 'Overview summary' },
  { type: 'reminders', label: 'Reminders list' },
];

const menuItemClass =
  'flex w-full min-h-[44px] items-center px-3.5 py-2 text-left text-[13px] font-medium text-foreground/80 transition-colors hover:bg-muted/50 disabled:opacity-60';

const outlineBtnClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-card px-2.5 py-2 text-[13px] font-semibold text-foreground transition-all duration-100 hover:border-primary/40 hover:bg-muted/60 disabled:opacity-60';

type Props = {
  query: MaintenanceQuery;
  summary?: MaintenanceSummary;
  items?: MaintenanceItem[];
};

export function MaintenanceExportMenu({
  query,
  summary: cachedSummary,
  items: cachedItems,
}: Props) {
  const propertyId = usePropertyIdParam();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState<MaintenanceExportType | null>(null);

  async function handlePdfExport(type: MaintenanceExportType) {
    setLoading(type);
    setMenuOpen(false);
    try {
      const needsItems = type === 'reminders' || type === 'combined';

      const [summary, items] = await Promise.all([
        cachedSummary ?? fetchMaintenanceSummary(query, propertyId),
        needsItems
          ? (cachedItems ?? fetchMaintenanceItems(query, { includeDueInRange: true }, propertyId))
          : Promise.resolve([]),
      ]);

      await downloadMaintenanceReportPdf({ query, summary, items }, type);
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error(friendlyToastError(e, 'PDF export failed'));
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
          menuOpen && 'interactive-primary border-border'
        )}
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Export report"
      >
        {busy ? (
          <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden />
        )}
        <span className="hidden sm:inline">Export report</span>
        <span className="sm:hidden">Report</span>
        <ChevronDown
          className={cn(
            'text-muted-foreground size-3.5 shrink-0 transition-transform duration-150',
            menuOpen && 'rotate-180'
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
            className="border-border/50 bg-popover shadow-elevated-lg dark:border-border/20 absolute right-0 z-50 mt-1.5 w-max min-w-[11.5rem] max-w-[min(calc(100vw-24px),13rem)] overflow-hidden rounded-xl border"
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

            <div className="border-separator border-b" role="separator" />

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
