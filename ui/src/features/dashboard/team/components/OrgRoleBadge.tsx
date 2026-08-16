import {
  getOrgRoleColor,
  getOrgRoleLabel,
  ORG_ROLES,
} from '@/features/dashboard/team/lib/orgTeamConstants';
import type { OrgRoleId } from '@/features/dashboard/team/types/orgTeam';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = {
  roleId: string;
};

export function OrgRoleBadge({ roleId }: Props) {
  return (
    <Badge className={cn('border-transparent text-white', getOrgRoleColor(roleId))}>
      {getOrgRoleLabel(roleId)}
    </Badge>
  );
}

type DotProps = {
  roleId: OrgRoleId | string;
  className?: string;
};

export function OrgRoleDot({ roleId, className }: DotProps) {
  const config = ORG_ROLES.find((r) => r.value === roleId);
  if (!config) {
    return <div className={cn('size-2 shrink-0 rounded-full bg-gray-500', className)} />;
  }
  return <div className={cn('size-2 shrink-0 rounded-full', config.color, className)} />;
}
