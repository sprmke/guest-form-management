import { Building2, Mail, ShieldCheck, Users } from 'lucide-react';

import { AdminMetricCard } from '@/features/dashboard/bookings/components/AdminMetricCard';
import { expandLegacyPropertyPermissionIds } from '@/features/dashboard/team/lib/legacyPermissionExpansion';
import type { TeamInvitation, TeamMember } from '@/features/dashboard/team/types/propertyTeam';

import { cn } from '@/lib/utils';

type Props = {
  members: TeamMember[];
  invitations: TeamInvitation[];
};

function memberHasTeamManageAccess(permissions: readonly string[]): boolean {
  const expanded = expandLegacyPropertyPermissionIds(permissions);
  return (
    expanded.includes('team.members:edit') ||
    expanded.includes('team.members:delete') ||
    expanded.includes('team.customRoles:add') ||
    expanded.includes('team.customRoles:edit') ||
    expanded.includes('team.customRoles:delete') ||
    expanded.includes('team:manage')
  );
}

export function TeamStatsCards({ members, invitations }: Props) {
  const adminCount = members.filter(
    (m) => memberHasTeamManageAccess(m.permissions) || m.fromOrg
  ).length;
  const fromOrgCount = members.filter((m) => m.fromOrg).length;
  const pendingInvites = invitations.length;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
      <AdminMetricCard
        title="Total Members"
        value={String(members.length)}
        icon={Users}
        iconClassName="text-sky-600 dark:text-sky-400"
        iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
      />
      <AdminMetricCard
        title="Team access"
        value={String(adminCount)}
        icon={ShieldCheck}
        iconClassName="text-violet-600 dark:text-violet-400"
        iconBgClassName="bg-violet-100 dark:bg-violet-900/30"
      />
      <AdminMetricCard
        title="Pending Invites"
        value={String(pendingInvites)}
        icon={Mail}
        iconClassName="text-emerald-600 dark:text-emerald-400"
        iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
        valueClassName={cn(pendingInvites > 0 ? 'text-amber-600 dark:text-amber-400' : undefined)}
      />
      <AdminMetricCard
        title="From Organization"
        value={String(fromOrgCount)}
        icon={Building2}
        iconClassName="text-amber-600 dark:text-amber-400"
        iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
      />
    </div>
  );
}
