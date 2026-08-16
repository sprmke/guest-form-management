import { useQuery } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import type {
  HostOrganization,
  HostProperty,
  HostSummary,
} from '@/features/dashboard/super-admin/types/host';

export const HOSTS_QUERY_KEY = ['super-admin', 'hosts'] as const;

export function hostQueryKey(hostId: string) {
  return ['super-admin', 'host', hostId] as const;
}

export function hostOrganizationsQueryKey(hostId: string) {
  return ['super-admin', 'host', hostId, 'organizations'] as const;
}

export function hostPropertiesQueryKey(hostId: string) {
  return ['super-admin', 'host', hostId, 'properties'] as const;
}

export function useHosts() {
  return useQuery({
    queryKey: HOSTS_QUERY_KEY,
    queryFn: () =>
      callEdgeFunction<{ hosts: HostSummary[] }>('list-hosts').then((data) => data.hosts),
  });
}

export function useHost(hostId: string | undefined) {
  return useQuery({
    queryKey: hostQueryKey(hostId ?? ''),
    enabled: Boolean(hostId),
    queryFn: () =>
      callEdgeFunction<{ host: HostSummary }>(
        `get-host?hostId=${encodeURIComponent(hostId!)}`
      ).then((data) => data.host),
  });
}

export function useHostOrganizations(hostId: string | undefined) {
  return useQuery({
    queryKey: hostOrganizationsQueryKey(hostId ?? ''),
    enabled: Boolean(hostId),
    queryFn: () =>
      callEdgeFunction<{ organizations: HostOrganization[] }>(
        `list-host-organizations?hostId=${encodeURIComponent(hostId!)}`
      ).then((data) => data.organizations),
  });
}

export function useHostProperties(hostId: string | undefined) {
  return useQuery({
    queryKey: hostPropertiesQueryKey(hostId ?? ''),
    enabled: Boolean(hostId),
    queryFn: () =>
      callEdgeFunction<{ properties: HostProperty[] }>(
        `list-host-properties?hostId=${encodeURIComponent(hostId!)}`
      ).then((data) => data.properties),
  });
}
