import { useEffect } from 'react';

import { Navigate, useNavigate } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { useProperties } from '@/features/dashboard/org/hooks/useOrganizations';
import {
  getLastPropertySlug,
  propertySectionPath,
  setLastTenantContext,
} from '@/features/dashboard/org/lib/tenantPaths';

type Props = {
  orgSlug: string;
};

/** Property-only members cannot use org-scoped routes — send them to an assigned property. */
export function PropertyMemberOrgRedirect({ orgSlug }: Props) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useProperties(orgSlug);

  useEffect(() => {
    if (isLoading || isError) return;
    const properties = data?.properties ?? [];
    if (properties.length === 0) return;

    const property =
      properties.find((entry) => entry.slug === getLastPropertySlug()) ?? properties[0]!;
    setLastTenantContext(orgSlug, property.slug);
    navigate(propertySectionPath(orgSlug, property.slug, 'dashboard'), {
      replace: true,
    });
  }, [data, isError, isLoading, navigate, orgSlug]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (isError || !data?.properties.length) {
    return <Navigate to="/org" replace />;
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
    </div>
  );
}
