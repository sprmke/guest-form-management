import { CheckSquare, Square } from 'lucide-react';
import type { DevControlFlags } from '@/features/admin/hooks/useTransitionBooking';
import type { WorkflowDevControlDef } from '@/features/admin/lib/workflowDevControls';
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
    <div className="mt-3 max-h-[40vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80">
      <p className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50/95 px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
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
                disabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-white',
              )}
            >
              <span className="mt-0.5 shrink-0">
                {checked ? (
                  <CheckSquare className="size-4 text-blue-600" />
                ) : (
                  <Square className="size-4 text-slate-300" />
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    'text-xs font-medium leading-snug',
                    checked ? 'text-slate-800' : 'text-slate-600',
                  )}
                >
                  {label}
                </span>
                <span className="text-[10.5px] leading-tight text-slate-400">
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
