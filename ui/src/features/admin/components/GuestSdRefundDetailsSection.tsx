/**
 * Read-only guest SD refund submission — shown in edit form Workflow Details.
 */

import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InlineCopyIconButton } from '@/features/admin/components/SdRefundForm';
import { Section } from '@/features/admin/components/bookingEditLayout';
import type { BookingRow } from '@/features/admin/lib/types';

function phoneDigitsOnly(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  return raw.replace(/\D/g, '');
}

function methodLabel(
  method: NonNullable<BookingRow['sd_refund_method']>,
): string {
  if (method === 'same_phone')
    return 'GCash (same as provided phone number from GAF)';
  if (method === 'cash') return 'Cash pickup';
  return 'Bank / e-wallet transfer';
}

function RefundSummaryRow({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1.5 py-3 sm:grid-cols-[minmax(0,5.75rem)_minmax(0,1fr)] sm:items-start sm:gap-x-3">
      <dt className="text-left text-xs font-semibold leading-snug text-muted-foreground sm:text-[11px]">
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 text-sm font-medium leading-relaxed text-foreground break-words sm:text-[13px] sm:font-normal',
          mono && 'font-mono text-[13px] tracking-tight sm:font-mono',
        )}
      >
        {children}
      </dd>
    </div>
  );
}

type Props = {
  booking: BookingRow;
  variant?: 'workflow' | 'edit';
};

export function GuestSdRefundDetailsSection({
  booking,
  variant = 'edit',
}: Props) {
  const guestMethod = booking.sd_refund_method;
  if (!guestMethod) return null;

  const phoneDisplay = booking.guest_phone_number?.trim() ?? '';
  const accountNameForCopy = booking.sd_refund_account_name?.trim() ?? '';
  const accountNumberForCopy =
    phoneDigitsOnly(booking.sd_refund_account_number) ||
    (booking.sd_refund_account_number ?? '').trim();

  async function copyGuestPhone() {
    if (!phoneDisplay) return;
    try {
      await navigator.clipboard.writeText(phoneDisplay);
      toast.success('Phone number copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  async function copyAccountName() {
    if (!accountNameForCopy) return;
    try {
      await navigator.clipboard.writeText(accountNameForCopy);
      toast.success('Account name copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  async function copyAccountNumber() {
    if (!accountNumberForCopy) return;
    try {
      await navigator.clipboard.writeText(accountNumberForCopy);
      toast.success('Account number copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  const body = (
    <dl className="min-w-0 divide-y divide-separator">
      <RefundSummaryRow label="Method">
        {methodLabel(guestMethod)}
      </RefundSummaryRow>
      {guestMethod === 'same_phone' && (
        <RefundSummaryRow label="Phone Number">
          <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 gap-y-0.5">
            <span
              className={cn(
                'min-w-0 break-words font-mono text-[13px] tracking-tight',
                !phoneDisplay && 'text-muted-foreground',
              )}
            >
              {phoneDisplay || '—'}
            </span>
            <InlineCopyIconButton
              aria-label="Copy phone number to clipboard"
              disabled={!phoneDisplay}
              onClick={() => void copyGuestPhone()}
            />
          </span>
        </RefundSummaryRow>
      )}
      {guestMethod === 'other_bank' && (
        <>
          <RefundSummaryRow label="Bank">
            {booking.sd_refund_bank ?? '—'}
          </RefundSummaryRow>
          <RefundSummaryRow label="Account name">
            <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 gap-y-0.5">
              <span
                className={cn(
                  'min-w-0 break-words',
                  !accountNameForCopy && 'text-muted-foreground',
                )}
              >
                {accountNameForCopy || '—'}
              </span>
              <InlineCopyIconButton
                aria-label="Copy account name to clipboard"
                disabled={!accountNameForCopy}
                onClick={() => void copyAccountName()}
              />
            </span>
          </RefundSummaryRow>
          <RefundSummaryRow label="Account number" mono>
            <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 gap-y-0.5">
              <span
                className={cn(
                  'min-w-0 break-all font-mono text-[13px] tracking-tight',
                  !accountNumberForCopy && 'text-muted-foreground',
                )}
              >
                {booking.sd_refund_account_number?.trim() || '—'}
              </span>
              <InlineCopyIconButton
                aria-label="Copy account number to clipboard"
                disabled={!accountNumberForCopy}
                onClick={() => void copyAccountNumber()}
              />
            </span>
          </RefundSummaryRow>
        </>
      )}
      {booking.sd_refund_form_submitted_at && (
        <RefundSummaryRow label="Submitted">
          {new Date(booking.sd_refund_form_submitted_at).toLocaleString(
            'en-PH',
            { timeZone: 'Asia/Manila' },
          )}
        </RefundSummaryRow>
      )}
    </dl>
  );

  if (variant === 'edit') {
    return <Section title="SD Refund Form">{body}</Section>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-slate-950/[0.04]">
      <div className="border-b border-separator bg-muted/50/80 px-4 py-3.5 sm:px-5">
        <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
          Guest refund details
        </h3>
      </div>
      <div className="px-4 py-3.5 sm:px-5">{body}</div>
    </div>
  );
}
