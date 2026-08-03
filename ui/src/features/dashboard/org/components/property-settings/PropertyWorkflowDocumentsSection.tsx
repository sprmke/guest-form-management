import { FileCheck2 } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import type { AppSettingsFormValues } from '@/features/dashboard/bookings/hooks/useAppSettings';

import { cn } from '@/lib/utils';

function SyncToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-border/40 bg-muted/15 flex min-h-[44px] items-start justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={id} className="text-foreground text-sm font-medium leading-snug">
          {label}
        </label>
        <p className="text-muted-foreground text-xs leading-snug">{description}</p>
      </div>
      <div className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center">
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors',
            'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            checked ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'bg-background pointer-events-none block size-5 rounded-full shadow-sm transition-transform',
              checked ? 'translate-x-[18px]' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>
    </div>
  );
}

export function PropertyWorkflowDocumentsSection({
  draft,
  disabled = false,
  onChange,
}: {
  draft: AppSettingsFormValues;
  disabled?: boolean;
  onChange: <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K]
  ) => void;
}) {
  return (
    <AdminSection
      id="workflow-documents"
      title="Booking Workflow"
      icon={FileCheck2}
      description="Calendar and Sheets sync when booking status changes."
    >
      <div className="space-y-2">
        <SyncToggleRow
          id="sync-calendar"
          label="Sync Google Calendar"
          description="Update Calendar on each status change."
          checked={draft.syncCalendar}
          disabled={disabled}
          onCheckedChange={(value) => onChange('syncCalendar', value)}
        />
        <SyncToggleRow
          id="sync-sheets"
          label="Sync Google Sheets"
          description="Update the Sheet row on each status change."
          checked={draft.syncSheets}
          disabled={disabled}
          onCheckedChange={(value) => onChange('syncSheets', value)}
        />
      </div>
    </AdminSection>
  );
}
