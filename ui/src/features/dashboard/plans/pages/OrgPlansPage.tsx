import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { FileText, LayoutGrid, Receipt } from 'lucide-react';

import {
  helpSupportNewTicketPath,
  useHelpSupportBasePath,
} from '@/features/dashboard/help-support/lib/helpSupportPaths';
import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import { CurrentPlanSummary } from '@/features/dashboard/plans/components/CurrentPlanSummary';
import { PlanBillingPanel } from '@/features/dashboard/plans/components/PlanBillingPanel';
import { PlanFaqSection } from '@/features/dashboard/plans/components/PlanFaqSection';
import { PlanFeatureMatrix } from '@/features/dashboard/plans/components/PlanFeatureMatrix';
import { PlanReviewDialog } from '@/features/dashboard/plans/components/PlanReviewDialog';
import { PlanTierRail } from '@/features/dashboard/plans/components/PlanTierRail';
import {
  useCreateOrgPlanCheckout,
  useApplyOrgPlanDowngrade,
  useOrgPlan,
} from '@/features/dashboard/plans/hooks/useOrgPlan';
import type { OrgBundlePlanDto } from '@/features/dashboard/plans/lib/orgPlanApi';
import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';
import {
  buildPlanTiers,
  isManagedSalesPlan,
  MANAGED_PLAN_INQUIRY_SUBJECT,
  nextUpgradePlan,
  PLANS_PAGE_SUBTITLE,
  planTabSectionTitleClass,
  resolveEffectiveCurrentPlan,
  resolveEffectiveCurrentPlanId,
  resolveMinimumPlanForFeature,
} from '@/features/dashboard/plans/lib/planPresentation';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { PlansPageSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageTitle } from '@/lib/pageTitle';
import { cn } from '@/lib/utils';

type PlansTab = 'plans' | 'billing' | 'compare';

/**
 * Org subscription hub — one plan covers every property in the org, priced per property with
 * volume discounts. Tier changes open PlanReviewDialog for a final review (with proration when
 * it's a genuine mid-cycle change) before charging anything.
 */
