import { useState } from 'react';

import { Search } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminListViewToggle } from '@/features/dashboard/super-admin/components/shared/SuperAdminListViewToggle';
import { SuperAdminApprovalsTable } from '@/features/dashboard/super-admin/components/super-admin-approvals/SuperAdminApprovalsTable';
import type { SuperAdminListViewMode } from '@/features/dashboard/super-admin/lib/superAdminListViewMode';

import { Input } from '@/components/ui/input';

export function SuperAdminApprovalsPage() {
  const [viewMode, setViewMode] = useState<SuperAdminListViewMode>('table');

  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminPageHeader title="Approvals" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            placeholder="Search approvals…"
            className="h-10 pl-9"
            aria-label="Search approvals"
            disabled
          />
        </div>

        <SuperAdminListViewToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          className="self-end sm:self-auto"
        />
      </div>

      <SuperAdminApprovalsTable />
    </div>
  );
}
