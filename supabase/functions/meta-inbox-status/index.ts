/**
 * Meta inbox connection status for an org.
 */

import { listChannelConnections, resolveMetaHasMore } from '../_shared/socialInboxService.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

const COMING_SOON_PLATFORMS = [
  {
    platform: 'tiktok' as const,
    available: false,
    reason: 'Requires TikTok Business Messaging API approval.',
  },
  {
    platform: 'airbnb' as const,
    available: false,
    reason: 'Requires Airbnb Homes API partnership.',
  },
];

serveAuthenticated('meta-inbox-status', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }
  const ctx = await resolveOrgAccessContext(req, 'org:inbox:view');
  const connections = await listChannelConnections(ctx.org.id);

  const serialized = connections.map((c) => ({
    id: c.id,
    platform: c.platform,
    displayName: c.display_name,
    profileImageUrl: c.profile_image_url,
    status: c.status,
    connectedAt: c.webhook_subscribed_at ?? c.updated_at,
    lastSyncAt: c.last_sync_at,
    webhookSubscribed: Boolean(c.webhook_subscribed_at),
    errorMessage: c.error_message,
  }));

  const facebook = connections.find((c) => c.platform === 'facebook' && c.status === 'connected');
  const metaSyncInProgress = Boolean(facebook && !facebook.last_sync_at);
  const metaHasMore = await resolveMetaHasMore(ctx.org.id);

  return jsonSuccess(req, {
    connections: serialized,
    comingSoon: COMING_SOON_PLATFORMS,
    metaConfigured: Boolean(Deno.env.get('META_APP_ID')?.trim()),
    metaSyncInProgress,
    metaSyncError: null,
    metaHasMore,
  });
});
