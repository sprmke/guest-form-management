import { Link, useNavigate } from 'react-router-dom';

import { Loader2, Plus } from 'lucide-react';

import { RequireAdmin } from '@/features/dashboard/bookings/components/RequireAdmin';
import { useOrganizations, useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import { isPropertyOnlyOrgAccess } from '@/features/dashboard/org/lib/orgAccessKind';
import {
  propertySectionPath,
  setLastTenantContext,
} from '@/features/dashboard/org/lib/tenantPaths';
import type { Organization } from '@/features/dashboard/org/types';

import { Button } from '@/components/ui/button';

function OrgCard({ org }: { org: Organization }) {
  const navigate = useNavigate();
  const { data, isLoading } = useProperties(org.slug);

  const openOrg = () => {
    const properties = data?.properties ?? [];
    if (isPropertyOnlyOrgAccess(org.accessKind)) {
      if (properties.length === 0) return;
      const property = properties[0]!;
      setLastTenantContext(org.slug, property.slug);
      navigate(propertySectionPath(org.slug, property.slug, 'dashboard'));
      return;
    }
    if (properties.length === 0) {
      navigate(`/org/${org.slug}/properties`);
      return;
    }
    const property = properties[0]!;
    setLastTenantContext(org.slug, property.slug);
    navigate(propertySectionPath(org.slug, property.slug, 'dashboard'));
  };

  return (
    <button
      type="button"
      onClick={() => openOrg()}
      disabled={isLoading}
      className="border-border bg-card hover:bg-muted/50 flex min-h-[44px] w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors"
    >
      <span className="text-foreground text-sm font-semibold">{org.name}</span>
      {isLoading ? (
        <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden />
      ) : (
        <span className="text-muted-foreground text-xs">
          {data?.properties.length ?? 0}{' '}
          {(data?.properties.length ?? 0) === 1 ? 'property' : 'properties'}
        </span>
      )}
    </button>
  );
}

export function OrgSelectorPage() {
  const { data, isLoading } = useOrganizations();
  const organizations = data?.organizations ?? [];

  return (
    <RequireAdmin>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="text-sidebar-primary size-5 animate-spin" aria-hidden />
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center">
            <Button asChild className="min-h-[44px]">
              <Link to="/onboarding">
                <Plus className="mr-2 size-4" aria-hidden />
                Create organization
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {organizations.map((org) => (
                <OrgCard key={org.id} org={org} />
              ))}
            </div>
            <Button asChild variant="outline" className="min-h-[44px] w-full">
              <Link to="/onboarding">
                <Plus className="mr-2 size-4" aria-hidden />
                New organization
              </Link>
            </Button>
          </>
        )}
      </div>
    </RequireAdmin>
  );
}
