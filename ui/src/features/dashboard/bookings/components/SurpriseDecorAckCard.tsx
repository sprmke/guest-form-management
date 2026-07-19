/**
 * Admin confirmation when the guest requested surprise decor (PENDING_REVIEW).
 * Shown below Review pricing; gates Proceed to Pending Documents with WorkflowPanel.
 */

import { WorkflowSubFormCard } from '@/features/dashboard/bookings/components/WorkflowSubFormCard';

import { Checkbox } from '@/components/ui/checkbox';

type Props = {
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  readOnly?: boolean;
  plain?: boolean;
};

export function SurpriseDecorAckCard({
  acknowledged,
  onAcknowledgedChange,
  readOnly = false,
  plain = false,
}: Props) {
  const content = (
    <div className="space-y-1">
      <div className="text-muted-foreground block text-xs">
        Staff coordination confirmation
        <span className="text-red-600"> *</span>
      </div>
      <label
        className={
          readOnly
            ? '-mx-1 flex min-h-[44px] items-start gap-3 rounded-lg px-1 py-1'
            : 'hover:bg-muted/50/80 -mx-1 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg px-1 py-1'
        }
      >
        <Checkbox
          checked={acknowledged}
          aria-required={!readOnly}
          disabled={readOnly}
          onCheckedChange={(checked) => onAcknowledgedChange(checked === true)}
          className="mt-1.5 disabled:cursor-default"
        />
        <span className="text-foreground text-xs">
          I coordinated surprise decor with staff, including theme and final price.
        </span>
      </label>
    </div>
  );

  if (plain) {
    return content;
  }

  return <WorkflowSubFormCard title="Surprise decor">{content}</WorkflowSubFormCard>;
}
