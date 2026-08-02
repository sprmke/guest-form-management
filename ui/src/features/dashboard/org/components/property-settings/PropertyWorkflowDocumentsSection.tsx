import { ChevronDown, ChevronUp, FileCheck2, Plus, Trash2 } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import type {
  AppSettingsDto,
  AppSettingsFormValues,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import type {
  DocumentApprovalSource,
  DocumentRequirement,
  DocumentTriggerCondition,
} from '@/features/dashboard/bookings/lib/documentRequirements';
import {
  addDocumentRequirement,
  DOCUMENT_APPROVAL_SOURCE_LABELS,
  DOCUMENT_APPROVAL_SOURCES,
  DOCUMENT_TRIGGER_CONDITION_LABELS,
  DOCUMENT_TRIGGER_CONDITIONS,
  moveDocumentRequirement,
  removeDocumentRequirement,
  updateDocumentRequirement,
} from '@/features/dashboard/org/lib/propertyDocumentRequirements';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type DocumentOverrideMode = 'default' | 'custom';

function overrideMode(override: DocumentRequirement[] | null): DocumentOverrideMode {
  return override === null ? 'default' : 'custom';
}

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

function OrderBadge({ index }: { index: number }) {
  return (
    <span
      className="text-muted-foreground bg-background mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      aria-hidden
    >
      {index + 1}
    </span>
  );
}

function DocumentRequirementReadRow({
  requirement,
  index,
}: {
  requirement: DocumentRequirement;
  index: number;
}) {
  return (
    <div className="border-border/40 bg-muted/15 flex items-start gap-3 rounded-lg border px-3 py-2.5">
      <OrderBadge index={index} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-foreground text-sm font-medium leading-snug">{requirement.label}</p>
        <p className="text-xs leading-snug">
          <span className="text-foreground/90 font-medium">Trigger:</span>{' '}
          <span className="text-muted-foreground">
            {DOCUMENT_TRIGGER_CONDITION_LABELS[requirement.triggerCondition]}
          </span>
        </p>
        <p className="text-xs leading-snug">
          <span className="text-foreground/90 font-medium">Approval:</span>{' '}
          <span className="text-muted-foreground">
            {DOCUMENT_APPROVAL_SOURCE_LABELS[requirement.approvalSource]}
          </span>
        </p>
      </div>
    </div>
  );
}

function RowActionButton({
  label,
  disabled,
  variant = 'default',
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'destructive'
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function DocumentRequirementEditRow({
  requirement,
  index,
  total,
  disabled,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  requirement: DocumentRequirement;
  index: number;
  total: number;
  disabled?: boolean;
  onChange: (patch: Partial<DocumentRequirement>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const rowId = `document-requirement-${index}`;

  return (
    <div className="border-border/40 bg-muted/15 space-y-3 rounded-lg border px-3 py-3">
      <div className="flex items-start gap-2">
        <OrderBadge index={index} />
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${rowId}-label`} className="sr-only">
            Document label
          </Label>
          <Input
            id={`${rowId}-label`}
            value={requirement.label}
            disabled={disabled}
            placeholder="e.g. GAF Request"
            onChange={(event) => onChange({ label: event.target.value })}
            className="h-10"
          />
        </div>
        <div className="flex shrink-0 gap-0.5">
          <RowActionButton label="Move up" disabled={disabled || index === 0} onClick={onMoveUp}>
            <ChevronUp className="size-4" aria-hidden />
          </RowActionButton>
          <RowActionButton
            label="Move down"
            disabled={disabled || index === total - 1}
            onClick={onMoveDown}
          >
            <ChevronDown className="size-4" aria-hidden />
          </RowActionButton>
          <RowActionButton
            label="Remove document"
            variant="destructive"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 className="size-4" aria-hidden />
          </RowActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${rowId}-trigger`} className="text-muted-foreground text-xs">
            Trigger
          </Label>
          <Select
            value={requirement.triggerCondition}
            onValueChange={(value) =>
              onChange({ triggerCondition: value as DocumentTriggerCondition })
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${rowId}-trigger`} className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TRIGGER_CONDITIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {DOCUMENT_TRIGGER_CONDITION_LABELS[condition]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${rowId}-approval`} className="text-muted-foreground text-xs">
            Approval source
          </Label>
          <Select
            value={requirement.approvalSource}
            onValueChange={(value) => onChange({ approvalSource: value as DocumentApprovalSource })}
            disabled={disabled}
          >
            <SelectTrigger id={`${rowId}-approval`} className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_APPROVAL_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {DOCUMENT_APPROVAL_SOURCE_LABELS[source]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function PropertyWorkflowDocumentsSection({
  data,
  draft,
  disabled = false,
  onChange,
}: {
  data: AppSettingsDto;
  draft: AppSettingsFormValues;
  disabled?: boolean;
  onChange: <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K]
  ) => void;
}) {
  const mode = overrideMode(draft.documentRequirementsOverride);
  const customList = draft.documentRequirementsOverride ?? [];

  const setMode = (next: DocumentOverrideMode) => {
    if (next === 'default') {
      onChange('documentRequirementsOverride', null);
    } else {
      onChange(
        'documentRequirementsOverride',
        data.resolvedDocumentRequirements.map((req) => ({ ...req }))
      );
    }
  };

  const setCustomList = (next: DocumentRequirement[]) => {
    onChange('documentRequirementsOverride', next);
  };

  return (
    <AdminSection
      id="workflow-documents"
      title="Workflow documents"
      icon={FileCheck2}
      description="Documents required before a booking reaches Ready for check-in, and which platforms stay in sync."
    >
      <div className="space-y-6">
        <div className="space-y-2.5">
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Sync</p>
          <div className="space-y-2">
            <SyncToggleRow
              id="sync-calendar"
              label="Sync Google Calendar"
              description="Keep this property's Calendar events updated on every workflow transition."
              checked={draft.syncCalendar}
              disabled={disabled}
              onCheckedChange={(value) => onChange('syncCalendar', value)}
            />
            <SyncToggleRow
              id="sync-sheets"
              label="Sync Google Sheets"
              description="Keep this property's Sheet row updated on every workflow transition."
              checked={draft.syncSheets}
              disabled={disabled}
              onCheckedChange={(value) => onChange('syncSheets', value)}
            />
          </div>
        </div>

        <div className="border-border/50 border-t" role="presentation" />

        <div className="space-y-3">
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
            Document requirements
          </p>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as DocumentOverrideMode)}
            disabled={disabled}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            <label
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                mode === 'default'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/30',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <RadioGroupItem value="default" disabled={disabled} />
              <span className="text-sm font-medium">Use residence default</span>
            </label>
            <label
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                mode === 'custom'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/30',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <RadioGroupItem value="custom" disabled={disabled} />
              <span className="text-sm font-medium">Custom list</span>
            </label>
          </RadioGroup>

          {mode === 'default' ? (
            <div className="space-y-2">
              {data.resolvedDocumentRequirements.map((requirement, index) => (
                <DocumentRequirementReadRow
                  key={requirement.id}
                  requirement={requirement}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {customList.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm">
                  No documents required — bookings for this property skip straight to Ready for
                  check-in.
                </p>
              ) : (
                customList.map((requirement, index) => (
                  <DocumentRequirementEditRow
                    key={requirement.id}
                    requirement={requirement}
                    index={index}
                    total={customList.length}
                    disabled={disabled}
                    onChange={(patch) =>
                      setCustomList(updateDocumentRequirement(customList, index, patch))
                    }
                    onMoveUp={() => setCustomList(moveDocumentRequirement(customList, index, -1))}
                    onMoveDown={() => setCustomList(moveDocumentRequirement(customList, index, 1))}
                    onRemove={() => setCustomList(removeDocumentRequirement(customList, index))}
                  />
                ))
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => setCustomList(addDocumentRequirement(customList))}
                className="border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="size-4" aria-hidden />
                Add document
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminSection>
  );
}
