/**
 * Org team — DB helpers, serialization, and mutations.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import {
  createServiceClient,
  type OrgRow,
  verifyOrgTeamAccess,
  type OrgTeamAccessContext,
} from './orgAuth.ts';
import {
  assertValidOrgRoleId,
  inviteExpiresAt,
  normalizeInviteEmail,
  virtualOrgOwnerMemberId,
} from './orgTeamPermissions.ts';
import { readOrgIdFromUrl, readOrgSlugFromUrl } from './propertyScope.ts';
import { sendOrgTeamInviteEmail } from './orgTeamInviteEmail.ts';
import { assertAllowedTeamInviteEmail } from './teamInviteEmail.ts';
import { parseTeamInviteContactFields } from './teamInviteContact.ts';
import { validatePhilippineMobilePhone } from './fieldValidation.ts';

export type SerializedOrgTeamMember = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  displayName: string;
  contactPhone: string;
  role: string;
  status: 'active' | 'inactive';
  assignedAt: string;
  lastActive: string | null;
  assignedBy: string;
  isOwner: boolean;
};

export type SerializedOrgTeamInvitation = {
  id: string;
  email: string;
  role: string;
  sentAt: string;
  expiresAt: string;
  sentBy: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
};

type AuthProfile = {
  name: string;
  email: string;
  avatar: string | null;
};

export function readTeamOrgId(url: URL, body: Record<string, unknown>): string {
  const fromUrl = readOrgIdFromUrl(url);
  if (fromUrl) return fromUrl;
  const fromBody = typeof body.orgId === 'string' ? body.orgId.trim() : '';
  return fromBody;
}

export function readTeamOrgSlug(url: URL): string | null {
  return readOrgSlugFromUrl(url);
}

export async function requireOrgTeamContext(
  req: Request,
  orgId: string,
  orgSlug: string | null,
  options?: { requireManage?: boolean; requireInvite?: boolean }
): Promise<OrgTeamAccessContext> {
  if (orgId) {
    return verifyOrgTeamAccess(req, { orgId }, options);
  }
  if (orgSlug) {
    return verifyOrgTeamAccess(req, { orgSlug }, options);
  }
  throw new Response(JSON.stringify({ success: false, error: 'org_id or org_slug is required' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getAuthProfile(supabase: SupabaseClient, userId: string): Promise<AuthProfile> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return { name: 'Unknown', email: '', avatar: null };
  }
  const email = data.user.email ?? '';
  const meta = data.user.user_metadata ?? {};
  const name =
    typeof meta.full_name === 'string' && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta.name === 'string' && meta.name.trim()
        ? meta.name.trim()
        : email.split('@')[0] || 'User';
  const avatar =
    typeof meta.avatar_url === 'string'
      ? meta.avatar_url
      : typeof meta.picture === 'string'
        ? meta.picture
        : null;
  return { name, email, avatar };
}

function isoDateOnly(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function serializeMemberRow(
  row: Record<string, unknown>,
  profile: AuthProfile,
  assignedByLabel: string,
  isOwner: boolean
): SerializedOrgTeamMember {
  const displayName =
    typeof row.display_name === 'string' && row.display_name.trim()
      ? row.display_name.trim()
      : profile.name;
  const contactPhone = typeof row.contact_phone === 'string' ? row.contact_phone.trim() : '';

  return {
    id: row.id as string,
    name: displayName,
    email: profile.email,
    avatar: profile.avatar,
    displayName,
    contactPhone,
    role: row.role_id as string,
    status: row.status as 'active' | 'inactive',
    assignedAt: isoDateOnly(row.assigned_at as string),
    lastActive: row.last_active_at ? isoDateOnly(row.last_active_at as string) : null,
    assignedBy: assignedByLabel,
    isOwner,
  };
}

function serializeVirtualOwnerMember(
  org: OrgRow,
  profile: AuthProfile,
  contactRow: Record<string, unknown> | null
): SerializedOrgTeamMember {
  const displayName =
    contactRow && typeof contactRow.display_name === 'string' && contactRow.display_name.trim()
      ? contactRow.display_name.trim()
      : profile.name;
  const contactPhone =
    contactRow && typeof contactRow.contact_phone === 'string'
      ? contactRow.contact_phone.trim()
      : '';

  return {
    id: virtualOrgOwnerMemberId(org.owner_id),
    name: displayName,
    email: profile.email,
    avatar: profile.avatar,
    displayName,
    contactPhone,
    role: 'OWNER',
    status: 'active',
    assignedAt: isoDateOnly(org.created_at),
    lastActive: null,
    assignedBy: 'System',
    isOwner: true,
  };
}

export async function listOrgTeamMembers(
  ctx: OrgTeamAccessContext
): Promise<SerializedOrgTeamMember[]> {
  const supabase = createServiceClient();
  const organizationId = ctx.org.id;

  const { data: rows, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('assigned_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to list members: ${error.message}`);
  }

  const members: SerializedOrgTeamMember[] = [];
  let ownerIncluded = false;

  for (const row of rows ?? []) {
    if (row.user_id === ctx.org.owner_id) {
      ownerIncluded = true;
    }
    const profile = await getAuthProfile(supabase, row.user_id as string);
    const assignedBy = row.invited_by
      ? (await getAuthProfile(supabase, row.invited_by as string)).name
      : 'System';
    members.push(serializeMemberRow(row, profile, assignedBy, row.user_id === ctx.org.owner_id));
  }

  if (!ownerIncluded) {
    const ownerProfile = await getAuthProfile(supabase, ctx.org.owner_id);
    const { data: ownerMemberRow } = await supabase
      .from('organization_members')
      .select('display_name, contact_phone')
      .eq('organization_id', organizationId)
      .eq('user_id', ctx.org.owner_id)
      .maybeSingle();
    members.unshift(
      serializeVirtualOwnerMember(
        ctx.org,
        ownerProfile,
        ownerMemberRow as Record<string, unknown> | null
      )
    );
  }

  return members;
}

export async function listOrgTeamInvitations(
  organizationId: string
): Promise<SerializedOrgTeamInvitation[]> {
  const supabase = createServiceClient();
  const now = new Date();

  const { data: rows, error } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'accepted', 'expired', 'cancelled'])
    .order('sent_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list invitations: ${error.message}`);
  }

  const out: SerializedOrgTeamInvitation[] = [];

  for (const row of rows ?? []) {
    let status = row.status as SerializedOrgTeamInvitation['status'];
    if (status === 'pending' && new Date(row.expires_at as string).getTime() < now.getTime()) {
      await supabase
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', row.id);
      status = 'expired';
    }

    const sentByProfile = await getAuthProfile(supabase, row.sent_by as string);

    out.push({
      id: row.id as string,
      email: row.email as string,
      role: row.role_id as string,
      sentAt: isoDateOnly(row.sent_at as string),
      expiresAt: isoDateOnly(row.expires_at as string),
      sentBy: sentByProfile.name,
      status,
    });
  }

  return out.filter((i) => i.status === 'pending');
}

async function findActiveOrgMemberByEmail(
  supabase: SupabaseClient,
  organizationId: string,
  email: string
): Promise<boolean> {
  const normalized = normalizeInviteEmail(email);
  const { data: rows } = await supabase
    .from('organization_members')
    .select('user_id, status')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  for (const row of rows ?? []) {
    const profile = await getAuthProfile(supabase, row.user_id as string);
    if (normalizeInviteEmail(profile.email) === normalized) return true;
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', organizationId)
    .maybeSingle();

  if (org?.owner_id) {
    const ownerProfile = await getAuthProfile(supabase, org.owner_id as string);
    if (normalizeInviteEmail(ownerProfile.email) === normalized) return true;
  }

  return false;
}

async function getFirstPropertyIdForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function createOrgInvitation(
  ctx: OrgTeamAccessContext,
  body: Record<string, unknown>
): Promise<SerializedOrgTeamInvitation> {
  const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
  assertAllowedTeamInviteEmail(emailRaw);
  const email = normalizeInviteEmail(emailRaw);
  const roleId = typeof body.roleId === 'string' ? body.roleId.trim() : 'ADMIN';
  assertValidOrgRoleId(roleId);

  const supabase = createServiceClient();
  const organizationId = ctx.org.id;
  const contact = parseTeamInviteContactFields(body);

  if (await findActiveOrgMemberByEmail(supabase, organizationId, email)) {
    throw new Error('This email is already an active member of this organization');
  }

  const { data: pending } = await supabase
    .from('organization_invitations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (pending?.id) {
    throw new Error('A pending invitation already exists for this email');
  }

  const expiresAt = inviteExpiresAt();
  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      email,
      role_id: roleId,
      display_name: null,
      contact_phone: contact.contactPhone,
      expires_at: expiresAt.toISOString(),
      sent_by: ctx.user.id,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create invitation');
  }

  const sentByProfile = await getAuthProfile(supabase, ctx.user.id);
  const brandingPropertyId = await getFirstPropertyIdForOrg(supabase, organizationId);

  try {
    await sendOrgTeamInviteEmail({
      organizationId,
      brandingPropertyId,
      inviteEmail: data.email as string,
      token: data.token as string,
      roleId: data.role_id as string,
      invitedByName: sentByProfile.name,
      expiresAtIso: data.expires_at as string,
    });
  } catch (emailError) {
    await supabase.from('organization_invitations').delete().eq('id', data.id);
    const detail =
      emailError instanceof Error ? emailError.message : 'Failed to send invitation email';
    throw new Error(detail);
  }

  return {
    id: data.id as string,
    email: data.email as string,
    role: data.role_id as string,
    sentAt: isoDateOnly(data.sent_at as string),
    expiresAt: isoDateOnly(data.expires_at as string),
    sentBy: sentByProfile.name,
    status: 'pending',
  };
}

export async function resendOrgInvitation(
  ctx: OrgTeamAccessContext,
  invitationId: string
): Promise<SerializedOrgTeamInvitation> {
  const supabase = createServiceClient();
  const organizationId = ctx.org.id;

  const { data: existing, error: findError } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error('Invitation not found');
  }
  if (existing.status !== 'pending') {
    throw new Error('Only pending invitations can be resent');
  }

  const previousToken = existing.token as string;
  const previousExpiresAt = existing.expires_at as string;
  const previousSentAt = existing.sent_at as string;
  const previousSentBy = existing.sent_by as string;

  const expiresAt = inviteExpiresAt();
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  const { data, error } = await supabase
    .from('organization_invitations')
    .update({
      token,
      expires_at: expiresAt.toISOString(),
      sent_at: new Date().toISOString(),
      sent_by: ctx.user.id,
    })
    .eq('id', invitationId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to resend invitation');
  }

  const sentByProfile = await getAuthProfile(supabase, ctx.user.id);
  const brandingPropertyId = await getFirstPropertyIdForOrg(supabase, organizationId);

  try {
    await sendOrgTeamInviteEmail({
      organizationId,
      brandingPropertyId,
      inviteEmail: data.email as string,
      token: data.token as string,
      roleId: data.role_id as string,
      invitedByName: sentByProfile.name,
      expiresAtIso: data.expires_at as string,
    });
  } catch (emailError) {
    await supabase
      .from('organization_invitations')
      .update({
        token: previousToken,
        expires_at: previousExpiresAt,
        sent_at: previousSentAt,
        sent_by: previousSentBy,
      })
      .eq('id', invitationId);
    const detail =
      emailError instanceof Error ? emailError.message : 'Failed to send invitation email';
    throw new Error(detail);
  }

  return {
    id: data.id as string,
    email: data.email as string,
    role: data.role_id as string,
    sentAt: isoDateOnly(data.sent_at as string),
    expiresAt: isoDateOnly(data.expires_at as string),
    sentBy: sentByProfile.name,
    status: 'pending',
  };
}

export async function cancelOrgInvitation(
  organizationId: string,
  invitationId: string
): Promise<void> {
  const supabase = createServiceClient();
  const { data: existing, error: findError } = await supabase
    .from('organization_invitations')
    .select('status')
    .eq('id', invitationId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error('Invitation not found');
  }
  if (existing.status !== 'pending') {
    throw new Error('Only pending invitations can be cancelled');
  }

  const { error } = await supabase
    .from('organization_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateOrgTeamMember(
  ctx: OrgTeamAccessContext,
  body: Record<string, unknown>
): Promise<SerializedOrgTeamMember> {
  const memberId = typeof body.memberId === 'string' ? body.memberId.trim() : '';
  if (!memberId) throw new Error('memberId is required');

  const hasContactPatch =
    typeof body.displayName === 'string' || typeof body.contactPhone === 'string';
  const hasStatusPatch = body.status === 'inactive' || body.status === 'active';
  const hasRolePatch = typeof body.roleId === 'string' && body.roleId.trim().length > 0;

  if (!hasContactPatch && !hasStatusPatch && !hasRolePatch) {
    throw new Error('No valid fields to update');
  }

  const supabase = createServiceClient();
  const isVirtualOwner = memberId.startsWith('org-owner-');
  const isVirtualAdmin = memberId.startsWith('org-admin-');
  let targetUserId = '';
  let existing: Record<string, unknown> | null = null;

  if (isVirtualOwner) {
    targetUserId = memberId.slice('org-owner-'.length);
    if (targetUserId !== ctx.org.owner_id) {
      throw new Error('Member not found');
    }
    const { data } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', ctx.org.id)
      .eq('user_id', targetUserId)
      .maybeSingle();
    existing = (data as Record<string, unknown> | null) ?? null;
  } else if (isVirtualAdmin) {
    targetUserId = memberId.slice('org-admin-'.length);
    const { data, error: findError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', ctx.org.id)
      .eq('user_id', targetUserId)
      .maybeSingle();
    if (findError || !data) {
      throw new Error('Member not found');
    }
    existing = data as Record<string, unknown>;
  } else {
    const { data, error: findError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('id', memberId)
      .eq('organization_id', ctx.org.id)
      .maybeSingle();

    if (findError || !data) {
      throw new Error('Member not found');
    }
    existing = data as Record<string, unknown>;
    targetUserId = existing.user_id as string;
  }

  const isSelf = ctx.user.id === targetUserId;

  if (hasStatusPatch || hasRolePatch) {
    if (!ctx.canManage) throw new Error('Access restricted');
    if (isVirtualOwner || targetUserId === ctx.org.owner_id) {
      throw new Error('Org owner cannot be updated');
    }
    if (isSelf && body.status === 'inactive') {
      throw new Error('You cannot deactivate your own account');
    }
  }

  if (hasContactPatch && !isSelf && !ctx.canManage) {
    throw new Error('Access restricted');
  }

  const patch: Record<string, unknown> = {};

  if (hasRolePatch) {
    assertValidOrgRoleId((body.roleId as string).trim());
    patch.role_id = (body.roleId as string).trim();
  }

  if (body.status === 'inactive') {
    patch.status = 'inactive';
  } else if (body.status === 'active') {
    patch.status = 'active';
  }

  if (typeof body.displayName === 'string') {
    patch.display_name = body.displayName.trim() || null;
  }
  if (typeof body.contactPhone === 'string') {
    const trimmed = body.contactPhone.trim();
    if (trimmed) {
      const phoneErr = validatePhilippineMobilePhone(trimmed);
      if (phoneErr) throw new Error(phoneErr);
    }
    patch.contact_phone = trimmed || null;
  }

  let savedRow: Record<string, unknown>;

  if (isVirtualOwner && !existing) {
    if (!hasContactPatch) {
      throw new Error('Org owner cannot be updated');
    }
    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: ctx.org.id,
        user_id: targetUserId,
        role_id: 'ADMIN',
        status: 'active',
        assigned_at: new Date().toISOString(),
        display_name: patch.display_name ?? null,
        contact_phone: patch.contact_phone ?? null,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update member');
    }
    savedRow = data as Record<string, unknown>;
  } else if (existing?.id) {
    const { data, error } = await supabase
      .from('organization_members')
      .update(patch)
      .eq('id', existing.id as string)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update member');
    }
    savedRow = data as Record<string, unknown>;
  } else {
    throw new Error('Member not found');
  }

  const profile = await getAuthProfile(supabase, targetUserId);
  const assignedBy = savedRow.invited_by
    ? (await getAuthProfile(supabase, savedRow.invited_by as string)).name
    : 'System';

  return serializeMemberRow(savedRow, profile, assignedBy, targetUserId === ctx.org.owner_id);
}

export async function removeOrgTeamMember(
  ctx: OrgTeamAccessContext,
  memberId: string
): Promise<void> {
  if (memberId.startsWith('org-owner-')) {
    throw new Error('Org owner cannot be removed');
  }

  const supabase = createServiceClient();
  const { data: existing, error: findError } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('id', memberId)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error('Member not found');
  }
  if (existing.user_id === ctx.org.owner_id) {
    throw new Error('Org owner cannot be removed');
  }
  if (existing.user_id === ctx.user.id) {
    throw new Error('You cannot remove your own account');
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)
    .eq('organization_id', ctx.org.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function acceptOrgInvitation(
  userId: string,
  userEmail: string,
  token: string
): Promise<{
  organizationId: string;
  memberId: string;
  orgSlug: string;
  orgName: string;
}> {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('token is required');

  const supabase = createServiceClient();
  const { data: invite, error: findError } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('token', trimmed)
    .maybeSingle();

  if (findError || !invite) {
    throw new Error('Invitation not found');
  }
  if (invite.status !== 'pending') {
    throw new Error('Invitation is no longer valid');
  }
  if (new Date(invite.expires_at as string).getTime() < Date.now()) {
    await supabase
      .from('organization_invitations')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    throw new Error('Invitation has expired');
  }

  const inviteEmail = normalizeInviteEmail(invite.email as string);
  if (normalizeInviteEmail(userEmail) !== inviteEmail) {
    throw new Error(`Signed-in email does not match the invitation email (${inviteEmail}).`);
  }

  const organizationId = invite.organization_id as string;
  const roleId = invite.role_id as string;
  const inviteContactPhone =
    typeof invite.contact_phone === 'string' && invite.contact_phone.trim()
      ? invite.contact_phone.trim()
      : null;

  const { data: member, error: upsertError } = await supabase
    .from('organization_members')
    .upsert(
      {
        organization_id: organizationId,
        user_id: userId,
        role_id: roleId,
        status: 'active',
        invited_by: invite.sent_by as string,
        assigned_at: new Date().toISOString(),
        display_name: null,
        contact_phone: inviteContactPhone,
      },
      { onConflict: 'organization_id,user_id' }
    )
    .select('id')
    .single();

  if (upsertError || !member) {
    throw new Error(upsertError?.message ?? 'Failed to create membership');
  }

  await supabase
    .from('organization_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq('id', invite.id);

  const { data: orgRow, error: orgError } = await supabase
    .from('organizations')
    .select('slug, name')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError || !orgRow?.slug) {
    throw new Error('Organization not found after accept');
  }

  return {
    organizationId,
    memberId: member.id as string,
    orgSlug: orgRow.slug as string,
    orgName: (orgRow.name as string) || 'Organization',
  };
}

export async function isActiveOrgAdmin(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('role_id', 'ADMIN')
    .maybeSingle();
  return Boolean(data?.id);
}
