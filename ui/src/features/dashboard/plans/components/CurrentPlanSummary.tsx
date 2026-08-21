import { ArrowRight, ArrowUpRight, Settings, Sparkles } from 'lucide-react';

import { PlanTierIconWell } from '@/features/dashboard/plans/components/PlanTierIconWell';
import {
  planDisplayName,
  planDisplayNameFromSubscription,
  planPrice,
  subscriptionGraceLabel,
  subscriptionRenewalLabel,
  subscriptionStatusMeta,
  upgradeBannerActionLabel,
} from '@/features/dashboard/plans/lib/planPresentation';
import type {
  PropertyPlanDto,
  PropertySubscriptionDto,
} from '@/features/dashboard/plans/lib/propertyPlanApi';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CurrentPlanSummaryProps = {
  /** Null when the active subscription sits outside the selectable tier list (e.g. commission). */
  plan: PropertyPlanDto | null;
  subscription: PropertySubscriptionDto | null;
  canManage?: boolean;
  pendingCheckoutUrl?: string | null;
  onPayNow?: () => void;
  isPaying?: boolean;
  upgradePlan?: PropertyPlanDto | null;
  onManageBilling?: () => void;
  onUpgrade?: (plan: PropertyPlanDto) => void;
};

function currentPlanBillingLine(
  price: ReturnType<typeof planPrice>,
  subscription: PropertySubscriptionDto | null
): string {
  const parts: string[] = [];

  if (price.suffix) {
    parts.push(`${price.amount}/month`);
  } else {
    parts.push(price.amount);
  }

  const renewal = subscriptionRenewalLabel(subscription);
  if (renewal) parts.push(`Next billing: ${renewal}`);

  return parts.join(' · ');
}

function currentPlanBadge(subscription: PropertySubscriptionDto | null): {
  label: string;
  variant: 'default' | 'success' | 'secondary' | 'destructive';
} {
  if (!subscription) return { label: 'Current', variant: 'default' };
  if (subscription.status === 'active') return { label: 'Current', variant: 'default' };

  const meta = subscriptionStatusMeta(subscription.status);
  const variant =
    meta.tone === 'destructive' ? 'destructive' : meta.tone === 'success' ? 'success' : 'secondary';

  return { label: meta.label, variant };
}

/** PMA-style banner — plan identity, billing rhythm, and quick actions. */
export function CurrentPlanSummary({
  plan,
  subscription,
  canManage = false,
  pendingCheckoutUrl,
  onPayNow,
  isPaying = false,
  upgradePlan,
  onManageBilling,
  onUpgrade,
}: CurrentPlanSummaryProps) {
  if (!plan && !subscription) return null;

  const name = plan ? planDisplayName(plan) : planDisplayNameFromSubscription(subscription);
  const price = plan
    ? planPrice(
        subscription?.pricePhpSnapshot != null && subscription.pricePhpSnapshot > 0
          ? { ...plan, chargedPricePhp: subscription.pricePhpSnapshot }
          : plan
      )
    : planPrice({
        isDefault: (subscription?.pricePhpSnapshot ?? 0) <= 0,
        pricePhp: subscription?.pricePhpSnapshot ?? 0,
        pricingModel: subscription?.pricingModel ?? 'subscription',
        code: subscription?.planCode ?? '',
        discountPercent: 0,
      });
  const billingLine = currentPlanBillingLine(price, subscription);
  const badge = currentPlanBadge(subscription);
  const status = subscription ? subscriptionStatusMeta(subscription.status) : null;
  const needsAttention = status?.tone === 'destructive';
  const showPayNow =
    canManage &&
    Boolean(onPayNow) &&
    subscription &&
    !plan?.isDefault &&
    (subscription.status === 'past_due' ||
      subscription.status === 'suspended' ||
      Boolean(pendingCheckoutUrl));
  const showResume = canManage && !needsAttention && Boolean(pendingCheckoutUrl);
  const showActions = canManage && (Boolean(onManageBilling) || (upgradePlan && onUpgrade));

  const openCheckout = () => {
    if (pendingCheckoutUrl) {
      window.location.assign(pendingCheckoutUrl);
      return;
    }
    onPayNow?.();
  };

  return (
    <FloatingPanel
      as="section"
      padding="lg"
      aria-labelledby="current-plan-heading"
      className={cn(
        'border-primary from-primary/5 to-primary/10 border bg-gradient-to-r',
        'pt-6 sm:pt-6 md:pt-6'
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <PlanTierIconWell planCode={plan?.code ?? subscription?.planCode ?? 'free'} size="lg" />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="current-plan-heading" className="text-lg font-semibold tracking-tight">
                {name} plan
              </h2>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">{billingLine}</p>
          </div>
        </div>

        {showActions ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {onManageBilling ? (
              <Button type="button" variant="outline" size="sm" onClick={onManageBilling}>
                <Settings className="size-4" aria-hidden />
                Manage subscription
              </Button>
            ) : null}
            {upgradePlan && onUpgrade ? (
              <Button type="button" size="sm" onClick={() => onUpgrade(upgradePlan)}>
                <ArrowUpRight className="size-4" aria-hidden />
                {upgradeBannerActionLabel(upgradePlan)}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {needsAttention ? (
        <div className="border-destructive/25 mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-destructive flex items-start gap-2 text-sm">
            <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
            {subscription?.status === 'suspended'
              ? 'Dashboard access is limited until payment is received.'
              : `Payment is past due — pay by ${subscriptionGraceLabel(subscription) ?? 'soon'} to keep full access.`}
          </p>
          {showPayNow ? (
            <Button
              type="button"
              className="min-h-[44px] shrink-0"
              disabled={isPaying}
              onClick={openCheckout}
            >
              {isPaying ? 'Opening…' : 'Pay now'}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : showResume ? (
        <div className="border-primary/15 mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground flex items-start gap-2 text-sm">
            <Sparkles className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />A plan payment
            is waiting to be completed.
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] shrink-0"
            disabled={isPaying}
            onClick={openCheckout}
          >
            Resume payment
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </FloatingPanel>
  );
}
