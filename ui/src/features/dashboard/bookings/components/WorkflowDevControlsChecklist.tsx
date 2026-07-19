import type { DevControlFlags } from '@/features/dashboard/bookings/hooks/useTransitionBooking';
import type { WorkflowDevControlDef } from '@/features/dashboard/bookings/lib/workflowDevControls';

import { CheckboxDisplay } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type Props = {
  controls: WorkflowDevControlDef[];
  values: DevControlFlags;
  onToggle: (key: keyof DevControlFlags) => void;
  disabled?: boolean;
};

export function WorkflowDevControlsChecklist({
  controls,
  values,
  onToggle,
  disabled = false,
}: Props) {
  if (controls.length === 0) return null;

  return (
    <div className="border-border bg-muted/50/80 mt-3 max-h-[40vh] overflow-y-auto rounded-lg border">
      <p className="border-separator bg-muted/50/95 text-muted-foreground sticky top-0 z-[1] border-b px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider">
        Side effects
      </p>
      <div className="space-y-0.5 p-1.5">
        {controls.map(({ key, label, description }) => {
          const checked = values[key] !== false;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(key)}
              className={cn(
                'flex min-h-[44px] w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-card'
              )}
            >
              <CheckboxDisplay checked={checked} className="mt-0.5" />
              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    'text-xs font-medium leading-snug',
                    checked ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
                <span className="text-muted-foreground text-[10.5px] leading-tight">
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
