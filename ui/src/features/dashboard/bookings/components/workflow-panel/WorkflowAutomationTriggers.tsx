/**
 * Automation-triggers collapsible — rail only.
 *
 * Manual workflow email sends (Free escape hatch / paid resend) + SD check-out automation.
 */

import { ChevronDown, ChevronRight, Loader2, Mail, RefreshCw, Timer } from 'lucide-react';

import {
  BOOKING_WORKFLOW_EMAIL_LABELS,
  type BookingWorkflowEmailKind,
} from '@/features/dashboard/bookings/lib/bookingWorkflowEmail';
import { workflowNeutralActionClass } from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';
import { formatSdRefundLeadPhrase } from '@/features/dashboard/bookings/lib/workflowAdvanceMode';

const DEFAULT_LEAD_MINUTES = 120;

type Props = {
  isModal: boolean;
  showSdCron: boolean;
  showSdFormResend: boolean;
  /** Manual send kinds eligible for this booking (excluding kinds handled only via legacy SD buttons when preferred). */
  manualEmailKinds: BookingWorkflowEmailKind[];
  /** Highlight that auto-send was skipped by plan. */
  planSkipHint: boolean;
  /** Property setting `sd_refund_cron_email_lead_minutes`. */
  sdRefundEmailLeadMinutes?: number;
  automationHelpOpen: boolean;
  onToggleAutomationHelp: () => void;
  sdCronPending: boolean;
  resendSdFormPending: boolean;
  sendingKind: BookingWorkflowEmailKind | null;
  onRunSdCron: () => void;
  onResendSdFormEmail: () => void;
  onSendWorkflowEmail: (kind: BookingWorkflowEmailKind) => void;
};

export function WorkflowAutomationTriggers({
  isModal,
  showSdCron,
  showSdFormResend,
  manualEmailKinds,
  planSkipHint,
  sdRefundEmailLeadMinutes = DEFAULT_LEAD_MINUTES,
  automationHelpOpen,
  onToggleAutomationHelp,
  sdCronPending,
  resendSdFormPending,
  sendingKind,
  onRunSdCron,
  onResendSdFormEmail,
  onSendWorkflowEmail,
}: Props) {
  const kindsForButtons = manualEmailKinds.filter((kind) => {
    if (kind === 'sd_refund_form_request' && showSdFormResend) return false;
    return true;
  });

  const hasContent = showSdCron || showSdFormResend || kindsForButtons.length > 0;
  if (isModal || !hasContent) return null;

  const leadPhrase = formatSdRefundLeadPhrase(sdRefundEmailLeadMinutes);

  return (
    <div className="border-separator border-b">
      <button
        type="button"
        aria-expanded={automationHelpOpen}
        onClick={onToggleAutomationHelp}
        className="hover:bg-muted/50 flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left transition-colors"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Timer className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          <span className="text-overline text-muted-foreground font-semibold">
            Automation Triggers
          </span>
          {planSkipHint ? (
            <span className="bg-warning/15 text-warning rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Send manually
            </span>
          ) : null}
        </span>
        {automationHelpOpen ? (
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        )}
      </button>

      {automationHelpOpen && (
        <div className="text-muted-foreground space-y-2 px-4 pb-3 text-[11.5px] leading-relaxed">
          {planSkipHint ? (
            <p>
              Automated workflow emails are not included on your plan. Send them below, or upgrade.
            </p>
          ) : null}
          {showSdCron ? (
            <>
              <p>
                {leadPhrase}, the guest gets the Check-out Instructions email automatically, even if
                the balance is unpaid. If the remaining balance is settled with a receipt uploaded,
                the booking also moves automatically to Ready for Check-out at that time.
              </p>
              <p>If the email or move did not happen, run the check-out automation below.</p>
            </>
          ) : null}
          {showSdFormResend ? (
            <p>
              Resend the Check-out Instructions email. It does not move the booking to the next
              step.
            </p>
          ) : null}
          {kindsForButtons.length > 0 && !planSkipHint ? (
            <p>Resend a workflow email without changing status.</p>
          ) : null}

          <div className="border-separator flex flex-col gap-1.5 border-t pt-3">
            {kindsForButtons.map((kind) => {
              const pending = sendingKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={sendingKind != null}
                  onClick={() => onSendWorkflowEmail(kind)}
                  className={workflowNeutralActionClass()}
                >
                  <span>Send {BOOKING_WORKFLOW_EMAIL_LABELS[kind]}</span>
                  {pending ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin" />
                  ) : (
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
            {showSdCron ? (
              <button
                type="button"
                disabled={sdCronPending}
                onClick={onRunSdCron}
                className={workflowNeutralActionClass()}
              >
                <span>Run check-out automation</span>
                {sdCronPending ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5 shrink-0" aria-hidden />
                )}
              </button>
            ) : null}
            {showSdFormResend ? (
              <button
                type="button"
                disabled={resendSdFormPending}
                onClick={onResendSdFormEmail}
                className={workflowNeutralActionClass()}
              >
                <span>Resend Check-out Instructions email</span>
                {resendSdFormPending ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                )}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
