import { Receipt } from 'lucide-react';

import { OrgPlanTransactions } from '@/features/dashboard/plans/components/OrgPlanTransactions';
import type {
  OrgBundlePlanDto,
  OrgPaymentTransactionDto,
  OrgSubscriptionDto,
} from '@/features/dashboard/plans/lib/orgPlanApi';
import {
  planDisplayName,
  planDisplayNameFromSubscription,
  planPrice,
  subscriptionRenewalLabel,
  subscriptionStatusMeta,
} from '@/features/dashboard/plans/lib/planPresentation';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { Badge } from '@/components/ui/badge';
import { formatManilaLongDate } from '@/utils/format/dates';

type PlanBillingPanelProps = {
  plan: OrgBundlePlanDto | null;
  subscription: OrgSubscriptionDto | null;
  transactions: OrgPaymentTransactionDto[];
};

function BillingEmptyState() {
  return (
    <FloatingPanel padding="lg" className="py-12 text-center">
      <Receipt className="text-muted-foreground mx-auto size-8" aria-hidden />
      <p className="text-foreground mt-3 text-sm font-semibold">No payments yet</p>
      <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
        Paid plan charges will appear here after checkout.
      </p>
    </FloatingPanel>
  );
}

/** Billing tab — subscription period context plus payment history. */
export function PlanBillingPanel({ plan, subscription, transactions }: PlanBillingPanelProps) {
  const status = subscription ? subscriptionStatusMeta(subscription.status) : null;
  const renewal = subscriptionRenewalLabel(subscription);
  const price = plan
    ? planPrice(
        subscription?.pricePhpSnapshot != null && subscription.pricePhpSnapshot > 0
          ? { ...plan, chargedPricePhp: subscription.pricePhpSnapshot }
          : plan
      )
    : subscription
      ? planPrice({
          isDefault: (subscription.pricePhpSnapshot ?? 0) <= 0,
          pricePhp: subscription.pricePhpSnapshot ?? 0,
          pricingModel: subscription.pricingModel ?? 'subscription',
          code: subscription.planCode ?? '',
          discountPercent: 0,
        })
      : null;

  const periodStart = subscription?.currentPeriodStart
    ? formatManilaLongDate(subscription.currentPeriodStart)
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      {subscription ? (
        <FloatingPanel as="section" padding="lg" aria-labelledby="billing-summary-heading">
          <h2 id="billing-summary-heading" className="sr-only">
            Billing summary
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Plan
              </p>
              <p className="text-foreground mt-1 text-base font-semibold">
                {plan ? planDisplayName(plan) : planDisplayNameFromSubscription(subscription)}
              </p>
              {status ? (
                <Badge variant={status.tone} className="mt-2">
                  {status.label}
                </Badge>
              ) : null}
            </div>

            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Amount
              </p>
              {price ? (
                <p className="truncate text-lg font-bold tabular-nums tracking-tight sm:text-2xl mt-1">
                  {price.amount}
                  {price.suffix ? (
                    <span className="text-muted-foreground ml-1 text-sm font-medium">
                      {price.suffix}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {renewal ? 'Next renewal' : 'Billing period'}
              </p>
              <p className="text-foreground mt-1 text-base font-semibold tabular-nums">
                {renewal ?? periodStart ?? '—'}
              </p>
              {periodStart && renewal ? (
                <p className="text-muted-foreground mt-0.5 text-xs">Since {periodStart}</p>
              ) : null}
            </div>
          </div>
        </FloatingPanel>
      ) : null}

      {transactions.length > 0 ? (
        <OrgPlanTransactions transactions={transactions} />
      ) : (
        <BillingEmptyState />
      )}
    </div>
  );
}
