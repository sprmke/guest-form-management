/**
 * Guest account profile + booking linkage for signed-in explore users.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { loadAuthUserProfile } from './authUserProfile.ts';
import { createServiceClient, type AuthenticatedUser } from './orgAuth.ts';
import { normalizePropertyMediaItems } from './propertyMedia.ts';

export type GuestProfileDto = {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  phone: string | null;
  locationLabel: string | null;
  email: string;
};

type GuestProfileRow = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  location_label: string | null;
};

export async function linkGuestBookingsByEmail(
  supabase: SupabaseClient,
  user: AuthenticatedUser
): Promise<number> {
  const email = user.email.trim().toLowerCase();
  if (!email) return 0;

  const { data, error } = await supabase
    .from('guest_submissions')
    .update({ guest_user_id: user.id })
    .eq('guest_email', email)
    .is('guest_user_id', null)
    .select('id');

  if (error) {
    console.error('[guestProfileService] link bookings failed:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}

async function loadProfileRow(
  supabase: SupabaseClient,
  userId: string
): Promise<GuestProfileRow | null> {
  const { data, error } = await supabase
    .from('guest_profiles')
    .select('user_id, display_name, bio, avatar_url, phone, location_label')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[guestProfileService] load row failed:', error.message);
    return null;
  }

  return (data as GuestProfileRow | null) ?? null;
}

export async function getGuestProfile(user: AuthenticatedUser): Promise<GuestProfileDto> {
  const supabase = createServiceClient();
  await linkGuestBookingsByEmail(supabase, user);

  const [row, authProfile] = await Promise.all([
    loadProfileRow(supabase, user.id),
    loadAuthUserProfile(supabase, user.id),
  ]);

  const displayName =
    row?.display_name?.trim() || authProfile.name.trim() || user.email.split('@')[0] || 'Guest';

  return {
    displayName,
    bio: row?.bio?.trim() || null,
    avatarUrl: row?.avatar_url?.trim() || authProfile.avatarUrl,
    phone: row?.phone?.trim() || null,
    locationLabel: row?.location_label?.trim() || null,
    email: user.email,
  };
}

export type GuestProfilePatch = {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  locationLabel?: string | null;
};

function validatePatch(patch: GuestProfilePatch): string | null {
  if (patch.displayName !== undefined) {
    const name = patch.displayName.trim();
    if (name.length < 1 || name.length > 80) {
      return 'Display name must be 1–80 characters';
    }
  }
  if (patch.bio !== undefined && patch.bio !== null && patch.bio.trim().length > 500) {
    return 'Bio must be 500 characters or fewer';
  }
  if (
    patch.locationLabel !== undefined &&
    patch.locationLabel !== null &&
    patch.locationLabel.trim().length > 120
  ) {
    return 'Location must be 120 characters or fewer';
  }
  return null;
}

export async function patchGuestProfile(
  user: AuthenticatedUser,
  patch: GuestProfilePatch
): Promise<GuestProfileDto> {
  const validationError = validatePatch(patch);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = createServiceClient();
  const existing = await loadProfileRow(supabase, user.id);
  const now = new Date().toISOString();

  const nextRow: Record<string, unknown> = {
    user_id: user.id,
    updated_at: now,
  };

  if (patch.displayName !== undefined) {
    nextRow.display_name = patch.displayName.trim();
  }
  if (patch.bio !== undefined) {
    nextRow.bio = patch.bio?.trim() || null;
  }
  if (patch.avatarUrl !== undefined) {
    nextRow.avatar_url = patch.avatarUrl?.trim() || null;
  }
  if (patch.phone !== undefined) {
    nextRow.phone = patch.phone?.trim() || null;
  }
  if (patch.locationLabel !== undefined) {
    nextRow.location_label = patch.locationLabel?.trim() || null;
  }

  if (!existing) {
    const authProfile = await loadAuthUserProfile(supabase, user.id);
    nextRow.display_name =
      (nextRow.display_name as string | undefined) ??
      authProfile.name.trim() ??
      user.email.split('@')[0] ??
      'Guest';
    nextRow.created_at = now;

    const { error } = await supabase.from('guest_profiles').insert(nextRow);
    if (error) throw new Error('Failed to save profile');
  } else {
    const { error } = await supabase.from('guest_profiles').update(nextRow).eq('user_id', user.id);
    if (error) throw new Error('Failed to save profile');
  }

  return getGuestProfile(user);
}

export type GuestTripDto = {
  id: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  propertySlug: string | null;
  propertyName: string | null;
  imageUrl: string | null;
  guestFacebookName: string | null;
};

type BookingRow = {
  id: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  guest_facebook_name: string | null;
  property_id: string | null;
};

type PropertyRow = {
  id: string;
  slug: string;
  name: string;
  settings: Record<string, unknown>;
};

function firstPropertyImage(settings: Record<string, unknown>): string | null {
  const media = normalizePropertyMediaItems(settings);
  const image = media.find((item) => item.type === 'image');
  return image?.url?.trim() || null;
}

export async function listGuestTrips(user: AuthenticatedUser): Promise<GuestTripDto[]> {
  const supabase = createServiceClient();
  await linkGuestBookingsByEmail(supabase, user);

  const email = user.email.trim().toLowerCase();
  const { data: bookings, error } = await supabase
    .from('guest_submissions')
    .select('id, status, check_in_date, check_out_date, guest_facebook_name, property_id')
    .or(`guest_user_id.eq.${user.id},and(guest_user_id.is.null,guest_email.eq.${email})`)
    .order('check_in_date', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[guestProfileService] list trips failed:', error.message);
    throw new Error('Failed to load trips');
  }

  const rows = (bookings ?? []) as BookingRow[];
  const propertyIds = [
    ...new Set(rows.map((row) => row.property_id).filter((id): id is string => Boolean(id))),
  ];

  const propertyMap = new Map<string, PropertyRow>();
  if (propertyIds.length > 0) {
    const { data: properties } = await supabase
      .from('properties')
      .select('id, slug, name, settings')
      .in('id', propertyIds);

    for (const property of (properties ?? []) as PropertyRow[]) {
      propertyMap.set(property.id, property);
    }
  }

  return rows.map((row) => {
    const property = row.property_id ? propertyMap.get(row.property_id) : undefined;
    const settings = property?.settings ?? {};
    return {
      id: row.id,
      status: row.status,
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      propertySlug: property?.slug ?? null,
      propertyName: property?.name ?? null,
      imageUrl: firstPropertyImage(settings),
      guestFacebookName: row.guest_facebook_name,
    } satisfies GuestTripDto;
  });
}

export type GuestMessageThreadDto = {
  conversationId: string;
  propertySlug: string | null;
  propertyName: string | null;
  propertyImageUrl: string | null;
  parkingSlug: string | null;
  parkingName: string | null;
  parkingImageUrl: string | null;
  hostName: string | null;
  hostAvatarUrl: string | null;
  inquiryCheckIn: string | null;
  inquiryCheckOut: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  replyStatus: string | null;
};

async function linkGuestWebConversations(
  supabase: SupabaseClient,
  user: AuthenticatedUser
): Promise<void> {
  const { error } = await supabase
    .from('social_conversations')
    .update({ guest_user_id: user.id })
    .eq('platform', 'web')
    .eq('external_participant_id', user.id)
    .is('guest_user_id', null);

  if (error) {
    console.error('[guestProfileService] link web conversations failed:', error.message);
  }
}

type ConversationRow = {
  id: string;
  property_id: string | null;
  parking_id: string | null;
  inquiry_check_in: string | null;
  inquiry_check_out: string | null;
  subject_preview: string | null;
  last_message_at: string | null;
  organization_id: string;
  guest_unread_count: number | null;
  reply_status: string | null;
};

type ParkingRow = {
  id: string;
  slug: string;
  name: string;
  settings: Record<string, unknown> | null;
};

function firstParkingImage(settings: Record<string, unknown>): string | null {
  const cover = typeof settings.coverImage === 'string' ? settings.coverImage.trim() : '';
  if (cover) return cover;
  const images = Array.isArray(settings.images) ? settings.images : [];
  const first = images.find((item) => typeof item === 'string' && item.trim());
  return typeof first === 'string' ? first.trim() : null;
}

export async function listGuestMessageThreads(
  user: AuthenticatedUser
): Promise<GuestMessageThreadDto[]> {
  const supabase = createServiceClient();
  await linkGuestWebConversations(supabase, user);

  const { data: conversations, error } = await supabase
    .from('social_conversations')
    .select(
      'id, property_id, parking_id, inquiry_check_in, inquiry_check_out, subject_preview, last_message_at, organization_id, guest_unread_count, reply_status'
    )
    .eq('platform', 'web')
    .or(`guest_user_id.eq.${user.id},external_participant_id.eq.${user.id}`)
    .not('subject_preview', 'is', null)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) {
    console.error('[guestProfileService] list messages failed:', error.message);
    throw new Error('Failed to load messages');
  }

  const rows = (conversations ?? []) as ConversationRow[];
  const propertyIds = [
    ...new Set(rows.map((row) => row.property_id).filter((id): id is string => Boolean(id))),
  ];
  const parkingIds = [
    ...new Set(rows.map((row) => row.parking_id).filter((id): id is string => Boolean(id))),
  ];
  const orgIds = [...new Set(rows.map((row) => row.organization_id))];

  const propertyMap = new Map<string, PropertyRow>();
  if (propertyIds.length > 0) {
    const { data: properties } = await supabase
      .from('properties')
      .select('id, slug, name, settings')
      .in('id', propertyIds);
    for (const property of (properties ?? []) as PropertyRow[]) {
      propertyMap.set(property.id, property);
    }
  }

  const parkingMap = new Map<string, ParkingRow>();
  if (parkingIds.length > 0) {
    const { data: parkings } = await supabase
      .from('parkings')
      .select('id, slug, name, settings')
      .in('id', parkingIds);
    for (const parking of (parkings ?? []) as ParkingRow[]) {
      parkingMap.set(parking.id, parking);
    }
  }

  const orgMap = new Map<string, { name: string; owner_id: string }>();
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, owner_id')
      .in('id', orgIds);
    for (const org of (orgs ?? []) as Array<{ id: string; name: string; owner_id: string }>) {
      orgMap.set(org.id, org);
    }
  }

  const ownerIds = [...new Set([...orgMap.values()].map((org) => org.owner_id))];
  const ownerProfiles = new Map<string, { name: string; avatarUrl: string | null }>();
  await Promise.all(
    ownerIds.map(async (ownerId) => {
      const profile = await loadAuthUserProfile(supabase, ownerId);
      ownerProfiles.set(ownerId, { name: profile.name, avatarUrl: profile.avatarUrl });
    })
  );

  return rows.map((row) => {
    const property = row.property_id ? propertyMap.get(row.property_id) : undefined;
    const parking = row.parking_id ? parkingMap.get(row.parking_id) : undefined;
    const org = orgMap.get(row.organization_id);
    const ownerProfile = org ? ownerProfiles.get(org.owner_id) : undefined;
    const hostName = ownerProfile?.name ?? org?.name ?? null;
    const propertySettings = property?.settings ?? {};
    const parkingSettings = (parking?.settings ?? {}) as Record<string, unknown>;

    return {
      conversationId: row.id,
      propertySlug: property?.slug ?? null,
      propertyName: property?.name ?? null,
      propertyImageUrl: firstPropertyImage(propertySettings),
      parkingSlug: parking?.slug ?? null,
      parkingName: parking?.name ?? null,
      parkingImageUrl: parking ? firstParkingImage(parkingSettings) : null,
      hostName,
      hostAvatarUrl: ownerProfile?.avatarUrl ?? null,
      inquiryCheckIn: row.inquiry_check_in,
      inquiryCheckOut: row.inquiry_check_out,
      lastMessagePreview: row.subject_preview,
      lastMessageAt: row.last_message_at,
      unreadCount: row.guest_unread_count ?? 0,
      replyStatus: row.reply_status,
    } satisfies GuestMessageThreadDto;
  });
}
