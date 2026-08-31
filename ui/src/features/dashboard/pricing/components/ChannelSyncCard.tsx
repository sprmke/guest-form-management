import { useMemo, useState } from 'react';

import { Copy, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { PlanGateWatermarkOverlay } from '@/features/dashboard/plans/components/PlanGateWatermarkOverlay';
import { TierBadge } from '@/features/dashboard/plans/components/TierBadge';
import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';
import { hasPropertyPermission } from '@/features/dashboard/team/lib/propertyPermissions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type LocalFeed = {
  id: string;
  url: string;
};

function exportFeedUrl(propertyId: string): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '');
  return `${base}/ical-export?property_id=${encodeURIComponent(propertyId)}`;
}

export function ChannelSyncCard() {
  const { data: access } = usePropertyPermissions();
  const canView = hasPropertyPermission(access?.permissions, 'pricing.channels:view');
  const canEdit = hasPropertyPermission(access?.permissions, 'pricing.channels:edit');
  const { canUse } = useFeatureGate('calendarSync');
  const propertyId = usePropertyIdParam();
  const [feedUrl, setFeedUrl] = useState('');
  const [feeds, setFeeds] = useState<LocalFeed[]>([]);

  const exportUrl = useMemo(() => (propertyId ? exportFeedUrl(propertyId) : ''), [propertyId]);

  if (!canView) return null;

  const addFeed = () => {
    const next = feedUrl.trim();
    if (!next) return;
    setFeeds((current) => [...current, { id: crypto.randomUUID(), url: next }]);
    setFeedUrl('');
  };

  const copyExport = async () => {
    if (!exportUrl) return;
    try {
      await navigator.clipboard.writeText(exportUrl);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const card = (
    <section className="surface-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-foreground text-sm font-semibold">Channel sync</h3>
        <TierBadge feature="calendarSync" />
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="channel-sync-import-url" className="text-foreground text-sm font-medium">
            Import
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="channel-sync-import-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
              value={feedUrl}
              disabled={!canEdit || !canUse}
              onChange={(event) => setFeedUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (canEdit && canUse) addFeed();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0 gap-1.5 sm:min-h-10"
              disabled={!canEdit || !canUse || !feedUrl.trim()}
              onClick={addFeed}
            >
              <Plus className="size-4" aria-hidden />
              Add
            </Button>
          </div>
          {feeds.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {feeds.map((feed) => (
                <li key={feed.id} className="flex items-center gap-2">
                  <p className="text-foreground min-w-0 flex-1 truncate text-sm">{feed.url}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 sm:size-9"
                    disabled={!canEdit || !canUse}
                    aria-label="Remove feed"
                    onClick={() =>
                      setFeeds((current) => current.filter((entry) => entry.id !== feed.id))
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <label htmlFor="channel-sync-export-url" className="text-foreground text-sm font-medium">
            Export
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input id="channel-sync-export-url" readOnly value={exportUrl} disabled={!exportUrl} />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0 gap-1.5 sm:min-h-10"
              disabled={!exportUrl}
              onClick={() => void copyExport()}
            >
              <Copy className="size-4" aria-hidden />
              Copy
            </Button>
          </div>
        </div>
      </div>
    </section>
  );

  if (canUse) return card;

  return (
    <PlanGateWatermarkOverlay feature="calendarSync" className="rounded-xl">
      {card}
    </PlanGateWatermarkOverlay>
  );
}
