/**
 * List/filter org inbox conversations (DB only — keep fast).
 */

import {
  listConversations,
  resolveMetaHasMore,
  searchInboxConversations,
} from '../_shared/socialInboxService.ts';
import type {
  ConversationType,
  InboxThreadFilter,
  SocialPlatform,
} from '../_shared/socialInboxTypes.ts';
import { enrichWebConversationsWithPropertyNames } from '../_shared/webGuestChatService.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

function parseFilter(url: URL): InboxThreadFilter {
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const platform = url.searchParams.get('platform');
  const search = url.searchParams.get('search') ?? undefined;
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limitRaw = url.searchParams.get('limit');
  return {
    type: (type === 'dm' || type === 'comment' ? type : 'all') as ConversationType | 'all',
    status: (status === 'unread' || status === 'pending' || status === 'replied'
      ? status
      : 'all') as InboxThreadFilter['status'],
    platform: (platform === 'facebook' ||
    platform === 'instagram' ||
    platform === 'tiktok' ||
    platform === 'airbnb' ||
    platform === 'web'
      ? platform
      : 'all') as SocialPlatform | 'all',
    search,
    cursor,
    limit: limitRaw ? Number(limitRaw) : undefined,
  };
}

serveAuthenticated('social-inbox-threads', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }
  const ctx = await resolveOrgAccessContext(req, 'org:inbox:view');
  const filter = parseFilter(new URL(req.url));

  const listResult = filter.search?.trim()
    ? await searchInboxConversations(ctx.org.id, filter)
    : await listConversations(ctx.org.id, filter);

  const conversations = await enrichWebConversationsWithPropertyNames(listResult.conversations);
  const metaHasMore = await resolveMetaHasMore(ctx.org.id);

  return jsonSuccess(req, {
    conversations,
    nextCursor: listResult.nextCursor,
    metaHasMore,
  });
});
