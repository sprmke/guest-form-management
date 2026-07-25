import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';
import type { Development } from '@/features/dashboard/super-admin/types/development';

export const DEVELOPMENTS_QUERY_KEY = ['super-admin', 'developments'] as const;

export function developmentQueryKey(slug: string) {
  return ['super-admin', 'development', slug] as const;
}

export function useDevelopments() {
  return useQuery({
    queryKey: DEVELOPMENTS_QUERY_KEY,
    queryFn: () =>
      callEdgeFunction<{ developments: Development[] }>('list-developments').then(
        (data) => data.developments
      ),
  });
}

export function useDevelopment(slug: string | undefined) {
  return useQuery({
    queryKey: developmentQueryKey(slug ?? ''),
    enabled: Boolean(slug),
    queryFn: () =>
      callEdgeFunction<{ development: Development }>(
        `get-development?slug=${encodeURIComponent(slug!)}`
      ).then((data) => data.development),
  });
}

export function useCreateDevelopment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; type?: string }) =>
      callEdgeFunction<{ development: Development }>('create-development', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((data) => data.development),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: DEVELOPMENTS_QUERY_KEY });
    },
  });
}

export function useUpdateDevelopment(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown> & { developmentId: string }) =>
      callEdgeFunction<{ development: Development }>('update-development', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }).then((data) => data.development),
    onSuccess: async (development) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: DEVELOPMENTS_QUERY_KEY }),
        qc.invalidateQueries({ queryKey: developmentQueryKey(slug) }),
        qc.setQueryData(developmentQueryKey(development.slug), development),
      ]);
    },
  });
}

export function useDeleteDevelopment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (developmentId: string) =>
      callEdgeFunction<{ deleted: boolean }>('delete-development', {
        method: 'POST',
        body: JSON.stringify({ developmentId }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: DEVELOPMENTS_QUERY_KEY });
    },
  });
}
