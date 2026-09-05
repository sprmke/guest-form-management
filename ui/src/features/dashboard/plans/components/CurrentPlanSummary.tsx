import { ArrowRight, ArrowUpRight, Settings, Sparkles } from 'lucide-react';

import { PlanTierIconWell } from '@/features/dashboard/plans/components/PlanTierIconWell';
import type {
  OrgBundlePlanDto,
  OrgSubscriptionDto,
} from '@/features/dashboard/plans/lib/orgPlanApi';
import {
  planDisplayName,
  planDisplayNameFromSubscription,
  planPrice,
  subscriptionGraceLabel,
  subscriptionRenewalLabel,
  subscriptionStatusMeta,
  upgradeBannerActionLabel,
} from '@/features/dashboard/plans/lib/planPresentation';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type CurrentPlanSummaryProps = {
  /** Null when the active subscription sits outside the selectable tier list (e.g. commission). */
  plan: OrgBundlePlanDto | null;
  subscription: OrgSubscriptionDto | null;
  canManage?: boolean;
  pendingCheckoutUrl?: string | null;
  onPayNow?: () => void;
  onResumePayment?: () => void;
  isPaying?: boolean;
  upgradePlan?: OrgBundlePlanDto | null;
  onManageBilling?: () => void;
  onUpgrade?: (plan: OrgBundlePlanDto) => void;
  uncoveredPropertyCount?: number;
  onCoverUncoveredProperties?: () => void;
};

function currentPlanBillingLine(
  price: ReturnType<typeof planPrice>,
  subscription: OrgSubscriptionDto | null
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

function currentPlanBadge(subscription: OrgSubscriptionDto | null): {
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
  onResumePayment,
  isPaying = false,
  upgradePlan,
  onManageBilling,
  onUpgrade,
  uncoveredPropertyCount = 0,
  onCoverUncoveredProperties,
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
      onResumePayment?.();
      return;
    }
    onPayNow?.();
  };

  return (
    <FloatingPanel
      as="section"
      padding="md"
      aria-labelledby="current-plan-heading"
      className="border-primary from-primary/5 to-primary/10 border bg-gradient-to-r"
    >
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <PlanTierIconWell planCode={plan?.code ?? subscription?.planCode ?? 'free'} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2
                id="current-plan-heading"
                className="text-foreground truncate text-sm font-semibold tracking-tight sm:text-base lg:text-lg"
              >
                {name} plan
              </h2>
              <Badge
                variant={badge.variant}
                className="h-5 shrink-0 px-1.5 text-[10px] leading-none sm:h-6 sm:px-2 sm:text-xs"
              >
                {badge.label}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-xs sm:text-sm">{billingLine}</p>
          </div>
        </div>

        {showActions ? (
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:justify-end">
            {onManageBilling ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] w-full justify-center sm:w-auto"
                onClick={onManageBilling}
              >
                <Settings className="size-4 shrink-0" aria-hidden />
                <span className="sm:hidden">Manage</span>
                <span className="hidden sm:inline">Manage subscription</span>
              </Button>
            ) : null}
            {upgradePlan && onUpgrade ? (
              <Button
                type="button"
                size="sm"
                className="min-h-[44px] w-full justify-center sm:w-auto"
                onClick={() => onUpgrade(upgradePlan)}
              >
                <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                {upgradeBannerActionLabel(upgradePlan)}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {needsAttention ? (
        <div className="border-destructive/25 mt-3 flex flex-col gap-2.5 border-t pt-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-4">
          <p className="text-destructive flex items-start gap-2 text-sm">
            <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
            {subscription?.status === 'suspended'
              ? 'Dashboard access is limited until payment is received.'
              : `Payment is past due. Pay by ${subscriptionGraceLabel(subscription) ?? 'soon'} to keep full access.`}
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
        <div className="border-primary/15 mt-3 flex flex-col gap-2.5 border-t pt-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-4">
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

      {uncoveredPropertyCount > 0 && onCoverUncoveredProperties ? (
        <div className="border-primary/15 mt-3 flex flex-col gap-2.5 border-t pt-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-4">
          <p className="text-muted-foreground text-sm">
            {uncoveredPropertyCount}{' '}
            {uncoveredPropertyCount === 1 ? 'property is' : 'properties are'} not on your plan yet.
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] shrink-0"
            onClick={onCoverUncoveredProperties}
          >
            Update billing
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </FloatingPanel>
  );
}
