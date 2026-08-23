import { PlatformLogo } from '@/features/dashboard/inbox/components/PlatformLogo';
import { platformLabel } from '@/features/dashboard/inbox/lib/inboxFormat';
import { INBOX_CHANNEL_ORDER } from '@/features/dashboard/inbox/lib/quickReplyGroups';
import type { ThreadPlatformFilter } from '@/features/dashboard/inbox/types/inbox';

import { SlidingTabs, SlidingTabsList, SlidingTabsTrigger } from '@/components/ui/sliding-tabs';

const ALL_PLATFORMS: ThreadPlatformFilter[] = ['all', ...INBOX_CHANNEL_ORDER];

type Props = {
  value: ThreadPlatformFilter;
  onChange: (value: ThreadPlatformFilter) => void;
  platforms?: ThreadPlatformFilter[];
};

export function InboxPlatformTabs({ value, onChange, platforms = ALL_PLATFORMS }: Props) {
  // Single channel (e.g. parking Chat-only) — no platform switcher needed.
  if (platforms.length <= 1) return null;

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
