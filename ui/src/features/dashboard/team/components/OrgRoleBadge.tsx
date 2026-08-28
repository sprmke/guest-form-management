import { ORG_ROLES } from '@/features/dashboard/team/lib/orgTeamConstants';
import { getOrgRoleColor, getOrgRoleLabel } from '@/features/dashboard/team/lib/orgTeamRoles';
import type { CustomOrgRole, OrgRoleId } from '@/features/dashboard/team/types/orgTeam';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = {
  roleId: string;
  customRoles?: CustomOrgRole[];
  muted?: boolean;
};

export function OrgRoleBadge({ roleId, customRoles = [], muted = false }: Props) {
  return (
    <Badge
      className={cn(
        muted
          ? 'border-border bg-muted text-muted-foreground font-normal'
          : cn('border-transparent text-white', getOrgRoleColor(roleId, customRoles))
      )}
    >
      {getOrgRoleLabel(roleId, customRoles)}
    </Badge>
  );
}

type DotProps = {
  roleId: OrgRoleId | string;
  className?: string;
};

export function OrgRoleDot({ roleId, className }: DotProps) {
  const config = ORG_ROLES.find((r) => r.value === roleId);
  const color = config?.color ?? getOrgRoleColor(roleId, []);
  return <div className={cn('size-2 shrink-0 rounded-full', color, className)} />;
}
