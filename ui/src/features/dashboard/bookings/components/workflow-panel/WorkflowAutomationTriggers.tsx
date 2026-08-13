/**
 * Automation-triggers collapsible — rail only.
 *
 * Ready for Check-in: run this booking’s check-out automation (email + settle).
 * Ready for Check-out: resend the Check-out Instructions email.
 */

import { ChevronDown, ChevronRight, Loader2, Mail, RefreshCw, Timer } from 'lucide-react';

import { workflowNeutralActionClass } from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';
import { formatSdRefundLeadPhrase } from '@/features/dashboard/bookings/lib/workflowAdvanceMode';

const DEFAULT_LEAD_MINUTES = 120;

type Props = {
  isModal: boolean;
  showSdCron: boolean;
  showSdFormResend: boolean;
  /** Property setting `sd_refund_cron_email_lead_minutes`. */
  sdRefundEmailLeadMinutes?: number;
  automationHelpOpen: boolean;
  onToggleAutomationHelp: () => void;
  sdCronPending: boolean;
  resendSdFormPending: boolean;
  onRunSdCron: () => void;
  onResendSdFormEmail: () => void;
};

export function WorkflowAutomationTriggers({
  isModal,
  showSdCron,
  showSdFormResend,
  sdRefundEmailLeadMinutes = DEFAULT_LEAD_MINUTES,
  automationHelpOpen,
  onToggleAutomationHelp,
  sdCronPending,
  resendSdFormPending,
  onRunSdCron,
  onResendSdFormEmail,
}: Props) {
  if (isModal || !(showSdCron || showSdFormResend)) return null;

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
        </span>
        {automationHelpOpen ? (
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        )}
      </button>

      {automationHelpOpen && (
        <div className="text-muted-foreground space-y-2 px-4 pb-3 text-[11.5px] leading-relaxed">
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

          <div className="border-separator flex flex-col gap-1.5 border-t pt-3">
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
