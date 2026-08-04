import {
  ChevronRight,
} from 'lucide-react';

import {
  OPTIONAL_TARGET_FIELDS,
  REQUIRED_TARGET_FIELDS,
} from '@/features/dashboard/import/lib/importTargetFields';
import type { ImportColumnMappingEntry } from '@/features/dashboard/import/types/importBatch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const SKIP_VALUE = '__skip__';

type Props = {
  entry: ImportColumnMappingEntry;
  /** Up to 3 sample values for this column. */
  samples: string[];
  /** Current user-chosen target (null = skip). */
  value: string | null;
  onChange: (rawHeader: string, target: string | null) => void;
  /** Already-used target ids (disables duplicate mapping). */
  usedTargets: Set<string>;
};

function statusBadge(status: ImportColumnMappingEntry['status']) {
  switch (status) {
    case 'matched':
      return <Badge variant="default" className="shrink-0 text-[10px]">Matched</Badge>;
    case 'likely_matched':
      return <Badge variant="secondary" className="shrink-0 text-[10px]">Likely</Badge>;
    case 'ambiguous':
      return <Badge variant="outline" className="shrink-0 text-[10px] text-amber-600 border-amber-300">Ambiguous</Badge>;
    default:
      return <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">Unmatched</Badge>;
  }
}

export function ImportManualMappingRow({ entry, samples, value, onChange, usedTargets }: Props) {
  const selectValue = value === null ? SKIP_VALUE : (value ?? SKIP_VALUE);

  const handleChange = (val: string) => {
    onChange(entry.rawHeader, val === SKIP_VALUE ? null : val);
  };

  const nonEmptySamples = samples.filter(Boolean).slice(0, 3);

  return (
    <div className={cn(
      'grid grid-cols-1 gap-2 rounded-lg border px-3 py-2.5 text-sm sm:grid-cols-[1fr_auto_1fr]',
      value === null && 'opacity-60',
    )}>
      {/* Raw header + samples */}
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium text-foreground truncate">{entry.rawHeader}</p>
        {nonEmptySamples.length > 0 && (
          <p className="text-muted-foreground text-xs truncate">
            {nonEmptySamples.join(' · ')}
          </p>
        )}
      </div>

      {/* Arrow divider */}
      <div className="hidden items-center sm:flex">
        <ChevronRight className="size-4 text-muted-foreground shrink-0" aria-hidden />
      </div>

      {/* Target select */}
      <div className="flex items-center gap-2">
        {statusBadge(entry.status)}
        <Select value={selectValue} onValueChange={handleChange}>
          <SelectTrigger className="h-8 min-w-0 flex-1 text-xs" aria-label={`Map column ${entry.rawHeader}`}>
            <SelectValue placeholder="Map to field…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SKIP_VALUE}>
              <span className="text-muted-foreground">Skip / Not applicable</span>
            </SelectItem>

            <SelectGroup>
              <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Required fields
              </SelectLabel>
              {REQUIRED_TARGET_FIELDS.map((field) => (
                <SelectItem
                  key={field.id}
                  value={field.id}
                  disabled={usedTargets.has(field.id) && value !== field.id}
                >
                  {field.description}
                  {usedTargets.has(field.id) && value !== field.id ? ' ✓' : ''}
                </SelectItem>
              ))}
            </SelectGroup>

            <SelectGroup>
              <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Optional fields
              </SelectLabel>
              {OPTIONAL_TARGET_FIELDS.map((field) => (
                <SelectItem
                  key={field.id}
                  value={field.id}
                  disabled={usedTargets.has(field.id) && value !== field.id}
                >
                  {field.description}
                  {usedTargets.has(field.id) && value !== field.id ? ' ✓' : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Reason hint below on mobile */}
      {entry.reason && entry.status !== 'matched' && (
        <p className="col-span-full text-[11px] text-muted-foreground sm:col-start-3 sm:col-end-4">
          {entry.reason}
        </p>
      )}
    </div>
  );
}
