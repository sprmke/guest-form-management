/**
 * Admin confirmation when the guest requested surprise decor (PENDING_REVIEW).
 * Shown below Review pricing; gates Proceed to Pending Documents with WorkflowPanel.
 */

import { WorkflowSubFormCard } from '@/features/admin/components/WorkflowSubFormCard';

type Props = {
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  readOnly?: boolean;
};

export function SurpriseDecorAckCard({
  acknowledged,
  onAcknowledgedChange,
  readOnly = false,
}: Props) {
  return (
    <WorkflowSubFormCard title="Surprise decor">
      <div className="space-y-1">
        <div className="block text-xs text-muted-foreground">
          Staff coordination confirmation
          <span className="text-red-600"> *</span>
        </div>
        <label
          className={
            readOnly
              ? 'flex items-start gap-3 min-h-[44px] rounded-lg px-1 -mx-1 py-1'
              : 'flex items-start gap-3 min-h-[44px] cursor-pointer rounded-lg px-1 -mx-1 py-1 hover:bg-muted/50/80'
          }
        >
          <input
            type="checkbox"
            checked={acknowledged}
            required={!readOnly}
            aria-required={!readOnly}
            disabled={readOnly}
            onChange={(e) => onAcknowledgedChange(e.target.checked)}
            className="mt-1.5 size-4 shrink-0 rounded border-border text-blue-600 focus:ring-blue-500/40 disabled:cursor-default disabled:opacity-70"
          />
          <span className="text-xs text-foreground">
            I coordinated surprise decor with staff, including theme and final
            price.
          </span>
        </label>
      </div>
    </WorkflowSubFormCard>
  );
}