export function OrgPlansPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: orgsData, isLoading: orgsLoading } = useOrganizations();
  const org = orgsData?.organizations.find((entry) => entry.slug === orgSlug);
  const helpSupportBase = useHelpSupportBasePath();
  usePageTitle(org?.name ? `${org.name} - Plans & Billing` : undefined);

  const { data, isLoading, error, refetch } = useOrgPlan(org?.id ?? null);
  const createCheckout = useCreateOrgPlanCheckout(org?.id ?? null);
  const applyDowngrade = useApplyOrgPlanDowngrade(org?.id ?? null);

  const [activeTab, setActiveTab] = useState<PlansTab>('plans');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const plans = data?.plans ?? [];
  const properties = data?.properties ?? [];
  const assignedPropertyIds = data?.assignedPropertyIds ?? [];
  const propertyCount = properties.length;
  const uncoveredPropertyCount = Math.max(0, propertyCount - assignedPropertyIds.length);
  const subscription = data?.subscription ?? null;

  const effectiveCurrentPlanId = useMemo(
    () => resolveEffectiveCurrentPlanId(plans, subscription?.planId),
    [plans, subscription?.planId]
  );

  const currentPlan = useMemo(
    () => resolveEffectiveCurrentPlan(plans, subscription?.planId),
    [plans, subscription?.planId]
  );

  const upgradeTarget = useMemo(
    () => nextUpgradePlan(plans, effectiveCurrentPlanId),
    [plans, effectiveCurrentPlanId]
  );

  useEffect(() => {
    setPendingPlanId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription?.id, subscription?.planId, propertyCount]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === pendingPlanId) ?? currentPlan,
    [plans, pendingPlanId, currentPlan]
  );

  const tiers = useMemo(
    () => buildPlanTiers(plans, effectiveCurrentPlanId),
    [plans, effectiveCurrentPlanId]
  );
  const hasPlans = plans.length > 0;

  const handleSelectPlan = (plan: OrgBundlePlanDto) => {
    if (isManagedSalesPlan(plan.code) && helpSupportBase) {
      navigate(
        helpSupportNewTicketPath(helpSupportBase, { subject: MANAGED_PLAN_INQUIRY_SUBJECT })
      );
      return;
    }
    setPendingPlanId(plan.id);
    setReviewOpen(true);
  };

  useEffect(() => {
    if (!plans.length) return;

    const tab = searchParams.get('tab');
    if (tab === 'billing') {
      setActiveTab('billing');
    }

    const reviewPlanId = searchParams.get('reviewPlan');
    const featureParam = searchParams.get('feature');
    let targetPlanId: string | null = reviewPlanId;

    if (!targetPlanId && featureParam) {
      const minimumPlan = resolveMinimumPlanForFeature(plans, featureParam as PlanFeatureKey);
      targetPlanId = minimumPlan?.id ?? null;
    }

    if (targetPlanId && plans.some((plan) => plan.id === targetPlanId)) {
      setActiveTab('plans');
      setPendingPlanId(targetPlanId);
      setReviewOpen(true);
    }

    if (tab || reviewPlanId || featureParam) {
      setSearchParams({}, { replace: true });
    }
  }, [plans, searchParams, setSearchParams]);

  const isBootstrapping = orgsLoading || (Boolean(org?.id) && isLoading && !data);

  if (isBootstrapping) {
    return (
      <AdminMobilePage title="Plans & Billing" subtitle={PLANS_PAGE_SUBTITLE}>
        <PlansPageSkeleton />
      </AdminMobilePage>
    );
  }

  if (!org || error) {
    return (
      <AdminMobilePage title="Plans & Billing" subtitle={PLANS_PAGE_SUBTITLE}>
        <FloatingPanel padding="lg" className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-foreground text-sm font-semibold">Could not load plans</p>
          <p className="text-caption max-w-sm">
            {error instanceof Error ? error.message : 'Please try again.'}
          </p>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </FloatingPanel>
      </AdminMobilePage>
    );
  }

  return (
    <AdminMobilePage
      title="Plans & Billing"
      subtitle={PLANS_PAGE_SUBTITLE}
      titleId="org-plans-heading"
      dense
      className="min-w-0 max-w-full"
    >
      {!hasPlans ? (
        <FloatingPanel padding="lg" className="py-16 text-center">
          <p className="text-foreground text-sm font-semibold">No plans available</p>
          <p className="text-caption mx-auto mt-1 max-w-sm">
            Pricing tiers have not been published yet.
          </p>
        </FloatingPanel>
      ) : (
        <div className="native-stagger flex min-w-0 flex-col gap-5 sm:gap-6 lg:gap-8">
          <p className="text-foreground max-w-2xl text-base font-medium lg:hidden">
            {PLANS_PAGE_SUBTITLE}
          </p>

          {currentPlan ? (
            <CurrentPlanSummary
              plan={currentPlan}
              subscription={subscription}
              canManage
              pendingCheckoutUrl={data?.pendingCheckoutUrl}
              upgradePlan={upgradeTarget}
              onUpgrade={handleSelectPlan}
              uncoveredPropertyCount={uncoveredPropertyCount}
              onCoverUncoveredProperties={
                subscription && currentPlan && uncoveredPropertyCount > 0
                  ? () => handleSelectPlan(currentPlan)
                  : undefined
              }
              onManageBilling={() => setActiveTab('billing')}
            />
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PlansTab)}
            className="min-w-0"
          >
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1 sm:w-auto">
              <TabsTrigger value="plans" className="gap-2 px-3 py-2">
                <LayoutGrid className="size-4 shrink-0" aria-hidden />
                <span>Plans</span>
              </TabsTrigger>
              <TabsTrigger value="compare" className="gap-2 px-3 py-2">
                <FileText className="size-4 shrink-0" aria-hidden />
                <span>Compare</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2 px-3 py-2">
                <Receipt className="size-4 shrink-0" aria-hidden />
                <span>Billing</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="mt-5 space-y-6 sm:mt-6">
              <section aria-labelledby="choose-plan-heading" className="min-w-0">
                <PlanTierRail
                  tiers={tiers}
                  hasCurrentPlan={Boolean(effectiveCurrentPlanId)}
                  canSelect
                  onSelectPlan={handleSelectPlan}
                />
              </section>
            </TabsContent>

            <TabsContent value="compare" className="mt-5 sm:mt-6">
              <section aria-labelledby="compare-features-heading" className="min-w-0">
                <h2 id="compare-features-heading" className={cn(planTabSectionTitleClass, 'mb-4')}>
                  Compare features
                </h2>

                <PlanFeatureMatrix
                  tiers={tiers}
                  hasCurrentPlan={Boolean(effectiveCurrentPlanId)}
                  canSelect
                  onSelectPlan={handleSelectPlan}
                  className="border-border/80 shadow-sm"
                />
              </section>
            </TabsContent>

            <TabsContent value="billing" className="mt-5 sm:mt-6">
              <section aria-labelledby="billing-tab-heading" className="min-w-0">
                <h2 id="billing-tab-heading" className={cn(planTabSectionTitleClass, 'mb-4')}>
                  Billing
                </h2>

                <PlanBillingPanel
                  plan={currentPlan}
                  subscription={subscription}
                  transactions={data?.transactions ?? []}
                />
              </section>
            </TabsContent>
          </Tabs>

          <PlanFaqSection />
        </div>
      )}

      <PlanReviewDialog
        open={reviewOpen && Boolean(selectedPlan)}
        plan={selectedPlan}
        currentPlan={currentPlan}
        propertyCount={propertyCount}
        subscription={subscription}
        onOpenChange={setReviewOpen}
        onConfirmDowngrade={async (planId) => {
          if (!org?.id) return;
          await applyDowngrade.mutateAsync({ planId });
        }}
        onCheckoutPaid={async (planId) => {
          if (!org?.id) return;
          const { checkoutUrl } = await createCheckout.mutateAsync({ planId });
          window.location.assign(checkoutUrl);
        }}
        isSubmitting={createCheckout.isPending || applyDowngrade.isPending}
      />
    </AdminMobilePage>
  );
}
