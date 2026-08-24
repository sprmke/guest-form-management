import { useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { Check, Loader2 } from 'lucide-react';

import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import { PlanTierIconWell } from '@/features/dashboard/plans/components/PlanTierIconWell';
import { useCreateOrgPlanCheckout, useOrgPlan } from '@/features/dashboard/plans/hooks/useOrgPlan';
import type { OrgBundlePlanDto } from '@/features/dashboard/plans/lib/orgPlanApi';
import {
  planDisplayName,
  planFeatureGains,
  planPrice,
  PESO_WHOLE,
} from '@/features/dashboard/plans/lib/planPresentation';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { PropertyPlansSkeleton } from '@/components/skeletons/AdminSkeletons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

function PropertyCoverageBadge({ covered }: { covered: boolean }) {
  if (!covered) return null;
  return (
    <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
      <Check className="size-3" aria-hidden />
      Covered
    </span>
  );
}

export function OrgPlansPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: orgsData, isLoading: orgsLoading } = useOrganizations();
  const org = orgsData?.organizations.find((entry) => entry.slug === orgSlug);

  const { data, isLoading, error, refetch } = useOrgPlan(org?.id ?? null);
  const createCheckout = useCreateOrgPlanCheckout(org?.id ?? null);

  const [selectedPlan, setSelectedPlan] = useState<OrgBundlePlanDto | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  const subscription = data?.subscription ?? null;
  const assignedPropertyIds = useMemo(
    () => new Set(data?.assignedPropertyIds ?? []),
    [data?.assignedPropertyIds]
  );
  const currentPlan = useMemo(
    () => data?.plans.find((plan) => plan.id === subscription?.planId) ?? null,
    [data?.plans, subscription?.planId]
  );

  const toggleProperty = (propertyId: string, maxProperties: number) => {
    setSelectedPropertyIds((current) => {
      if (current.includes(propertyId)) {
        return current.filter((id) => id !== propertyId);
      }
      if (current.length >= maxProperties) return current;
      return [...current, propertyId];
    });
  };

  const startPlan = (plan: OrgBundlePlanDto) => {
    setSelectedPlan(plan);
    setSelectedPropertyIds([]);
  };

  const isBootstrapping = orgsLoading || (Boolean(org?.id) && isLoading && !data);

  if (isBootstrapping) {
    return (
      <AdminMobilePage title="Portfolio Plans" subtitle="Bundle pricing across your properties.">
        <PropertyPlansSkeleton />
      </AdminMobilePage>
    );
  }

  if (!org || error) {
    return (
      <AdminMobilePage title="Portfolio Plans" subtitle="Bundle pricing across your properties.">
        <div className="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center text-sm">
          <p>Could not load portfolio plans.</p>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </AdminMobilePage>
    );
  }

  return (
    <AdminMobilePage
      title="Portfolio Plans"
      subtitle="Bundle Pro, Business, or Business Plus across multiple properties in one subscription."
    >
      <div className="space-y-6">
        {subscription ? (
          <section className="border-border bg-muted/30 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <PlanTierIconWell planCode={subscription.planCode} />
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-semibold">{subscription.planName}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {subscription.pricePhpSnapshot != null
                    ? PESO_WHOLE.format(subscription.pricePhpSnapshot)
                    : '—'}
                  /month · covers up to {subscription.maxProperties} properties
                </p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {data?.properties.map((property) => (
                <li key={property.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{property.name}</span>
                  <PropertyCoverageBadge covered={assignedPropertyIds.has(property.id)} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              No active portfolio subscription. Choose a tier below to bundle multiple properties
              under one plan instead of paying per property.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {data?.plans.map((plan) => {
                const price = planPrice(plan);
                const gains = planFeatureGains(currentPlan?.features ?? null, plan.features);
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'border-border flex flex-col gap-3 rounded-xl border p-4',
                      selectedPlan?.id === plan.id && 'border-primary ring-primary/30 ring-2'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <PlanTierIconWell planCode={plan.code} size="sm" />
                      <p className="text-foreground text-sm font-semibold">
                        {planDisplayName(plan)}
                      </p>
                    </div>
                    <p className="text-foreground text-xl font-bold tabular-nums">
                      {price.amount}
                      <span className="text-muted-foreground text-xs font-normal">
                        {price.suffix}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Up to {plan.maxProperties} properties
                    </p>
                    {gains.length > 0 ? (
                      <ul className="text-muted-foreground space-y-1 text-xs">
                        {gains.slice(0, 4).map((gain) => (
                          <li key={gain.key} className="flex items-start gap-1.5">
                            <Check className="text-primary mt-0.5 size-3 shrink-0" aria-hidden />
                            {gain.label}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <Button
                      type="button"
                      variant={selectedPlan?.id === plan.id ? 'default' : 'outline'}
                      className="mt-auto min-h-[44px]"
                      onClick={() => startPlan(plan)}
                    >
                      Select {planDisplayName(plan)}
                    </Button>
                  </div>
                );
              })}
            </div>

            {selectedPlan ? (
              <section className="border-border rounded-xl border p-4">
                <p className="text-foreground text-sm font-semibold">
                  Choose up to {selectedPlan.maxProperties} properties
                </p>
                <ul className="mt-3 space-y-1">
                  {data?.properties.map((property) => {
                    const alreadyCovered = assignedPropertyIds.has(property.id);
                    const checked = selectedPropertyIds.includes(property.id);
                    return (
                      <li key={property.id} className="flex items-center gap-2.5 py-1">
                        <Checkbox
                          id={`org-plan-property-${property.id}`}
                          checked={checked}
                          disabled={alreadyCovered}
                          onCheckedChange={() =>
                            toggleProperty(property.id, selectedPlan.maxProperties ?? 0)
                          }
                        />
                        <label
                          htmlFor={`org-plan-property-${property.id}`}
                          className={cn(
                            'text-sm',
                            alreadyCovered && 'text-muted-foreground line-through'
                          )}
                        >
                          {property.name}
                          {alreadyCovered ? ' (already in another portfolio)' : ''}
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <Button
                  type="button"
                  className="mt-4 min-h-[44px]"
                  disabled={selectedPropertyIds.length === 0 || createCheckout.isPending}
                  onClick={async () => {
                    const { checkoutUrl } = await createCheckout.mutateAsync({
                      planId: selectedPlan.id,
                      propertyIds: selectedPropertyIds,
                    });
                    window.location.assign(checkoutUrl);
                  }}
                >
                  {createCheckout.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  Continue to payment
                </Button>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AdminMobilePage>
  );
}
