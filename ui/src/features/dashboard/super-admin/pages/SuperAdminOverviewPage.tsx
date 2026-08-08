import { Link } from 'react-router-dom';

import { ClipboardCheck, Landmark, Users, Building2 } from 'lucide-react';

import { AiPlatformKillSwitchCard } from '@/features/dashboard/super-admin/components/AiPlatformKillSwitchCard';
import { VoiceReceptionistKillSwitchCard } from '@/features/dashboard/super-admin/components/VoiceReceptionistKillSwitchCard';
import { superAdminPaths } from '@/features/dashboard/super-admin/lib/superAdminPaths';

const sections = [
  { title: 'Developments', href: superAdminPaths.developments, Icon: Landmark },
  { title: 'Properties', href: superAdminPaths.properties, Icon: Building2 },
  { title: 'Approvals', href: superAdminPaths.approvals, Icon: ClipboardCheck },
  { title: 'Hosts', href: superAdminPaths.hosts, Icon: Users },
] as const;

export function SuperAdminOverviewPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-admin-page-title sm:text-xl">Super Admin</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ title, href, Icon }) => (
          <Link
            key={href}
            to={href}
            className="border-border bg-card hover:border-primary/40 flex min-h-[88px] items-center gap-3 rounded-xl border p-4 transition-colors"
          >
            <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
            <span className="font-medium">{title}</span>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AiPlatformKillSwitchCard />
        <VoiceReceptionistKillSwitchCard />
      </div>
    </div>
  );
}
