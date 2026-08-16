import type { HostSummary } from '@/features/dashboard/super-admin/types/host';

export type SuperAdminHostsFilters = {
  search: string;
};

import type { SuperAdminListViewMode } from '@/features/dashboard/super-admin/lib/superAdminListViewMode';

export type SuperAdminHostsViewMode = SuperAdminListViewMode;

export function filterSuperAdminHosts(
  hosts: HostSummary[],
  filters: SuperAdminHostsFilters
): HostSummary[] {
  const search = filters.search.trim().toLowerCase();
  if (!search) return hosts;

  return hosts.filter((host) => {
    const haystack = [host.name, host.email].join(' ').toLowerCase();
    return haystack.includes(search);
  });
}

export function superAdminHostsHasActiveFilters(filters: SuperAdminHostsFilters): boolean {
  return filters.search.trim() !== '';
}

export function superAdminHostsSummaryFromList(hosts: HostSummary[]) {
  const total = hosts.length;
  const totalOrgs = hosts.reduce((sum, host) => sum + host.stats.organizationCount, 0);
  const totalProperties = hosts.reduce((sum, host) => sum + host.stats.propertyCount, 0);
  const totalParking = hosts.reduce((sum, host) => sum + host.stats.parkingCount, 0);
  return { total, totalOrgs, totalProperties, totalParking };
}

export function hostDisplayInitial(name: string, email: string): string {
  const source = name.trim() || email.split('@')[0] || 'H';
  return source[0]?.toUpperCase() ?? 'H';
}
