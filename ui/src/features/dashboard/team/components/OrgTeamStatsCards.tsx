import { Mail, Shield, Users } from 'lucide-react';

import { AdminMetricCard } from '@/features/dashboard/bookings/components/AdminMetricCard';
import {
  listSeededOrgRoleFilters,
  resolveOrgMemberTemplateRoleId,
} from '@/features/dashboard/team/lib/orgMemberRoleDisplay';
import type {
  CustomOrgRole,
  OrgTeamInvitation,
  OrgTeamMember,
} from '@/features/dashboard/team/types/orgTeam';

import { cn } from '@/lib/utils';

type Props = {
  members: OrgTeamMember[];
  invitations: OrgTeamInvitation[];
  customRoles: CustomOrgRole[];
};

function countByTemplateRole(
  roleId: string,
  members: OrgTeamMember[],
  invitations: OrgTeamInvitation[],
  customRoles: CustomOrgRole[]
): number {
  const memberCount = members.filter(
    (member) => resolveOrgMemberTemplateRoleId(member, customRoles) === roleId
  ).length;
  const inviteCount = invitations.filter(
    (invitation) => resolveOrgMemberTemplateRoleId(invitation, customRoles) === roleId
  ).length;
  return memberCount + inviteCount;
}

export function OrgTeamStatsCards({ members, invitations, customRoles }: Props) {
  const seededRoles = listSeededOrgRoleFilters(customRoles);
  const pendingInvites = invitations.length;

  const metricCards = [
    {
      title: 'Total Members',
      value: String(members.length),
      icon: Users,
      iconClassName: 'text-sky-600 dark:text-sky-400',
      iconBgClassName: 'bg-sky-100 dark:bg-sky-900/30',
    },
    ...seededRoles.map((role) => ({
      title: role.name,
      value: String(countByTemplateRole(role.id, members, invitations, customRoles)),
      icon: Shield,
      iconClassName: 'text-violet-600 dark:text-violet-400',
      iconBgClassName: 'bg-violet-100 dark:bg-violet-900/30',
    })),
    {
      title: 'Pending Invites',
      value: String(pendingInvites),
      icon: Mail,
      iconClassName: 'text-emerald-600 dark:text-emerald-400',
      iconBgClassName: 'bg-emerald-100 dark:bg-emerald-900/30',
      valueClassName: pendingInvites > 0 ? 'text-amber-600 dark:text-amber-400' : undefined,
    },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4',
        metricCards.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'
      )}
    >
      {metricCards.map((card) => (
        <AdminMetricCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          iconClassName={card.iconClassName}
          iconBgClassName={card.iconBgClassName}
          valueClassName={'valueClassName' in card ? card.valueClassName : undefined}
        />
      ))}
    </div>
  );
}
