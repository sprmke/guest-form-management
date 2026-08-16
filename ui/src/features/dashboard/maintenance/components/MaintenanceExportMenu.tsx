import { useState, type ComponentType } from 'react';

import { FileText, Loader2, MoreHorizontal, Plus } from 'lucide-react';
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

import { MobileChoiceItem, MobileChoiceSheet } from '@/components/mobile/MobileChoiceSheet';
import { MobileHeroActionButton } from '@/components/mobile/MobileHeroActionButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

const FULL_REPORT = { type: 'combined' as const, label: 'Full report' };

const SECTION_OPTIONS: { type: MaintenanceExportType; label: string }[] = [
  { type: 'overview', label: 'Overview summary' },
  { type: 'reminders', label: 'Reminders list' },
];

const outlineBtnClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-card px-2.5 py-2 text-[13px] font-semibold text-foreground transition-all duration-100 hover:border-primary/40 hover:bg-muted/60 disabled:opacity-60';

export type MaintenanceExportLeadingAction = {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
};

type Props = {
  query: MaintenanceQuery;
  summary?: MaintenanceSummary;
  items?: MaintenanceItem[];
  variant?: 'default' | 'hero';
  leadingActions?: MaintenanceExportLeadingAction[];
};

export function MaintenanceExportMenu({
  query,
  summary: cachedSummary,
  items: cachedItems,
  variant = 'default',
  leadingActions = [],
}: Props) {
  const propertyId = usePropertyIdParam();
  const [loading, setLoading] = useState<MaintenanceExportType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  async function handlePdfExport(type: MaintenanceExportType) {
    setLoading(type);
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
  const exportItems = [FULL_REPORT, ...SECTION_OPTIONS];

  if (variant === 'hero') {
    const hasLeading = leadingActions.length > 0;
    const TriggerIcon = busy ? Loader2 : hasLeading ? MoreHorizontal : FileText;
    const sheetTitle = hasLeading ? 'Maintenance actions' : 'Export report';

    return (
      <>
        <MobileHeroActionButton
          aria-label={sheetTitle}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          disabled={busy}
          onClick={() => setSheetOpen(true)}
        >
          <TriggerIcon className={cn('size-5', busy && 'animate-spin')} aria-hidden />
        </MobileHeroActionButton>
        <MobileChoiceSheet open={sheetOpen} onOpenChange={setSheetOpen} title={sheetTitle}>
          <div role="listbox" aria-label={sheetTitle}>
            {leadingActions.map((action) => {
              const Icon = action.Icon;
              return (
                <MobileChoiceItem
                  key={action.key}
                  label={action.label}
                  disabled={busy}
                  icon={<Icon className="size-5" aria-hidden />}
                  onSelect={() => {
                    action.onSelect();
                    setSheetOpen(false);
                  }}
                />
              );
            })}
            {hasLeading ? <div className="border-border/60 my-1.5 border-t" aria-hidden /> : null}
            {exportItems.map((opt) => (
              <MobileChoiceItem
                key={opt.type}
                label={loading === opt.type ? 'Preparing…' : opt.label}
                disabled={busy}
                icon={<FileText className="size-5" aria-hidden />}
                onSelect={() => {
                  void handlePdfExport(opt.type);
                  setSheetOpen(false);
                }}
              />
            ))}
          </div>
        </MobileChoiceSheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          className={cn(outlineBtnClass, 'gap-1.5 px-3')}
          aria-label="Export report"
        >
          {busy ? (
            <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden />
          )}
          <span className="hidden sm:inline">Export report</span>
          <span className="sm:hidden">Report</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {exportItems.map((opt) => (
          <DropdownMenuItem
            key={opt.type}
            disabled={busy}
            onSelect={() => void handlePdfExport(opt.type)}
            className="min-h-[44px] gap-2"
          >
            <FileText className="size-4 shrink-0" aria-hidden />
            {loading === opt.type ? 'Preparing…' : opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function maintenanceAddReminderAction(onSelect: () => void): MaintenanceExportLeadingAction {
  return { key: 'add', label: 'Add reminder', Icon: Plus, onSelect };
}
