import { createContext, useContext, useEffect, useMemo } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { TenantAccessDenied } from '@/features/dashboard/org/components/TenantAccessDenied';
import { useOrganizations, useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import { setLastTenantContext } from '@/features/dashboard/org/lib/tenantPaths';
import type { Organization, Property } from '@/features/dashboard/org/types';

export type OrgContextValue = {
  org: Organization;
  property: Property;
  orgSlug: string;
  propertySlug: string;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrgContext must be used within RequireOrgContext');
  }
  return ctx;
}

export function useOptionalOrgContext(): OrgContextValue | null {
  return useContext(OrgContext);
}

type Props = {
  children: React.ReactNode;
};

export function RequireOrgContext({ children }: Props) {
  const { orgSlug, propertySlug } = useParams<{
    orgSlug: string;
    propertySlug: string;
  }>();

  const orgsQuery = useOrganizations();
  const propsQuery = useProperties(orgSlug);

  const value = useMemo(() => {
    if (!orgSlug || !propertySlug) return null;
    const org = orgsQuery.data?.organizations.find((o) => o.slug === orgSlug);
    const property = propsQuery.data?.properties.find((p) => p.slug === propertySlug);
    if (!org || !property) return null;
    return { org, property, orgSlug, propertySlug };
  }, [orgSlug, propertySlug, orgsQuery.data, propsQuery.data]);

  useEffect(() => {
    if (value) {
      setLastTenantContext(value.orgSlug, value.propertySlug);
    }
  }, [value]);

  if (orgsQuery.isLoading || propsQuery.isLoading) {
    return (
      <div
        className="bg-card fixed inset-0 flex flex-col items-center justify-center gap-3"
        role="status"
      >
        <Loader2 className="text-sidebar-primary size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!orgSlug || !propertySlug) {
    return <Navigate to="/org" replace />;
  }

  if (orgsQuery.isError) {
    return <TenantAccessDenied scope="org" orgSlug={orgSlug} />;
  }

  const org = orgsQuery.data?.organizations.find((o) => o.slug === orgSlug);
  if (!org) {
    return <TenantAccessDenied scope="org" orgSlug={orgSlug} />;
  }

  if (propsQuery.isError) {
    return (
      <TenantAccessDenied
        scope="property"
        orgSlug={orgSlug}
        orgName={org.name}
        propertySlug={propertySlug}
      />
    );
  }

  const property = propsQuery.data?.properties.find((p) => p.slug === propertySlug);
  if (!property) {
    return (
      <TenantAccessDenied
        scope="property"
        orgSlug={orgSlug}
        orgName={org.name}
        propertySlug={propertySlug}
      />
    );
  }

  const contextValue = { org, property, orgSlug, propertySlug };

  return <OrgContext.Provider value={contextValue}>{children}</OrgContext.Provider>;
}
