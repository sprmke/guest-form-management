import { useParams } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import {
  SuperAdminHostOrgCard,
  SuperAdminHostOrgsEmptyState,
} from '@/features/dashboard/super-admin/components/super-admin-hosts/SuperAdminHostOrgCard';
import { useHostOrganizations } from '@/features/dashboard/super-admin/hooks/useHosts';

export function SuperAdminHostOrgsPage() {
  const { hostId = '' } = useParams<{ hostId: string }>();
  const { data: organizations = [], isLoading, error } = useHostOrganizations(hostId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">Could not load organizations.</p>;
  }

  if (organizations.length === 0) {
    return <SuperAdminHostOrgsEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {organizations.map((organization) => (
        <SuperAdminHostOrgCard key={organization.id} organization={organization} />
      ))}
    </div>
  );
}
