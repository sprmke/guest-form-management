/**
 * Meta inbox connect/disconnect cleanup — prevents stale threads/tokens across reconnects.
 * Org wipe only touches org-default rows (property_id/parking_id null); overrides are separate.
 */

import { getPageAccessToken, unsubscribeMetaPageWebhooks } from './metaInboxGraph.ts';
import { createServiceClient } from './orgAuth.ts';
import {
  listOrgDefaultMetaConnections,
  listParkingOverrideMetaConnections,
  listPropertyOverrideMetaConnections,
} from './metaInboxScope.ts';
import { deleteConversationsForConnections, socialInboxDb } from './socialInboxService.ts';
import type { SocialChannelConnectionRow } from './socialInboxTypes.ts';

const META_PLATFORMS = ['facebook', 'instagram'] as const;

async function unsubscribeMetaConnections(
  connections: SocialChannelConnectionRow[]
): Promise<void> {
  for (const conn of connections) {
    if (!conn.meta_page_id || !conn.encrypted_access_token) continue;
    try {
      const token = await getPageAccessToken(conn);
      await unsubscribeMetaPageWebhooks(conn.meta_page_id, token);
    } catch (e) {
      console.warn('[metaInboxLifecycle] unsubscribe:', e);
    }
  }
}

async function deleteMetaConnectionsByIds(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const sb = socialInboxDb();
  const { error, count } = await sb
    .from('social_channel_connections')
    .delete({ count: 'exact' })
    .in('id', ids);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Wipe org-default Meta inbox data before a fresh org connect/reconnect. */
export async function prepareOrgMetaInboxConnect(orgId: string): Promise<void> {
  const sb = createServiceClient();
  await sb
    .from('meta_inbox_oauth_state')
    .delete()
    .eq('organization_id', orgId)
    .is('property_id', null)
    .is('parking_id', null);

  const orgMeta = await listOrgDefaultMetaConnections(orgId);
  const ids = orgMeta.map((c) => c.id);
  await deleteConversationsForConnections(ids);
  await deleteMetaConnectionsByIds(ids);
}

/** Full org-default Meta disconnect (overrides remain). */
export async function clearOrgMetaInbox(orgId: string): Promise<{
  conversationsCleared: number;
  connectionsRemoved: number;
}> {
  const metaConnections = await listOrgDefaultMetaConnections(orgId);
  await unsubscribeMetaConnections(metaConnections);

  const ids = metaConnections.map((c) => c.id);
  const conversationsCleared = await deleteConversationsForConnections(ids);
  const connectionsRemoved = await deleteMetaConnectionsByIds(ids);

  const sb = createServiceClient();
  await sb
    .from('meta_inbox_oauth_state')
    .delete()
    .eq('organization_id', orgId)
    .is('property_id', null)
    .is('parking_id', null);

  return { conversationsCleared, connectionsRemoved };
}

/** Wipe prior property override before connecting a new Page for that property. */
export async function preparePropertyMetaInboxConnect(
  orgId: string,
  propertyId: string
): Promise<void> {
  const sb = createServiceClient();
  await sb
    .from('meta_inbox_oauth_state')
    .delete()
    .eq('organization_id', orgId)
    .eq('property_id', propertyId);

  const rows = await listPropertyOverrideMetaConnections(orgId, propertyId);
  const ids = rows.map((c) => c.id);
  await deleteConversationsForConnections(ids);
  await deleteMetaConnectionsByIds(ids);
}

/** Wipe prior parking override before connecting a new Page for that parking. */
export async function prepareParkingMetaInboxConnect(
  orgId: string,
  parkingId: string
): Promise<void> {
  const sb = createServiceClient();
  await sb
    .from('meta_inbox_oauth_state')
    .delete()
    .eq('organization_id', orgId)
    .eq('parking_id', parkingId);

  const rows = await listParkingOverrideMetaConnections(orgId, parkingId);
  const ids = rows.map((c) => c.id);
  await deleteConversationsForConnections(ids);
  await deleteMetaConnectionsByIds(ids);
}

export async function clearPropertyMetaInbox(
  orgId: string,
  propertyId: string
): Promise<{ conversationsCleared: number; connectionsRemoved: number }> {
  const rows = await listPropertyOverrideMetaConnections(orgId, propertyId);
  await unsubscribeMetaConnections(rows);
  const ids = rows.map((c) => c.id);
  const conversationsCleared = await deleteConversationsForConnections(ids);
  const connectionsRemoved = await deleteMetaConnectionsByIds(ids);

  const sb = createServiceClient();
  await sb
    .from('meta_inbox_oauth_state')
    .delete()
    .eq('organization_id', orgId)
    .eq('property_id', propertyId);

  return { conversationsCleared, connectionsRemoved };
}

export async function clearParkingMetaInbox(
  orgId: string,
  parkingId: string
): Promise<{ conversationsCleared: number; connectionsRemoved: number }> {
  const rows = await listParkingOverrideMetaConnections(orgId, parkingId);
  await unsubscribeMetaConnections(rows);
  const ids = rows.map((c) => c.id);
  const conversationsCleared = await deleteConversationsForConnections(ids);
  const connectionsRemoved = await deleteMetaConnectionsByIds(ids);

  const sb = createServiceClient();
  await sb
    .from('meta_inbox_oauth_state')
    .delete()
    .eq('organization_id', orgId)
    .eq('parking_id', parkingId);

  return { conversationsCleared, connectionsRemoved };
}

/** @deprecated Prefer clearOrgMetaInbox — kept name for call sites that purged all Meta. */
export async function purgeOrgMetaInboxConversations(orgId: string): Promise<number> {
  const orgMeta = await listOrgDefaultMetaConnections(orgId);
  return deleteConversationsForConnections(orgMeta.map((c) => c.id));
}

export async function deleteOrgMetaChannelConnections(orgId: string): Promise<number> {
  const orgMeta = await listOrgDefaultMetaConnections(orgId);
  return deleteMetaConnectionsByIds(orgMeta.map((c) => c.id));
}

export { META_PLATFORMS };
