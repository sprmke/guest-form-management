/**
 * Org/property/parking auth — owner, platform admin, and team RBAC.
 *
 * verifyAuthenticatedUser — any valid Supabase JWT
 * verifyOrgOwner — JWT + organizations.owner_id match
 * verifyPropertyOwner — JWT + property belongs to an org the user owns
 * verifyPropertyAccess — owner | platform admin | active property_members + optional permission
 * isPlatformAdmin — ADMIN_ALLOWED_EMAILS superadmin escape hatch
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { resolveSupabaseServiceRoleKey, resolveSupabaseUrl } from './supabaseRuntimeEnv.ts';

import {
  allOrgPermissions,
  hasOrgPermission,
  ORG_PROPERTY_MEMBER_PERMISSIONS,
  ORG_ROLE_PERMISSIONS,
  type OrgPermissionId,
} from './orgTeamPermissions.ts';
import {
  allParkingTeamPermissions,
  BUILTIN_PARKING_ROLE_PERMISSIONS,
  effectiveMemberPermissions as effectiveParkingMemberPermissions,
  type ParkingTeamPermissionId,
} from './parkingTeamPermissions.ts';
import {
  allTeamPermissions,
  BUILTIN_ROLE_PERMISSIONS,
  effectiveMemberPermissions,
  type TeamPermissionId,
} from './propertyTeamPermissions.ts';

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type OrgRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  host_modes: string[] | null;
  created_at: string;
  updated_at: string;
};

export type ParkingRow = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  status: string;
  residence_name: string | null;
  tower: string | null;
  level: string | null;
  slot_label: string;
  parking_type: string;
  rate_per_night: number | null;
  accepted_vehicle_types: string[];
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PropertyRow = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  address: string | null;
  tower_and_unit: string | null;
  tower: string | null;
  unit_number: string | null;
  residence_name: string | null;
  max_guests: number | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function unauthorizedResponse(message: string): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function forbiddenResponse(message: string): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

function notFoundResponse(message: string): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createServiceClient(): SupabaseClient {
  return createClient(resolveSupabaseUrl(), resolveSupabaseServiceRoleKey());
}

export function isPlatformAdmin(email: string): boolean {
  const allowedRaw = Deno.env.get('ADMIN_ALLOWED_EMAILS') ?? '';
  const allowed = allowedRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export function isSuperAdminEmail(email: string): boolean {
  const raw = Deno.env.get('SUPER_ADMIN_EMAILS') ?? '';
  const allowed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return email.trim() !== '' && allowed.includes(email.trim().toLowerCase());
}

function extractBearerJwt(req: Request): string {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw unauthorizedResponse('Missing or invalid Authorization header');
  }
  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) {
    throw unauthorizedResponse('Missing JWT');
  }
  return jwt;
}

/** Validates JWT only — any signed-in Google user. */
export async function verifyAuthenticatedUser(req: Request): Promise<AuthenticatedUser> {
  const jwt = extractBearerJwt(req);
  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) {
    throw unauthorizedResponse('Invalid or expired session');
  }
  const email = data.user.email ?? '';
  if (!email) {
    throw unauthorizedResponse('Account email is required');
  }
  return { id: data.user.id, email };
}

/** Optional JWT — returns null when missing or invalid (public endpoints). */
export async function tryGetAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email };
}

/** JWT + org ownership (or platform admin). */
export async function verifyOrgOwner(
  req: Request,
  orgId: string
): Promise<{ user: AuthenticatedUser; org: OrgRow }> {
  const user = await verifyAuthenticatedUser(req);
  const supabase = createServiceClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();

  if (error) {
    console.error('[orgAuth] org lookup failed:', error.message);
    throw forbiddenResponse('Could not verify organization access');
  }
  if (!org) {
    throw notFoundResponse('Organization not found');
  }

  if (org.owner_id !== user.id && !isPlatformAdmin(user.email)) {
    throw forbiddenResponse('Access restricted');
  }

  return { user, org: org as OrgRow };
}

