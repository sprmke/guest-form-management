/**
 * Automation-triggers collapsible section — ported from the pre-decomposition
 * `WorkflowPanel.tsx`. Rail-only: renders `null` in modal mode.
 */

import { ChevronDown, ChevronRight, Loader2, Mail, RefreshCw, Timer } from 'lucide-react';

import { workflowNeutralActionClass } from '@/features/dashboard/bookings/lib/workflowActionButtonStyles';

type Props = {
  isModal: boolean;
  showGmailPoll: boolean;
  showSdCron: boolean;
  showSdFormResend: boolean;
  automationHelpOpen: boolean;
  onToggleAutomationHelp: () => void;
  gmailPollPending: boolean;
  sdCronPending: boolean;
  resendSdFormPending: boolean;
  onRunGmailPoll: () => void;
  onRunSdCron: () => void;
  onResendSdFormEmail: () => void;
};

export function WorkflowAutomationTriggers({
  isModal,
  showGmailPoll,
  showSdCron,
  showSdFormResend,
  automationHelpOpen,
  onToggleAutomationHelp,
  gmailPollPending,
  sdCronPending,
  resendSdFormPending,
  onRunGmailPoll,
  onRunSdCron,
  onResendSdFormEmail,
}: Props) {
  if (isModal || !(showGmailPoll || showSdCron || showSdFormResend)) return null;

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
              <p className="text-muted-foreground">
                Two hours before checkout, guests get the check-out/SD email—even if balance is
                unsettled. Settlement is still required to advance status.
              </p>
              <p className="text-muted-foreground">
                <span className="text-muted-foreground font-medium">Run SD refund cron</span> checks{' '}
                <span className="text-muted-foreground font-medium">this booking only</span>. The
                same job also runs for other ready-for-check-in stays.
              </p>
              <p className="text-muted-foreground">
                <span className="text-muted-foreground font-medium">Send SD refund form email</span>{' '}
                resends the link only. It does{' '}
                <span className="text-muted-foreground font-medium">not</span> change booking
                status.
              </p>
            </>
          ) : showGmailPoll ? (
            <>
              <p className="text-muted-foreground">
                Use when inbox approvals look stuck. Shown while this booking awaits pipeline
                documents.
              </p>
              <ol className="marker:text-muted-foreground list-decimal space-y-1.5 pl-4">
                <li>
                  <span className="text-muted-foreground font-medium">Run Gmail poll now</span>{' '}
                  checks the inbox for all bookings awaiting that reply—not just this one. Safe to
                  rerun.
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                <span className="text-muted-foreground font-medium">Send SD refund form email</span>{' '}
                resends the check-out/SD link. It does not advance the booking—email only.
              </p>
            </>
          )}

          <div className="border-separator flex flex-col gap-1.5 border-t pt-3">
            {showGmailPoll && (
              <button
                type="button"
                disabled={gmailPollPending}
                onClick={onRunGmailPoll}
                className={workflowNeutralActionClass()}
              >
                <span>Run Gmail poll now</span>
                {gmailPollPending ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                )}
              </button>
            )}
            {showSdCron && (
              <button
                type="button"
                disabled={sdCronPending}
                onClick={onRunSdCron}
                className={workflowNeutralActionClass()}
              >
                <span>Run SD refund cron</span>
                {sdCronPending ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5 shrink-0" aria-hidden />
                )}
              </button>
            )}
            {showSdFormResend && (
              <button
                type="button"
                disabled={resendSdFormPending}
                onClick={onResendSdFormEmail}
                className={workflowNeutralActionClass()}
              >
                <span>Send SD refund form email</span>
                {resendSdFormPending ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
