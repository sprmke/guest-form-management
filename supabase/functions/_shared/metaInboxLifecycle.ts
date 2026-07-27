/**
 * Meta inbox connect/disconnect cleanup — prevents stale threads/tokens across reconnects.
 */

import { getPageAccessToken, unsubscribeMetaPageWebhooks } from './metaInboxGraph.ts';
import { createServiceClient } from './orgAuth.ts';
import { listChannelConnections, socialInboxDb } from './socialInboxService.ts';

const META_PLATFORMS = ['facebook', 'instagram'] as const;

export async function purgeOrgMetaInboxConversations(orgId: string): Promise<number> {
  const sb = socialInboxDb();
  const { error, count } = await sb
    .from('social_conversations')
    .delete({ count: 'exact' })
    .eq('organization_id', orgId)
    .in('platform', [...META_PLATFORMS]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function deleteOrgMetaChannelConnections(orgId: string): Promise<number> {
  const sb = socialInboxDb();
  const { error, count } = await sb
    .from('social_channel_connections')
    .delete({ count: 'exact' })
    .eq('organization_id', orgId)
    .in('platform', [...META_PLATFORMS]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Wipe Meta inbox data before a fresh connect/reconnect. */
export async function prepareOrgMetaInboxConnect(orgId: string): Promise<void> {
  const sb = createServiceClient();
  await sb.from('meta_inbox_oauth_state').delete().eq('organization_id', orgId);
  await purgeOrgMetaInboxConversations(orgId);
  await deleteOrgMetaChannelConnections(orgId);
}

/** Full Meta disconnect: unsubscribe, delete threads, remove connections + OAuth picker state. */
export async function clearOrgMetaInbox(orgId: string): Promise<{
  conversationsCleared: number;
  connectionsRemoved: number;
}> {
  const connections = await listChannelConnections(orgId);
  const metaConnections = connections.filter(
    (c) => c.platform === 'facebook' || c.platform === 'instagram'
  );

  for (const conn of metaConnections) {
    if (!conn.meta_page_id || !conn.encrypted_access_token) continue;
    try {
      const token = await getPageAccessToken(conn);
      await unsubscribeMetaPageWebhooks(conn.meta_page_id, token);
    } catch (e) {
      console.warn('[clearOrgMetaInbox] unsubscribe:', e);
    }
  }

  const conversationsCleared = await purgeOrgMetaInboxConversations(orgId);
  const connectionsRemoved = await deleteOrgMetaChannelConnections(orgId);

  const sb = createServiceClient();
  await sb.from('meta_inbox_oauth_state').delete().eq('organization_id', orgId);

  return { conversationsCleared, connectionsRemoved };
}
