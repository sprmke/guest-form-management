import { Crown, Mail, ShieldCheck, Users } from 'lucide-react';

import { AdminMetricCard } from '@/features/dashboard/bookings/components/AdminMetricCard';
import type { OrgTeamInvitation, OrgTeamMember } from '@/features/dashboard/team/types/orgTeam';

import { cn } from '@/lib/utils';

type Props = {
  members: OrgTeamMember[];
  invitations: OrgTeamInvitation[];
};

export function OrgTeamStatsCards({ members, invitations }: Props) {
  const adminCount = members.filter((m) => m.role === 'ADMIN').length;
  const ownerCount = members.filter((m) => m.isOwner).length;
  const pendingInvites = invitations.length;

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
      <AdminMetricCard
        title="Total Members"
        value={String(members.length)}
        icon={Users}
        iconClassName="text-sky-600 dark:text-sky-400"
        iconBgClassName="bg-sky-100 dark:bg-sky-900/30"
      />
      <AdminMetricCard
        title="Owners"
        value={String(ownerCount)}
        icon={Crown}
        iconClassName="text-amber-600 dark:text-amber-400"
        iconBgClassName="bg-amber-100 dark:bg-amber-900/30"
      />
      <AdminMetricCard
        title="Admins"
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
    </div>
  );
}
