/**
 * Resolve display name + role for the user changing sensitive settings.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { loadAuthUserProfile } from './authUserProfile.ts';
import { isBuiltinPropertyRole, type BuiltinPropertyRole } from './propertyTeamPermissions.ts';
import { isBuiltinParkingRole, type BuiltinParkingRole } from './parkingTeamPermissions.ts';

const PROPERTY_ROLE_LABELS: Record<BuiltinPropertyRole, string> = {
  MANAGER: 'Manager',
  STAFF: 'Staff',
  VIEWER: 'Viewer',
};

const PARKING_ROLE_LABELS: Record<BuiltinParkingRole, string> = {
  MANAGER: 'Manager',
  STAFF: 'Staff',
  VIEWER: 'Viewer',
};

export type SettingsChangeActor = {
  name: string;
  email: string;
  roleLabel: string;
};

export async function resolveSettingsChangeActor(opts: {
  supabase: SupabaseClient;
  actorUserId: string;
  ownerId: string;
  organizationId: string;
  propertyId?: string | null;
  parkingId?: string | null;
}): Promise<SettingsChangeActor> {
  const profile = await loadAuthUserProfile(opts.supabase, opts.actorUserId);
  const name = profile.name?.trim() || profile.email?.trim() || 'A team member';
  const email = profile.email?.trim() || '';

  if (opts.actorUserId === opts.ownerId) {
    return { name, email, roleLabel: 'Owner' };
  }

  const { data: orgMember } = await opts.supabase
    .from('organization_members')
    .select('role_id, status')
    .eq('organization_id', opts.organizationId)
    .eq('user_id', opts.actorUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (orgMember?.role_id === 'ADMIN') {
    return { name, email, roleLabel: 'Admin' };
  }

  if (opts.propertyId) {
    const { data: propertyMember } = await opts.supabase
      .from('property_members')
      .select('role_id, status')
      .eq('property_id', opts.propertyId)
      .eq('user_id', opts.actorUserId)
      .eq('status', 'active')
      .maybeSingle();

    const roleId = (propertyMember?.role_id as string | undefined)?.trim() ?? '';
    if (roleId) {
      if (isBuiltinPropertyRole(roleId)) {
        return { name, email, roleLabel: PROPERTY_ROLE_LABELS[roleId] };
      }
      const { data: custom } = await opts.supabase
        .from('property_custom_roles')
        .select('name')
        .eq('id', roleId)
        .eq('property_id', opts.propertyId)
        .maybeSingle();
      return {
        name,
        email,
        roleLabel: (custom?.name as string | undefined)?.trim() || 'Team member',
      };
    }
  }

  if (opts.parkingId) {
    const { data: parkingMember } = await opts.supabase
      .from('parking_members')
      .select('role_id, status')
      .eq('parking_id', opts.parkingId)
      .eq('user_id', opts.actorUserId)
      .eq('status', 'active')
      .maybeSingle();

    const roleId = (parkingMember?.role_id as string | undefined)?.trim() ?? '';
    if (roleId) {
      if (isBuiltinParkingRole(roleId)) {
        return { name, email, roleLabel: PARKING_ROLE_LABELS[roleId] };
      }
      return { name, email, roleLabel: 'Team member' };
    }
  }

  return { name, email, roleLabel: 'Team member' };
}
