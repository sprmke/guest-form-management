/**
 * Admin confirmation when the guest requested surprise decor (PENDING_REVIEW).
 * Shown below Review pricing; gates Proceed to Pending Documents with WorkflowPanel.
 */

import { WorkflowSubFormCard } from '@/features/admin/components/WorkflowSubFormCard';

type Props = {
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
};

export function SurpriseDecorAckCard({
  acknowledged,
  onAcknowledgedChange,
}: Props) {
  return (
    <WorkflowSubFormCard title="Surprise decor">
      <div className="space-y-1">
        <div className="block text-xs text-muted-foreground">
          Staff coordination confirmation
          <span className="text-red-600"> *</span>
        </div>
        <label className="flex items-start gap-3 min-h-[44px] cursor-pointer rounded-lg px-1 -mx-1 py-1 hover:bg-muted/50/80">
          <input
            type="checkbox"
            checked={acknowledged}
            required
            aria-required="true"
            onChange={(e) => onAcknowledgedChange(e.target.checked)}
            className="mt-1.5 size-4 shrink-0 rounded border-border text-blue-600 focus:ring-blue-500/40"
          />
          <span className="text-xs text-foreground">
            By checking this, you confirm that you have already coordinated with
            our staff regarding the surprise decor setup, including the selected
            theme and final price.
          </span>
        </label>
      </div>
    </WorkflowSubFormCard>
  );
}
