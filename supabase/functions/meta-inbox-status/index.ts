/**
 * Meta inbox connection status for org / property / parking scope.
 */

import { resolveInboxAccess } from '../_shared/inboxAccess.ts';
import {
  resolveEffectiveMetaConnection,
  listOrgDefaultMetaConnections,
} from '../_shared/metaInboxScope.ts';
import { metaBackfillHasMore, resolveMetaHasMore } from '../_shared/socialInboxService.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
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
  const ctx = await resolveInboxAccess(req, 'view');
  const effective = await resolveEffectiveMetaConnection(ctx.orgId, ctx.scope);

  // Org Channels list shows org-default rows only (overrides managed at property/parking).
  // Property/parking Channels show the effective Page (override or inherited org).
  const connectionsForUi =
    ctx.kind === 'org' ? await listOrgDefaultMetaConnections(ctx.orgId) : effective.connections;

  const serialized = connectionsForUi.map((c) => ({
    id: c.id,
    platform: c.platform,
    displayName: c.display_name,
    profileImageUrl: c.profile_image_url,
    status: c.status,
    connectedAt: c.webhook_subscribed_at ?? c.updated_at,
    lastSyncAt: c.last_sync_at,
    webhookSubscribed: Boolean(c.webhook_subscribed_at),
    errorMessage: c.error_message,
    propertyId: c.property_id ?? null,
    parkingId: c.parking_id ?? null,
  }));

  const facebook = effective.connection;
  const metaSyncInProgress = Boolean(facebook && !facebook.last_sync_at);
  const metaHasMore =
    ctx.kind === 'org' ? await resolveMetaHasMore(ctx.orgId) : metaBackfillHasMore(facebook);

  return jsonSuccess(req, {
    connections: serialized,
    comingSoon: COMING_SOON_PLATFORMS,
    metaConfigured: Boolean(Deno.env.get('META_APP_ID')?.trim()),
    metaSyncInProgress,
    metaSyncError: null,
    metaHasMore,
    metaSource: effective.source,
    usingOrgMeta: ctx.kind !== 'org' && effective.source === 'org',
  });
});
