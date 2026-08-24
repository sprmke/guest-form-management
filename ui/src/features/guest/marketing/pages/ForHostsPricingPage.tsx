import { useMemo } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { ArrowRight, CreditCard, LayoutGrid } from 'lucide-react';

import { PlanFeatureMatrix } from '@/features/dashboard/plans/components/PlanFeatureMatrix';
import { PlanTierRail } from '@/features/dashboard/plans/components/PlanTierRail';
import {
  buildPlanTiers,
  isManagedSalesPlan,
  planTabSectionTitleClass,
} from '@/features/dashboard/plans/lib/planPresentation';
import type { PropertyPlanDto } from '@/features/dashboard/plans/lib/propertyPlanApi';
import { usePublicPricingPlans } from '@/features/guest/marketing/for-hosts/hooks/usePublicPricingPlans';
import { MarketingPublicCallout } from '@/features/guest/marketing/shared/components/MarketingPublicCallout';
import { MarketingPublicPageContent } from '@/features/guest/marketing/shared/components/MarketingPublicPageContent';
import { MarketingPublicPageHero } from '@/features/guest/marketing/shared/components/MarketingPublicPageHero';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { publicPageTitle, usePageTitle } from '@/lib/pageTitle';
import { cn } from '@/lib/utils';

function PublicPricingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[28rem] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ForHostsPricingPage() {
  usePageTitle(publicPageTitle('Pricing'));
  const navigate = useNavigate();
  const { data: plans = [], isLoading, isError, refetch } = usePublicPricingPlans();

  const tiers = useMemo(() => buildPlanTiers(plans, undefined), [plans]);

  const handleSelectPlan = (plan: PropertyPlanDto) => {
    if (isManagedSalesPlan(plan.code)) {
      navigate('/contact');
      return;
    }
    navigate('/for-hosts/login');
  };

  return (
    <div className="bg-background min-h-screen">
      <MarketingPublicPageHero
        eyebrow="For Hosts"
        title="Plans that grow with you"
        description="Start free on one listing. Upgrade when you need automation, marketing, AI, or hands-off hosting."
        blobPosition="right"
      />

      <MarketingPublicPageContent>
        {isLoading ? <PublicPricingSkeleton /> : null}

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground text-sm">Could not load plans.</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && tiers.length > 0 ? (
          <div className="space-y-12">
            <PlanTierRail
              tiers={tiers}
              hasCurrentPlan={false}
              canSelect
              onSelectPlan={handleSelectPlan}
            />

            <section className="space-y-4">
              <h2 className={cn(planTabSectionTitleClass)}>Compare features</h2>
              <PlanFeatureMatrix
                tiers={tiers}
                hasCurrentPlan={false}
                canSelect
                onSelectPlan={handleSelectPlan}
              />
            </section>
          </div>
        ) : null}

        <MarketingPublicCallout
          variant="inset"
          className="mt-12"
          icon={CreditCard}
          title="Managing more than one property?"
          body={
            <>
              After sign-up, bundle Pro, Business, or Business Plus across your portfolio from the
              org Plans page. Questions before you start?{' '}
              <Link to="/contact" className="text-primary font-medium hover:underline">
                Contact us
              </Link>
              .
            </>
          }
          actions={
            <>
              <Button variant="outline" className="min-h-[44px] rounded-full" asChild>
                <Link to="/for-hosts">
                  <LayoutGrid className="mr-2 h-4 w-4" aria-hidden />
                  Back to overview
                </Link>
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 min-h-[44px] rounded-full text-white"
                asChild
              >
                <Link to="/for-hosts/login">
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </>
          }
        />
      </MarketingPublicPageContent>
    </div>
  );
}
