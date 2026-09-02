import type { OrgPaymentTransactionDto } from '@/features/dashboard/plans/lib/orgPlanApi';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { Badge } from '@/components/ui/badge';
import { formatManilaLongDate } from '@/utils/format/dates';

type OrgPlanTransactionsProps = {
  transactions: OrgPaymentTransactionDto[];
};

type StatusMeta = {
  label: string;
  tone: 'success' | 'secondary' | 'destructive';
};

const STATUS_META: Record<string, StatusMeta> = {
  paid: { label: 'Paid', tone: 'success' },
  pending: { label: 'Pending', tone: 'secondary' },
  failed: { label: 'Failed', tone: 'destructive' },
  expired: { label: 'Expired', tone: 'secondary' },
  cancelled: { label: 'Cancelled', tone: 'secondary' },
};

const METHOD_LABELS: Record<string, string> = {
  qrph: 'QRPH',
  gcash: 'GCash',
  paymaya: 'Maya',
  card: 'Card',
  dob: 'Online banking',
  dob_ubp: 'UnionBank',
  brankas: 'Online banking',
};

function methodLabel(method: string | null): string | null {
  if (!method) return null;
  return METHOD_LABELS[method] ?? method.replace(/_/g, ' ');
}

export function OrgPlanTransactions({ transactions }: OrgPlanTransactionsProps) {
  if (transactions.length === 0) return null;

  return (
    <FloatingPanel as="section" padding="lg" aria-labelledby="plan-payments-heading">
      <h2 id="plan-payments-heading" className="text-section-title">
        Recent payments
      </h2>
      <ul className="divide-border mt-3 divide-y">
        {transactions.map((txn) => {
          const status = STATUS_META[txn.status] ?? {
            label: txn.status,
            tone: 'secondary' as const,
          };
          const method = methodLabel(txn.paymentMethodType);
          /* An unpaid row has no paid_at — dating it by creation keeps the timeline honest. */
          const date = formatManilaLongDate(txn.paidAt ?? txn.createdAt);

          return (
            <li key={txn.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="text-foreground font-medium tabular-nums">
                  ₱{txn.amount.toLocaleString('en-PH')}
                </p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {date}
                  {method ? ` · ${method}` : ''}
                </p>
              </div>
              <Badge variant={status.tone} className="shrink-0">
                {status.label}
              </Badge>
            </li>
          );
        })}
      </ul>
    </FloatingPanel>
  );
}