/** JWT + property belongs to an org the user owns (or platform admin). */
export async function verifyPropertyOwner(
  req: Request,
  propertyId: string
): Promise<{ user: AuthenticatedUser; property: PropertyRow; org: OrgRow }> {
  const user = await verifyAuthenticatedUser(req);
  const supabase = createServiceClient();

  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .maybeSingle();

  if (propError) {
    console.error('[orgAuth] property lookup failed:', propError.message);
    throw forbiddenResponse('Could not verify property access');
  }
  if (!property) {
    throw notFoundResponse('Property not found');
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', property.organization_id)
    .maybeSingle();

  if (orgError || !org) {
    throw forbiddenResponse('Could not verify organization access');
  }

  if (org.owner_id !== user.id && !isPlatformAdmin(user.email)) {
    throw forbiddenResponse('Access restricted');
  }

  return {
    user,
    property: property as PropertyRow,
    org: org as OrgRow,
  };
}

export type PropertyAccessKind = 'owner' | 'platform_admin' | 'org_admin' | 'member';

export type PropertyAccessContext = {
  user: AuthenticatedUser;
  property: PropertyRow;
  org: OrgRow;
  accessKind: PropertyAccessKind;
  /** Effective permission ids for this request (full catalog for owner/platform admin). */
  permissions: TeamPermissionId[];
  memberId?: string;
};

type PropertyMemberDbRow = {
  id: string;
  role_id: string;
  permissions: unknown;
  status: string;
};

function capStaffMemberPermissions(
  roleId: string,
  permissions: TeamPermissionId[]
): TeamPermissionId[] {
  if (roleId !== 'STAFF') return permissions;
  const allowed = new Set(BUILTIN_ROLE_PERMISSIONS.STAFF);
  return permissions.filter((permission) => allowed.has(permission));
}

/**
 * JWT + property access for org owner, platform admin, or active property_members row.
 * Optional requiredPermission enforces RBAC (team:*, bookings:*, etc.).
 */
export async function verifyPropertyAccess(
  req: Request,
  propertyId: string,
  requiredPermission?: TeamPermissionId
): Promise<PropertyAccessContext> {
  const user = await verifyAuthenticatedUser(req);
  const supabase = createServiceClient();

  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .maybeSingle();

  if (propError) {
    console.error('[orgAuth] property lookup failed:', propError.message);
    throw forbiddenResponse('Could not verify property access');
  }
  if (!property) {
    throw notFoundResponse('Property not found');
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', property.organization_id)
    .maybeSingle();

  if (orgError || !org) {
    throw forbiddenResponse('Could not verify organization access');
  }

  const orgRow = org as OrgRow;
  const propertyRow = property as PropertyRow;

  if (orgRow.owner_id === user.id) {
    const ctx: PropertyAccessContext = {
      user,
      property: propertyRow,
      org: orgRow,
      accessKind: 'owner',
      permissions: allTeamPermissions(),
    };
    if (requiredPermission && !ctx.permissions.includes(requiredPermission)) {
      throw forbiddenResponse('Access restricted');
    }
    return ctx;
  }

  if (isPlatformAdmin(user.email)) {
    const ctx: PropertyAccessContext = {
      user,
      property: propertyRow,
      org: orgRow,
      accessKind: 'platform_admin',
      permissions: allTeamPermissions(),
    };
    if (requiredPermission && !ctx.permissions.includes(requiredPermission)) {
      throw forbiddenResponse('Access restricted');
    }
    return ctx;
  }

  const { data: orgAdminMember, error: orgAdminError } = await supabase
    .from('organization_members')
    .select('id, status, role_id')
    .eq('organization_id', orgRow.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (orgAdminError) {
    console.error('[orgAuth] org member lookup failed:', orgAdminError.message);
    throw forbiddenResponse('Could not verify property access');
  }

  if (orgAdminMember && orgAdminMember.status === 'active' && orgAdminMember.role_id === 'ADMIN') {
    const ctx: PropertyAccessContext = {
      user,
      property: propertyRow,
      org: orgRow,
      accessKind: 'org_admin',
      permissions: allTeamPermissions(),
      memberId: orgAdminMember.id as string,
    };
    if (requiredPermission && !ctx.permissions.includes(requiredPermission)) {
      throw forbiddenResponse('Access restricted');
    }
    return ctx;
  }

  const { data: member, error: memberError } = await supabase
    .from('property_members')
    .select('id, role_id, permissions, status')
    .eq('property_id', propertyId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberError) {
    console.error('[orgAuth] property member lookup failed:', memberError.message);
    throw forbiddenResponse('Could not verify property access');
  }

  if (!member || member.status !== 'active') {
    throw forbiddenResponse('Access restricted');
  }

  const memberRow = member as PropertyMemberDbRow;
  const permissions = capStaffMemberPermissions(
    memberRow.role_id,
    effectiveMemberPermissions({
      permissions: memberRow.permissions,
      status: 'active',
    })
  );

  if (permissions.length === 0) {
    throw forbiddenResponse('Access restricted');
  }

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    throw forbiddenResponse('Access restricted');
  }

  return {
    user,
    property: propertyRow,
    org: orgRow,
    accessKind: 'member',
    permissions,
    memberId: memberRow.id,
  };
}

export type ParkingAccessKind = 'owner' | 'platform_admin' | 'org_admin' | 'member';

export type ParkingTeamAccessContext = {
  user: AuthenticatedUser;
  parking: ParkingRow;
  org: OrgRow;
  accessKind: ParkingAccessKind;
  permissions: ParkingTeamPermissionId[];
  memberId?: string;
};

type ParkingMemberDbRow = {
  id: string;
  role_id: string;
  permissions: unknown;
  status: string;
};

function capParkingStaffMemberPermissions(
  roleId: string,
  permissions: ParkingTeamPermissionId[]
): ParkingTeamPermissionId[] {
  if (roleId !== 'STAFF') return permissions;
  const allowed = new Set(BUILTIN_PARKING_ROLE_PERMISSIONS.STAFF);
  return permissions.filter((permission) => allowed.has(permission));
}

/**
 * JWT + parking access for org owner, platform admin, org ADMIN, or active parking_members row.
 */
export async function verifyParkingTeamAccess(
  req: Request,
  parkingId: string,
  requiredPermission?: ParkingTeamPermissionId
): Promise<ParkingTeamAccessContext> {
  const user = await verifyAuthenticatedUser(req);
  const supabase = createServiceClient();

  const { data: parking, error: parkingError } = await supabase
    .from('parkings')
    .select('*')
    .eq('id', parkingId)
    .maybeSingle();

  if (parkingError) {
    console.error('[orgAuth] parking lookup failed:', parkingError.message);
    throw forbiddenResponse('Could not verify parking access');
  }
  if (!parking) {
    throw notFoundResponse('Parking not found');
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', parking.organization_id)
    .maybeSingle();

  if (orgError || !org) {
    throw forbiddenResponse('Could not verify organization access');
  }

  const orgRow = org as OrgRow;
  const parkingRow = parking as ParkingRow;

  if (orgRow.owner_id === user.id) {
    const ctx: ParkingTeamAccessContext = {
      user,
      parking: parkingRow,
      org: orgRow,
      accessKind: 'owner',
      permissions: allParkingTeamPermissions(),
    };
    if (requiredPermission && !ctx.permissions.includes(requiredPermission)) {
      throw forbiddenResponse('Access restricted');
    }
    return ctx;
  }

  if (isPlatformAdmin(user.email)) {
    const ctx: ParkingTeamAccessContext = {
      user,
      parking: parkingRow,
      org: orgRow,
      accessKind: 'platform_admin',
      permissions: allParkingTeamPermissions(),
    };
    if (requiredPermission && !ctx.permissions.includes(requiredPermission)) {
      throw forbiddenResponse('Access restricted');
    }
    return ctx;
  }

  const { data: orgAdminMember, error: orgAdminError } = await supabase
    .from('organization_members')
    .select('id, status, role_id')
    .eq('organization_id', orgRow.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (orgAdminError) {
    console.error('[orgAuth] org member lookup failed:', orgAdminError.message);
    throw forbiddenResponse('Could not verify parking access');
  }

  if (orgAdminMember && orgAdminMember.status === 'active' && orgAdminMember.role_id === 'ADMIN') {
    const ctx: ParkingTeamAccessContext = {
      user,
      parking: parkingRow,
      org: orgRow,
      accessKind: 'org_admin',
      permissions: allParkingTeamPermissions(),
      memberId: orgAdminMember.id as string,
    };
    if (requiredPermission && !ctx.permissions.includes(requiredPermission)) {
      throw forbiddenResponse('Access restricted');
    }
    return ctx;
  }

  const { data: member, error: memberError } = await supabase
    .from('parking_members')
    .select('id, role_id, permissions, status')
    .eq('parking_id', parkingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberError) {
    console.error('[orgAuth] parking member lookup failed:', memberError.message);
    throw forbiddenResponse('Could not verify parking access');
  }

  if (!member || member.status !== 'active') {
    throw forbiddenResponse('Access restricted');
  }

  const memberRow = member as ParkingMemberDbRow;
  const permissions = capParkingStaffMemberPermissions(
    memberRow.role_id,
    effectiveParkingMemberPermissions({
      permissions: memberRow.permissions,
      status: 'active',
    })
  );

  if (permissions.length === 0) {
    throw forbiddenResponse('Access restricted');
  }

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    throw forbiddenResponse('Access restricted');
  }

  return {
    user,
    parking: parkingRow,
    org: orgRow,
    accessKind: 'member',
    permissions,
    memberId: memberRow.id,
  };
}

/**
 * Org list access — owner, platform admin, or active member on any property in the org.
 * `canListAllProperties` is true for owner/platform admin (all org properties).
 */
export async function verifyOrgListAccess(
  req: Request,
  orgId?: string,
  orgSlug?: string
): Promise<{
  user: AuthenticatedUser;
  org: OrgRow;
  canListAllProperties: boolean;
}> {
  const user = await verifyAuthenticatedUser(req);
  const supabase = createServiceClient();

  let org: OrgRow | null = null;
  if (orgId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();
    if (error) {
      throw forbiddenResponse('Could not verify organization access');
    }
    org = data as OrgRow | null;
  } else if (orgSlug) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', orgSlug)
      .maybeSingle();
    if (error) {
      throw forbiddenResponse('Could not verify organization access');
    }
    org = data as OrgRow | null;
  }

  if (!org) {
    throw notFoundResponse('Organization not found');
  }

  if (org.owner_id === user.id || isPlatformAdmin(user.email) || isSuperAdminEmail(user.email)) {
    return { user, org, canListAllProperties: true };
  }

  const { count: orgAdminCount, error: orgAdminError } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('role_id', 'ADMIN');

  if (orgAdminError) {
    throw forbiddenResponse('Could not verify organization access');
  }
  if ((orgAdminCount ?? 0) > 0) {
    return { user, org, canListAllProperties: true };
  }

  const { count, error: memberError } = await supabase
    .from('property_members')
    .select('id, properties!inner(organization_id)', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('properties.organization_id', org.id);

  if (memberError) {
    throw forbiddenResponse('Could not verify organization access');
  }
  if ((count ?? 0) === 0) {
    throw forbiddenResponse('Access restricted');
  }

  return { user, org, canListAllProperties: false };
}

async function resolveOrgRow(
  supabase: SupabaseClient,
  scope: { orgId?: string; orgSlug?: string }
): Promise<OrgRow | null> {
  if (scope.orgId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', scope.orgId)
      .maybeSingle();
    if (error) {
      throw forbiddenResponse('Could not verify organization access');
    }
    return data as OrgRow | null;
  }
  if (scope.orgSlug) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', scope.orgSlug)
      .maybeSingle();
    if (error) {
      throw forbiddenResponse('Could not verify organization access');
    }
    return data as OrgRow | null;
  }
  return null;
}

/**
 * JWT + org access for owner, platform admin, org ADMIN, or property-only member.
 * Optional requiredPermission enforces org RBAC (org:dashboard:view, etc.).
 */
export async function verifyOrgAccess(
  req: Request,
  scope: { orgId?: string; orgSlug?: string },
  requiredPermission?: OrgPermissionId
): Promise<OrgAccessContext> {
  const user = await verifyAuthenticatedUser(req);
  const supabase = createServiceClient();

  const org = await resolveOrgRow(supabase, scope);
  if (!org) {
    throw notFoundResponse('Organization not found');
  }

  const enforce = (ctx: OrgAccessContext): OrgAccessContext => {
    if (requiredPermission && !hasOrgPermission(ctx.permissions, requiredPermission)) {
      throw forbiddenResponse('Access restricted');
    }
    return ctx;
  };

  if (org.owner_id === user.id) {
    return enforce({
      user,
      org,
      accessKind: 'owner',
      permissions: allOrgPermissions(),
      canListAllProperties: true,
    });
  }

  if (isPlatformAdmin(user.email)) {
    return enforce({
      user,
      org,
      accessKind: 'platform_admin',
      permissions: allOrgPermissions(),
      canListAllProperties: true,
    });
  }

  const { data: orgAdminMember, error: orgAdminError } = await supabase
    .from('organization_members')
    .select('id, status, role_id')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (orgAdminError) {
    console.error('[orgAuth] org member lookup failed:', orgAdminError.message);
    throw forbiddenResponse('Could not verify organization access');
  }

  if (orgAdminMember && orgAdminMember.status === 'active' && orgAdminMember.role_id === 'ADMIN') {
    return enforce({
      user,
      org,
      accessKind: 'org_admin',
      permissions: [...ORG_ROLE_PERMISSIONS.ADMIN],
      canListAllProperties: true,
      memberId: orgAdminMember.id as string,
    });
  }

  const { count, error: memberError } = await supabase
    .from('property_members')
    .select('id, properties!inner(organization_id)', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('properties.organization_id', org.id);

  if (memberError) {
    throw forbiddenResponse('Could not verify organization access');
  }
  if ((count ?? 0) === 0) {
    throw forbiddenResponse('Access restricted');
  }

  return enforce({
    user,
    org,
    accessKind: 'property_member',
    permissions: [...ORG_PROPERTY_MEMBER_PERMISSIONS],
    canListAllProperties: false,
  });
}

/** Resolve org by slug and verify ownership. */
export async function verifyOrgOwnerBySlug(
  req: Request,
  orgSlug: string
): Promise<{ user: AuthenticatedUser; org: OrgRow }> {
  const user = await verifyAuthenticatedUser(req);
  const supabase = createServiceClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .maybeSingle();

  if (error) {
    console.error('[orgAuth] org slug lookup failed:', error.message);
    throw forbiddenResponse('Could not verify organization access');
  }
  if (!org) {
    throw notFoundResponse('Organization not found');
  }

  if (org.owner_id !== user.id && !isPlatformAdmin(user.email)) {
    throw forbiddenResponse('Access restricted');
  }

  return { user, org: org as OrgRow };
}

export type OrgAccessKind = 'owner' | 'platform_admin' | 'org_admin' | 'property_member';

export type OrgAccessContext = {
  user: AuthenticatedUser;
  org: OrgRow;
  accessKind: OrgAccessKind;
  permissions: OrgPermissionId[];
  canListAllProperties: boolean;
  memberId?: string;
};

export type OrgTeamAccessKind = 'owner' | 'platform_admin' | 'org_admin';

export type OrgTeamAccessContext = {
  user: AuthenticatedUser;
  org: OrgRow;
  accessKind: OrgTeamAccessKind;
  memberId?: string;
  canManage: boolean;
};

/**
 * JWT + org team access for owner, platform admin, or active org ADMIN member.
 * Property-only members cannot access org team routes.
 */
export async function verifyOrgTeamAccess(
  req: Request,
  scope: { orgId?: string; orgSlug?: string },
  options?: { requireManage?: boolean; requireInvite?: boolean }
): Promise<OrgTeamAccessContext> {
  const ctx = await verifyOrgAccess(req, scope, 'org:team:view');

  if (options?.requireManage && !hasOrgPermission(ctx.permissions, 'org:team:manage')) {
    throw forbiddenResponse('Access restricted');
  }

  if (
    options?.requireInvite &&
    !hasOrgPermission(ctx.permissions, 'org:team:invite') &&
    !hasOrgPermission(ctx.permissions, 'org:team:manage')
  ) {
    throw forbiddenResponse('Access restricted');
  }

  return {
    user: ctx.user,
    org: ctx.org,
    accessKind: ctx.accessKind as OrgTeamAccessKind,
    memberId: ctx.memberId,
    canManage: hasOrgPermission(ctx.permissions, 'org:team:manage'),
  };
}

/** Pick a unique slug within organizations. */
export async function allocateOrganizationSlug(
  supabase: SupabaseClient,
  name: string,
  preferred?: string,
  excludeOrgId?: string
): Promise<string> {
  const { slugifyName, withSlugSuffix } = await import('./slugUtils.ts');
  const base = slugifyName(preferred?.trim() || name);
  for (let i = 0; i < 20; i++) {
    const candidate = withSlugSuffix(base, i);
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    if (excludeOrgId && data.id === excludeOrgId) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Pick a unique slug across all properties (guest ?property= resolves globally). */
export async function allocatePropertySlug(
  supabase: SupabaseClient,
  name: string,
  preferred?: string,
  excludePropertyId?: string
): Promise<string> {
  const { slugifyName, withSlugSuffix } = await import('./slugUtils.ts');
  const base = slugifyName(preferred?.trim() || name);
  for (let i = 0; i < 20; i++) {
    const candidate = withSlugSuffix(base, i);
    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    if (excludePropertyId && data.id === excludePropertyId) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export function serializeOrganization(org: OrgRow) {
  const hostModes = Array.isArray(org.host_modes) ? org.host_modes : [];
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    logoUrl: org.logo_url,
    settings: org.settings ?? {},
    hostModes,
    createdAt: org.created_at,
    updatedAt: org.updated_at,
  };
}

export function serializeProperty(property: PropertyRow) {
  return {
    id: property.id,
    organizationId: property.organization_id,
    name: property.name,
    slug: property.slug,
    type: property.type,
    status: property.status,
    address: property.address,
    towerAndUnit: property.tower_and_unit,
    tower: property.tower,
    unitNumber: property.unit_number,
    residenceName: property.residence_name,
    maxGuests: property.max_guests,
    settings: property.settings ?? {},
    createdAt: property.created_at,
    updatedAt: property.updated_at,
  };
}

export async function allocateParkingSlug(
  supabase: SupabaseClient,
  name: string,
  preferred?: string,
  excludeParkingId?: string
): Promise<string> {
  const { slugifyName, withSlugSuffix } = await import('./slugUtils.ts');
  const base = slugifyName(preferred?.trim() || name);
  for (let i = 0; i < 20; i++) {
    const candidate = withSlugSuffix(base, i);
    const { data } = await supabase
      .from('parkings')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    if (excludeParkingId && data.id === excludeParkingId) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export function serializeParking(parking: ParkingRow) {
  return {
    id: parking.id,
    organizationId: parking.organization_id,
    name: parking.name,
    slug: parking.slug,
    status: parking.status,
    residenceName: parking.residence_name,
    tower: parking.tower,
    level: parking.level,
    slotLabel: parking.slot_label,
    parkingType: parking.parking_type,
    ratePerNight: parking.rate_per_night,
    acceptedVehicleTypes: parking.accepted_vehicle_types ?? ['car'],
    settings: parking.settings ?? {},
    createdAt: parking.created_at,
    updatedAt: parking.updated_at,
  };
}
