/**
 * Shared Meta inbox connect finalization + Page picker helpers.
 */

import { encryptMetaInboxToken } from './metaInboxCrypto.ts';
import { prepareOrgMetaInboxConnect } from './metaInboxLifecycle.ts';
import {
  fetchMetaUserPages,
  persistMetaPageConnection,
  type MetaPageAccount,
} from './metaInboxGraph.ts';
import { ensureSocialInboxSettings, socialInboxDb } from './socialInboxService.ts';
import { seedDefaultInboxQuickRepliesIfEmpty } from './inboxDefaultQuickReplies.ts';

export type MetaPagePickerOption = {
  id: string;
  name: string;
  profileImageUrl: string | null;
  hasInstagram: boolean;
};

export function metaPagesForPicker(pages: MetaPageAccount[]): MetaPagePickerOption[] {
  return pages.map((page) => ({
    id: page.id,
    name: page.name,
    profileImageUrl: page.picture?.data?.url ?? null,
    hasInstagram: Boolean(page.instagram_business_account?.id),
  }));
}

/** Persist Page + IG connection only — backfill runs via `meta-inbox-backfill`. */
export async function connectOrgMetaInboxPage(orgId: string, page: MetaPageAccount): Promise<void> {
  await ensureSocialInboxSettings(orgId);
  await prepareOrgMetaInboxConnect(orgId);
  await persistMetaPageConnection(orgId, page);
  const sb = socialInboxDb();
  const now = new Date().toISOString();
  await sb
    .from('social_channel_connections')
    .update({
      meta_backfill_done: false,
      meta_backfill_phase: 'messenger',
      meta_backfill_next_url: null,
      last_sync_at: null,
      updated_at: now,
    })
    .eq('organization_id', orgId)
    .eq('platform', 'facebook')
    .eq('status', 'connected');
  await seedDefaultInboxQuickRepliesIfEmpty(orgId);
}

export async function encryptMetaUserToken(userToken: string): Promise<string> {
  return encryptMetaInboxToken(userToken);
}

export async function resolveMetaPageFromUserToken(
  userToken: string,
  pageId: string
): Promise<MetaPageAccount | null> {
  const pages = await fetchMetaUserPages(userToken);
  return pages.find((p) => p.id === pageId) ?? null;
}
