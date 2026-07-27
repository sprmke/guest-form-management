import { PlatformLogo } from '@/features/dashboard/inbox/components/PlatformLogo';
import { platformLabel } from '@/features/dashboard/inbox/lib/inboxFormat';
import type { ThreadPlatformFilter } from '@/features/dashboard/inbox/types/inbox';

import { SlidingTabs, SlidingTabsList, SlidingTabsTrigger } from '@/components/ui/sliding-tabs';

const PLATFORMS_MOCK: ThreadPlatformFilter[] = ['all', 'facebook', 'instagram', 'tiktok', 'airbnb'];

const PLATFORMS_LIVE: ThreadPlatformFilter[] = ['all', 'web', 'facebook', 'instagram'];

type Props = {
  value: ThreadPlatformFilter;
  onChange: (value: ThreadPlatformFilter) => void;
  /** When false, TikTok/Airbnb tabs are hidden (no live API). */
  showComingSoonPlatforms?: boolean;
};

export function InboxPlatformTabs({ value, onChange, showComingSoonPlatforms = false }: Props) {
  const platforms = showComingSoonPlatforms ? PLATFORMS_MOCK : PLATFORMS_LIVE;

  return (
    <SlidingTabs
      value={value}
      onValueChange={(next) => onChange(next as ThreadPlatformFilter)}
      className="border-border shrink-0 border-b"
    >
      <SlidingTabsList
        size="compact"
        className="w-full max-w-none justify-start gap-0 overflow-x-auto rounded-none bg-transparent px-2 py-1.5 sm:px-3"
        pillClassName="bg-muted rounded-md shadow-none"
        aria-label="Platform"
        remeasureDeps={[platforms.length, value]}
      >
        {platforms.map((platform) => {
          const label = platform === 'all' ? 'All' : platformLabel(platform);
          return (
            <SlidingTabsTrigger
              key={platform}
              value={platform}
              className="shrink-0 gap-2 font-medium"
            >
              {platform !== 'all' && <PlatformLogo platform={platform} size="xs" />}
              {label}
            </SlidingTabsTrigger>
          );
        })}
      </SlidingTabsList>
    </SlidingTabs>
  );
}
