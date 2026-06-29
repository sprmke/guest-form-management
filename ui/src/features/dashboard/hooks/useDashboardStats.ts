import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import {
  resolveDashboardPeriod,
} from '@/features/dashboard/lib/dashboardPeriod';
import type { DashboardStats } from '@/features/dashboard/lib/types';

const DASHBOARD_STATS_KEY = ['dashboard-stats'] as const;

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function fetchDashboardStats(
  from: string,
  to: string,
): Promise<DashboardStats> {
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData.session?.access_token;
  if (!jwt) throw new Error('No admin session');

  const params = new URLSearchParams({ from, to });
  const res = await fetch(`${FUNCTIONS_URL}/dashboard-stats?${params.toString()}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? 'Failed to load dashboard');
  }
  return json.data as DashboardStats;
}

export function useDashboardStats() {
  const [searchParams] = useSearchParams();

  const period = useMemo(
    () => resolveDashboardPeriod(searchParams),
    [searchParams],
  );

  const query = useQuery({
    queryKey: [...DASHBOARD_STATS_KEY, period] as const,
    queryFn: () => fetchDashboardStats(period.from, period.to),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return { ...query, period };
}
