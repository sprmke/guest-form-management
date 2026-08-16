import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { loadAuthUserProfile } from './authUserProfile.ts';

export type HostStats = {
  organizationCount: number;
  propertyCount: number;
  parkingCount: number;
};

export type HostSummary = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  stats: HostStats;
  memberSince: string | null;
};

export function serializeHostSummary(
  userId: string,
  profile: { name: string; email: string; avatarUrl: string | null },
  stats: HostStats,
  memberSince: string | null
): HostSummary {
  return {
    id: userId,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
    stats,
    memberSince,
  };
}

export async function hostStatsForOwner(
  supabase: SupabaseClient,
  ownerId: string
): Promise<HostStats & { memberSince: string | null }> {
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, created_at')
    .eq('owner_id', ownerId);

  if (orgError) {
    console.error('[hostStatsForOwner] orgs', orgError.message);
    throw new Error('Failed to load host organizations');
  }

  const orgRows = orgs ?? [];
  const orgIds = orgRows.map((row) => row.id as string);
  const memberSince =
    orgRows.length > 0
      ? orgRows.reduce(
          (earliest, row) => {
            const createdAt = row.created_at as string;
            return !earliest || createdAt < earliest ? createdAt : earliest;
          },
          null as string | null
        )
      : null;

  if (orgIds.length === 0) {
    return {
      organizationCount: 0,
      propertyCount: 0,
      parkingCount: 0,
      memberSince,
    };
  }

  const [{ count: propertyCount }, { count: parkingCount }] = await Promise.all([
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .in('organization_id', orgIds),
    supabase
      .from('parkings')
      .select('id', { count: 'exact', head: true })
      .in('organization_id', orgIds),
  ]);

  return {
    organizationCount: orgIds.length,
    propertyCount: propertyCount ?? 0,
    parkingCount: parkingCount ?? 0,
    memberSince,
  };
}

export async function loadHostSummary(
  supabase: SupabaseClient,
  ownerId: string
): Promise<HostSummary> {
  const [profile, stats] = await Promise.all([
    loadAuthUserProfile(supabase, ownerId),
    hostStatsForOwner(supabase, ownerId),
  ]);

  return serializeHostSummary(ownerId, profile, stats, stats.memberSince);
}

export async function listDistinctHostOwnerIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from('organizations').select('owner_id');

  if (error) {
    console.error('[listDistinctHostOwnerIds]', error.message);
    throw new Error('Failed to list hosts');
  }

  return [...new Set((data ?? []).map((row) => row.owner_id as string).filter(Boolean))].sort();
}
