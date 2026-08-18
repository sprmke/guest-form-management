import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { FileText, LayoutGrid, Receipt } from 'lucide-react';

import {
  helpSupportNewTicketPath,
  useHelpSupportBasePath,
} from '@/features/dashboard/help-support/lib/helpSupportPaths';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { CurrentPlanSummary } from '@/features/dashboard/plans/components/CurrentPlanSummary';
import { PlanBillingPanel } from '@/features/dashboard/plans/components/PlanBillingPanel';
import { PlanFaqSection } from '@/features/dashboard/plans/components/PlanFaqSection';
import { PlanFeatureMatrix } from '@/features/dashboard/plans/components/PlanFeatureMatrix';
import { PlanReviewDialog } from '@/features/dashboard/plans/components/PlanReviewDialog';
import { PlanTierRail } from '@/features/dashboard/plans/components/PlanTierRail';
import {
  useAssignPropertyFreePlan,
  useCreatePropertyPlanCheckout,
  usePropertyPlan,
  useRenewPropertyPlanCheckout,
} from '@/features/dashboard/plans/hooks/usePropertyPlan';
import {
  buildPlanTiers,
  isManagedSalesPlan,
  MANAGED_PLAN_INQUIRY_SUBJECT,
  nextUpgradePlan,
  PLANS_PAGE_SUBTITLE,
  planTabSectionTitleClass,
} from '@/features/dashboard/plans/lib/planPresentation';
import type { PropertyPlanDto } from '@/features/dashboard/plans/lib/propertyPlanApi';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';

import { FloatingPanel } from '@/components/mobile/FloatingPanel';
import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { PropertyPlansSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageTitle } from '@/lib/pageTitle';
import { cn } from '@/lib/utils';

type PlansTab = 'plans' | 'billing' | 'compare';

/**
 * Property subscription hub — current plan banner, then tabbed plans carousel,
 * billing history, and full feature comparison (PMA-style navigation).
 */
export function PropertyPlansPage() {
  const navigate = useNavigate();
  const orgContext = useOptionalOrgContext();
  const helpSupportBase = useHelpSupportBasePath();
  const propertyName = orgContext?.property.name?.trim();
  usePageTitle(propertyName ? `${propertyName} - Plans` : undefined);

  const { data: access } = usePropertyPermissions();
  const { data, isLoading, error, refetch } = usePropertyPlan();
  const assignFree = useAssignPropertyFreePlan();
  const createCheckout = useCreatePropertyPlanCheckout();
  const renewCheckout = useRenewPropertyPlanCheckout();
  const [selectedPlan, setSelectedPlan] = useState<PropertyPlanDto | null>(null);
  const [activeTab, setActiveTab] = useState<PlansTab>('plans');

  const isOwner = access?.accessKind === 'owner' || access?.accessKind === 'platform_admin';
  const currentPlanId = data?.subscription?.planId;
  const plans = data?.plans ?? [];

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === currentPlanId) ?? null,
    [plans, currentPlanId]
  );

  const tiers = useMemo(() => buildPlanTiers(plans, currentPlanId), [plans, currentPlanId]);
  const upgradeTarget = useMemo(
    () => nextUpgradePlan(plans, currentPlanId),
    [plans, currentPlanId]
  );
  const hasPlans = plans.length > 0;

  const handleSelectPlan = (plan: PropertyPlanDto) => {
    if (isManagedSalesPlan(plan.code) && plan.id !== currentPlanId && helpSupportBase) {
      navigate(
        helpSupportNewTicketPath(helpSupportBase, { subject: MANAGED_PLAN_INQUIRY_SUBJECT })
      );
      return;
    }
    setSelectedPlan(plan);
  };

  return (
    <AdminMobilePage
      title="Plans"
      subtitle={PLANS_PAGE_SUBTITLE}
      titleId="property-plans-heading"
      dense
      className="min-w-0 max-w-full"
    >
      {isLoading && !data ? (
        <PropertyPlansSkeleton />
      ) : error ? (
        <FloatingPanel padding="lg" className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-foreground text-sm font-semibold">Could not load plans</p>
          <p className="text-caption max-w-sm">
            {error instanceof Error ? error.message : 'Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="native-cta max-w-xs sm:w-auto sm:px-4"
          >
            Retry
          </button>
        </FloatingPanel>
      ) : !hasPlans ? (
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

          <CurrentPlanSummary
            plan={currentPlan}
            subscription={data?.subscription ?? null}
            canManage={Boolean(isOwner)}
            pendingCheckoutUrl={data?.pendingCheckoutUrl}
            isPaying={renewCheckout.isPending}
            upgradePlan={upgradeTarget}
            onManageBilling={() => setActiveTab('billing')}
            onUpgrade={handleSelectPlan}
            onPayNow={async () => {
              const { checkoutUrl } = await renewCheckout.mutateAsync();
              window.location.assign(checkoutUrl);
            }}
          />

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

            <TabsContent value="plans" className="mt-5 sm:mt-6">
              <section aria-labelledby="choose-plan-heading" className="min-w-0">
                <PlanTierRail
                  tiers={tiers}
                  hasCurrentPlan={Boolean(currentPlanId)}
                  canSelect={Boolean(isOwner)}
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
                  hasCurrentPlan={Boolean(currentPlanId)}
                  canSelect={Boolean(isOwner)}
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
                  subscription={data?.subscription ?? null}
                  transactions={data?.transactions ?? []}
                />
              </section>
            </TabsContent>
          </Tabs>

          <PlanFaqSection />
        </div>
      )}

      <PlanReviewDialog
        open={Boolean(selectedPlan)}
        plan={selectedPlan}
        currentPlan={currentPlan}
        onOpenChange={(open) => {
          if (!open) setSelectedPlan(null);
        }}
        onConfirmFree={async (planId) => {
          await assignFree.mutateAsync(planId);
        }}
        onCheckoutPaid={async (planId) => {
          const { checkoutUrl } = await createCheckout.mutateAsync(planId);
          window.location.assign(checkoutUrl);
        }}
        isSubmitting={assignFree.isPending || createCheckout.isPending}
      />
    </AdminMobilePage>
  );
}
