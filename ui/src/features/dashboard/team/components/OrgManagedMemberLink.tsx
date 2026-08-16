import { Link } from 'react-router-dom';

import { ArrowUpRight, Building2 } from 'lucide-react';

import { orgTeamPath } from '@/features/dashboard/org/lib/tenantPaths';
import { useOrgPermissions } from '@/features/dashboard/team/hooks/useOrgPermissions';
import { hasOrgPermission } from '@/features/dashboard/team/lib/orgPermissions';

import { Button } from '@/components/ui/button';

type Props = {
  orgSlug: string;
};

export function OrgManagedMemberLink({ orgSlug }: Props) {
  const { data } = useOrgPermissions();
  const canViewOrgTeam = hasOrgPermission(data?.permissions, 'org:team:view');

  if (!canViewOrgTeam) {
    return null;
  }

  return (
    <Button variant="outline" size="sm" className="min-h-[44px] gap-1.5 sm:min-h-9" asChild>
      <Link to={orgTeamPath(orgSlug)}>
        <Building2 className="size-3.5 shrink-0" aria-hidden />
        <span>Manage in org</span>
        <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
      </Link>
    </Button>
  );
}
